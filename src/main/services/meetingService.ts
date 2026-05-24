import { and, eq, inArray, isNotNull } from 'drizzle-orm';

import { todayISO } from '../../shared/dates';
import type {
  EligibleAttendee,
  LoadMeetingsInput,
  MeetingAttendee,
  MeetingDetail,
  MeetingListItem,
  SaveMeetingInput,
  SaveMeetingResult,
} from '../../shared/meeting';
import type { DB, DBLike } from '../db';
import {
  activityRecords,
  activityTypes,
  households,
  meetingAttendees,
  meetings,
  members,
  monthlyReports,
  roles,
} from '../db/schema';

export interface MeetingDeps {
  db: DB;
  clock?: () => Date;
}

export class MeetingNotFoundError extends Error {
  constructor(id: number) {
    super(`Musyawarah id ${id} tidak ditemukan`);
    this.name = 'MeetingNotFoundError';
  }
}

export class InvalidMeetingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMeetingInputError';
  }
}

export class FutureMeetingDateError extends Error {
  constructor(date: string) {
    super(`Tanggal ${date} di masa depan — musyawarah belum bisa dicatat`);
    this.name = 'FutureMeetingDateError';
  }
}

export class InvalidMeetingPeriodError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMeetingPeriodError';
  }
}

function isoToday(deps: MeetingDeps): string {
  return todayISO(deps.clock?.());
}

function periodBounds(
  month: number,
  year: number,
): { start: string; end: string } {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new InvalidMeetingPeriodError(
      `month harus 1–12 (diterima ${month})`,
    );
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new InvalidMeetingPeriodError(`year tidak valid (diterima ${year})`);
  }
  const startMonth = String(month).padStart(2, '0');
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endMonth = String(nextMonth).padStart(2, '0');
  return {
    start: `${year}-${startMonth}-01`,
    end: `${nextYear}-${endMonth}-01`,
  };
}

function readAttendees(db: DBLike, meetingId: number): MeetingAttendee[] {
  const rows = db
    .select({
      memberId: members.id,
      fullName: members.fullName,
      gender: members.gender,
      lifeStage: members.lifeStage,
      roleName: roles.name,
    })
    .from(meetingAttendees)
    .innerJoin(members, eq(meetingAttendees.memberId, members.id))
    .innerJoin(roles, eq(members.roleId, roles.id))
    .where(eq(meetingAttendees.meetingId, meetingId))
    .all();
  return rows
    .map((r) => ({
      memberId: r.memberId,
      fullName: r.fullName,
      gender: r.gender,
      lifeStage: r.lifeStage,
      roleName: r.roleName,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'id'));
}

function readDetail(db: DBLike, meetingId: number): MeetingDetail {
  const row = db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .get();
  if (!row) throw new MeetingNotFoundError(meetingId);
  return {
    id: row.id,
    meetingDate: row.meetingDate,
    type: row.type,
    title: row.title,
    resultNotes: row.resultNotes,
    suggestions: row.suggestions,
    attendees: readAttendees(db, meetingId),
  };
}

/**
 * §8 trigger: on meeting save, UPSERT activity_records for every active
 * activity_type with source_kind='meeting' AND meeting_type=savedMeeting.type.
 * Get-or-create monthly_reports for the meeting's month/year. Sets
 * source_meeting_id so the report can backlink to the meeting.
 */
function applyActivityRecordsFromMeeting(
  tx: DBLike,
  meetingId: number,
): number {
  const meeting = tx
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .get()!;

  const linked = tx
    .select()
    .from(activityTypes)
    .where(
      and(
        eq(activityTypes.sourceKind, 'meeting'),
        eq(activityTypes.meetingType, meeting.type),
        eq(activityTypes.isActive, true),
      ),
    )
    .all();
  if (linked.length === 0) return 0;

  const [yStr, mStr] = meeting.meetingDate.split('-');
  const year = Number(yStr);
  const month = Number(mStr);

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
        executedDate: meeting.meetingDate,
        sourceMeetingId: meeting.id,
      })
      .onConflictDoUpdate({
        target: [activityRecords.reportId, activityRecords.activityTypeId],
        set: {
          status: 'Terlaksana',
          executedDate: meeting.meetingDate,
          sourceMeetingId: meeting.id,
        },
      })
      .run();
  }
  return linked.length;
}

function diffAttendees(
  tx: DBLike,
  meetingId: number,
  nextMemberIds: number[],
): void {
  const existing = tx
    .select({ memberId: meetingAttendees.memberId })
    .from(meetingAttendees)
    .where(eq(meetingAttendees.meetingId, meetingId))
    .all()
    .map((r) => r.memberId);
  const existingSet = new Set(existing);
  const nextSet = new Set(nextMemberIds);

  const toRemove = existing.filter((id) => !nextSet.has(id));
  const toAdd = nextMemberIds.filter((id) => !existingSet.has(id));

  if (toRemove.length > 0) {
    tx.delete(meetingAttendees)
      .where(
        and(
          eq(meetingAttendees.meetingId, meetingId),
          inArray(meetingAttendees.memberId, toRemove),
        ),
      )
      .run();
  }
  if (toAdd.length > 0) {
    tx.insert(meetingAttendees)
      .values(toAdd.map((memberId) => ({ meetingId, memberId })))
      .run();
  }
}

