import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { type DB, openDatabase, runMigrations } from '@main/db';
import {
  activityRecords,
  activityTypes,
  attendance,
  monthlyReports,
  sessionTypes,
  sessions,
} from '@main/db/schema';
import {
  FutureDateError,
  InvalidAttendanceInputError,
  InvalidPeriodError,
  OneSessionPerDateError,
  SessionTypeNotFoundError,
  attendanceService,
} from '@main/services/attendanceService';
import { memberService } from '@main/services/memberService';
import type { SaveBatchInput } from '@shared/attendance';
import type { NewMemberInput } from '@shared/member';

const MIGRATIONS = join(process.cwd(), 'src', 'main', 'db', 'migrations');

function freshDb(): DB {
  const db = openDatabase({ path: ':memory:', inMemory: true });
  runMigrations({ db, migrationsFolder: MIGRATIONS });
  return db;
}

const fixedClock = (iso = '2026-05-23T10:00:00.000Z') => () => new Date(iso);

const FAISAL: NewMemberInput = {
  fullName: 'Ahmad Faisal Rahman',
  nickname: 'Pak Faisal',
  gender: 'Laki-Laki',
  lifeStage: 'Dewasa',
  maritalStatus: 'Menikah',
  bloodType: 'A',
  rhesus: 'Positif',
  birthPlace: 'Jakarta',
  birthDate: '1978-03-12',
  household: { mode: 'create-new', address: 'Jl. Cilandak No. 42' },
  logAs: 'none',
};

const SITI: Omit<NewMemberInput, 'household'> = {
  fullName: 'Siti Aminah Putri',
  nickname: 'Bu Siti',
  gender: 'Perempuan',
  lifeStage: 'Dewasa',
  maritalStatus: 'Menikah',
  bloodType: 'B',
  rhesus: 'Positif',
  logAs: 'none',
};

function seedSessionType(db: DB, name: string): number {
  return db
    .insert(sessionTypes)
    .values({ name })
    .returning({ id: sessionTypes.id })
    .get().id;
}

function seedThreeMembers(db: DB) {
  const faisal = memberService.addMember({ db }, FAISAL);
  const siti = memberService.addMember(
    { db },
    { ...SITI, household: { mode: 'join-existing', householdId: faisal.householdId } },
  );
  const andi = memberService.addMember(
    { db },
    { ...FAISAL, fullName: 'Andi Pratama' },
  );
  return { faisal, siti, andi };
}

// ─── loadRoster (keyed by date alone, per one-pengajian-per-day rule) ─────

