import { join } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { type DB, openDatabase, runMigrations } from '@main/db';
import {
  eventLogService,
  InvalidEventLogPeriodError,
} from '@main/services/eventLogService';
import { memberService } from '@main/services/memberService';
import type { NewMemberInput } from '@shared/member';

const MIGRATIONS = join(process.cwd(), 'src', 'main', 'db', 'migrations');

function freshDb(): DB {
  const db = openDatabase({ path: ':memory:', inMemory: true });
  runMigrations({ db, migrationsFolder: MIGRATIONS });
  return db;
}

const FAISAL: NewMemberInput = {
  fullName: 'Ahmad Faisal Rahman',
  nickname: 'Pak Faisal',
  gender: 'Laki-Laki',
  lifeStage: 'Dewasa',
  maritalStatus: 'Menikah',
  bloodType: 'A',
  rhesus: 'Positif',
  household: { mode: 'create-new', address: null },
  logAs: 'none',
};

function seedMember(db: DB, fullName: string): number {
  return memberService.addMember({ db }, { ...FAISAL, fullName }).id;
}

// ─── period bounds + sort ─────────────────────────────────────────────────

describe('eventLogService.listByPeriod', () => {
  let db: DB;
  let aliceId: number;
  let bobId: number;
  beforeEach(() => {
    db = freshDb();
    aliceId = seedMember(db, 'Alice Pratiwi');
    bobId = seedMember(db, 'Bob Setiawan');
  });

  it('returns empty array for a month with no events', () => {
    expect(
      eventLogService.listByPeriod({ db }, { month: 5, year: 2026 }),
    ).toEqual([]);
  });

  it('rejects invalid month/year', () => {
    expect(() =>
      eventLogService.listByPeriod({ db }, { month: 13, year: 2026 }),
    ).toThrow(InvalidEventLogPeriodError);
    expect(() =>
      eventLogService.listByPeriod({ db }, { month: 5, year: 1500 }),
    ).toThrow(InvalidEventLogPeriodError);
  });

  it('includes vital_records for the period (Lahir / Meninggal)', () => {
    eventLogService.recordVital(db, {
      eventType: 'Lahir',
      eventDate: '2026-05-10',
      memberId: aliceId,
    });
    eventLogService.recordVital(db, {
      eventType: 'Meninggal',
      eventDate: '2026-05-20',
      memberId: bobId,
    });

    const list = eventLogService.listByPeriod({ db }, { month: 5, year: 2026 });
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({
      source: 'vital',
      kind: 'Lahir',
      memberName: 'Alice Pratiwi',
      date: '2026-05-10',
    });
    expect(list[1]).toMatchObject({
      source: 'vital',
      kind: 'Meninggal',
      memberName: 'Bob Setiawan',
    });
  });

  it('includes member_movements for the period (Sambung Baru / Pindah Sambung)', () => {
    eventLogService.recordMovement(db, {
      movementType: 'Sambung Baru',
      movementDate: '2026-05-05',
      memberId: aliceId,
    });
    eventLogService.recordMovement(db, {
      movementType: 'Pindah Sambung',
      movementDate: '2026-05-15',
      memberId: bobId,
    });

    const list = eventLogService.listByPeriod({ db }, { month: 5, year: 2026 });
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({
      source: 'movement',
      kind: 'Sambung Baru',
      memberName: 'Alice Pratiwi',
    });
    expect(list[1]).toMatchObject({
      source: 'movement',
      kind: 'Pindah Sambung',
    });
  });

  it('includes member_changes for the period (Menikah / Perubahan Kelas / Perubahan Dapukan)', () => {
    eventLogService.recordChange(db, {
      changeType: 'Menikah',
      changeDate: '2026-05-01',
      memberId: aliceId,
      oldValue: 'Belum Menikah',
      newValue: 'Menikah',
    });
    eventLogService.recordChange(db, {
      changeType: 'Perubahan Kelas',
      changeDate: '2026-05-02',
      memberId: bobId,
      oldValue: 'Muda-mudi',
      newValue: 'Dewasa',
    });

    const list = eventLogService.listByPeriod({ db }, { month: 5, year: 2026 });
    expect(list).toHaveLength(2);
    const menikah = list.find((e) => e.source === 'change' && e.kind === 'Menikah');
    expect(menikah).toMatchObject({
      oldValue: 'Belum Menikah',
      newValue: 'Menikah',
      memberName: 'Alice Pratiwi',
    });
  });

  it('merges all three sources into one chronological stream', () => {
    eventLogService.recordChange(db, {
      changeType: 'Menikah',
      changeDate: '2026-05-15',
      memberId: aliceId,
      oldValue: 'Belum Menikah',
      newValue: 'Menikah',
    });
    eventLogService.recordVital(db, {
      eventType: 'Lahir',
      eventDate: '2026-05-01',
      memberId: aliceId,
    });
    eventLogService.recordMovement(db, {
      movementType: 'Sambung Baru',
      movementDate: '2026-05-10',
      memberId: bobId,
    });

    const list = eventLogService.listByPeriod({ db }, { month: 5, year: 2026 });
    expect(list.map((e) => e.date)).toEqual([
      '2026-05-01',
      '2026-05-10',
      '2026-05-15',
    ]);
    expect(list.map((e) => e.source)).toEqual(['vital', 'movement', 'change']);
  });

  it('same-date tiebreak orders vital → movement → change (not alphabetical)', () => {
    eventLogService.recordChange(db, {
      changeType: 'Perubahan Dapukan',
      changeDate: '2026-05-20',
      memberId: aliceId,
      oldValue: null,
      newValue: 'Bendahara',
    });
    eventLogService.recordMovement(db, {
      movementType: 'Sambung Baru',
      movementDate: '2026-05-20',
      memberId: aliceId,
    });
    eventLogService.recordVital(db, {
      eventType: 'Lahir',
      eventDate: '2026-05-20',
      memberId: aliceId,
    });

    const list = eventLogService.listByPeriod({ db }, { month: 5, year: 2026 });
    expect(list.map((e) => e.source)).toEqual(['vital', 'movement', 'change']);
  });

  it('excludes events outside the month boundary (no leak into adjacent months)', () => {
    eventLogService.recordVital(db, {
      eventType: 'Lahir',
      eventDate: '2026-04-30',
      memberId: aliceId,
    });
    eventLogService.recordVital(db, {
      eventType: 'Lahir',
      eventDate: '2026-05-01',
      memberId: aliceId,
    });
    eventLogService.recordVital(db, {
      eventType: 'Lahir',
      eventDate: '2026-05-31',
      memberId: aliceId,
    });
    eventLogService.recordVital(db, {
      eventType: 'Lahir',
      eventDate: '2026-06-01',
      memberId: aliceId,
    });

    const list = eventLogService.listByPeriod({ db }, { month: 5, year: 2026 });
    expect(list.map((e) => e.date)).toEqual(['2026-05-01', '2026-05-31']);
  });

  it('handles December → January boundary correctly', () => {
    eventLogService.recordVital(db, {
      eventType: 'Lahir',
      eventDate: '2026-12-31',
      memberId: aliceId,
    });
    eventLogService.recordVital(db, {
      eventType: 'Lahir',
      eventDate: '2027-01-01',
      memberId: aliceId,
    });
    const dec = eventLogService.listByPeriod(
      { db },
      { month: 12, year: 2026 },
    );
    expect(dec.map((e) => e.date)).toEqual(['2026-12-31']);
    const jan = eventLogService.listByPeriod(
      { db },
      { month: 1, year: 2027 },
    );
    expect(jan.map((e) => e.date)).toEqual(['2027-01-01']);
  });
});

