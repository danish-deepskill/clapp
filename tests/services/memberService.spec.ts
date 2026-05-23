import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { type DB, openDatabase, runMigrations } from '@main/db';
import {
  households,
  memberChanges,
  memberMovements,
  members,
  roles,
  vitalRecords,
} from '@main/db/schema';
import {
  HouseholdNotFoundError,
  InvalidHeadError,
  householdService,
} from '@main/services/householdService';
import {
  AlreadyInactiveError,
  HeadReassignmentRequiredError,
  MemberNotFoundError,
  memberService,
} from '@main/services/memberService';
import type { NewMemberInput } from '@shared/member';

const MIGRATIONS = join(process.cwd(), 'src', 'main', 'db', 'migrations');

function freshDb(): DB {
  const db = openDatabase({ path: ':memory:', inMemory: true });
  runMigrations({ db, migrationsFolder: MIGRATIONS });
  return db;
}

const fixedClock = (iso = '2026-05-23T10:00:00.000Z') => () => new Date(iso);

function seedRole(db: DB, name: string): number {
  return db.insert(roles).values({ name }).returning({ id: roles.id }).get().id;
}

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

// ─── addMember ──────────────────────────────────────────────────────────────

describe('memberService.addMember', () => {
  let db: DB;
  beforeEach(() => {
    db = freshDb();
  });

  it("creates a KK-S when mode='create-new' and sets the new member as head", () => {
    const m = memberService.addMember({ db }, FAISAL);
    expect(m.isActive).toBe(true);
    expect(m.isHead).toBe(true);
    const hh = db.select().from(households).get();
    expect(hh?.type).toBe('KK-S');
    expect(hh?.householdNo).toBe('001');
    expect(hh?.headMemberId).toBe(m.id);
    expect(hh?.address).toBe('Jl. Cilandak No. 42');
  });

  it('auto-assigns next contiguous householdNo (001, 002, 003)', () => {
    memberService.addMember({ db }, FAISAL);
    memberService.addMember({ db }, { ...FAISAL, fullName: 'B' });
    memberService.addMember({ db }, { ...FAISAL, fullName: 'C' });
    const hhs = db.select().from(households).all();
    expect(hhs.map((h) => h.householdNo).sort()).toEqual(['001', '002', '003']);
  });

  it("joins an existing KK when mode='join-existing' (no new head assignment)", () => {
    const head = memberService.addMember({ db }, FAISAL);
    const wife = memberService.addMember(
      { db },
      { ...SITI, household: { mode: 'join-existing', householdId: head.householdId } },
    );
    expect(wife.householdId).toBe(head.householdId);
    expect(wife.isHead).toBe(false);
    const hh = db.select().from(households).where(eq(households.id, head.householdId)).get();
    expect(hh?.headMemberId).toBe(head.id);
  });

  it('throws HouseholdNotFoundError for unknown join target', () => {
    expect(() =>
      memberService.addMember(
        { db },
        { ...SITI, household: { mode: 'join-existing', householdId: 999 } },
      ),
    ).toThrow(HouseholdNotFoundError);
  });

  // §8 auto-trigger #1
  it("logAs='Lahir' inserts a vital_records(Lahir) row tied to the member", () => {
    const baby: NewMemberInput = {
      ...FAISAL,
      fullName: 'Bayi Aisyah',
      nickname: null,
      gender: 'Perempuan',
      lifeStage: 'Balita',
      maritalStatus: 'Belum Menikah',
      logAs: 'Lahir',
      logDate: '2026-05-23',
      logNotes: 'anak Pak Faisal',
    };
    const m = memberService.addMember({ db, clock: fixedClock() }, baby);
    const v = db.select().from(vitalRecords).all();
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({
      eventType: 'Lahir',
      eventDate: '2026-05-23',
      memberId: m.id,
      name: 'Bayi Aisyah',
      gender: 'Perempuan',
      notes: 'anak Pak Faisal',
    });
  });

  // §8 auto-trigger #2
  it("logAs='Sambung Baru' inserts a member_movements(Sambung Baru) row", () => {
    const arrival: NewMemberInput = {
      ...FAISAL,
      fullName: 'Andi Hermawan',
      logAs: 'Sambung Baru',
      logDate: '2026-05-07',
      logNotes: 'dari Bandung',
    };
    const m = memberService.addMember({ db }, arrival);
    const mv = db.select().from(memberMovements).all();
    expect(mv).toHaveLength(1);
    expect(mv[0]).toMatchObject({
      movementType: 'Sambung Baru',
      movementDate: '2026-05-07',
      memberId: m.id,
      notes: 'dari Bandung',
    });
  });

  it("logAs='none' does NOT touch vital_records or member_movements", () => {
    memberService.addMember({ db }, FAISAL);
    expect(db.select().from(vitalRecords).all()).toHaveLength(0);
    expect(db.select().from(memberMovements).all()).toHaveLength(0);
  });

  it('defaults logDate to clock.now() when omitted', () => {
    memberService.addMember(
      { db, clock: fixedClock('2026-08-15T12:00:00Z') },
      { ...FAISAL, fullName: 'Defaulted', logAs: 'Sambung Baru' },
    );
    const mv = db.select().from(memberMovements).get();
    expect(mv?.movementDate).toBe('2026-08-15');
  });
});

