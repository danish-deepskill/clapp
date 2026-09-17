import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { BACKUP_RETENTION_DEFAULT } from '../../shared/backup';

/**
 * App-level configuration that isn't congregation data, kept as a JSON file
 * in userData (no schema change; ERD.html stays the data-model authority).
 */
export interface AppSettings {
  backup: {
    autoBackup: boolean;
    /** null = use the platform default (~/Documents/CLApp/backups). */
    folder: string | null;
    retention: number;
    lastAutoBackupAt: string | null;
  };
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  backup: {
    autoBackup: true,
    folder: null,
    retention: BACKUP_RETENTION_DEFAULT,
    lastAutoBackupAt: null,
  },
};

/** Missing or unreadable file → defaults; unknown keys are dropped. */
export function loadAppSettings(path: string): AppSettings {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return structuredClone(DEFAULT_APP_SETTINGS);
  }
  const b =
    raw && typeof raw === 'object' && 'backup' in raw
      ? ((raw as { backup?: Partial<AppSettings['backup']> }).backup ?? {})
      : {};
  const d = DEFAULT_APP_SETTINGS.backup;
  return {
    backup: {
      autoBackup: typeof b.autoBackup === 'boolean' ? b.autoBackup : d.autoBackup,
      folder: typeof b.folder === 'string' && b.folder.trim() ? b.folder : d.folder,
      retention:
        Number.isInteger(b.retention) && (b.retention as number) > 0
          ? (b.retention as number)
          : d.retention,
      lastAutoBackupAt:
        typeof b.lastAutoBackupAt === 'string' ? b.lastAutoBackupAt : null,
    },
  };
}

/** Atomic write (tmp + rename) so a crash mid-write can't corrupt settings. */
export function saveAppSettings(path: string, settings: AppSettings): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(settings, null, 2), 'utf8');
  renameSync(tmp, path);
}
