import { eq, inArray } from 'drizzle-orm';

import type {
  ActionItem,
  DashboardData,
  RecentSession,
} from '../../shared/dashboard';
import {
  RECENT_LIMIT,
  UNFINALIZED_LOOKBACK_MONTHS,
} from '../../shared/dashboard';
import { currentMonthYear, isValidISODate } from '../../shared/dates';
import { ATTENDANCE_LIFE_STAGES, isPresentStatus } from '../../shared/enums';
import type { MeetingListItem } from '../../shared/meeting';
import { monthKey } from '../../shared/period';
import type { DB } from '../db';
import {
  activityRecords,
  activityTypes,
  attendance,
  households,
  meetingAttendees,
  meetings,
  memberChanges,
  memberMovements,
  members,
  monthlyReports,
  sessionTypes,
  sessions,
  vitalRecords,
} from '../db/schema';
import { eventLogService } from './eventLogService';
import { historyService } from './historyService';

export interface DashboardDeps {
  db: DB;
  /** Defaults to () => new Date() for production; injected in tests. */
  clock?: () => Date;
}

interface Period {
  month: number;
  year: number;
}

/** Rows every dashboard computation starts from — loaded once per call. */
interface Core {
  period: Period;
  activeMembers: (typeof members.$inferSelect)[];
  activeIds: Set<number>;
  activeCountByHousehold: Map<number, number>;
  allHouseholds: (typeof households.$inferSelect)[];
  sessionRows: (typeof sessions.$inferSelect)[];
  meetingRows: (typeof meetings.$inferSelect)[];
  reportRows: (typeof monthlyReports.$inferSelect)[];
}

function loadCore(deps: DashboardDeps): Core {
  const db = deps.db;
  const activeMembers = db
    .select()
    .from(members)
    .where(eq(members.isActive, true))
    .all();
  const activeCountByHousehold = new Map<number, number>();
  for (const m of activeMembers) {
    activeCountByHousehold.set(
      m.householdId,
      (activeCountByHousehold.get(m.householdId) ?? 0) + 1,
    );
  }
  return {
    period: currentMonthYear(deps.clock?.()),
    activeMembers,
    activeIds: new Set(activeMembers.map((m) => m.id)),
    activeCountByHousehold,
    allHouseholds: db.select().from(households).all(),
    sessionRows: db.select().from(sessions).all(),
    meetingRows: db.select().from(meetings).all(),
    reportRows: db.select().from(monthlyReports).all(),
  };
}

/** `YYYY-MM` key + parts for a stored date; null unless it's a real date. */
function periodOf(date: string): { key: string; month: number; year: number } | null {
  if (!isValidISODate(date)) return null;
  return {
    key: date.slice(0, 7),
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
  };
}

