import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { migrate as drizzleMigrate } from 'drizzle-orm/better-sqlite3/migrator';

import type { DB } from './connection';

export interface RunMigrationsOptions {
  db: DB;
  /** Folder containing drizzle-kit generated migration SQL files. */
  migrationsFolder: string;
  /** Live DB file path. Pass null/undefined for in-memory tests (no backup). */
  dbPath?: string | null;
  /** Folder where pre-migration backups land. Created if missing. */
  backupFolder?: string;
  /** Clock for naming the backup file. Defaults to `new Date()`. */
  now?: () => Date;
}

/**
 * Apply pending migrations. Before any migration runs, the live SQLite file
 * is copied to a timestamped backup in `backupFolder` (mandatory per
 * OPERATIONS.md — a botched migration on an unreachable machine must leave
 * the operator with an intact pre-migration copy).
 *
 * In-memory databases (tests) skip the backup step.
 */
export function runMigrations({
  db,
  migrationsFolder,
  dbPath,
  backupFolder,
  now = () => new Date(),
}: RunMigrationsOptions): { backupPath: string | null } {
  const backupPath =
    dbPath && backupFolder && existsSync(dbPath) && statSync(dbPath).size > 0
      ? backupBeforeMigrate({ dbPath, backupFolder, now: now() })
      : null;

  drizzleMigrate(db, { migrationsFolder });

  return { backupPath };
}

function backupBeforeMigrate({
  dbPath,
  backupFolder,
  now,
}: {
  dbPath: string;
  backupFolder: string;
  now: Date;
}): string {
  mkdirSync(backupFolder, { recursive: true });
  const stamp = formatStamp(now);
  const target = join(backupFolder, `clapp-pre-migration-${stamp}.sqlite`);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(dbPath, target);
  return target;
}

function formatStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  );
}
