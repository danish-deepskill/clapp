import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { type DB, openDatabase, runMigrations } from '@main/db';
import { activityTypes, households, members, roles, sessionTypes } from '@main/db/schema';
import {
  DEFAULT_ACTIVITY_TYPES,
  DEFAULT_SESSION_TYPES,
  PROVISIONAL_ROLES,
  SeedAlreadyCommittedError,
  seedService,
} from '@main/services/seedService';
import { memberService } from '@main/services/memberService';

const MIGRATIONS = join(process.cwd(), 'src', 'main', 'db', 'migrations');

function freshDb(): DB {
  const db = openDatabase({ path: ':memory:', inMemory: true });
  runMigrations({ db, migrationsFolder: MIGRATIONS });
  return db;
}

/** The canonical example shipped in the handoff — the import contract. */
const REAL_SEED = JSON.parse(
  readFileSync(join(process.cwd(), 'clapp-handoff', 'seed.json'), 'utf8'),
) as unknown;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

type Loose = {
  households: {
    household_no: string;
    type: string;
    members: { is_head: boolean; is_active: boolean; role: string | null; birth_date: string | null; life_stage: string }[];
  }[];
};

// ─── parse ─────────────────────────────────────────────────────────────────

describe('seedService.parse', () => {
  it('accepts the handoff seed.json and previews its counts', () => {
    const r = seedService.parse(REAL_SEED);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const file = REAL_SEED as Loose;
    const all = file.households.flatMap((h) => h.members);
    expect(r.preview).toMatchObject({
      kelompokName: 'Cilandak A',
      region: 'SLM',
      households: file.households.length,
      members: all.length,
      active: all.filter((m) => m.is_active).length,
      inactive: all.filter((m) => !m.is_active).length,
      pengurus: all.filter((m) => m.role !== null).length,
    });
    expect(r.preview.kk + r.preview.kks).toBe(file.households.length);
    expect(r.preview.roles).toContain('Imam');
    const totalByStage = r.preview.byStage.reduce((a, s) => a + s.total, 0);
    expect(totalByStage).toBe(r.preview.active);
  });

  it('reports each problem with a human path', () => {
    const bad = clone(REAL_SEED) as Loose;
    bad.households[0]!.members[1]!.is_head = true; // two heads in KK #1
    bad.households[1]!.members[0]!.birth_date = '1990-02-30'; // impossible date
    bad.households[2]!.members[0]!.life_stage = 'Cabe Rawit'; // old spelling
    bad.households[3]!.household_no = bad.households[0]!.household_no; // duplicate

    const r = seedService.parse(bad);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const paths = r.issues.map((i) => i.path);
    expect(paths).toContain('KK #1');
    expect(paths).toContain('KK #2 › Anggota #1 › birth_date');
    expect(paths).toContain('KK #3 › Anggota #1 › life_stage');
    expect(paths).toContain('KK #4 › household_no');
    expect(r.issues.find((i) => i.path === 'KK #4 › household_no')?.message).toMatch(/dipakai dua kali/);
  });

  it('rejects a file that is not a seed at all', () => {
    expect(seedService.parse({ hello: 'world' }).ok).toBe(false);
    expect(seedService.parse(null).ok).toBe(false);
  });
});

// ─── commit ────────────────────────────────────────────────────────────────

describe('seedService.commit', () => {
  it('imports households, members, heads, roles and master data in one go', () => {
    const db = freshDb();
    const parsed = seedService.parse(REAL_SEED);
    if (!parsed.ok) throw new Error('seed should parse');

    const r = seedService.commit({ db }, parsed.seed);
    expect(r).toMatchObject({ households: 8, members: 30 });
    expect(r.sessionTypes).toBe(DEFAULT_SESSION_TYPES.length);
    expect(r.activityTypes).toBe(DEFAULT_ACTIVITY_TYPES.length);

    const hh = db.select().from(households).all();
    expect(hh).toHaveLength(8);
    // Every KK has exactly one head, and that head belongs to the KK.
    const all = db.select().from(members).all();
    for (const h of hh) {
      expect(h.headMemberId).not.toBe(null);
      const head = all.find((m) => m.id === h.headMemberId);
      expect(head?.householdId).toBe(h.id);
    }
    // Roles: provisional list first (HANDOFF order), members resolved by name.
    const roleRows = db.select().from(roles).all().sort((a, b) => a.position - b.position);
    expect(roleRows.slice(0, PROVISIONAL_ROLES.length).map((x) => x.name)).toEqual([
      ...PROVISIONAL_ROLES,
    ]);
    const imam = roleRows.find((x) => x.name === 'Imam')!;
    const faisal = all.find((m) => m.fullName === 'Ahmad Faisal Rahman')!;
    expect(faisal.roleId).toBe(imam.id);
    // Session-linked activity types point at real session types.
    const st = db.select().from(sessionTypes).all();
    const asad = db.select().from(activityTypes).all().find((a) => a.name === 'Penderesan ASAD')!;
    expect(st.find((s) => s.id === asad.sessionTypeId)?.name).toBe('Penderesan ASAD');
  });

  it('refuses a second import once any member exists', () => {
    const db = freshDb();
    memberService.addMember(
      { db },
      {
        fullName: 'Sudah Ada',
        gender: 'Laki-Laki',
        lifeStage: 'Dewasa',
        maritalStatus: 'Menikah',
        bloodType: 'A',
        rhesus: 'Positif',
        household: { mode: 'create-new', address: null },
        logAs: 'none',
      },
    );
    const parsed = seedService.parse(REAL_SEED);
    if (!parsed.ok) throw new Error('seed should parse');
    expect(() => seedService.commit({ db }, parsed.seed)).toThrow(SeedAlreadyCommittedError);
    expect(db.select().from(households).all()).toHaveLength(1);
  });

  it('does not duplicate master data that Pengaturan already has', () => {
    const db = freshDb();
    db.insert(sessionTypes).values({ name: 'Hasda' }).run();
    db.insert(roles).values({ name: 'Imam', position: 1 }).run();
    const parsed = seedService.parse(REAL_SEED);
    if (!parsed.ok) throw new Error('seed should parse');
    const r = seedService.commit({ db }, parsed.seed);
    expect(r.sessionTypes).toBe(DEFAULT_SESSION_TYPES.length - 1);
    expect(db.select().from(sessionTypes).all().filter((s) => s.name === 'Hasda')).toHaveLength(1);
    expect(db.select().from(roles).all().filter((x) => x.name === 'Imam')).toHaveLength(1);
  });

  it('status flips once members exist', () => {
    const db = freshDb();
    expect(seedService.status({ db })).toEqual({ hasMembers: false });
    const parsed = seedService.parse(REAL_SEED);
    if (!parsed.ok) throw new Error('seed should parse');
    seedService.commit({ db }, parsed.seed);
    expect(seedService.status({ db })).toEqual({ hasMembers: true });
  });
});
