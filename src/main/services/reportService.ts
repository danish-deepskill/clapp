import { and, eq, inArray } from 'drizzle-orm';

import { ATTENDANCE_LIFE_STAGES, LIFE_STAGE } from '../../shared/enums';
import type {
  Demografi,
  FinalizeInput,
  LimaBab,
  LoadReportInput,
  Peristiwa,
  ReportData,
  SaranEntry,
  SaveReportInput,
  VisitPlan,
  ConstructionProject,
} from '../../shared/report';
import type { DB, DBLike } from '../db';
import {
  activityRecords,
  activityTypes,
  attendance,
  familyVisits,
  households,
  meetings,
  members,
  monthlyReports,
  sessions,
  sickRecords,
} from '../db/schema';
import { eventLogService } from './eventLogService';

export interface ReportDeps {
  db: DB;
  clock?: () => Date;
}

export class InvalidReportPeriodError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidReportPeriodError';
  }
}

export class ReportLockedError extends Error {
  constructor(month: number, year: number) {
    super(`Laporan ${month}/${year} sudah dikunci — buka kunci dulu`);
    this.name = 'ReportLockedError';
  }
}

export class ReportNotFoundError extends Error {
  constructor(month: number, year: number) {
    super(`Laporan ${month}/${year} belum ada`);
    this.name = 'ReportNotFoundError';
  }
}

function assertPeriod(month: number, year: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new InvalidReportPeriodError(`month harus 1–12 (diterima ${month})`);
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new InvalidReportPeriodError(`year tidak valid (diterima ${year})`);
  }
}

