import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { type DB, openDatabase, runMigrations } from '@main/db';
import { members, roles } from '@main/db/schema';
import { eventLogService } from '@main/services/eventLogService';
import {
  InvalidAsOfDateError,
  historyService,
} from '@main/services/historyService';
import { memberService } from '@main/services/memberService';
import type { LifeStage, MaritalStatus } from '@shared/enums';
import type { NewMemberInput } from '@shared/member';

const MIGRATIONS = join(process.cwd(), 'src', 'main', 'db', 'migrations');

function freshDb(): DB {
  const db = openDatabase({ path: ':memory:', inMemory: true });
  runMigrations({ db, migrationsFolder: MIGRATIONS });
  return db;
}

const BASE: Omit<NewMemberInput, 'fullName'> = {
  gender: 'Laki-Laki',
  lifeStage: 'Dewasa',
  maritalStatus: 'Belum Menikah',
  bloodType: 'A',
  rhesus: 'Positif',
  household: { mode: 'create-new', address: null },
  logAs: 'none',
};

/** Create a member (no arrival event by default); optional current overrides. */
function mk(
  db: DB,
  fullName: string,
  over: Partial<{
    lifeStage: LifeStage;
    maritalStatus: MaritalStatus;
    isActive: boolean;
    roleId: number | null;
  }> = {},
): number {
  const m = memberService.addMember(
    { db },
    {
      ...BASE,
      fullName,
      lifeStage: over.lifeStage ?? 'Dewasa',
      maritalStatus: over.maritalStatus ?? 'Belum Menikah',
    },
  );
  const patch: Record<string, unknown> = {};
  if (over.isActive === false) patch.isActive = false;
  if (over.roleId !== undefined) patch.roleId = over.roleId;
  if (Object.keys(patch).length > 0) {
    db.update(members).set(patch).where(eq(members.id, m.id)).run();
  }
  return m.id;
}

function names(roster: { fullName: string }[]): string[] {
  return roster.map((r) => r.fullName);
}