describe('attendanceService.loadRoster', () => {
  let db: DB;
  beforeEach(() => {
    db = freshDb();
    seedSessionType(db, 'Hasda');
  });

  it('returns empty roster when no active members exist', () => {
    const r = attendanceService.loadRoster(
      { db, clock: fixedClock() },
      { sessionDate: '2026-05-20' },
    );
    expect(r.session).toBe(null);
    expect(r.roster).toEqual([]);
  });

  it('session=null + every active member with status=null when no session exists', () => {
    const { faisal, siti, andi } = seedThreeMembers(db);
    const r = attendanceService.loadRoster(
      { db, clock: fixedClock() },
      { sessionDate: '2026-05-20' },
    );
    expect(r.session).toBe(null);
    expect(r.roster).toHaveLength(3);
    expect(r.roster.every((row) => row.status === null)).toBe(true);
    expect(r.roster.every((row) => row.arrivalAt === null)).toBe(true);
    expect(r.roster.every((row) => row.donationAmount === null)).toBe(true);
    const ids = r.roster.map((r) => r.memberId).sort();
    expect(ids).toEqual([faisal.id, siti.id, andi.id].sort());
  });

  it('unsaved members remain status=null even when a session exists for the date', () => {
    const typeId = db.select().from(sessionTypes).get()!.id;
    const { faisal, siti } = seedThreeMembers(db);
    // Save attendance only for Faisal — Siti and Andi are intentionally unmarked.
    attendanceService.saveBatch(
      { db, clock: fixedClock() },
      {
        sessionTypeId: typeId,
        sessionDate: '2026-05-20',
        rows: [
          { memberId: faisal.id, status: 'H', arrivalAt: null, donationAmount: 25000 },
        ],
      },
    );
    const r = attendanceService.loadRoster(
      { db, clock: fixedClock() },
      { sessionDate: '2026-05-20' },
    );
    const byId = new Map(r.roster.map((x) => [x.memberId, x]));
    expect(byId.get(faisal.id)?.status).toBe('H');
    expect(byId.get(siti.id)?.status).toBe(null);
  });

  it('returns the (one-per-date) session + saved attendance regardless of type', () => {
    const typeId = db.select().from(sessionTypes).get()!.id;
    const { faisal, siti, andi } = seedThreeMembers(db);
    attendanceService.saveBatch(
      { db, clock: fixedClock() },
      {
        sessionTypeId: typeId,
        sessionDate: '2026-05-20',
        rows: [
          { memberId: faisal.id, status: 'H', arrivalAt: '2026-05-20T19:30:00.000Z', donationAmount: 25000 },
          { memberId: siti.id, status: 'S', arrivalAt: null, donationAmount: null },
          { memberId: andi.id, status: 'A', arrivalAt: null, donationAmount: null },
        ],
      },
    );

    const r = attendanceService.loadRoster(
      { db, clock: fixedClock() },
      { sessionDate: '2026-05-20' },
    );
    expect(r.session).not.toBe(null);
    expect(r.session?.sessionTypeId).toBe(typeId);
    const byId = new Map(r.roster.map((x) => [x.memberId, x]));
    expect(byId.get(faisal.id)).toMatchObject({
      status: 'H',
      donationAmount: 25000,
    });
    expect(byId.get(siti.id)).toMatchObject({
      status: 'S',
      arrivalAt: null,
      donationAmount: null,
    });
    expect(byId.get(andi.id)).toMatchObject({ status: 'A' });
  });

  it('excludes inactive members', () => {
    const { faisal, siti } = seedThreeMembers(db);
    memberService.recordMovement({ db }, {
      memberId: siti.id,
      kind: 'Pindah Sambung',
      date: '2026-05-20',
    });
    const r = attendanceService.loadRoster(
      { db, clock: fixedClock() },
      { sessionDate: '2026-05-20' },
    );
    expect(r.roster.map((r) => r.memberId)).not.toContain(siti.id);
    expect(r.roster.map((r) => r.memberId)).toContain(faisal.id);
  });

  it('sorts roster alphabetically by fullName (id locale)', () => {
    seedThreeMembers(db);
    const r = attendanceService.loadRoster(
      { db, clock: fixedClock() },
      { sessionDate: '2026-05-20' },
    );
    expect(r.roster.map((row) => row.fullName)).toEqual([
      'Ahmad Faisal Rahman',
      'Andi Pratama',
      'Siti Aminah Putri',
    ]);
  });

  it('excludes members with ineligible life_stage (only Muda-mudi + Dewasa attend)', () => {
    const { faisal } = seedThreeMembers(db);
    const child = memberService.addMember({ db }, {
      ...FAISAL,
      fullName: 'Bayi Aisyah',
      lifeStage: 'Balita',
      maritalStatus: 'Belum Menikah',
    });
    const teen = memberService.addMember({ db }, {
      ...FAISAL,
      fullName: 'Remaja Putra',
      lifeStage: 'Remaja',
      maritalStatus: 'Belum Menikah',
    });
    const mudaMudi = memberService.addMember({ db }, {
      ...FAISAL,
      fullName: 'Yusuf Pemuda',
      lifeStage: 'Muda-mudi',
      maritalStatus: 'Belum Menikah',
    });
    const r = attendanceService.loadRoster(
      { db, clock: fixedClock() },
      { sessionDate: '2026-05-20' },
    );
    const ids = r.roster.map((row) => row.memberId);
    expect(ids).toContain(faisal.id);
    expect(ids).toContain(mudaMudi.id);
    expect(ids).not.toContain(child.id);
    expect(ids).not.toContain(teen.id);
  });
});

// ─── saveBatch (one-session-per-date enforcement) ──────────────────────────

