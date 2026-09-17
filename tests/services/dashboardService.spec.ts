import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { type DB, openDatabase, runMigrations } from '@main/db';
import { activityTypes, members as membersTable, sessions } from '@main/db/schema';
import { attendanceService } from '@main/services/attendanceService';
import { dashboardService } from '@main/services/dashboardService';
import { eventLogService } from '@main/services/eventLogService';
import {
  activityTypeService,
  roleService,
  sessionTypeService,
} from '@main/services/masterDataService';
import { meetingService } from '@main/services/meetingService';
import { memberService } from '@main/services/memberService';
import { reportService } from '@main/services/reportService';
import type { AttendanceStatus } from '@shared/enums';
import type { NewMemberInput } from '@shared/member';

const MIGRATIONS = join(process.cwd(), 'src', 'main', 'db', 'migrations');

function freshDb(): DB {
  const db = openDatabase({ path: ':memory:', inMemory: true });
  runMigrations({ db, migrationsFolder: MIGRATIONS });
  return db;
}

// "Now" = 25 May 2026 → current period is Mei 2026 in every timezone.
const clock = () => new Date('2026-05-25T10:00:00.000Z');

const BASE: Omit<NewMemberInput, 'fullName'> = {
  gender: 'Laki-Laki',
  lifeStage: 'Dewasa',
  maritalStatus: 'Menikah',
  bloodType: 'A',
  rhesus: 'Positif',
  household: { mode: 'create-new', address: null },
  logAs: 'none',
};

/** New member heading a brand-new KK. */
function addHead(db: DB, fullName: string, roleId: number | null = null) {
  return memberService.addMember({ db }, { ...BASE, fullName, roleId });
}

/** New member joining an existing KK. */
function addToHousehold(db: DB, fullName: string, householdId: number) {
  return memberService.addMember(
    { db },
    { ...BASE, fullName, household: { mode: 'join-existing', householdId } },
  );
}

/** Bypasses the movement rule on purpose — simulates legacy/seed data. */
function deactivateDirectly(db: DB, memberId: number) {
  db.update(membersTable)
    .set({ isActive: false })
    .where(eq(membersTable.id, memberId))
    .run();
}

function saveSession(
  db: DB,
  sessionTypeId: number,
  sessionDate: string,
  rows: { memberId: number; status: AttendanceStatus }[],
) {
  return attendanceService.saveBatch(
    { db, clock },
    {
      sessionTypeId,
      sessionDate,
      rows: rows.map((r) => ({ ...r, arrivalAt: null, donationAmount: null })),
    },
  );
}

function saveMeeting(
  db: DB,
  meetingDate: string,
  title = 'Rapat',
  attendeeMemberIds: number[] = [],
) {
  return meetingService.save(
    { db, clock },
    {
      meetingDate,
      type: 'Musyawarah Kelompok',
      title,
      resultNotes: null,
      suggestions: null,
      attendeeMemberIds,
    },
  );
}

const get = (db: DB) => dashboardService.get({ db, clock });

// ─── Empty state ───────────────────────────────────────────────────────────

describe('dashboardService.get — empty database', () => {
  it('reports the current period with zero totals and nothing to do', () => {
    const d = get(freshDb());
    expect(d.period).toEqual({ month: 5, year: 2026 });
    expect(d.totals).toEqual({ activeMembers: 0, households: 0, serkilerMembers: 0 });
    expect(d.lastInputDate).toBe(null);
    expect(d.actionItems).toEqual([]);
    expect(d.recentSessions).toEqual([]);
    expect(d.recentMeetings).toEqual([]);
    expect(d.eventsThisMonth).toEqual([]);
  });
});

// ─── Totals ────────────────────────────────────────────────────────────────

describe('dashboardService.get — totals', () => {
  it('counts active members, KKs with ≥1 active member, and Serkiler flags', () => {
    const db = freshDb();
    const a = addHead(db, 'Pak A');
    addToHousehold(db, 'Bu B', a.householdId);
    const c = addHead(db, 'Pak C');
    const e = addHead(db, 'Pak E');
    deactivateDirectly(db, e.id); // KK E is now dormant
    memberService.editMember({ db }, a.id, { isSerkiler: true });
    memberService.editMember({ db }, c.id, { isSerkiler: true });

    expect(get(db).totals).toEqual({
      activeMembers: 3,
      households: 2,
      serkilerMembers: 2,
    });
  });
});

// ─── Perlu Tindakan ────────────────────────────────────────────────────────

