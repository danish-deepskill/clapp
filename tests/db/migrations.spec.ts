import { join } from 'node:path';

import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { openDatabase, runMigrations } from '@main/db';

const MIGRATIONS_FOLDER = join(process.cwd(), 'src', 'main', 'db', 'migrations');

describe('db migrations', () => {
  it('runs the initial migration cleanly into an in-memory database', () => {
    const db = openDatabase({ path: ':memory:', inMemory: true });

    expect(() =>
      runMigrations({ db, migrationsFolder: MIGRATIONS_FOLDER }),
    ).not.toThrow();

    const rows = db.all<{ name: string }>(sql`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `);
    const names = rows.map((r) => r.name);

    // All 17 schema tables present (plus drizzle's bookkeeping + sqlite internals).
    const expected = [
      'activity_records',
      'activity_types',
      'attendance',
      'circular_roster',
      'family_visits',
      'households',
      'meeting_attendees',
      'meetings',
      'member_changes',
      'member_movements',
      'members',
      'monthly_reports',
      'roles',
      'session_types',
      'sessions',
      'sick_records',
      'vital_records',
    ];
    for (const t of expected) {
      expect(names).toContain(t);
    }
  });

  it('is idempotent: running migrations twice does not throw', () => {
    const db = openDatabase({ path: ':memory:', inMemory: true });
    runMigrations({ db, migrationsFolder: MIGRATIONS_FOLDER });
    expect(() =>
      runMigrations({ db, migrationsFolder: MIGRATIONS_FOLDER }),
    ).not.toThrow();
  });
});