describe('attendanceService.saveBatch', () => {
  let db: DB;
  let typeId: number;
  let memberIds: { faisal: number; siti: number; andi: number };
  beforeEach(() => {
    db = freshDb();
    typeId = seedSessionType(db, 'Hasda');
    const { faisal, siti, andi } = seedThreeMembers(db);
    memberIds = { faisal: faisal.id, siti: siti.id, andi: andi.id };
  });

  function makeInput(): SaveBatchInput {
    return {
      sessionTypeId: typeId,
      sessionDate: '2026-05-20',
      rows: [
        {
          memberId: memberIds.faisal,
          status: 'H',
          arrivalAt: '2026-05-20T19:30:00.000Z',
          donationAmount: 25000,
        },
        { memberId: memberIds.siti, status: 'H', arrivalAt: null, donationAmount: 10000 },
        { memberId: memberIds.andi, status: 'A', arrivalAt: null, donationAmount: null },
      ],
    };
  }

  it('writes all rows in one txn, creating the session', () => {
    const result = attendanceService.saveBatch(
      { db, clock: fixedClock() },
      makeInput(),
    );
    expect(result.savedCount).toBe(3);
    expect(db.select().from(sessions).all()).toHaveLength(1);
    expect(db.select().from(attendance).all()).toHaveLength(3);
  });

  it('UPSERTs same-type re-save (one session per (type,date), no duplicates)', () => {
    attendanceService.saveBatch({ db, clock: fixedClock() }, makeInput());
    attendanceService.saveBatch(
      { db, clock: fixedClock() },
      {
        ...makeInput(),
        rows: [
          {
            memberId: memberIds.faisal,
            status: 'S',
            arrivalAt: null,
            donationAmount: 99999,
          },
          { memberId: memberIds.siti, status: 'H', arrivalAt: null, donationAmount: 10000 },
          { memberId: memberIds.andi, status: 'A', arrivalAt: null, donationAmount: null },
        ],
      },
    );
    const all = db.select().from(attendance).all();
    expect(all).toHaveLength(3);
    const faisalRow = all.find((a) => a.memberId === memberIds.faisal);
    expect(faisalRow?.status).toBe('S');
    expect(faisalRow?.donationAmount).toBe(null);
    expect(faisalRow?.arrivalAt).toBe(null);
  });

  it("clears arrival/donation for non-Hadir rows even if caller passes values", () => {
    attendanceService.saveBatch(
      { db, clock: fixedClock() },
      {
        sessionTypeId: typeId,
        sessionDate: '2026-05-20',
        rows: [
          {
            memberId: memberIds.faisal,
            status: 'I',
            arrivalAt: '2026-05-20T19:30:00.000Z',
            donationAmount: 50000,
          },
        ],
      },
    );
    const row = db
      .select()
      .from(attendance)
      .where(eq(attendance.memberId, memberIds.faisal))
      .get();
    expect(row?.status).toBe('I');
    expect(row?.arrivalAt).toBe(null);
    expect(row?.donationAmount).toBe(null);
  });

  it('rejects future sessionDate', () => {
    expect(() =>
      attendanceService.saveBatch(
        { db, clock: fixedClock() },
        { ...makeInput(), sessionDate: '2027-01-01' },
      ),
    ).toThrow(FutureDateError);
    expect(db.select().from(sessions).all()).toHaveLength(0);
    expect(db.select().from(attendance).all()).toHaveLength(0);
  });

  it('rejects empty rows', () => {
    expect(() =>
      attendanceService.saveBatch(
        { db, clock: fixedClock() },
        { ...makeInput(), rows: [] },
      ),
    ).toThrow(InvalidAttendanceInputError);
  });

  it('rejects duplicate memberId in rows', () => {
    expect(() =>
      attendanceService.saveBatch(
        { db, clock: fixedClock() },
        {
          ...makeInput(),
          rows: [
            { memberId: memberIds.faisal, status: 'H', arrivalAt: null, donationAmount: null },
            { memberId: memberIds.faisal, status: 'A', arrivalAt: null, donationAmount: null },
          ],
        },
      ),
    ).toThrow(InvalidAttendanceInputError);
  });

  it('rejects unknown memberId and rolls back', () => {
    expect(() =>
      attendanceService.saveBatch(
        { db, clock: fixedClock() },
        {
          ...makeInput(),
          rows: [
            { memberId: 9999, status: 'H', arrivalAt: null, donationAmount: null },
          ],
        },
      ),
    ).toThrow(InvalidAttendanceInputError);
    expect(db.select().from(sessions).all()).toHaveLength(0);
  });

  it('rejects unknown sessionTypeId and rolls back', () => {
    expect(() =>
      attendanceService.saveBatch(
        { db, clock: fixedClock() },
        { ...makeInput(), sessionTypeId: 9999 },
      ),
    ).toThrow(SessionTypeNotFoundError);
    expect(db.select().from(sessions).all()).toHaveLength(0);
  });

  // ─── one-session-per-date enforcement ──────────────────────────────────

  it('refuses saving a different type on a date that already has a session', () => {
    const otherTypeId = seedSessionType(db, 'Qur\'an');
    attendanceService.saveBatch({ db, clock: fixedClock() }, makeInput());
    expect(() =>
      attendanceService.saveBatch(
        { db, clock: fixedClock() },
        { ...makeInput(), sessionTypeId: otherTypeId },
      ),
    ).toThrow(OneSessionPerDateError);
    // Original session + attendance untouched.
    expect(db.select().from(sessions).all()).toHaveLength(1);
    expect(db.select().from(attendance).all()).toHaveLength(3);
  });

  it('error names the existing type and date for the operator', () => {
    const otherTypeId = seedSessionType(db, 'Qur\'an');
    attendanceService.saveBatch({ db, clock: fixedClock() }, makeInput());
    try {
      attendanceService.saveBatch(
        { db, clock: fixedClock() },
        { ...makeInput(), sessionTypeId: otherTypeId },
      );
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(OneSessionPerDateError);
      const err = e as OneSessionPerDateError;
      expect(err.existingTypeName).toBe('Hasda');
      expect(err.sessionDate).toBe('2026-05-20');
    }
  });

  it('different DATE creates a separate session (no one-per-date conflict)', () => {
    attendanceService.saveBatch({ db, clock: fixedClock() }, makeInput());
    attendanceService.saveBatch(
      { db, clock: fixedClock() },
      { ...makeInput(), sessionDate: '2026-05-21' },
    );
    expect(db.select().from(sessions).all()).toHaveLength(2);
  });

  // ─── Materi (session notes) round-trip ─────────────────────────────────

  it('persists notes on new session and returns them via loadRoster', () => {
    attendanceService.saveBatch(
      { db, clock: fixedClock() },
      { ...makeInput(), notes: 'Al-Baqarah ayat 1-15' },
    );
    const loaded = attendanceService.loadRoster(
      { db, clock: fixedClock() },
      { sessionDate: '2026-05-20' },
    );
    expect(loaded.session?.notes).toBe('Al-Baqarah ayat 1-15');
  });

  it('updates notes on existing session without losing attendance rows', () => {
    attendanceService.saveBatch(
      { db, clock: fixedClock() },
      { ...makeInput(), notes: 'awal' },
    );
    const before = db.select().from(attendance).all().length;
    attendanceService.saveBatch(
      { db, clock: fixedClock() },
      { ...makeInput(), notes: 'diubah' },
    );
    expect(db.select().from(attendance).all()).toHaveLength(before);
    const loaded = attendanceService.loadRoster(
      { db, clock: fixedClock() },
      { sessionDate: '2026-05-20' },
    );
    expect(loaded.session?.notes).toBe('diubah');
  });

  it('clears notes when passed null', () => {
    attendanceService.saveBatch(
      { db, clock: fixedClock() },
      { ...makeInput(), notes: 'akan dihapus' },
    );
    attendanceService.saveBatch(
      { db, clock: fixedClock() },
      { ...makeInput(), notes: null },
    );
    const loaded = attendanceService.loadRoster(
      { db, clock: fixedClock() },
      { sessionDate: '2026-05-20' },
    );
    expect(loaded.session?.notes).toBe(null);
  });

  it('leaves existing notes untouched when caller omits notes (undefined)', () => {
    attendanceService.saveBatch(
      { db, clock: fixedClock() },
      { ...makeInput(), notes: 'jangan disentuh' },
    );
    // Re-save without notes field — should NOT clear them.
    attendanceService.saveBatch({ db, clock: fixedClock() }, makeInput());
    const loaded = attendanceService.loadRoster(
      { db, clock: fixedClock() },
      { sessionDate: '2026-05-20' },
    );
    expect(loaded.session?.notes).toBe('jangan disentuh');
  });

  // ─── null-status = DELETE semantics (unmark) ───────────────────────────

  it('null status DELETEs existing attendance row (unmark)', () => {
    // Save Faisal as Hadir first.
    attendanceService.saveBatch({ db, clock: fixedClock() }, makeInput());
    expect(db.select().from(attendance).all()).toHaveLength(3);
    // Now unmark Faisal — same session, status=null.
    const result = attendanceService.saveBatch(
      { db, clock: fixedClock() },
      {
        sessionTypeId: typeId,
        sessionDate: '2026-05-20',
        rows: [
          { memberId: memberIds.faisal, status: null, arrivalAt: null, donationAmount: null },
          { memberId: memberIds.siti, status: 'H', arrivalAt: null, donationAmount: 10000 },
          { memberId: memberIds.andi, status: 'A', arrivalAt: null, donationAmount: null },
        ],
      },
    );
    expect(result.savedCount).toBe(2); // only Siti + Andi got UPSERTed
    const remaining = db.select().from(attendance).all();
    expect(remaining).toHaveLength(2);
    expect(remaining.find((a) => a.memberId === memberIds.faisal)).toBeUndefined();
  });

  it('null status for a member with no existing attendance is a no-op DELETE', () => {
    const result = attendanceService.saveBatch(
      { db, clock: fixedClock() },
      {
        sessionTypeId: typeId,
        sessionDate: '2026-05-20',
        rows: [
          { memberId: memberIds.faisal, status: null, arrivalAt: null, donationAmount: null },
          { memberId: memberIds.siti, status: 'H', arrivalAt: null, donationAmount: 10000 },
        ],
      },
    );
    expect(result.savedCount).toBe(1);
    expect(db.select().from(attendance).all()).toHaveLength(1);
  });

  it('rejects saveBatch row referencing a child/teen member', () => {
    const child = memberService.addMember({ db }, {
      ...FAISAL,
      fullName: 'Bayi Aisyah',
      lifeStage: 'Balita',
      maritalStatus: 'Belum Menikah',
    });
    expect(() =>
      attendanceService.saveBatch(
        { db, clock: fixedClock() },
        {
          sessionTypeId: typeId,
          sessionDate: '2026-05-20',
          rows: [
            { memberId: child.id, status: 'H', arrivalAt: null, donationAmount: null },
          ],
        },
      ),
    ).toThrow(/tidak ikut pengajian/);
    // Rolled back atomically.
    expect(db.select().from(sessions).all()).toHaveLength(0);
    expect(db.select().from(attendance).all()).toHaveLength(0);
  });
});