// ─── editMember ─────────────────────────────────────────────────────────────

describe('memberService.editMember', () => {
  let db: DB;
  let faisalId: number;
  beforeEach(() => {
    db = freshDb();
    faisalId = memberService.addMember({ db }, FAISAL).id;
  });

  // §8 auto-trigger #5
  it('marital_status change logs a member_changes(Menikah) row', () => {
    memberService.editMember(
      { db, clock: fixedClock() },
      faisalId,
      { maritalStatus: 'Duda' },
    );
    const c = db.select().from(memberChanges).all();
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({
      changeType: 'Menikah',
      changeDate: '2026-05-23',
      memberId: faisalId,
      oldValue: 'Menikah',
      newValue: 'Duda',
    });
  });

  // §8 auto-trigger #6
  it('life_stage change logs a member_changes(Perubahan Kelas) row', () => {
    memberService.editMember({ db, clock: fixedClock() }, faisalId, {
      lifeStage: 'Muda-mudi',
    });
    const c = db.select().from(memberChanges).get();
    expect(c).toMatchObject({
      changeType: 'Perubahan Kelas',
      oldValue: 'Dewasa',
      newValue: 'Muda-mudi',
    });
  });

  // §8 auto-trigger #7
  it('role_id change logs a member_changes(Perubahan Dapukan) row with role names', () => {
    const imamId = seedRole(db, 'Imam');
    const wakilId = seedRole(db, 'Wakil');
    memberService.editMember({ db, clock: fixedClock() }, faisalId, {
      roleId: imamId,
    });
    memberService.editMember({ db, clock: fixedClock() }, faisalId, {
      roleId: wakilId,
    });
    const cs = db.select().from(memberChanges).all();
    expect(cs).toHaveLength(2);
    expect(cs[0]).toMatchObject({
      changeType: 'Perubahan Dapukan',
      oldValue: null,
      newValue: 'Imam',
    });
    expect(cs[1]).toMatchObject({
      oldValue: 'Imam',
      newValue: 'Wakil',
    });
  });

  it('role removal (set to null) logs the change with null newValue', () => {
    const imamId = seedRole(db, 'Imam');
    memberService.editMember({ db }, faisalId, { roleId: imamId });
    db.delete(memberChanges).run(); // reset log for clarity
    memberService.editMember({ db }, faisalId, { roleId: null });
    const c = db.select().from(memberChanges).get();
    expect(c).toMatchObject({
      changeType: 'Perubahan Dapukan',
      oldValue: 'Imam',
      newValue: null,
    });
  });

  it('no relevant change → no event-log row', () => {
    memberService.editMember({ db }, faisalId, { fullName: 'Renamed' });
    expect(db.select().from(memberChanges).all()).toHaveLength(0);
  });

  it('throws MemberNotFoundError for unknown id', () => {
    expect(() =>
      memberService.editMember({ db }, 999, { fullName: 'Ghost' }),
    ).toThrow(MemberNotFoundError);
  });

  it('NEVER flips is_active (mandatory-movement rule)', () => {
    // editMember has no is_active field in EditMemberInput, so this is enforced
    // at the type level. Sanity-check at runtime: the row stays active.
    memberService.editMember({ db }, faisalId, { fullName: 'Still Active' });
    const m = db.select().from(members).where(eq(members.id, faisalId)).get();
    expect(m?.isActive).toBe(true);
  });

  it('household move: relocates to existing KK and clears old head if needed', () => {
    // Build a second household with its own head
    const ekoId = memberService.addMember(
      { db },
      { ...FAISAL, fullName: 'Pak Eko' },
    ).id;
    const ekoHhId = db
      .select()
      .from(members)
      .where(eq(members.id, ekoId))
      .get()!.householdId;
    // Move Faisal (head of KK 001) to Eko's household
    memberService.editMember({ db }, faisalId, {
      household: { mode: 'join-existing', householdId: ekoHhId },
    });
    const faisal = db.select().from(members).where(eq(members.id, faisalId)).get();
    expect(faisal?.householdId).toBe(ekoHhId);
    // Old household (KK 001) should have head cleared
    const oldHh = db.select().from(households).where(eq(households.id, 1)).get();
    expect(oldHh?.headMemberId).toBe(null);
  });
});