describe('historyService.reconstructRosterAsOf', () => {
  it('rejects a malformed date', () => {
    const db = freshDb();
    expect(() =>
      historyService.reconstructRosterAsOf({ db }, { date: '2026-5-1' }),
    ).toThrow(InvalidAsOfDateError);
  });

  it('includes members with no arrival event for any past date (seed case)', () => {
    const db = freshDb();
    mk(db, 'Seed Member');
    const r = historyService.reconstructRosterAsOf({ db }, { date: '2020-01-31' });
    expect(names(r)).toEqual(['Seed Member']);
  });

  it('excludes a member whose Sambung Baru is after the as-of date', () => {
    const db = freshDb();
    const id = mk(db, 'Late Joiner');
    eventLogService.recordMovement(db, {
      movementType: 'Sambung Baru',
      movementDate: '2026-06-10',
      memberId: id,
    });
    expect(
      names(historyService.reconstructRosterAsOf({ db }, { date: '2026-05-31' })),
    ).toEqual([]);
    expect(
      names(historyService.reconstructRosterAsOf({ db }, { date: '2026-06-30' })),
    ).toEqual(['Late Joiner']);
  });

  it('includes a departed member for months before their Pindah Sambung', () => {
    const db = freshDb();
    const id = mk(db, 'Pak Pindah', { isActive: false });
    eventLogService.recordMovement(db, {
      movementType: 'Pindah Sambung',
      movementDate: '2026-08-15',
      memberId: id,
    });
    // Active as-of May (before departure)
    expect(
      names(historyService.reconstructRosterAsOf({ db }, { date: '2026-05-31' })),
    ).toEqual(['Pak Pindah']);
    // Gone by September
    expect(
      names(historyService.reconstructRosterAsOf({ db }, { date: '2026-09-30' })),
    ).toEqual([]);
  });

  it('includes a deceased member for months before their Meninggal', () => {
    const db = freshDb();
    const id = mk(db, 'Alm Fulan', { isActive: false });
    eventLogService.recordVital(db, {
      eventType: 'Meninggal',
      eventDate: '2026-07-20',
      memberId: id,
    });
    expect(
      names(historyService.reconstructRosterAsOf({ db }, { date: '2026-06-30' })),
    ).toEqual(['Alm Fulan']);
    expect(
      names(historyService.reconstructRosterAsOf({ db }, { date: '2026-07-31' })),
    ).toEqual([]);
  });

  it('reverts a single Perubahan Kelas before the change date', () => {
    const db = freshDb();
    const id = mk(db, 'Naik Kelas', { lifeStage: 'Dewasa' });
    eventLogService.recordChange(db, {
      changeType: 'Perubahan Kelas',
      changeDate: '2026-07-01',
      memberId: id,
      oldValue: 'Remaja',
      newValue: 'Dewasa',
    });
    const before = historyService.reconstructRosterAsOf({ db }, { date: '2026-06-30' });
    expect(before[0]?.lifeStage).toBe('Remaja');
    const after = historyService.reconstructRosterAsOf({ db }, { date: '2026-07-31' });
    expect(after[0]?.lifeStage).toBe('Dewasa');
  });

  it('reverts through multiple class changes to the value in effect at D', () => {
    const db = freshDb();
    const id = mk(db, 'Berjenjang', { lifeStage: 'Dewasa' });
    eventLogService.recordChange(db, {
      changeType: 'Perubahan Kelas',
      changeDate: '2026-03-01',
      memberId: id,
      oldValue: 'Remaja',
      newValue: 'Muda-mudi',
    });
    eventLogService.recordChange(db, {
      changeType: 'Perubahan Kelas',
      changeDate: '2026-07-01',
      memberId: id,
      oldValue: 'Muda-mudi',
      newValue: 'Dewasa',
    });
    // Feb: before both → Remaja
    expect(
      historyService.reconstructRosterAsOf({ db }, { date: '2026-02-28' })[0]
        ?.lifeStage,
    ).toBe('Remaja');
    // May: after first, before second → Muda-mudi
    expect(
      historyService.reconstructRosterAsOf({ db }, { date: '2026-05-31' })[0]
        ?.lifeStage,
    ).toBe('Muda-mudi');
    // Aug: after both → Dewasa
    expect(
      historyService.reconstructRosterAsOf({ db }, { date: '2026-08-31' })[0]
        ?.lifeStage,
    ).toBe('Dewasa');
  });

  it('reverts Perubahan Dapukan (role name), including back to null', () => {
    const db = freshDb();
    const imam = db
      .insert(roles)
      .values({ name: 'Imam', position: 0 })
      .returning({ id: roles.id })
      .get().id;
    const id = mk(db, 'Pak Imam', { roleId: imam });
    eventLogService.recordChange(db, {
      changeType: 'Perubahan Dapukan',
      changeDate: '2026-07-01',
      memberId: id,
      oldValue: null,
      newValue: 'Imam',
    });
    expect(
      historyService.reconstructRosterAsOf({ db }, { date: '2026-06-30' })[0]
        ?.roleName,
    ).toBe(null);
    expect(
      historyService.reconstructRosterAsOf({ db }, { date: '2026-07-31' })[0]
        ?.roleName,
    ).toBe('Imam');
  });

  it('reverts Menikah (marital status)', () => {
    const db = freshDb();
    const id = mk(db, 'Pengantin', { maritalStatus: 'Menikah' });
    eventLogService.recordChange(db, {
      changeType: 'Menikah',
      changeDate: '2026-07-01',
      memberId: id,
      oldValue: 'Belum Menikah',
      newValue: 'Menikah',
    });
    expect(
      historyService.reconstructRosterAsOf({ db }, { date: '2026-06-30' })[0]
        ?.maritalStatus,
    ).toBe('Belum Menikah');
  });

  it('treats an event exactly on the as-of date as already happened', () => {
    const db = freshDb();
    const id = mk(db, 'Boundary');
    eventLogService.recordMovement(db, {
      movementType: 'Sambung Baru',
      movementDate: '2026-05-31',
      memberId: id,
    });
    // Joined on the last day of May → present in May's roster.
    expect(
      names(historyService.reconstructRosterAsOf({ db }, { date: '2026-05-31' })),
    ).toEqual(['Boundary']);
  });

  it('ignores vital_records with null member_id (unregistered birth)', () => {
    const db = freshDb();
    mk(db, 'Existing');
    eventLogService.recordVital(db, {
      eventType: 'Lahir',
      eventDate: '2026-09-01',
      memberId: null,
      name: 'Bayi Tanpa ID',
    });
    expect(() =>
      historyService.reconstructRosterAsOf({ db }, { date: '2026-05-31' }),
    ).not.toThrow();
    expect(
      names(historyService.reconstructRosterAsOf({ db }, { date: '2026-05-31' })),
    ).toEqual(['Existing']);
  });

  it('combines arrival-before + class-change-after correctly', () => {
    const db = freshDb();
    const id = mk(db, 'Kombinasi', { lifeStage: 'Dewasa' });
    eventLogService.recordMovement(db, {
      movementType: 'Sambung Baru',
      movementDate: '2026-01-10',
      memberId: id,
    });
    eventLogService.recordChange(db, {
      changeType: 'Perubahan Kelas',
      changeDate: '2026-07-01',
      memberId: id,
      oldValue: 'Muda-mudi',
      newValue: 'Dewasa',
    });
    const may = historyService.reconstructRosterAsOf({ db }, { date: '2026-05-31' });
    expect(may).toHaveLength(1);
    expect(may[0]?.lifeStage).toBe('Muda-mudi');
  });

  it('sorts the roster alphabetically by name', () => {
    const db = freshDb();
    mk(db, 'Zaid');
    mk(db, 'Alice');
    mk(db, 'Budi');
    expect(
      names(historyService.reconstructRosterAsOf({ db }, { date: '2026-05-31' })),
    ).toEqual(['Alice', 'Budi', 'Zaid']);
  });
});