// ─── relabelSessionType (operator miscategorized a saved session) ─────────

describe('attendanceService.relabelSessionType', () => {
  let db: DB;
  let hasdaId: number;
  let quranId: number;
  let memberIds: { faisal: number; siti: number };
  beforeEach(() => {
    db = freshDb();
    hasdaId = seedSessionType(db, 'Hasda');
    quranId = seedSessionType(db, 'Qur\'an');
    const f = memberService.addMember({ db }, FAISAL);
    const s = memberService.addMember(
      { db },
      { ...SITI, household: { mode: 'join-existing', householdId: f.householdId } },
    );
    memberIds = { faisal: f.id, siti: s.id };
  });

  function saveOne(typeId = hasdaId, date = '2026-05-20'): number {
    return attendanceService.saveBatch(
      { db, clock: fixedClock() },
      {
        sessionTypeId: typeId,
        sessionDate: date,
        rows: [
          { memberId: memberIds.faisal, status: 'H', arrivalAt: null, donationAmount: 25000 },
          { memberId: memberIds.siti, status: 'S', arrivalAt: null, donationAmount: null },
        ],
      },
    ).session.id;
  }

  it('changes type in-place, preserving session id + attendance rows', () => {
    const sessionId = saveOne(hasdaId);
    const attendanceBefore = db.select().from(attendance).all();
    const result = attendanceService.relabelSessionType(
      { db, clock: fixedClock() },
      { sessionId, newSessionTypeId: quranId },
    );
    expect(result.id).toBe(sessionId);
    expect(result.sessionTypeId).toBe(quranId);
    const attendanceAfter = db.select().from(attendance).all();
    expect(attendanceAfter).toHaveLength(attendanceBefore.length);
    // attendance rows still reference the SAME session id
    expect(attendanceAfter.every((a) => a.sessionId === sessionId)).toBe(true);
  });

  it('no-op when newSessionTypeId equals current type', () => {
    const sessionId = saveOne(hasdaId);
    const result = attendanceService.relabelSessionType(
      { db, clock: fixedClock() },
      { sessionId, newSessionTypeId: hasdaId },
    );
    expect(result.sessionTypeId).toBe(hasdaId);
  });

  it('throws on unknown newSessionTypeId', () => {
    const sessionId = saveOne(hasdaId);
    expect(() =>
      attendanceService.relabelSessionType(
        { db, clock: fixedClock() },
        { sessionId, newSessionTypeId: 9999 },
      ),
    ).toThrow(SessionTypeNotFoundError);
  });

  it('throws on unknown sessionId', () => {
    expect(() =>
      attendanceService.relabelSessionType(
        { db, clock: fixedClock() },
        { sessionId: 9999, newSessionTypeId: hasdaId },
      ),
    ).toThrow(InvalidAttendanceInputError);
  });

  it('relabeling re-fires §8: marks the new type\'s activity_record Terlaksana', () => {
    db.insert(activityTypes)
      .values({
        name: 'Pengajian Ibu-Ibu Kelompok',
        sourceKind: 'session',
        sessionTypeId: quranId,
      })
      .run();
    const sessionId = saveOne(hasdaId); // saved as Hasda → no activity_record yet
    expect(db.select().from(activityRecords).all()).toHaveLength(0);
    attendanceService.relabelSessionType(
      { db, clock: fixedClock() },
      { sessionId, newSessionTypeId: quranId },
    );
    const recs = db.select().from(activityRecords).all();
    expect(recs).toHaveLength(1);
    expect(recs[0]?.status).toBe('Terlaksana');
  });
});

