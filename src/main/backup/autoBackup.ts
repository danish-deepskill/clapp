import type Database from 'better-sqlite3';

import { loadAppSettings, saveAppSettings } from '../settings/appSettings';
import { backupService } from './backupService';

export interface AutoBackupDeps {
  sqlite: Database.Database;
  settingsPath: string;
  /** Used when settings.backup.folder is null. */
  defaultFolder: string;
  clock?: () => Date;
  /** Optional sink for failures (never throws into the app lifecycle). */
  log?: (message: string) => void;
}

/** Run the daily automatic backup if it hasn't happened on today's calendar day. */
export async function runAutoBackupIfDue(deps: AutoBackupDeps): Promise<boolean> {
  const settings = loadAppSettings(deps.settingsPath);
  const now = deps.clock?.() ?? new Date();
  if (!settings.backup.autoBackup) return false;
  if (!backupService.isAutoBackupDue(settings.backup.lastAutoBackupAt, now)) {
    return false;
  }
  try {
    await backupService.createBackup(
      {
        sqlite: deps.sqlite,
        folder: settings.backup.folder ?? deps.defaultFolder,
        retention: settings.backup.retention,
        clock: () => now,
      },
      'auto',
    );
    saveAppSettings(deps.settingsPath, {
      ...settings,
      backup: { ...settings.backup, lastAutoBackupAt: now.toISOString() },
    });
    return true;
  } catch (e) {
    deps.log?.(`auto-backup gagal: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

const HOUR = 60 * 60 * 1000;

/**
 * Check shortly after launch, then hourly — so a laptop that is only opened
 * at pengajian time still gets its daily copy without the operator
 * remembering (OPERATIONS: "don't rely on the operator").
 */
export function scheduleAutoBackup(deps: AutoBackupDeps): () => void {
  const initial = setTimeout(() => void runAutoBackupIfDue(deps), 5_000);
  const timer = setInterval(() => void runAutoBackupIfDue(deps), HOUR);
  return () => {
    clearTimeout(initial);
    clearInterval(timer);
  };
}
