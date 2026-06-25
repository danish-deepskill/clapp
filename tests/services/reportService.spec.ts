import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { type DB, openDatabase, runMigrations } from '@main/db';
import {
  activityTypes,
  attendance,
  members as membersTable,
  sessions,
  sessionTypes,
} from '@main/db/schema';
import { eventLogService } from '@main/services/eventLogService';
import { meetingService } from '@main/services/meetingService';
import { memberService } from '@main/services/memberService';
import {
  InvalidReportPeriodError,
  ReportLockedError,
  ReportNotFoundError,
  reportService,
} from '@main/services/reportService';
import type { AttendanceStatus } from '@shared/enums';
import type { NewMemberInput } from '@shared/member';
import type { SaveReportInput } from '@shared/report';

const MIGRATIONS = join(process.cwd(), 'src', 'main', 'db', 'migrations');

function freshDb(): DB {
  const db = openDatabase({ path: ':memory:', inMemory: true });
  runMigrations({ db, migrationsFolder: MIGRATIONS });
  return db;
}

const fixedClock = () => new Date('2026-05-25T10:00:00.000Z');

const BASE: Omit<NewMemberInput, 'fullName' | 'gender' | 'lifeStage' | 'maritalStatus'> = {
  bloodType: 'A',
  rhesus: 'Positif',
  household: { mode: 'create-new', address: null },
  logAs: 'none',
};

function addMember(
  db: DB,
  fullName: string,
  gender: 'Laki-Laki' | 'Perempuan',
  lifeStage: NewMemberInput['lifeStage'],
  maritalStatus: NewMemberInput['maritalStatus'] = 'Belum Menikah',
): number {
  return memberService.addMember(
    { db },
    { ...BASE, fullName, gender, lifeStage, maritalStatus },
  ).id;
}

function emptySave(month: number, year: number): SaveReportInput {
  return {
    month,
    year,
    rencanaBece: null,
    berasJimpitan: null,
    fotocopyDalil: null,
    otherNotes: null,
    visitPlans: [],
    constructionProjects: [],
    sick: [],
    familyVisits: [],
    activities: [],
  };
}

// ─── getReport: get-or-create + period guard ───────────────────────────────

describe('reportService.getReport', () => {
  it('rejects invalid period', () => {
    const db = freshDb();
    expect(() => reportService.getReport({ db }, { month: 13, year: 2026 })).toThrow(
      InvalidReportPeriodError,
    );
  });

  it('returns a fresh draft (finalizedAt null) for a new period', () => {
    const db = freshDb();
    const r = reportService.getReport({ db }, { month: 5, year: 2026 });
    expect(r.finalizedAt).toBe(null);
    expect(r.sick).toEqual([]);
    expect(r.activities).toEqual([]);
  });
});

// ─── Demografi (computed live) ─────────────────────────────────────────────

describe('reportService demografi', () => {
  it('counts active members by life_stage × gender + janda/duda + totals', () => {
    const db = freshDb();
    addMember(db, 'Pak A', 'Laki-Laki', 'Dewasa', 'Menikah');
    addMember(db, 'Bu B', 'Perempuan', 'Dewasa', 'Menikah');
    addMember(db, 'Bu C', 'Perempuan', 'Lansia', 'Janda');
    addMember(db, 'Pak D', 'Laki-Laki', 'Lansia', 'Duda');
    addMember(db, 'Anak E', 'Laki-Laki', 'Balita');

    const { demografi } = reportService.getReport({ db }, { month: 5, year: 2026 });
    expect(demografi.total).toBe(5);
    expect(demografi.totalMale).toBe(3);
    expect(demografi.totalFemale).toBe(2);
    expect(demografi.janda).toBe(1);
    expect(demografi.duda).toBe(1);
    const dewasa = demografi.byStage.find((s) => s.stage === 'Dewasa');
    expect(dewasa).toMatchObject({ male: 1, female: 1, total: 2 });
    const balita = demografi.byStage.find((s) => s.stage === 'Balita');
    expect(balita).toMatchObject({ male: 1, female: 0, total: 1 });
  });

  it('excludes inactive members', () => {
    const db = freshDb();
    const a = addMember(db, 'Pak A', 'Laki-Laki', 'Dewasa');
    addMember(db, 'Bu B', 'Perempuan', 'Dewasa');
    // Deactivate directly (movement rules tested elsewhere).
    db.update(membersTable)
      .set({ isActive: false })
      .where(eq(membersTable.id, a))
      .run();
    const { demografi } = reportService.getReport({ db }, { month: 5, year: 2026 });
    expect(demografi.total).toBe(1);
  });
});