// ─── loadRecap (read-only matrix for a month/year) ─────────────────────────

describe('attendanceService.loadRecap', () => {
  let db: DB;
  let hasdaId: number;
  let quranId: number;
  let memberIds: { faisal: number; siti: number; andi: number };
  beforeEach(() => {
    db = freshDb();
    hasdaId = seedSessionType(db, 'Hasda');
    quranId = seedSessionType(db, "Qur'an");
    const { faisal, siti, andi } = seedThreeMembers(db);
    memberIds = { faisal: faisal.id, siti: siti.id, andi: andi.id };
  });

  // Use a far-future clock so back-dated saves anywhere in 2026/2027 don't
  // trip the future-date guard.
  const farFuture = () => new Date('2099-12-31T00:00:00.000Z');

  function saveAt(typeId: number, date: string, rows: { memberId: number; status: 'H' | 'A' | 'S' | 'I' }[]) {
    return attendanceService.saveBatch(
      { db, clock: farFuture },
      {
        sessionTypeId: typeId,
        sessionDate: date,
        rows: rows.map((r) => ({ ...r, arrivalAt: null, donationAmount: null })),
      },
    );
  }

  it('returns empty sessions + same eligible members for a quiet month', () => {
    const r = attendanceService.loadRecap({ db, clock: fixedClock() }, {
      month: 5,
      year: 2026,
    });
    expect(r.sessions).toEqual([]);
    expect(r.attendance).toEqual([]);
    expect(r.members.map((m) => m.fullName)).toEqual([
      'Ahmad Faisal Rahman',
      'Andi Pratama',
      'Siti Aminah Putri',
    ]);
  });

  it('returns sessions in the month ordered by date asc', () => {
    saveAt(hasdaId, '2026-05-20', [
      { memberId: memberIds.faisal, status: 'H' },
    ]);
    saveAt(quranId, '2026-05-10', [
      { memberId: memberIds.faisal, status: 'H' },
    ]);
    saveAt(hasdaId, '2026-05-15', [
      { memberId: memberIds.faisal, status: 'A' },
    ]);
    const r = attendanceService.loadRecap({ db, clock: fixedClock() }, {
      month: 5,
      year: 2026,
    });
    expect(r.sessions.map((s) => s.sessionDate)).toEqual([
      '2026-05-10',
      '2026-05-15',
      '2026-05-20',
    ]);
    expect(r.sessions[0]?.sessionTypeName).toBe("Qur'an");
    expect(r.sessions[1]?.sessionTypeName).toBe('Hasda');
  });

  it('excludes sessions from adjacent months (string-compare bounds)', () => {
    saveAt(hasdaId, '2026-04-30', [
      { memberId: memberIds.faisal, status: 'H' },
    ]);
    saveAt(hasdaId, '2026-05-01', [
      { memberId: memberIds.faisal, status: 'H' },
    ]);
    saveAt(hasdaId, '2026-05-31', [
      { memberId: memberIds.faisal, status: 'H' },
    ]);
    saveAt(hasdaId, '2026-06-01', [
      { memberId: memberIds.faisal, status: 'H' },
    ]);
    const r = attendanceService.loadRecap({ db, clock: fixedClock() }, {
      month: 5,
      year: 2026,
    });
    expect(r.sessions.map((s) => s.sessionDate)).toEqual([
      '2026-05-01',
      '2026-05-31',
    ]);
  });

  it('December → January boundary works (year wraps)', () => {
    saveAt(hasdaId, '2026-12-31', [
      { memberId: memberIds.faisal, status: 'H' },
    ]);
    saveAt(hasdaId, '2027-01-01', [
      { memberId: memberIds.faisal, status: 'H' },
    ]);
    const dec = attendanceService.loadRecap({ db, clock: fixedClock() }, {
      month: 12,
      year: 2026,
    });
    expect(dec.sessions.map((s) => s.sessionDate)).toEqual(['2026-12-31']);
  });

  it('attendance rows are scoped to in-period sessions only', () => {
    saveAt(hasdaId, '2026-05-10', [
      { memberId: memberIds.faisal, status: 'H' },
      { memberId: memberIds.siti, status: 'S' },
    ]);
    saveAt(hasdaId, '2026-06-10', [
      { memberId: memberIds.faisal, status: 'H' },
    ]);
    const r = attendanceService.loadRecap({ db, clock: fixedClock() }, {
      month: 5,
      year: 2026,
    });
    expect(r.attendance).toHaveLength(2);
    expect(r.attendance.every((a) => a.sessionId === r.sessions[0]?.id)).toBe(true);
  });

  it('excludes ineligible life stages from the member list', () => {
    memberService.addMember({ db }, {
      ...FAISAL,
      fullName: 'Bayi Aisyah',
      lifeStage: 'Balita',
      maritalStatus: 'Belum Menikah',
    });
    const r = attendanceService.loadRecap({ db, clock: fixedClock() }, {
      month: 5,
      year: 2026,
    });
    expect(r.members.map((m) => m.fullName)).not.toContain('Bayi Aisyah');
  });

  it('attendance rows for ineligible members are NOT returned (defensive)', () => {
    // Bypass eligibility check on saveBatch by inserting attendance directly
    // — simulates stale data from before the eligibility rule was added.
    const child = memberService.addMember({ db }, {
      ...FAISAL,
      fullName: 'Bayi Aisyah',
      lifeStage: 'Balita',
      maritalStatus: 'Belum Menikah',
    });
    saveAt(hasdaId, '2026-05-10', [{ memberId: memberIds.faisal, status: 'H' }]);
    const session = db.select().from(sessions).get()!;
    db.insert(attendance).values({
      memberId: child.id,
      sessionId: session.id,
      status: 'H',
    }).run();

    const r = attendanceService.loadRecap({ db, clock: fixedClock() }, {
      month: 5,
      year: 2026,
    });
    expect(r.attendance.map((a) => a.memberId)).not.toContain(child.id);
    expect(r.attendance).toHaveLength(1);
  });

  it('rejects out-of-range month or year', () => {
    expect(() =>
      attendanceService.loadRecap({ db, clock: fixedClock() }, { month: 0, year: 2026 }),
    ).toThrow(InvalidPeriodError);
    expect(() =>
      attendanceService.loadRecap({ db, clock: fixedClock() }, { month: 13, year: 2026 }),
    ).toThrow(InvalidPeriodError);
    expect(() =>
      attendanceService.loadRecap({ db, clock: fixedClock() }, { month: 5, year: 1999 }),
    ).toThrow(InvalidPeriodError);
  });
});