function shiftMonths(p: Period, delta: number): Period {
  const d = new Date(p.year, p.month - 1 + delta, 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

function newestFirst<T extends { id: number }>(
  rows: T[],
  dateOf: (row: T) => string,
): T[] {
  return [...rows].sort(
    (a, b) => dateOf(b).localeCompare(dateOf(a)) || b.id - a.id,
  );
}

/**
 * Perlu Tindakan — things the app can detect as incomplete (CONTEXT §3).
 * Order: data-integrity issues first, then unlocked months (newest first),
 * then the current month's activity checklist.
 */
function computeActionItems(db: DB, core: Core): ActionItem[] {
  const { period, activeIds, activeCountByHousehold, reportRows } = core;
  const items: ActionItem[] = [];

  // 1. Headless households. A KK with no active members at all is dormant,
  //    not actionable (setHead needs an active member), so it's skipped.
  for (const h of [...core.allHouseholds].sort((a, b) =>
    a.householdNo.localeCompare(b.householdNo),
  )) {
    if ((activeCountByHousehold.get(h.id) ?? 0) === 0) continue;
    const headActive = h.headMemberId !== null && activeIds.has(h.headMemberId);
    if (!headActive) {
      items.push({
        kind: 'headless-household',
        householdId: h.id,
        householdNo: h.householdNo,
      });
    }
  }

  // 2. Past months (within the lookback window) that had a pengajian or a
  //    musyawarah but no locked Laporan. A bare monthly_reports row from
  //    merely browsing Laporan Bulanan doesn't count as activity.
  const currentKey = monthKey(period.month, period.year);
  const cutoff = shiftMonths(period, -UNFINALIZED_LOOKBACK_MONTHS);
  const cutoffKey = monthKey(cutoff.month, cutoff.year);
  const finalizedKeys = new Set(
    reportRows
      .filter((r) => r.finalizedAt !== null)
      .map((r) => monthKey(r.month, r.year)),
  );
  const monthsWithActivity = new Map<string, Period>();
  for (const d of [
    ...core.sessionRows.map((s) => s.sessionDate),
    ...core.meetingRows.map((m) => m.meetingDate),
  ]) {
    const p = periodOf(d);
    if (p) monthsWithActivity.set(p.key, { month: p.month, year: p.year });
  }
  for (const [key, p] of [...monthsWithActivity.entries()].sort(([a], [b]) =>
    b.localeCompare(a),
  )) {
    if (key >= currentKey || key < cutoffKey || finalizedKeys.has(key)) continue;
    items.push({ kind: 'unfinalized-report', month: p.month, year: p.year });
  }

  // 3. Current month's activity checklist — only while the month is open.
  const currentReport = reportRows.find(
    (r) => r.month === period.month && r.year === period.year,
  );
  if (!currentReport || currentReport.finalizedAt === null) {
    const doneTypeIds = new Set(
      currentReport
        ? db
            .select()
            .from(activityRecords)
            .where(eq(activityRecords.reportId, currentReport.id))
            .all()
            .filter((r) => r.status === 'Terlaksana')
            .map((r) => r.activityTypeId)
        : [],
    );
    const pending = db
      .select()
      .from(activityTypes)
      .all()
      .filter((t) => t.isActive && !doneTypeIds.has(t.id))
      .map((t) => t.name)
      .sort((a, b) => a.localeCompare(b, 'id'));
    if (pending.length > 0) {
      items.push({
        kind: 'pending-activities',
        month: period.month,
        year: period.year,
        activityNames: pending,
      });
    }
  }

  return items;
}

export const dashboardService = {
  /** Cheap path for the NavBar badge — skips the recent panels entirely. */
  actionItems(deps: DashboardDeps): ActionItem[] {
    return computeActionItems(deps.db, loadCore(deps));
  },

  /**
   * Read-only. Everything Beranda shows, computed live from current state —
   * nothing here is stored (CONTEXT §2: summaries are derived, never copied).
   */
  get(deps: DashboardDeps): DashboardData {
    const db = deps.db;
    const core = loadCore(deps);
    const { period, activeMembers, activeCountByHousehold } = core;

    const totals = {
      activeMembers: activeMembers.length,
      households: core.allHouseholds.filter(
        (h) => (activeCountByHousehold.get(h.id) ?? 0) > 0,
      ).length,
      serkilerMembers: activeMembers.filter((m) => m.isSerkiler).length,
    };

    // Orientation line: newest recorded date anywhere.
    const allDates = [
      ...core.sessionRows.map((s) => s.sessionDate),
      ...core.meetingRows.map((m) => m.meetingDate),
      ...db.select({ d: vitalRecords.eventDate }).from(vitalRecords).all().map((r) => r.d),
      ...db.select({ d: memberMovements.movementDate }).from(memberMovements).all().map((r) => r.d),
      ...db.select({ d: memberChanges.changeDate }).from(memberChanges).all().map((r) => r.d),
    ];
    const lastInputDate =
      allDates.length === 0 ? null : allDates.reduce((a, b) => (b > a ? b : a));

    // Recent sessions. Same denominator as Rekap Absensi: the attendance-
    // eligible roster for the SESSION'S period (live this month, month-end
    // reconstruction for older sessions), rows for others dropped.
    const now = deps.clock?.() ?? new Date();
    const eligibleByPeriod = new Map<string, Set<number>>();
    const eligibleFor = (sessionDate: string): Set<number> => {
      const p = periodOf(sessionDate);
      if (!p) return new Set();
      let ids = eligibleByPeriod.get(p.key);
      if (!ids) {
        ids = new Set(
          historyService
            .rosterForPeriod(db, p.month, p.year, now)
            .members.filter((m) =>
              (ATTENDANCE_LIFE_STAGES as readonly string[]).includes(m.lifeStage),
            )
            .map((m) => m.id),
        );
        eligibleByPeriod.set(p.key, ids);
      }
      return ids;
    };
    const typeNameById = new Map(
      db.select().from(sessionTypes).all().map((t) => [t.id, t.name]),
    );
    const recentSessionRows = newestFirst(core.sessionRows, (s) => s.sessionDate).slice(
      0,
      RECENT_LIMIT,
    );
    const attendanceRows =
      recentSessionRows.length === 0
        ? []
        : db
            .select({
              sessionId: attendance.sessionId,
              memberId: attendance.memberId,
              status: attendance.status,
            })
            .from(attendance)
            .where(
              inArray(
                attendance.sessionId,
                recentSessionRows.map((s) => s.id),
              ),
            )
            .all();
    const recentSessions: RecentSession[] = recentSessionRows.map((s) => {
      const eligibleIds = eligibleFor(s.sessionDate);
      const rows = attendanceRows.filter(
        (a) => a.sessionId === s.id && eligibleIds.has(a.memberId),
      );
      const present = rows.filter((a) => isPresentStatus(a.status)).length;
      return {
        sessionId: s.id,
        sessionDate: s.sessionDate,
        sessionTypeName: typeNameById.get(s.sessionTypeId) ?? `id ${s.sessionTypeId}`,
        hadir: rows.filter((a) => a.status === 'H').length,
        marked: rows.length,
        rosterSize: eligibleIds.size,
        pct:
          eligibleIds.size === 0
            ? 0
            : Math.round((present / eligibleIds.size) * 100),
      };
    });

    // Recent meetings.
    const recentMeetingRows = newestFirst(core.meetingRows, (m) => m.meetingDate).slice(
      0,
      RECENT_LIMIT,
    );
    const attendeeRows =
      recentMeetingRows.length === 0
        ? []
        : db
            .select({ meetingId: meetingAttendees.meetingId })
            .from(meetingAttendees)
            .where(
              inArray(
                meetingAttendees.meetingId,
                recentMeetingRows.map((m) => m.id),
              ),
            )
            .all();
    const recentMeetings: MeetingListItem[] = recentMeetingRows.map((m) => ({
      id: m.id,
      meetingDate: m.meetingDate,
      type: m.type,
      title: m.title,
      attendeeCount: attendeeRows.filter((a) => a.meetingId === m.id).length,
    }));

    // Events this month, newest first. A stable sort keeps listByPeriod's
    // same-date tiebreak (vital → movement → change) intact.
    const eventsThisMonth = [
      ...eventLogService.listByPeriod({ db }, { month: period.month, year: period.year }),
    ].sort((a, b) => b.date.localeCompare(a.date));

    return {
      period,
      totals,
      lastInputDate,
      actionItems: computeActionItems(db, core),
      recentSessions,
      recentMeetings,
      eventsThisMonth,
    };
  },
};