// ─── recordMovement ─────────────────────────────────────────────────────────

describe('memberService.recordMovement', () => {
  let db: DB;
  let faisalId: number;
  let sitiId: number;
  let hhId: number;
  beforeEach(() => {
    db = freshDb();
    faisalId = memberService.addMember({ db }, FAISAL).id;
    hhId = db.select().from(members).where(eq(members.id, faisalId)).get()!.householdId;
    sitiId = memberService.addMember(
      { db },
      { ...SITI, household: { mode: 'join-existing', householdId: hhId } },
    ).id;
  });

  // §8 auto-trigger #3
  it('Pindah Sambung on non-head: inserts movement row + flips is_active=false', () => {
    memberService.recordMovement({ db }, {
      memberId: sitiId,
      kind: 'Pindah Sambung',
      date: '2026-05-20',
      notes: 'ke Jogja',
    });
    const mv = db.select().from(memberMovements).get();
    expect(mv).toMatchObject({
      movementType: 'Pindah Sambung',
      movementDate: '2026-05-20',
      memberId: sitiId,
      notes: 'ke Jogja',
    });
    const m = db.select().from(members).where(eq(members.id, sitiId)).get();
    expect(m?.isActive).toBe(false);
  });

  // §8 auto-trigger #4
  it('Meninggal on non-head: inserts vital_records + flips is_active=false', () => {
    memberService.recordMovement({ db }, {
      memberId: sitiId,
      kind: 'Meninggal',
      date: '2026-05-11',
      notes: 'wafat di RS Fatmawati',
    });
    const v = db.select().from(vitalRecords).get();
    expect(v).toMatchObject({
      eventType: 'Meninggal',
      eventDate: '2026-05-11',
      memberId: sitiId,
      name: 'Siti Aminah Putri',
      gender: 'Perempuan',
      notes: 'wafat di RS Fatmawati',
    });
    const m = db.select().from(members).where(eq(members.id, sitiId)).get();
    expect(m?.isActive).toBe(false);
  });

  it('on head WITHOUT newHeadMemberId → HeadReassignmentRequiredError, no partial writes', () => {
    expect(() =>
      memberService.recordMovement({ db }, {
        memberId: faisalId, // is the head of hhId
        kind: 'Pindah Sambung',
        date: '2026-05-20',
      }),
    ).toThrow(HeadReassignmentRequiredError);
    // No movement row, member still active, head still Faisal.
    expect(db.select().from(memberMovements).all()).toHaveLength(0);
    const m = db.select().from(members).where(eq(members.id, faisalId)).get();
    expect(m?.isActive).toBe(true);
    const hh = db.select().from(households).where(eq(households.id, hhId)).get();
    expect(hh?.headMemberId).toBe(faisalId);
  });

  it('on head WITH newHeadMemberId: head reassigned + member deactivated + movement logged (one txn)', () => {
    memberService.recordMovement({ db }, {
      memberId: faisalId,
      kind: 'Pindah Sambung',
      date: '2026-05-20',
      notes: 'ke Surabaya',
      newHeadMemberId: sitiId,
    });
    const hh = db.select().from(households).where(eq(households.id, hhId)).get();
    expect(hh?.headMemberId).toBe(sitiId);
    const faisal = db.select().from(members).where(eq(members.id, faisalId)).get();
    expect(faisal?.isActive).toBe(false);
    expect(db.select().from(memberMovements).all()).toHaveLength(1);
  });

  it('refuses to reassign head to a member outside the household → rollback', () => {
    // Make a second household with another member
    const outsiderId = memberService.addMember({ db }, {
      ...FAISAL,
      fullName: 'Outsider',
    }).id;
    expect(() =>
      memberService.recordMovement({ db }, {
        memberId: faisalId,
        kind: 'Pindah Sambung',
        date: '2026-05-20',
        newHeadMemberId: outsiderId,
      }),
    ).toThrow(InvalidHeadError);
    // Atomic: no partial writes
    expect(db.select().from(memberMovements).all()).toHaveLength(0);
    const m = db.select().from(members).where(eq(members.id, faisalId)).get();
    expect(m?.isActive).toBe(true);
  });

  it('throws AlreadyInactiveError when called on an already-inactive member', () => {
    memberService.recordMovement({ db }, {
      memberId: sitiId,
      kind: 'Pindah Sambung',
      date: '2026-05-20',
    });
    expect(() =>
      memberService.recordMovement({ db }, {
        memberId: sitiId,
        kind: 'Meninggal',
        date: '2026-05-21',
      }),
    ).toThrow(AlreadyInactiveError);
  });

  it('throws MemberNotFoundError for unknown id', () => {
    expect(() =>
      memberService.recordMovement({ db }, {
        memberId: 999,
        kind: 'Pindah Sambung',
        date: '2026-05-20',
      }),
    ).toThrow(MemberNotFoundError);
  });
});