// ─── §8 trigger: activity_records UPSERT ───────────────────────────────────

describe('attendanceService.saveBatch · activity_records auto-fill (HANDOFF §8)', () => {
  let db: DB;
  let typeId: number;
  let memberIds: { faisal: number; siti: number };
  beforeEach(() => {
    db = freshDb();
    typeId = seedSessionType(db, 'Hasda');
    const f = memberService.addMember({ db }, FAISAL);
    const s = memberService.addMember(
      { db },
      { ...SITI, household: { mode: 'join-existing', householdId: f.householdId } },
    );
    memberIds = { faisal: f.id, siti: s.id };
  });

  function saveOne(date = '2026-05-20') {
    return attendanceService.saveBatch(
      { db, clock: fixedClock() },
      {
        sessionTypeId: typeId,
        sessionDate: date,
        rows: [
          { memberId: memberIds.faisal, status: 'H', arrivalAt: null, donationAmount: 25000 },
          { memberId: memberIds.siti, status: 'S', arrivalAt: null, donationAmount: null },
        ],
      },
    );
  }

  it("session_type with linked activity_types(source_kind='session') → UPSERTs activity_records to Terlaksana", () => {
    const atId = db
      .insert(activityTypes)
      .values({
        name: 'Pengajian Ibu-Ibu Kelompok',
        sourceKind: 'session',
        sessionTypeId: typeId,
      })
      .returning({ id: activityTypes.id })
      .get().id;

    const result = saveOne();
    expect(result.activityRecordsTouched).toBe(1);
    const recs = db.select().from(activityRecords).all();
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({
      activityTypeId: atId,
      status: 'Terlaksana',
      executedDate: '2026-05-20',
    });
  });

  it('session_type with NO linked activity_type → no activity_records write', () => {
    saveOne();
    expect(db.select().from(activityRecords).all()).toHaveLength(0);
    expect(db.select().from(attendance).all()).toHaveLength(2);
  });

  it('linked but inactive activity_type → skipped', () => {
    db.insert(activityTypes)
      .values({
        name: 'Disabled Activity',
        sourceKind: 'session',
        sessionTypeId: typeId,
        isActive: false,
      })
      .run();
    const result = saveOne();
    expect(result.activityRecordsTouched).toBe(0);
    expect(db.select().from(activityRecords).all()).toHaveLength(0);
  });

  it('monthly_reports row auto-created if missing for the session period', () => {
    db.insert(activityTypes)
      .values({
        name: 'Pengajian Ibu-Ibu Kelompok',
        sourceKind: 'session',
        sessionTypeId: typeId,
      })
      .run();
    expect(db.select().from(monthlyReports).all()).toHaveLength(0);
    saveOne('2026-05-20');
    const reports = db.select().from(monthlyReports).all();
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      month: 5,
      year: 2026,
      finalizedAt: null,
    });
  });

  it('reuses existing monthly_report for the same month, no duplicates', () => {
    db.insert(activityTypes)
      .values({
        name: 'Pengajian Ibu-Ibu Kelompok',
        sourceKind: 'session',
        sessionTypeId: typeId,
      })
      .run();
    db.insert(monthlyReports)
      .values({ month: 5, year: 2026, rencanaBece: 'preexisting note' })
      .run();
    saveOne('2026-05-20');
    const reports = db.select().from(monthlyReports).all();
    expect(reports).toHaveLength(1);
    expect(reports[0]?.rencanaBece).toBe('preexisting note');
  });

  it('existing activity_records row → updated, not duplicated (UNIQUE honored)', () => {
    const atId = db
      .insert(activityTypes)
      .values({
        name: 'Pengajian Ibu-Ibu Kelompok',
        sourceKind: 'session',
        sessionTypeId: typeId,
      })
      .returning({ id: activityTypes.id })
      .get().id;

    saveOne('2026-05-15');
    saveOne('2026-05-20');

    const recs = db
      .select()
      .from(activityRecords)
      .where(eq(activityRecords.activityTypeId, atId))
      .all();
    expect(recs).toHaveLength(1);
    expect(recs[0]?.executedDate).toBe('2026-05-20');
  });

  it('two months → two distinct monthly_reports + two activity_records', () => {
    db.insert(activityTypes)
      .values({
        name: 'Pengajian Ibu-Ibu Kelompok',
        sourceKind: 'session',
        sessionTypeId: typeId,
      })
      .run();

    saveOne('2026-04-10');
    saveOne('2026-05-15');

    expect(db.select().from(monthlyReports).all()).toHaveLength(2);
    expect(db.select().from(activityRecords).all()).toHaveLength(2);
  });

  it("activity_type with source_kind='meeting' is not triggered by attendance save", () => {
    db.insert(activityTypes)
      .values({
        name: 'Musyawarah Kelompok',
        sourceKind: 'meeting',
        meetingType: 'Musyawarah Kelompok',
      })
      .run();
    const result = saveOne();
    expect(result.activityRecordsTouched).toBe(0);
    expect(db.select().from(activityRecords).all()).toHaveLength(0);
  });

  it('multiple linked activity_types → each UPSERTed', () => {
    db.insert(activityTypes)
      .values([
        {
          name: 'Pengajian Ibu-Ibu Kelompok',
          sourceKind: 'session',
          sessionTypeId: typeId,
        },
        {
          name: 'Penderesan ASAD',
          sourceKind: 'session',
          sessionTypeId: typeId,
        },
      ])
      .run();
    const result = saveOne();
    expect(result.activityRecordsTouched).toBe(2);
    expect(db.select().from(activityRecords).all()).toHaveLength(2);
  });
});