// ─── group filter ─────────────────────────────────────────────────────────

describe('eventLogService.listByPeriod (group filter)', () => {
  let db: DB;
  let aliceId: number;
  beforeEach(() => {
    db = freshDb();
    aliceId = seedMember(db, 'Alice Pratiwi');
    eventLogService.recordVital(db, {
      eventType: 'Lahir',
      eventDate: '2026-05-01',
      memberId: aliceId,
    });
    eventLogService.recordMovement(db, {
      movementType: 'Sambung Baru',
      movementDate: '2026-05-02',
      memberId: aliceId,
    });
    eventLogService.recordChange(db, {
      changeType: 'Menikah',
      changeDate: '2026-05-03',
      memberId: aliceId,
      oldValue: 'Belum Menikah',
      newValue: 'Menikah',
    });
  });

  it('returns all 3 groups when no filter given', () => {
    const list = eventLogService.listByPeriod({ db }, { month: 5, year: 2026 });
    expect(list).toHaveLength(3);
  });

  it('returns all 3 groups when filter is empty array', () => {
    const list = eventLogService.listByPeriod(
      { db },
      { month: 5, year: 2026, groups: [] },
    );
    expect(list).toHaveLength(3);
  });

  it('filters to vital only', () => {
    const list = eventLogService.listByPeriod(
      { db },
      { month: 5, year: 2026, groups: ['vital'] },
    );
    expect(list).toHaveLength(1);
    expect(list[0]?.source).toBe('vital');
  });

  it('filters to arrival-departure only', () => {
    const list = eventLogService.listByPeriod(
      { db },
      { month: 5, year: 2026, groups: ['arrival-departure'] },
    );
    expect(list).toHaveLength(1);
    expect(list[0]?.source).toBe('movement');
  });

  it('filters to change only', () => {
    const list = eventLogService.listByPeriod(
      { db },
      { month: 5, year: 2026, groups: ['change'] },
    );
    expect(list).toHaveLength(1);
    expect(list[0]?.source).toBe('change');
  });

  it('combines two groups', () => {
    const list = eventLogService.listByPeriod(
      { db },
      { month: 5, year: 2026, groups: ['vital', 'change'] },
    );
    expect(list.map((e) => e.source).sort()).toEqual(['change', 'vital']);
  });
});

// ─── member name join ─────────────────────────────────────────────────────

describe('eventLogService.listByPeriod (member name resolution)', () => {
  it('joins member.fullName by id for movement + change rows', () => {
    const db = freshDb();
    const id = seedMember(db, 'Resolved Name');
    eventLogService.recordMovement(db, {
      movementType: 'Sambung Baru',
      movementDate: '2026-05-01',
      memberId: id,
    });
    const list = eventLogService.listByPeriod({ db }, { month: 5, year: 2026 });
    expect(list[0]?.memberName).toBe('Resolved Name');
  });

  it('falls back to vital_records.name when memberId is null', () => {
    const db = freshDb();
    eventLogService.recordVital(db, {
      eventType: 'Lahir',
      eventDate: '2026-05-01',
      memberId: null,
      name: 'Bayi Belum Terdaftar',
    });
    const list = eventLogService.listByPeriod({ db }, { month: 5, year: 2026 });
    expect(list[0]?.memberName).toBe('Bayi Belum Terdaftar');
  });

  it('falls back to "(tidak diketahui)" when memberId is null and name is null', () => {
    const db = freshDb();
    eventLogService.recordVital(db, {
      eventType: 'Meninggal',
      eventDate: '2026-05-01',
      memberId: null,
    });
    const list = eventLogService.listByPeriod({ db }, { month: 5, year: 2026 });
    expect(list[0]?.memberName).toBe('(tidak diketahui)');
  });
});