describe('dashboardService.get — unfinalized past months', () => {
  it('flags a past month with a pengajian session until its Laporan is locked', () => {
    const db = freshDb();
    const a = addHead(db, 'Pak A');
    const hasda = sessionTypeService.create({ db }, 'Hasda');
    saveSession(db, hasda.id, '2026-04-10', [{ memberId: a.id, status: 'H' }]);

    expect(get(db).actionItems).toContainEqual({
      kind: 'unfinalized-report',
      month: 4,
      year: 2026,
    });

    reportService.finalize({ db, clock }, { month: 4, year: 2026 });
    expect(
      get(db).actionItems.filter((i) => i.kind === 'unfinalized-report'),
    ).toEqual([]);
  });

  it('flags a past month that only had a musyawarah', () => {
    const db = freshDb();
    saveMeeting(db, '2026-03-05');
    expect(get(db).actionItems).toContainEqual({
      kind: 'unfinalized-report',
      month: 3,
      year: 2026,
    });
  });

  it('ignores the current month and a report row that was merely browsed', () => {
    const db = freshDb();
    const a = addHead(db, 'Pak A');
    const hasda = sessionTypeService.create({ db }, 'Hasda');
    saveSession(db, hasda.id, '2026-05-10', [{ memberId: a.id, status: 'H' }]);
    // Opening Laporan Bulanan for Feb creates an empty draft row — not activity.
    reportService.getReport({ db }, { month: 2, year: 2026 });

    expect(
      get(db).actionItems.filter((i) => i.kind === 'unfinalized-report'),
    ).toEqual([]);
  });

  it('lists several months newest first', () => {
    const db = freshDb();
    saveMeeting(db, '2026-01-05');
    saveMeeting(db, '2025-12-05');
    saveMeeting(db, '2026-03-05');
    const months = get(db)
      .actionItems.filter((i) => i.kind === 'unfinalized-report')
      .map((i) => (i.kind === 'unfinalized-report' ? `${i.year}-${i.month}` : ''));
    expect(months).toEqual(['2026-3', '2026-1', '2025-12']);
  });
});

describe('dashboardService.get — pending activities (current month)', () => {
  it('lists active activity types still Belum, sorted, excluding done + retired ones', () => {
    const db = freshDb();
    activityTypeService.create({ db }, 'Penderesan ASAD');
    activityTypeService.create({ db }, 'Beras Jimpitan');
    const retired = activityTypeService.create({ db }, 'Kegiatan Lama');
    activityTypeService.setActive({ db }, retired.id, false);
    // Meeting-sourced type → §8 trigger marks it Terlaksana for Mei.
    db.insert(activityTypes)
      .values({
        name: 'Musyawarah Kelompok',
        sourceKind: 'meeting',
        meetingType: 'Musyawarah Kelompok',
      })
      .run();
    saveMeeting(db, '2026-05-12');

    const pending = get(db).actionItems.find((i) => i.kind === 'pending-activities');
    expect(pending).toEqual({
      kind: 'pending-activities',
      month: 5,
      year: 2026,
      activityNames: ['Beras Jimpitan', 'Penderesan ASAD'],
    });
  });

  it('is absent when every active type is done or when there are no types', () => {
    const db = freshDb();
    expect(get(db).actionItems.some((i) => i.kind === 'pending-activities')).toBe(false);

    db.insert(activityTypes)
      .values({
        name: 'Musyawarah Kelompok',
        sourceKind: 'meeting',
        meetingType: 'Musyawarah Kelompok',
      })
      .run();
    saveMeeting(db, '2026-05-12');
    expect(get(db).actionItems.some((i) => i.kind === 'pending-activities')).toBe(false);
  });

  it('is absent once the current month is locked', () => {
    const db = freshDb();
    activityTypeService.create({ db }, 'Penderesan ASAD');
    expect(get(db).actionItems.some((i) => i.kind === 'pending-activities')).toBe(true);

    reportService.finalize({ db, clock }, { month: 5, year: 2026 });
    expect(get(db).actionItems.some((i) => i.kind === 'pending-activities')).toBe(false);
  });
});

describe('dashboardService.get — headless households', () => {
  it('flags KKs whose head left or is inactive, skips dormant KKs, sorts by no', () => {
    const db = freshDb();
    const a = addHead(db, 'Pak A'); // KK 001
    addToHousehold(db, 'Bu B', a.householdId);
    const c = addHead(db, 'Pak C'); // KK 002
    addToHousehold(db, 'Bu D', c.householdId);
    const e = addHead(db, 'Pak E'); // KK 003
    addHead(db, 'Pak F'); // KK 004 — healthy

    // A moves to a new KK-S → KK 001 keeps Bu B but loses its head.
    memberService.editMember({ db }, a.id, {
      household: { mode: 'create-new', address: null },
    });
    // Legacy data: head flagged inactive without reassignment.
    deactivateDirectly(db, c.id);
    // Dormant: sole member gone → nothing actionable.
    deactivateDirectly(db, e.id);

    const headless = get(db).actionItems.filter(
      (i) => i.kind === 'headless-household',
    );
    expect(headless.map((i) => (i.kind === 'headless-household' ? i.householdNo : ''))).toEqual([
      '001',
      '002',
    ]);
  });

  it('is absent when every KK has an active head', () => {
    const db = freshDb();
    const a = addHead(db, 'Pak A');
    addToHousehold(db, 'Bu B', a.householdId);
    expect(get(db).actionItems.some((i) => i.kind === 'headless-household')).toBe(false);
  });
});