// ─── Lima Bab (computed from attendance) ───────────────────────────────────

describe('reportService limaBab', () => {
  let db: DB;
  let typeId: number;
  beforeEach(() => {
    db = freshDb();
    typeId = db
      .insert(sessionTypes)
      .values({ name: 'Hasda' })
      .returning({ id: sessionTypes.id })
      .get().id;
  });

  function makeSessions(dates: string[]): number[] {
    return dates.map(
      (d) =>
        db
          .insert(sessions)
          .values({ sessionDate: d, sessionTypeId: typeId })
          .returning({ id: sessions.id })
          .get().id,
    );
  }

  function mark(memberId: number, sessionId: number, status: AttendanceStatus) {
    db.insert(attendance)
      .values({ memberId, sessionId, status })
      .run();
  }

  it('returns zero buckets when no sessions in the period', () => {
    addMember(db, 'Pak A', 'Laki-Laki', 'Dewasa');
    const { limaBab } = reportService.getReport({ db }, { month: 5, year: 2026 });
    expect(limaBab).toMatchObject({
      lancar: 0,
      kurangLancar: 0,
      kurangSambung: 0,
      tabayyun: 0,
      sessionCount: 0,
    });
  });

  it('buckets members by % Hadir = (H+S+I)/sessions', () => {
    const a = addMember(db, 'A Lancar', 'Laki-Laki', 'Dewasa');
    const b = addMember(db, 'B KurangLancar', 'Laki-Laki', 'Dewasa');
    const c = addMember(db, 'C Tabayyun', 'Laki-Laki', 'Dewasa');
    const [s1, s2, s3, s4, s5] = makeSessions([
      '2026-05-02',
      '2026-05-09',
      '2026-05-16',
      '2026-05-23',
      '2026-05-30',
    ]);
    // A: 5/5 = 100% → lancar (H/S/I all count)
    [s1, s2, s3, s4].forEach((s) => mark(a, s!, 'H'));
    mark(a, s5!, 'S');
    // B: 2/5 = 40% → kurangLancar
    mark(b, s1!, 'H');
    mark(b, s2!, 'I');
    mark(b, s3!, 'A'); // alpa doesn't count as present
    // C: 0% → tabayyun (no present rows)
    mark(c, s1!, 'A');

    const { limaBab } = reportService.getReport({ db }, { month: 5, year: 2026 });
    expect(limaBab).toMatchObject({
      lancar: 1,
      kurangLancar: 1,
      kurangSambung: 0,
      tabayyun: 1,
      sessionCount: 5,
    });
  });

  it('only counts attendance-eligible life stages', () => {
    addMember(db, 'Child', 'Laki-Laki', 'Balita');
    const [s1] = makeSessions(['2026-05-02']);
    void s1;
    const { limaBab } = reportService.getReport({ db }, { month: 5, year: 2026 });
    // Child not eligible → not bucketed at all.
    expect(
      limaBab.lancar + limaBab.kurangLancar + limaBab.kurangSambung + limaBab.tabayyun,
    ).toBe(0);
  });
});

// ─── Peristiwa + Saran (composed from other modules) ───────────────────────