// ─── list ───────────────────────────────────────────────────────────────────

describe('memberService.list', () => {
  let db: DB;
  beforeEach(() => {
    db = freshDb();
  });

  it('returns empty when no members exist', () => {
    expect(memberService.list({ db })).toEqual([]);
  });

  it('joins role name and computes isHead', () => {
    const imamId = seedRole(db, 'Imam');
    const m = memberService.addMember({ db }, { ...FAISAL, roleId: imamId });
    const rows = memberService.list({ db });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: m.id,
      fullName: 'Ahmad Faisal Rahman',
      roleId: imamId,
      roleName: 'Imam',
      isHead: true,
    });
  });

  it('filter.activeOnly hides inactive members', () => {
    const faisal = memberService.addMember({ db }, FAISAL);
    const siti = memberService.addMember(
      { db },
      { ...SITI, household: { mode: 'join-existing', householdId: faisal.householdId } },
    );
    memberService.recordMovement({ db }, {
      memberId: siti.id,
      kind: 'Pindah Sambung',
      date: '2026-05-20',
    });
    expect(memberService.list({ db }, { activeOnly: true })).toHaveLength(1);
    expect(memberService.list({ db })).toHaveLength(2);
  });

  it('filter.pengurusOnly hides members without a role', () => {
    const imamId = seedRole(db, 'Imam');
    memberService.addMember({ db }, { ...FAISAL, roleId: imamId });
    memberService.addMember({ db }, { ...FAISAL, fullName: 'Plain Member' });
    expect(memberService.list({ db }, { pengurusOnly: true })).toHaveLength(1);
  });

  it('filter.search matches fullName or nickname (case-insensitive)', () => {
    memberService.addMember({ db }, FAISAL);
    memberService.addMember({ db }, {
      ...FAISAL,
      fullName: 'Andi Pratama',
      nickname: 'Pak Andi',
    });
    expect(memberService.list({ db }, { search: 'faisal' })).toHaveLength(1);
    expect(memberService.list({ db }, { search: 'PAK' })).toHaveLength(2);
    expect(memberService.list({ db }, { search: 'zzzz' })).toHaveLength(0);
  });

  it('filter.lifeStage and filter.gender narrow results', () => {
    memberService.addMember({ db }, FAISAL); // Dewasa, Laki-Laki
    memberService.addMember({ db }, {
      ...FAISAL,
      fullName: 'Wife',
      gender: 'Perempuan',
    });
    memberService.addMember({ db }, {
      ...FAISAL,
      fullName: 'Kid',
      lifeStage: 'Balita',
    });
    expect(
      memberService.list({ db }, { gender: 'Perempuan' }),
    ).toHaveLength(1);
    expect(memberService.list({ db }, { lifeStage: 'Balita' })).toHaveLength(1);
  });
});

