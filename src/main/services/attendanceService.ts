import { and, eq, inArray } from 'drizzle-orm';

import type {
  LoadRosterInput,
  LoadRosterResult,
  RosterRow,
  SaveBatchInput,
  SaveBatchResult,
  SessionRow,
} from '../../shared/attendance';
import { ATTENDANCE_LIFE_STAGES } from '../../shared/enums';
import type { DB, DBLike } from '../db';
import {
  activityRecords,
  activityTypes,
  attendance,
  households,
  members,
  monthlyReports,
  roles,
  sessionTypes,
  sessions,
} from '../db/schema';

export interface AttendanceDeps {
  db: DB;
  /** Defaults to () => new Date() for production; injected in tests. */
  clock?: () => Date;
}

export class SessionTypeNotFoundError extends Error {
  constructor(id: number) {
    super(`Jenis pengajian id ${id} tidak ditemukan`);
    this.name = 'SessionTypeNotFoundError';
  }
}

export class FutureDateError extends Error {
  constructor(date: string) {
    super(`Tanggal ${date} di masa depan — sesi tidak bisa dicatat dulu`);
    this.name = 'FutureDateError';
  }
}

export class InvalidAttendanceInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAttendanceInputError';
  }
}

export class OneSessionPerDateError extends Error {
  constructor(
    public readonly existingTypeName: string,
    public readonly sessionDate: string,
  ) {
    super(
      `Sudah ada sesi ${existingTypeName} di tanggal ${sessionDate} — hapus atau ubah jenisnya dulu`,
    );
    this.name = 'OneSessionPerDateError';
  }
}

function isoToday(deps: AttendanceDeps): string {
  return (deps.clock?.() ?? new Date()).toISOString().slice(0, 10);
}

function isFutureDate(deps: AttendanceDeps, date: string): boolean {
  return date > isoToday(deps);
}

function findSessionByDate(db: DBLike, sessionDate: string): SessionRow | null {
  const row = db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionDate, sessionDate))
    .get();
  return row ?? null;
}

/**
 * One-session-per-date rule (see project-one-pengajian-per-day memory):
 * - If a session exists for this date AND it's the same type → return it.
 * - If a session exists for this date AND it's a different type → refuse with
 *   OneSessionPerDateError. Operator must explicitly delete or relabel.
 * - If no session exists → insert a new one with the given type.
 */
function getOrCreateSessionTx(
  tx: DBLike,
  sessionTypeId: number,
  sessionDate: string,
): SessionRow {
  const existing = findSessionByDate(tx, sessionDate);
  if (existing) {
    if (existing.sessionTypeId === sessionTypeId) return existing;
    // FK guarantees the session_type row exists.
    const existingType = tx
      .select({ name: sessionTypes.name })
      .from(sessionTypes)
      .where(eq(sessionTypes.id, existing.sessionTypeId))
      .get()!;
    throw new OneSessionPerDateError(existingType.name, sessionDate);
  }
  return tx
    .insert(sessions)
    .values({ sessionDate, sessionTypeId })
    .returning()
    .get();
}