function periodBounds(month: number, year: number): { start: string; end: string } {
  const startMonth = String(month).padStart(2, '0');
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return {
    start: `${year}-${startMonth}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  };
}

function getOrCreateReport(tx: DBLike, month: number, year: number) {
  const existing = tx
    .select()
    .from(monthlyReports)
    .where(and(eq(monthlyReports.month, month), eq(monthlyReports.year, year)))
    .get();
  if (existing) return existing;
  return tx
    .insert(monthlyReports)
    .values({ month, year })
    .returning()
    .get();
}

// ─── Computed sections ─────────────────────────────────────────────────────

function computeDemografi(db: DBLike): Demografi {
  const active = db
    .select({
      gender: members.gender,
      lifeStage: members.lifeStage,
      maritalStatus: members.maritalStatus,
    })
    .from(members)
    .where(eq(members.isActive, true))
    .all();

  const byStage = LIFE_STAGE.map((stage) => {
    const inStage = active.filter((m) => m.lifeStage === stage);
    const male = inStage.filter((m) => m.gender === 'Laki-Laki').length;
    const female = inStage.filter((m) => m.gender === 'Perempuan').length;
    return { stage, male, female, total: male + female };
  });

  return {
    byStage,
    janda: active.filter((m) => m.maritalStatus === 'Janda').length,
    duda: active.filter((m) => m.maritalStatus === 'Duda').length,
    totalMale: active.filter((m) => m.gender === 'Laki-Laki').length,
    totalFemale: active.filter((m) => m.gender === 'Perempuan').length,
    total: active.length,
  };
}

/** % Hadir = (H + S + I) / total sessions, per attendance-eligible member. */
function computeLimaBab(db: DBLike, month: number, year: number): LimaBab {
  const { start, end } = periodBounds(month, year);
  const sessionIds = db
    .select({ id: sessions.id, sessionDate: sessions.sessionDate })
    .from(sessions)
    .all()
    .filter((s) => s.sessionDate >= start && s.sessionDate < end)
    .map((s) => s.id);

  const empty: LimaBab = {
    lancar: 0,
    kurangLancar: 0,
    kurangSambung: 0,
    tabayyun: 0,
    sessionCount: sessionIds.length,
  };
  if (sessionIds.length === 0) return empty;

  const eligible = db
    .select({ id: members.id })
    .from(members)
    .where(
      and(
        eq(members.isActive, true),
        inArray(members.lifeStage, [...ATTENDANCE_LIFE_STAGES]),
      ),
    )
    .all()
    .map((m) => m.id);
  if (eligible.length === 0) return empty;

  const rows = db
    .select({
      memberId: attendance.memberId,
      status: attendance.status,
    })
    .from(attendance)
    .where(
      and(
        inArray(attendance.sessionId, sessionIds),
        inArray(attendance.memberId, eligible),
      ),
    )
    .all();

  const presentByMember = new Map<number, number>();
  for (const r of rows) {
    if (r.status === 'H' || r.status === 'S' || r.status === 'I') {
      presentByMember.set(r.memberId, (presentByMember.get(r.memberId) ?? 0) + 1);
    }
  }

  const result = { ...empty };
  for (const memberId of eligible) {
    const pct = ((presentByMember.get(memberId) ?? 0) / sessionIds.length) * 100;
    if (pct > 60) result.lancar += 1;
    else if (pct >= 20) result.kurangLancar += 1;
    else if (pct > 0) result.kurangSambung += 1;
    else result.tabayyun += 1;
  }
  return result;
}

function computePeristiwa(deps: ReportDeps, month: number, year: number): Peristiwa {
  const all = eventLogService.listByPeriod({ db: deps.db }, { month, year });
  return {
    vital: all.filter((e) => e.source === 'vital'),
    movement: all.filter((e) => e.source === 'movement'),
  };
}

function computeSaran(db: DBLike, month: number, year: number): SaranEntry[] {
  const { start, end } = periodBounds(month, year);
  return db
    .select({
      meetingId: meetings.id,
      meetingTitle: meetings.title,
      meetingType: meetings.type,
      meetingDate: meetings.meetingDate,
      suggestions: meetings.suggestions,
    })
    .from(meetings)
    .all()
    .filter(
      (m) =>
        m.meetingDate >= start &&
        m.meetingDate < end &&
        m.suggestions !== null &&
        m.suggestions.trim() !== '',
    )
    .sort((a, b) => a.meetingDate.localeCompare(b.meetingDate))
    .map((m) => ({
      meetingId: m.meetingId,
      meetingTitle: m.meetingTitle,
      meetingType: m.meetingType,
      suggestions: m.suggestions!,
    }));
}

// ─── Child-table readers ───────────────────────────────────────────────────

function readChildren(db: DBLike, reportId: number) {
  const memberById = new Map(
    db.select({ id: members.id, fullName: members.fullName }).from(members).all().map(
      (m) => [m.id, m.fullName],
    ),
  );
  const householdById = new Map(
    db
      .select({ id: households.id, householdNo: households.householdNo })
      .from(households)
      .all()
      .map((h) => [h.id, h.householdNo]),
  );
  const activityTypeById = new Map(
    db.select().from(activityTypes).all().map((t) => [t.id, t]),
  );

  const sick = db
    .select()
    .from(sickRecords)
    .where(eq(sickRecords.reportId, reportId))
    .all()
    .map((r) => ({
      memberId: r.memberId,
      memberName: memberById.get(r.memberId) ?? `id ${r.memberId}`,
      notes: r.notes,
    }));

  const visits = db
    .select()
    .from(familyVisits)
    .where(eq(familyVisits.reportId, reportId))
    .all()
    .map((r) => ({
      householdId: r.householdId,
      familyName: r.familyName,
      householdLabel:
        r.householdId !== null
          ? `KK-${householdById.get(r.householdId) ?? r.householdId}`
          : (r.familyName ?? ''),
      notes: r.notes,
    }));

  const activities = db
    .select()
    .from(activityRecords)
    .where(eq(activityRecords.reportId, reportId))
    .all()
    .map((r) => {
      const at = activityTypeById.get(r.activityTypeId);
      return {
        activityTypeId: r.activityTypeId,
        activityName: at?.name ?? `id ${r.activityTypeId}`,
        sourceKind: at?.sourceKind,
        status: r.status,
        executedDate: r.executedDate,
        attendeeCount: r.attendeeCount,
        location: r.location,
        sourceMeetingId: r.sourceMeetingId,
      };
    });

  return { sick, visits, activities };
}

export const reportService = {
  getReport(deps: ReportDeps, input: LoadReportInput): ReportData {
    assertPeriod(input.month, input.year);
    const { month, year } = input;

    return deps.db.transaction((tx) => {
      const report = getOrCreateReport(tx, month, year);
      const finalized = report.finalizedAt !== null;

      // Demografi + Lima Bab freeze at finalize; everything else stays live.
      const demografi: Demografi =
        finalized && report.demographicsSnapshot
          ? (report.demographicsSnapshot as Demografi)
          : computeDemografi(tx);

      const limaBab: LimaBab = finalized
        ? {
            lancar: report.limaBabLancar ?? 0,
            kurangLancar: report.limaBabKurangLancar ?? 0,
            kurangSambung: report.limaBabKurangSambung ?? 0,
            tabayyun: report.limaBabTabayyun ?? 0,
            sessionCount: computeLimaBab(tx, month, year).sessionCount,
          }
        : computeLimaBab(tx, month, year);

      const children = readChildren(tx, report.id);

      return {
        month,
        year,
        finalizedAt: report.finalizedAt
          ? report.finalizedAt.toISOString()
          : null,
        demografi,
        limaBab,
        peristiwa: computePeristiwa(deps, month, year),
        saran: computeSaran(tx, month, year),
        rencanaBece: report.rencanaBece,
        berasJimpitan: report.berasJimpitan,
        fotocopyDalil: report.fotocopyDalil,
        otherNotes: report.otherNotes,
        visitPlans: (report.visitPlans as VisitPlan[] | null) ?? [],
        constructionProjects:
          (report.constructionProjects as ConstructionProject[] | null) ?? [],
        sick: children.sick,
        familyVisits: children.visits,
        activities: children.activities,
      };
    });
  },

  saveReport(deps: ReportDeps, input: SaveReportInput): ReportData {
    assertPeriod(input.month, input.year);
    const { month, year } = input;

    deps.db.transaction((tx) => {
      const report = getOrCreateReport(tx, month, year);
      if (report.finalizedAt !== null) {
        throw new ReportLockedError(month, year);
      }

      tx.update(monthlyReports)
        .set({
          rencanaBece: input.rencanaBece,
          berasJimpitan: input.berasJimpitan,
          fotocopyDalil: input.fotocopyDalil,
          otherNotes: input.otherNotes,
          visitPlans: input.visitPlans,
          constructionProjects: input.constructionProjects,
        })
        .where(eq(monthlyReports.id, report.id))
        .run();

      // sick + family_visits: no external FK references in — delete-all + reinsert.
      tx.delete(sickRecords).where(eq(sickRecords.reportId, report.id)).run();
      if (input.sick.length > 0) {
        tx.insert(sickRecords)
          .values(
            input.sick.map((s) => ({
              reportId: report.id,
              memberId: s.memberId,
              notes: s.notes,
            })),
          )
          .run();
      }

      tx.delete(familyVisits).where(eq(familyVisits.reportId, report.id)).run();
      if (input.familyVisits.length > 0) {
        tx.insert(familyVisits)
          .values(
            input.familyVisits.map((v) => ({
              reportId: report.id,
              householdId: v.householdId,
              familyName: v.familyName,
              notes: v.notes,
            })),
          )
          .run();
      }

      // activity_records: UPSERT per (report, activity_type) so §8-trigger
      // rows (with source_meeting_id) survive operator edits.
      for (const a of input.activities) {
        tx.insert(activityRecords)
          .values({
            reportId: report.id,
            activityTypeId: a.activityTypeId,
            status: a.status,
            executedDate: a.executedDate,
            attendeeCount: a.attendeeCount,
            location: a.location,
          })
          .onConflictDoUpdate({
            target: [activityRecords.reportId, activityRecords.activityTypeId],
            set: {
              status: a.status,
              executedDate: a.executedDate,
              attendeeCount: a.attendeeCount,
              location: a.location,
            },
          })
          .run();
      }
    });

    return this.getReport(deps, { month, year });
  },

  /**
   * §8 #10: lock the month. Snapshots demographics (live → JSON) + caches
   * Lima Bab bucket counts so the report freezes as-of finalize time.
   */
  finalize(deps: ReportDeps, input: FinalizeInput): ReportData {
    assertPeriod(input.month, input.year);
    const { month, year } = input;

    deps.db.transaction((tx) => {
      const report = getOrCreateReport(tx, month, year);
      if (report.finalizedAt !== null) {
        throw new ReportLockedError(month, year);
      }
      const demografi = computeDemografi(tx);
      const limaBab = computeLimaBab(tx, month, year);
      tx.update(monthlyReports)
        .set({
          finalizedAt: deps.clock?.() ?? new Date(),
          demographicsSnapshot: demografi,
          limaBabLancar: limaBab.lancar,
          limaBabKurangLancar: limaBab.kurangLancar,
          limaBabKurangSambung: limaBab.kurangSambung,
          limaBabTabayyun: limaBab.tabayyun,
        })
        .where(eq(monthlyReports.id, report.id))
        .run();
    });

    return this.getReport(deps, { month, year });
  },

  unlock(deps: ReportDeps, input: FinalizeInput): ReportData {
    assertPeriod(input.month, input.year);
    const { month, year } = input;

    deps.db.transaction((tx) => {
      const report = tx
        .select()
        .from(monthlyReports)
        .where(
          and(eq(monthlyReports.month, month), eq(monthlyReports.year, year)),
        )
        .get();
      if (!report) throw new ReportNotFoundError(month, year);
      if (report.finalizedAt === null) return;
      // Clear the snapshot so a later re-finalize recomputes fresh.
      tx.update(monthlyReports)
        .set({ finalizedAt: null, demographicsSnapshot: null })
        .where(eq(monthlyReports.id, report.id))
        .run();
    });

    return this.getReport(deps, { month, year });
  },
};