describe('dashboardService.get — action item order', () => {
  it('puts headless KKs first, then unfinalized months, then pending activities', () => {
    const db = freshDb();
    const a = addHead(db, 'Pak A');
    addToHousehold(db, 'Bu B', a.householdId);
    memberService.editMember({ db }, a.id, {
      household: { mode: 'create-new', address: null },
    });
    saveMeeting(db, '2026-04-05');
    activityTypeService.create({ db }, 'Penderesan ASAD');

    expect(get(db).actionItems.map((i) => i.kind)).toEqual([
      'headless-household',
      'unfinalized-report',
      'pending-activities',
    ]);
  });
});

// ─── Recent panels ─────────────────────────────────────────────────────────

describe('dashboardService.get — recent sessions', () => {
  it('returns the newest 5 with hadir / marked / % over the eligible roster', () => {
    const db = freshDb();
    const a = addHead(db, 'Pak A');
    const b = addHead(db, 'Pak B');
    const c = addHead(db, 'Pak C');
    addHead(db, 'Pak D'); // eligible but never marked — still in the denominator
    const hasda = sessionTypeService.create({ db }, 'Hasda');
    for (let d = 1; d <= 6; d++) {
      saveSession(db, hasda.id, `2026-05-0${d}`, [{ memberId: a.id, status: 'H' }]);
    }
    saveSession(db, hasda.id, '2026-05-20', [
      { memberId: a.id, status: 'H' },
      { memberId: b.id, status: 'S' },
      { memberId: c.id, status: 'A' },
    ]);

    const { recentSessions } = get(db);
    expect(recentSessions).toHaveLength(5);
    expect(recentSessions.map((s) => s.sessionDate)).toEqual([
      '2026-05-20',
      '2026-05-06',
      '2026-05-05',
      '2026-05-04',
      '2026-05-03',
    ]);
    expect(recentSessions[0]).toMatchObject({
      sessionTypeName: 'Hasda',
      hadir: 1,
      marked: 3,
      rosterSize: 4,
      pct: 50, // (H + S) / 4 — same denominator as Rekap Absensi
    });
    expect(recentSessions[1]).toMatchObject({ hadir: 1, marked: 1, rosterSize: 4, pct: 25 });
  });
});

describe('dashboardService.get — recent meetings', () => {
  it('returns the newest 5 with derived attendee counts', () => {
    const db = freshDb();
    const imam = roleService.create({ db }, 'Imam');
    const a = addHead(db, 'Pak A', imam.id);
    for (let d = 1; d <= 6; d++) saveMeeting(db, `2026-05-0${d}`, `Rapat ${d}`);
    saveMeeting(db, '2026-05-15', 'Evaluasi', [a.id]);

    const { recentMeetings } = get(db);
    expect(recentMeetings).toHaveLength(5);
    expect(recentMeetings[0]).toMatchObject({
      meetingDate: '2026-05-15',
      title: 'Evaluasi',
      type: 'Musyawarah Kelompok',
      attendeeCount: 1,
    });
    expect(recentMeetings.map((m) => m.title)).toEqual([
      'Evaluasi',
      'Rapat 6',
      'Rapat 5',
      'Rapat 4',
      'Rapat 3',
    ]);
  });
});

describe('dashboardService.get — events this month + lastInputDate', () => {
  it('lists only the current month, newest first', () => {
    const db = freshDb();
    const a = addHead(db, 'Pak A');
    eventLogService.recordMovement(db, {
      movementType: 'Sambung Baru',
      movementDate: '2026-05-10',
      memberId: a.id,
    });
    eventLogService.recordVital(db, {
      eventType: 'Lahir',
      eventDate: '2026-05-20',
      memberId: null,
      name: 'Bayi A',
    });
    eventLogService.recordChange(db, {
      changeType: 'Perubahan Kelas',
      changeDate: '2026-04-30',
      memberId: a.id,
      oldValue: 'Remaja',
      newValue: 'Dewasa',
    });

    const { eventsThisMonth } = get(db);
    expect(eventsThisMonth.map((e) => [e.date, e.kind])).toEqual([
      ['2026-05-20', 'Lahir'],
      ['2026-05-10', 'Sambung Baru'],
    ]);
  });

  it('lastInputDate is the newest date across sessions, meetings and events', () => {
    const db = freshDb();
    const a = addHead(db, 'Pak A');
    const hasda = sessionTypeService.create({ db }, 'Hasda');
    saveSession(db, hasda.id, '2026-05-02', [{ memberId: a.id, status: 'H' }]);
    saveMeeting(db, '2026-05-09');
    expect(get(db).lastInputDate).toBe('2026-05-09');

    eventLogService.recordChange(db, {
      changeType: 'Menikah',
      changeDate: '2026-05-21',
      memberId: a.id,
      oldValue: 'Belum Menikah',
      newValue: 'Menikah',
    });
    expect(get(db).lastInputDate).toBe('2026-05-21');
  });
});

