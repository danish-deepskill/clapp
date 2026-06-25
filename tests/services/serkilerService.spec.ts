import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { type DB, openDatabase, runMigrations } from '@main/db';
import { circularRoster, members } from '@main/db/schema';
import { memberService } from '@main/services/memberService';
import {
  InvalidSerkilerInputError,
  InvalidSerkilerPeriodError,
  MemberNotFoundError,
  serkilerService,
} from '@main/services/serkilerService';
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

/** Seed a member and optionally flag them into the Serkiler rotation. */
function seed(db: DB, fullName: string, isSerkiler = false): number {
  const m = memberService.addMember({ db }, { ...FAISAL, fullName });
  if (isSerkiler) {
    db.update(members)
      .set({ isSerkiler: true })
      .where(eq(members.id, m.id))
      .run();
  }
  return m.id;
}

// ─── list (flag-based membership) ──────────────────────────────────────────

describe('serkilerService.list', () => {
  let db: DB;
  beforeEach(() => {
    db = freshDb();
  });

  it('returns empty when no members are flagged', () => {
    seed(db, 'Not In Roster', false);
    expect(serkilerService.list({ db }, { month: 5, year: 2026 })).toEqual([]);
  });

  it('rejects invalid month/year', () => {
    expect(() =>
      serkilerService.list({ db }, { month: 13, year: 2026 }),
    ).toThrow(InvalidSerkilerPeriodError);
    expect(() =>
      serkilerService.list({ db }, { month: 5, year: 1900 }),
    ).toThrow(InvalidSerkilerPeriodError);
  });

  it('includes flagged active members, alpha-sorted, with null paraf/iuran before any edit', () => {
    seed(db, 'Zaid Rahman', true);
    seed(db, 'Alice Putri', true);
    seed(db, 'Bob NotFlagged', false);

    const list = serkilerService.list({ db }, { month: 5, year: 2026 });
    expect(list.map((r) => r.fullName)).toEqual([
      'Alice Putri',
      'Zaid Rahman',
    ]);
    expect(list[0]).toMatchObject({ paraf: false, circulationAmount: null });
    expect(list[0]?.householdNo).toBeTruthy();
  });

  it('excludes inactive flagged members from current periods', () => {
    const faisal = seed(db, 'Faisal', true);
    const siti = seed(db, 'Siti', true);
    // Deactivate Faisal directly — we're testing list()'s active filter, not
    // memberService's movement/head rules.
    db.update(members)
      .set({ isActive: false })
      .where(eq(members.id, faisal))
      .run();
    const ids = serkilerService
      .list({ db }, { month: 5, year: 2026 })
      .map((r) => r.memberId);
    expect(ids).not.toContain(faisal);
    expect(ids).toContain(siti);
  });

  it('same membership shows across periods (standing list, not per-period)', () => {
    seed(db, 'Alice', true);
    expect(serkilerService.list({ db }, { month: 5, year: 2026 })).toHaveLength(
      1,
    );
    expect(serkilerService.list({ db }, { month: 6, year: 2026 })).toHaveLength(
      1,
    );
  });
});

// ─── setParaf / setIuran (lazy upsert) ─────────────────────────────────────

describe('serkilerService.setParaf', () => {
  it('lazily creates the row and flips paraf', () => {
    const db = freshDb();
    const a = seed(db, 'Alice', true);
    expect(db.select().from(circularRoster).all()).toHaveLength(0);

    serkilerService.setParaf(
      { db },
      { month: 5, year: 2026, memberId: a, paraf: true },
    );
    expect(db.select().from(circularRoster).all()).toHaveLength(1);
    expect(
      serkilerService.list({ db }, { month: 5, year: 2026 })[0]?.paraf,
    ).toBe(true);

    serkilerService.setParaf(
      { db },
      { month: 5, year: 2026, memberId: a, paraf: false },
    );
    // Still one row — updated, not duplicated.
    expect(db.select().from(circularRoster).all()).toHaveLength(1);
    expect(
      serkilerService.list({ db }, { month: 5, year: 2026 })[0]?.paraf,
    ).toBe(false);
  });

  it('throws MemberNotFoundError for unknown member', () => {
    const db = freshDb();
    expect(() =>
      serkilerService.setParaf(
        { db },
        { month: 5, year: 2026, memberId: 99999, paraf: true },
      ),
    ).toThrow(MemberNotFoundError);
  });
});

describe('serkilerService.setIuran', () => {
  let db: DB;
  let a: number;
  beforeEach(() => {
    db = freshDb();
    a = seed(db, 'Alice', true);
  });

  it('lazily creates row, sets amount, clears with null', () => {
    serkilerService.setIuran(
      { db },
      { month: 5, year: 2026, memberId: a, amount: 50000 },
    );
    expect(
      serkilerService.list({ db }, { month: 5, year: 2026 })[0]
        ?.circulationAmount,
    ).toBe(50000);
    serkilerService.setIuran(
      { db },
      { month: 5, year: 2026, memberId: a, amount: null },
    );
    expect(
      serkilerService.list({ db }, { month: 5, year: 2026 })[0]
        ?.circulationAmount,
    ).toBe(null);
  });

  it('accepts 0 (recorded-as-zero, distinct from null)', () => {
    serkilerService.setIuran(
      { db },
      { month: 5, year: 2026, memberId: a, amount: 0 },
    );
    expect(
      serkilerService.list({ db }, { month: 5, year: 2026 })[0]
        ?.circulationAmount,
    ).toBe(0);
  });

  it('rejects negative amount', () => {
    expect(() =>
      serkilerService.setIuran(
        { db },
        { month: 5, year: 2026, memberId: a, amount: -1 },
      ),
    ).toThrow(InvalidSerkilerInputError);
  });

  it('per-period isolation — iuran in May does not bleed into June', () => {
    serkilerService.setIuran(
      { db },
      { month: 5, year: 2026, memberId: a, amount: 50000 },
    );
    expect(
      serkilerService.list({ db }, { month: 6, year: 2026 })[0]
        ?.circulationAmount,
    ).toBe(null);
  });
});

// ─── historical correctness (un-flag preserves past period data) ───────────

describe('serkilerService historical roster', () => {
  it('keeps a member in a past period after they are un-flagged (has-row UNION)', () => {
    const db = freshDb();
    const a = seed(db, 'Alice', true);

    // Record May iuran while flagged.
    serkilerService.setIuran(
      { db },
      { month: 5, year: 2026, memberId: a, amount: 50000 },
    );
    // Operator later removes Alice from the standing rotation.
    db.update(members)
      .set({ isSerkiler: false })
      .where(eq(members.id, a))
      .run();

    // May still shows Alice (she has a recorded row) ...
    const may = serkilerService.list({ db }, { month: 5, year: 2026 });
    expect(may.map((r) => r.memberId)).toContain(a);
    expect(may[0]?.circulationAmount).toBe(50000);

    // ... but June (no row, not flagged) does not.
    expect(serkilerService.list({ db }, { month: 6, year: 2026 })).toEqual([]);
  });
});
