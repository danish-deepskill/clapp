import type Database from 'better-sqlite3';
import BetterSqlite3 from 'better-sqlite3';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';

import type { BackupFile, BackupKind } from '../../shared/backup';
import { todayISO } from '../../shared/dates';

export interface BackupDeps {
  /** better-sqlite3 handle of the live database (drizzle's `$client`). */
  sqlite: Database.Database;
  folder: string;
  retention: number;
  /** Defaults to () => new Date() for production; injected in tests. */
  clock?: () => Date;
}

export class InvalidBackupFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBackupFileError';
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `clapp-backup-YYYY-MM-DD-HH-mm-ss[-manual|-pre-restore].sqlite` (HANDOFF §12.7). */
export function backupFileName(now: Date, kind: Exclude<BackupKind, 'pre-migration'>): string {
  const stamp =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const suffix = kind === 'auto' ? '' : `-${kind}`;
  return `clapp-backup-${stamp}${suffix}.sqlite`;
}

const BACKUP_RE =
  /^clapp-backup-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})(?:-(manual|pre-restore))?\.sqlite$/;
const PRE_MIGRATION_RE =
  /^clapp-pre-migration-(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})\.sqlite$/;

/** Parse a file name into its kind + local timestamp; null for unrelated files. */
export function parseBackupFileName(
  fileName: string,
): { kind: BackupKind; createdAt: string } | null {
  const m = BACKUP_RE.exec(fileName) ?? PRE_MIGRATION_RE.exec(fileName);
  if (!m || !m[1] || !m[2] || !m[3] || !m[4] || !m[5] || !m[6]) return null;
  const createdAt = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6]),
  ).toISOString();
  const kind: BackupKind = PRE_MIGRATION_RE.test(fileName)
    ? 'pre-migration'
    : ((m[7] as 'manual' | 'pre-restore' | undefined) ?? 'auto');
  return { kind, createdAt };
}

export const backupService = {
  /** Recognised backup files in `folder`, newest first. Missing folder → []. */
  listBackups(folder: string): BackupFile[] {
    if (!existsSync(folder)) return [];
    const out: BackupFile[] = [];
    for (const fileName of readdirSync(folder)) {
      const parsed = parseBackupFileName(fileName);
      if (!parsed) continue;
      const path = join(folder, fileName);
      out.push({
        fileName,
        path,
        sizeBytes: statSync(path).size,
        createdAt: parsed.createdAt,
        kind: parsed.kind,
      });
    }
    return out.sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) ||
        b.fileName.localeCompare(a.fileName),
    );
  },

  /**
   * Snapshot the live database with SQLite's online backup API (safe under
   * WAL, no need to pause writes). Automatic copies are rotated afterwards;
   * manual and pre-restore copies are kept until the operator deletes them.
   */
  async createBackup(
    deps: BackupDeps,
    kind: Exclude<BackupKind, 'pre-migration'>,
  ): Promise<BackupFile> {
    mkdirSync(deps.folder, { recursive: true });
    const fileName = backupFileName(deps.clock?.() ?? new Date(), kind);
    const path = join(deps.folder, fileName);
    await deps.sqlite.backup(path);
    if (kind === 'auto') this.rotate(deps.folder, deps.retention);
    const parsed = parseBackupFileName(fileName)!;
    return {
      fileName,
      path,
      sizeBytes: statSync(path).size,
      createdAt: parsed.createdAt,
      kind,
    };
  },

  /** Delete automatic copies beyond the newest `retention`. Returns deleted paths. */
  rotate(folder: string, retention: number): string[] {
    const keep = Math.max(1, Math.floor(retention));
    const autos = this.listBackups(folder).filter((b) => b.kind === 'auto');
    const stale = autos.slice(keep);
    for (const b of stale) rmSync(b.path, { force: true });
    return stale.map((b) => b.path);
  },

  /** Daily rule: due when no automatic backup has run on today's calendar day. */
  isAutoBackupDue(lastAutoBackupAt: string | null, now: Date): boolean {
    if (!lastAutoBackupAt) return true;
    const last = new Date(lastAutoBackupAt);
    if (Number.isNaN(last.getTime())) return true;
    return todayISO(last) !== todayISO(now);
  },

  /**
   * A restore candidate must be a readable SQLite file that passes
   * integrity_check and contains the `members` table.
   */
  validateBackupFile(path: string): void {
    if (!existsSync(path)) {
      throw new InvalidBackupFileError(`File tidak ditemukan: ${path}`);
    }
    let probe: Database.Database | null = null;
    try {
      probe = new BetterSqlite3(path, { readonly: true, fileMustExist: true });
      const check = probe.pragma('integrity_check') as { integrity_check: string }[];
      if (check[0]?.integrity_check !== 'ok') {
        throw new InvalidBackupFileError('File backup rusak (integrity_check gagal)');
      }
      const hasMembers = probe
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='members'")
        .get();
      if (!hasMembers) {
        throw new InvalidBackupFileError('File ini bukan database CLApp (tabel members tidak ada)');
      }
    } catch (e) {
      if (e instanceof InvalidBackupFileError) throw e;
      throw new InvalidBackupFileError(
        `File tidak bisa dibaca sebagai database SQLite: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      probe?.close();
    }
  },

  /**
   * Replace the live database file with `sourcePath`. The live handle MUST be
   * closed first (WAL is checkpointed on close); stale -wal/-shm are removed
   * so the next open doesn't replay journal pages from the old database.
   */
  swapDatabaseFile(dbPath: string, sourcePath: string): void {
    copyFileSync(sourcePath, dbPath);
    rmSync(`${dbPath}-wal`, { force: true });
    rmSync(`${dbPath}-shm`, { force: true });
  },
};