// ─── Follow-ups from review ────────────────────────────────────────────────

describe('dashboardService.get — unfinalized lookback window', () => {
  it('nags only months within UNFINALIZED_LOOKBACK_MONTHS (12)', () => {
    const db = freshDb();
    saveMeeting(db, '2025-05-05'); // 12 months back → still nagged
    saveMeeting(db, '2025-04-05'); // 13 months back → out of window
    const months = get(db)
      .actionItems.filter((i) => i.kind === 'unfinalized-report')
      .map((i) => (i.kind === 'unfinalized-report' ? `${i.year}-${i.month}` : ''));
    expect(months).toEqual(['2025-5']);
  });

  it('skips a malformed stored session date instead of throwing', () => {
    const db = freshDb();
    const hasda = sessionTypeService.create({ db }, 'Hasda');
    // Bypasses saveBatch validation on purpose (legacy / hand-edited data).
    db.insert(sessions)
      .values({ sessionDate: '2026-00-15', sessionTypeId: hasda.id })
      .run();
    expect(() => get(db)).not.toThrow();
    expect(get(db).actionItems.some((i) => i.kind === 'unfinalized-report')).toBe(false);
  });
});

describe('dashboardService.get — same-date event order', () => {
  it('keeps the vital → movement → change tiebreak while listing newest first', () => {
    const db = freshDb();
    const a = addHead(db, 'Pak A');
    eventLogService.recordChange(db, {
      changeType: 'Perubahan Kelas',
      changeDate: '2026-05-10',
      memberId: a.id,
      oldValue: 'Remaja',
      newValue: 'Dewasa',
    });
    eventLogService.recordMovement(db, {
      movementType: 'Sambung Baru',
      movementDate: '2026-05-10',
      memberId: a.id,
    });
    eventLogService.recordVital(db, {
      eventType: 'Lahir',
      eventDate: '2026-05-12',
      memberId: null,
      name: 'Bayi B',
    });
    expect(get(db).eventsThisMonth.map((e) => [e.date, e.kind])).toEqual([
      ['2026-05-12', 'Lahir'],
      ['2026-05-10', 'Sambung Baru'],
      ['2026-05-10', 'Perubahan Kelas'],
    ]);
  });
});

describe('dashboardService.actionItems', () => {
  it('is the same list get() returns, without the recent panels', () => {
    const db = freshDb();
    const a = addHead(db, 'Pak A');
    addToHousehold(db, 'Bu B', a.householdId);
    memberService.editMember({ db }, a.id, {
      household: { mode: 'create-new', address: null },
    });
    saveMeeting(db, '2026-04-05');
    activityTypeService.create({ db }, 'Penderesan ASAD');

    const items = dashboardService.actionItems({ db, clock });
    expect(items).toHaveLength(3);
    expect(items).toEqual(get(db).actionItems);
  });
});

describe('dashboardService.get — past-month sessions use that month\'s roster', () => {
  it('keeps a since-departed member in an older session\'s denominator', () => {
    const db = freshDb();
    const a = addHead(db, 'Pak A');
    const b = addToHousehold(db, 'Pak B', a.householdId);
    const hasda = sessionTypeService.create({ db }, 'Hasda');
    saveSession(db, hasda.id, '2026-04-10', [{ memberId: a.id, status: 'H' }]);
    saveSession(db, hasda.id, '2026-05-08', [{ memberId: a.id, status: 'H' }]);
    // B leaves on 5 May (after the April session, before the May one).
    memberService.recordMovement(
      { db },
      { memberId: b.id, kind: 'Pindah Sambung', date: '2026-05-05' },
    );

    const [may, april] = get(db).recentSessions;
    expect(may).toMatchObject({ sessionDate: '2026-05-08', rosterSize: 1, pct: 100 });
    expect(april).toMatchObject({ sessionDate: '2026-04-10', rosterSize: 2, pct: 50 });
  });
});