function buildRoster(db: DBLike, sessionId: number | null): RosterRow[] {
  // Attendance roster excludes children/teens — only Muda-mudi & Dewasa
  // attend pengajian. See project-attendance-eligibility memory.
  const activeMembers = db
    .select({
      id: members.id,
      fullName: members.fullName,
      nickname: members.nickname,
      gender: members.gender,
      lifeStage: members.lifeStage,
      roleId: members.roleId,
      householdId: members.householdId,
    })
    .from(members)
    .where(
      and(
        eq(members.isActive, true),
        inArray(members.lifeStage, [...ATTENDANCE_LIFE_STAGES]),
      ),
    )
    .all();

  if (activeMembers.length === 0) return [];

  const allRoles = db.select().from(roles).all();
  const allHouseholds = db.select().from(households).all();
  const existingAttendance = sessionId
    ? db
        .select()
        .from(attendance)
        .where(eq(attendance.sessionId, sessionId))
        .all()
    : [];
  const attendanceByMember = new Map(
    existingAttendance.map((a) => [a.memberId, a]),
  );

  return activeMembers
    .map<RosterRow>((m) => {
      const hh = allHouseholds.find((h) => h.id === m.householdId);
      const saved = attendanceByMember.get(m.id);
      return {
        memberId: m.id,
        fullName: m.fullName,
        nickname: m.nickname,
        gender: m.gender,
        lifeStage: m.lifeStage,
        roleName: m.roleId
          ? (allRoles.find((r) => r.id === m.roleId)?.name ?? null)
          : null,
        isHead: hh?.headMemberId === m.id,
        householdNo: hh?.householdNo ?? '',
        status: saved?.status ?? null,
        arrivalAt: saved?.arrivalAt
          ? saved.arrivalAt.toISOString()
          : null,
        donationAmount: saved?.donationAmount ?? null,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'id'));
}

/**
 * §8 trigger: if the session's session_type is linked to an
 * `activity_types` row with source_kind='session', UPSERT a matching
 * `activity_records` row to 'Terlaksana' for that month. Creates the
 * `monthly_reports` draft row if missing. Returns count touched.
 */
function applyActivityRecordsFromSession(
  tx: DBLike,
  sessionId: number,
): number {
  // Caller passes a sessionId from getOrCreateSessionTx or after an existence check.
  const session = tx
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get()!;

  const linked = tx
    .select()
    .from(activityTypes)
    .where(
      and(
        eq(activityTypes.sourceKind, 'session'),
        eq(activityTypes.sessionTypeId, session.sessionTypeId),
        eq(activityTypes.isActive, true),
      ),
    )
    .all();
  if (linked.length === 0) return 0;

  // Parse YYYY-MM-DD as local-month (string-stable, avoid timezone slippage).
  const [yStr, mStr] = session.sessionDate.split('-');
  const year = Number(yStr);
  const month = Number(mStr);

  // Get-or-create the monthly_reports row for this period.
  const existingReport = tx
    .select()
    .from(monthlyReports)
    .where(and(eq(monthlyReports.month, month), eq(monthlyReports.year, year)))
    .get();
  const reportId =
    existingReport?.id ??
    tx
      .insert(monthlyReports)
      .values({ month, year })
      .returning({ id: monthlyReports.id })
      .get().id;

  for (const at of linked) {
    tx.insert(activityRecords)
      .values({
        reportId,
        activityTypeId: at.id,
        status: 'Terlaksana',
        executedDate: session.sessionDate,
      })
      .onConflictDoUpdate({
        target: [activityRecords.reportId, activityRecords.activityTypeId],
        set: { status: 'Terlaksana', executedDate: session.sessionDate },
      })
      .run();
  }
  return linked.length;
}

function assertSessionType(db: DBLike, sessionTypeId: number): void {
  const row = db
    .select({ id: sessionTypes.id })
    .from(sessionTypes)
    .where(eq(sessionTypes.id, sessionTypeId))
    .get();
  if (!row) throw new SessionTypeNotFoundError(sessionTypeId);
}

export const attendanceService = {
  /**
   * Reads-only. Returns whatever session exists for that DATE (one-per-day
   * rule — type is metadata on the row), plus one roster entry per active
   * member, prefilled from saved attendance if present else status='H'.
   * Does NOT create the session.
   */
  loadRoster(deps: AttendanceDeps, input: LoadRosterInput): LoadRosterResult {
    const session = findSessionByDate(deps.db, input.sessionDate);
    return {
      session,
      roster: buildRoster(deps.db, session?.id ?? null),
    };
  },

  /**
   * Update the type of an existing session in-place. Same `sessions.id`, same
   * attendance rows. Used when the operator miscategorized a saved session.
   * Re-evaluates §8 activity_records for both old and new types in the same
   * transaction.
   */
  relabelSessionType(
    deps: AttendanceDeps,
    input: { sessionId: number; newSessionTypeId: number },
  ): SessionRow {
    return deps.db.transaction((tx) => {
      assertSessionType(tx, input.newSessionTypeId);
      const existing = tx
        .select()
        .from(sessions)
        .where(eq(sessions.id, input.sessionId))
        .get();
      if (!existing) {
        throw new InvalidAttendanceInputError(
          `Sesi id ${input.sessionId} tidak ditemukan`,
        );
      }
      if (existing.sessionTypeId === input.newSessionTypeId) return existing;
      tx.update(sessions)
        .set({ sessionTypeId: input.newSessionTypeId })
        .where(eq(sessions.id, input.sessionId))
        .run();
      // Re-evaluate §8 against the new type. The OLD type's activity_record
      // is intentionally left alone here — Laporan Bulanan recomputes from
      // attendance buckets at finalize, so a stale Terlaksana flag is
      // self-healing on report close.
      applyActivityRecordsFromSession(tx, input.sessionId);
      return tx
        .select()
        .from(sessions)
        .where(eq(sessions.id, input.sessionId))
        .get()!;
    });
  },

  /**
   * Batch-saves attendance for one session. Wraps everything in one txn:
   * get-or-create session → UPSERT each row → §8 activity_records trigger.
   * Blocks future session_date.
   */
  saveBatch(deps: AttendanceDeps, input: SaveBatchInput): SaveBatchResult {
    if (isFutureDate(deps, input.sessionDate)) {
      throw new FutureDateError(input.sessionDate);
    }
    if (input.rows.length === 0) {
      throw new InvalidAttendanceInputError('rows tidak boleh kosong');
    }
    const memberIds = input.rows.map((r) => r.memberId);
    if (new Set(memberIds).size !== memberIds.length) {
      throw new InvalidAttendanceInputError('memberId duplikat di dalam rows');
    }

    return deps.db.transaction((tx) => {
      assertSessionType(tx, input.sessionTypeId);

      // Validate every memberId resolves to an actual member (active or not —
      // back-dating into a period when someone was active is allowed; we just
      // refuse phantoms) AND is eligible for attendance (Muda-mudi / Dewasa).
      const known = tx
        .select({
          id: members.id,
          lifeStage: members.lifeStage,
          fullName: members.fullName,
        })
        .from(members)
        .where(inArray(members.id, memberIds))
        .all();
      if (known.length !== memberIds.length) {
        const knownSet = new Set(known.map((k) => k.id));
        const missing = memberIds.find((id) => !knownSet.has(id));
        throw new InvalidAttendanceInputError(
          `Jama'ah id ${missing} tidak ditemukan`,
        );
      }
      const ineligible = known.find(
        (m) =>
          !(ATTENDANCE_LIFE_STAGES as readonly string[]).includes(m.lifeStage),
      );
      if (ineligible) {
        throw new InvalidAttendanceInputError(
          `${ineligible.fullName} (kelas ${ineligible.lifeStage}) tidak ikut pengajian — Absensi hanya untuk Muda-mudi & Dewasa`,
        );
      }

      const session = getOrCreateSessionTx(
        tx,
        input.sessionTypeId,
        input.sessionDate,
      );

      const now = deps.clock?.() ?? new Date();

      let upsertedCount = 0;
      for (const r of input.rows) {
        if (r.status === null) {
          // Unmark — remove any existing attendance for this (member, session).
          tx.delete(attendance)
            .where(
              and(
                eq(attendance.memberId, r.memberId),
                eq(attendance.sessionId, session.id),
              ),
            )
            .run();
          continue;
        }
        // CONTEXT §3: only Hadir has arrival/donation. Other statuses null out.
        const arrivalAt = r.status === 'H' ? r.arrivalAt : null;
        const donationAmount = r.status === 'H' ? r.donationAmount : null;
        tx.insert(attendance)
          .values({
            memberId: r.memberId,
            sessionId: session.id,
            status: r.status,
            arrivalAt: arrivalAt ? new Date(arrivalAt) : null,
            donationAmount,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [attendance.memberId, attendance.sessionId],
            set: {
              status: r.status,
              arrivalAt: arrivalAt ? new Date(arrivalAt) : null,
              donationAmount,
              updatedAt: now,
            },
          })
          .run();
        upsertedCount += 1;
      }

      const activityRecordsTouched = applyActivityRecordsFromSession(
        tx,
        session.id,
      );

      return {
        session,
        savedCount: upsertedCount,
        activityRecordsTouched,
      };
    });
  },
};