// ─── householdService ──────────────────────────────────────────────────────

describe('householdService', () => {
  let db: DB;
  beforeEach(() => {
    db = freshDb();
  });

  it('list returns households with head info and member counts', () => {
    const faisal = memberService.addMember({ db }, FAISAL);
    memberService.addMember(
      { db },
      { ...SITI, household: { mode: 'join-existing', householdId: faisal.householdId } },
    );
    const hhs = householdService.list({ db });
    expect(hhs).toHaveLength(1);
    expect(hhs[0]).toMatchObject({
      householdNo: '001',
      type: 'KK-S',
      headMemberId: faisal.id,
      headMemberName: 'Ahmad Faisal Rahman',
      memberCount: 2,
      activeMemberCount: 2,
    });
  });

  it('setHead rejects a candidate from a different household', () => {
    const head = memberService.addMember({ db }, FAISAL);
    const outsider = memberService.addMember({ db }, { ...FAISAL, fullName: 'Outsider' });
    expect(() =>
      householdService.setHead(db, head.householdId, outsider.id),
    ).toThrow(InvalidHeadError);
  });

  it('setHead rejects an inactive candidate', () => {
    const faisal = memberService.addMember({ db }, FAISAL);
    const siti = memberService.addMember(
      { db },
      { ...SITI, household: { mode: 'join-existing', householdId: faisal.householdId } },
    );
    memberService.recordMovement({ db }, {
      memberId: siti.id,
      kind: 'Pindah Sambung',
      date: '2026-05-20',
    });
    expect(() =>
      householdService.setHead(db, faisal.householdId, siti.id),
    ).toThrow(InvalidHeadError);
  });

  it('suggestNewHead returns earliest-joined active member excluding the current head', () => {
    const head = memberService.addMember({ db }, FAISAL);
    const second = memberService.addMember(
      { db },
      { ...SITI, household: { mode: 'join-existing', householdId: head.householdId } },
    );
    const third = memberService.addMember(
      { db },
      {
        ...SITI,
        fullName: 'Anak',
        household: { mode: 'join-existing', householdId: head.householdId },
      },
    );
    void third;
    expect(householdService.suggestNewHead({ db }, head.householdId)).toBe(
      second.id,
    );
  });

  it('suggestNewHead returns null when no other active members exist', () => {
    const lone = memberService.addMember({ db }, FAISAL);
    expect(householdService.suggestNewHead({ db }, lone.householdId)).toBe(null);
  });

  it('update returns HouseholdNotFoundError for unknown id', () => {
    expect(() =>
      householdService.update({ db }, 999, { address: 'somewhere' }),
    ).toThrow(HouseholdNotFoundError);
  });
});