describe('reportService peristiwa + saran', () => {
  it('splits event-log into vital + movement for the period', () => {
    const db = freshDb();
    const a = addMember(db, 'Pak A', 'Laki-Laki', 'Dewasa');
    eventLogService.recordVital(db, {
      eventType: 'Lahir',
      eventDate: '2026-05-10',
      memberId: a,
    });
    eventLogService.recordMovement(db, {
      movementType: 'Sambung Baru',
      movementDate: '2026-05-12',
      memberId: a,
    });
    const { peristiwa } = reportService.getReport({ db }, { month: 5, year: 2026 });
    expect(peristiwa.vital).toHaveLength(1);
    expect(peristiwa.movement).toHaveLength(1);
  });

  it('pulls meeting suggestions into saran (only non-empty, in-period)', () => {
    const db = freshDb();
    meetingService.save(
      { db, clock: () => new Date('2026-05-20T00:00:00Z') },
      {
        meetingDate: '2026-05-15',
        type: 'Musyawarah Kelompok',
        title: 'Rapat Mei',
        resultNotes: 'hasil',
        suggestions: 'Tingkatkan kehadiran',
        attendeeMemberIds: [],
      },
    );
    meetingService.save(
      { db, clock: () => new Date('2026-05-20T00:00:00Z') },
      {
        meetingDate: '2026-05-18',
        type: 'Lainnya',
        title: 'Rapat tanpa saran',
        resultNotes: 'hasil',
        suggestions: null,
        attendeeMemberIds: [],
      },
    );
    const { saran } = reportService.getReport({ db }, { month: 5, year: 2026 });
    expect(saran).toHaveLength(1);
    expect(saran[0]).toMatchObject({
      meetingTitle: 'Rapat Mei',
      suggestions: 'Tingkatkan kehadiran',
    });
  });
});

// ─── saveReport ────────────────────────────────────────────────────────────

describe('reportService.saveReport', () => {
  let db: DB;
  let memberId: number;
  beforeEach(() => {
    db = freshDb();
    memberId = addMember(db, 'Pak A', 'Laki-Laki', 'Dewasa');
  });

  it('persists free fields + JSON arrays round-trip', () => {
    reportService.saveReport(
      { db },
      {
        ...emptySave(5, 2026),
        rencanaBece: 'Rp 500.000',
        berasJimpitan: '20 kg',
        fotocopyDalil: '50 lembar',
        otherNotes: 'Catatan bebas',
        visitPlans: [{ waktu: 'Minggu', tempat: 'Masjid', agenda: 'Yasinan' }],
        constructionProjects: [
          { jenis: 'Renovasi', tujuan: 'Atap', volume: '1', dana: 'Rp 2jt' },
        ],
      },
    );
    const r = reportService.getReport({ db }, { month: 5, year: 2026 });
    expect(r.rencanaBece).toBe('Rp 500.000');
    expect(r.visitPlans).toHaveLength(1);
    expect(r.visitPlans[0]?.agenda).toBe('Yasinan');
    expect(r.constructionProjects[0]?.jenis).toBe('Renovasi');
  });

  it('replaces sick + family rows on each save (no duplication)', () => {
    reportService.saveReport(
      { db },
      { ...emptySave(5, 2026), sick: [{ memberId, notes: 'Demam' }] },
    );
    reportService.saveReport(
      { db },
      { ...emptySave(5, 2026), sick: [{ memberId, notes: 'Sudah sembuh' }] },
    );
    const r = reportService.getReport({ db }, { month: 5, year: 2026 });
    expect(r.sick).toHaveLength(1);
    expect(r.sick[0]?.notes).toBe('Sudah sembuh');
    expect(r.sick[0]?.memberName).toBe('Pak A');
  });

  it('upserts activity rows by activityType (preserves trigger linkage)', () => {
    const at = db
      .insert(activityTypes)
      .values({ name: 'Kegiatan X', sourceKind: 'manual' })
      .returning({ id: activityTypes.id })
      .get();
    reportService.saveReport(
      { db },
      {
        ...emptySave(5, 2026),
        activities: [
          {
            activityTypeId: at.id,
            status: 'Terlaksana',
            executedDate: '2026-05-10',
            attendeeCount: 30,
            location: 'Masjid',
          },
        ],
      },
    );
    reportService.saveReport(
      { db },
      {
        ...emptySave(5, 2026),
        activities: [
          {
            activityTypeId: at.id,
            status: 'Belum',
            executedDate: null,
            attendeeCount: null,
            location: null,
          },
        ],
      },
    );
    const r = reportService.getReport({ db }, { month: 5, year: 2026 });
    expect(r.activities).toHaveLength(1);
    expect(r.activities[0]).toMatchObject({ status: 'Belum', executedDate: null });
  });

  it('throws ReportLockedError when saving a finalized report', () => {
    reportService.finalize({ db, clock: fixedClock }, { month: 5, year: 2026 });
    expect(() =>
      reportService.saveReport({ db }, emptySave(5, 2026)),
    ).toThrow(ReportLockedError);
  });
});