function validateAttendees(tx: DBLike, memberIds: number[]): void {
  if (memberIds.length === 0) return;
  if (new Set(memberIds).size !== memberIds.length) {
    throw new InvalidMeetingInputError(
      'memberId duplikat di daftar hadir',
    );
  }
  // Every attendee must be a known member with a non-null role (Pengurus).
  const found = tx
    .select({
      id: members.id,
      fullName: members.fullName,
      roleId: members.roleId,
    })
    .from(members)
    .where(inArray(members.id, memberIds))
    .all();
  if (found.length !== memberIds.length) {
    const foundSet = new Set(found.map((m) => m.id));
    const missing = memberIds.find((id) => !foundSet.has(id));
    throw new InvalidMeetingInputError(
      `Jama'ah id ${missing} tidak ditemukan`,
    );
  }
  const nonPengurus = found.find((m) => m.roleId === null);
  if (nonPengurus) {
    throw new InvalidMeetingInputError(
      `${nonPengurus.fullName} bukan pengurus — daftar hadir musyawarah hanya untuk yang memiliki dapukan`,
    );
  }
}

export const meetingService = {
  listByPeriod(
    deps: MeetingDeps,
    input: LoadMeetingsInput,
  ): MeetingListItem[] {
    const { start, end } = periodBounds(input.month, input.year);
    const rows = deps.db
      .select({
        id: meetings.id,
        meetingDate: meetings.meetingDate,
        type: meetings.type,
        title: meetings.title,
      })
      .from(meetings)
      .all()
      .filter((m) => m.meetingDate >= start && m.meetingDate < end)
      .sort((a, b) => a.meetingDate.localeCompare(b.meetingDate));

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const counts = new Map<number, number>();
    const junction = deps.db
      .select({
        meetingId: meetingAttendees.meetingId,
      })
      .from(meetingAttendees)
      .where(inArray(meetingAttendees.meetingId, ids))
      .all();
    for (const j of junction) {
      counts.set(j.meetingId, (counts.get(j.meetingId) ?? 0) + 1);
    }

    return rows.map((r) => ({
      ...r,
      attendeeCount: counts.get(r.id) ?? 0,
    }));
  },

  get(deps: MeetingDeps, id: number): MeetingDetail {
    return readDetail(deps.db, id);
  },

  /**
   * Pengurus only — `members.role_id IS NOT NULL` per ERD note on
   * `meeting_attendees`. Active members only. Returns role name joined in.
   *
   * Order: by role insertion order (roles.id ASC), then by name within role.
   * Interim until `roles.position` lands in a follow-up PR; both orderings
   * give the operator-controlled "Imam first, then Sekretaris…" sequence.
   */
  eligibleAttendees(deps: MeetingDeps): EligibleAttendee[] {
    return deps.db
      .select({
        memberId: members.id,
        fullName: members.fullName,
        gender: members.gender,
        lifeStage: members.lifeStage,
        roleName: roles.name,
        roleId: roles.id,
      })
      .from(members)
      .innerJoin(roles, eq(members.roleId, roles.id))
      .where(and(eq(members.isActive, true), isNotNull(members.roleId)))
      .all()
      .sort((a, b) => {
        if (a.roleId !== b.roleId) return a.roleId - b.roleId;
        return a.fullName.localeCompare(b.fullName, 'id');
      })
      .map(({ roleId: _roleId, ...rest }) => rest);
  },

  save(deps: MeetingDeps, input: SaveMeetingInput): SaveMeetingResult {
    if (!input.title.trim()) {
      throw new InvalidMeetingInputError('Judul musyawarah wajib diisi');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.meetingDate)) {
      throw new InvalidMeetingInputError(
        `Tanggal ${input.meetingDate} bukan format YYYY-MM-DD`,
      );
    }
    if (input.meetingDate > isoToday(deps)) {
      throw new FutureMeetingDateError(input.meetingDate);
    }

    return deps.db.transaction((tx) => {
      validateAttendees(tx, input.attendeeMemberIds);

      let meetingId: number;
      if (input.id === undefined) {
        const inserted = tx
          .insert(meetings)
          .values({
            meetingDate: input.meetingDate,
            type: input.type,
            title: input.title.trim(),
            resultNotes: input.resultNotes,
            suggestions: input.suggestions,
          })
          .returning({ id: meetings.id })
          .get();
        meetingId = inserted.id;
      } else {
        const current = tx
          .select({ id: meetings.id })
          .from(meetings)
          .where(eq(meetings.id, input.id))
          .get();
        if (!current) throw new MeetingNotFoundError(input.id);
        tx.update(meetings)
          .set({
            meetingDate: input.meetingDate,
            type: input.type,
            title: input.title.trim(),
            resultNotes: input.resultNotes,
            suggestions: input.suggestions,
          })
          .where(eq(meetings.id, input.id))
          .run();
        meetingId = input.id;
      }

      diffAttendees(tx, meetingId, input.attendeeMemberIds);

      // §8 trigger. When the type changes on an existing meeting, the old
      // type's activity_record is intentionally left in place — Laporan
      // Bulanan recomputes from buckets at finalize (self-healing).
      const activityRecordsTouched = applyActivityRecordsFromMeeting(
        tx,
        meetingId,
      );

      return {
        meeting: readDetail(tx, meetingId),
        activityRecordsTouched,
      };
    });
  },

  remove(deps: MeetingDeps, id: number): void {
    deps.db.transaction((tx) => {
      const exists = tx
        .select({ id: meetings.id })
        .from(meetings)
        .where(eq(meetings.id, id))
        .get();
      if (!exists) throw new MeetingNotFoundError(id);

      // Clear backlink from any activity_records that referenced this meeting.
      // Status (Terlaksana) stays — the activity may still have happened; the
      // operator can decide whether to re-link or clear via Laporan Bulanan.
      tx.update(activityRecords)
        .set({ sourceMeetingId: null })
        .where(eq(activityRecords.sourceMeetingId, id))
        .run();

      tx.delete(meetingAttendees)
        .where(eq(meetingAttendees.meetingId, id))
        .run();
      tx.delete(meetings).where(eq(meetings.id, id)).run();
    });
  },
};