// ─── finalize / unlock (§8 #10) ────────────────────────────────────────────

describe('reportService.finalize / unlock', () => {
  let db: DB;
  beforeEach(() => {
    db = freshDb();
    addMember(db, 'Pak A', 'Laki-Laki', 'Dewasa', 'Menikah');
    addMember(db, 'Bu B', 'Perempuan', 'Dewasa', 'Menikah');
  });

  it('sets finalizedAt and snapshots demografi', () => {
    const r = reportService.finalize({ db, clock: fixedClock }, { month: 5, year: 2026 });
    expect(r.finalizedAt).not.toBe(null);
    expect(r.demografi.total).toBe(2);
  });

  it('freezes demografi — later member changes do not affect a finalized report', () => {
    reportService.finalize({ db, clock: fixedClock }, { month: 5, year: 2026 });
    // Add a member AFTER finalize.
    addMember(db, 'Pak C', 'Laki-Laki', 'Dewasa');
    const r = reportService.getReport({ db }, { month: 5, year: 2026 });
    // Snapshot still shows 2, not 3.
    expect(r.demografi.total).toBe(2);
  });

  it('caches lima bab bucket counts at finalize', () => {
    const typeId = db
      .insert(sessionTypes)
      .values({ name: 'Hasda' })
      .returning({ id: sessionTypes.id })
      .get().id;
    const s = db
      .insert(sessions)
      .values({ sessionDate: '2026-05-10', sessionTypeId: typeId })
      .returning({ id: sessions.id })
      .get().id;
    const pakA = db.select().from(membersTable).all()[0]!;
    db.insert(attendance).values({ memberId: pakA.id, sessionId: s, status: 'H' }).run();

    const r = reportService.finalize({ db, clock: fixedClock }, { month: 5, year: 2026 });
    expect(r.limaBab.lancar).toBe(1); // Pak A 100%
  });

  it('rejects finalizing an already-finalized report', () => {
    reportService.finalize({ db, clock: fixedClock }, { month: 5, year: 2026 });
    expect(() =>
      reportService.finalize({ db, clock: fixedClock }, { month: 5, year: 2026 }),
    ).toThrow(ReportLockedError);
  });

  it('unlock clears finalizedAt + snapshot; report recomputes live again', () => {
    reportService.finalize({ db, clock: fixedClock }, { month: 5, year: 2026 });
    addMember(db, 'Pak C', 'Laki-Laki', 'Dewasa');
    reportService.unlock({ db }, { month: 5, year: 2026 });
    const r = reportService.getReport({ db }, { month: 5, year: 2026 });
    expect(r.finalizedAt).toBe(null);
    // Live again → now counts the post-finalize member.
    expect(r.demografi.total).toBe(3);
  });

  it('unlock on a non-existent report throws ReportNotFoundError', () => {
    expect(() => reportService.unlock({ db }, { month: 9, year: 2026 })).toThrow(
      ReportNotFoundError,
    );
  });

  it('save after unlock works again', () => {
    reportService.finalize({ db, clock: fixedClock }, { month: 5, year: 2026 });
    reportService.unlock({ db }, { month: 5, year: 2026 });
    expect(() =>
      reportService.saveReport(
        { db },
        { ...emptySave(5, 2026), otherNotes: 'edited after unlock' },
      ),
    ).not.toThrow();
  });
});
