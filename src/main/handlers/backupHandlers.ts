import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';

import type {
  BackupFile,
  BackupSettingsPatch,
  BackupState,
  RestoreResult,
} from '../../shared/backup';
import {
  BACKUP_RETENTION_MAX,
  BACKUP_RETENTION_MIN,
} from '../../shared/backup';
import type { IpcResult } from '../../shared/ipc';
import { backupService, InvalidBackupFileError } from '../backup/backupService';
import type { DB } from '../db';
import { loadAppSettings, saveAppSettings } from '../settings/appSettings';

export interface BackupHandlerDeps {
  db: DB;
  dbPath: string;
  settingsPath: string;
  defaultFolder: string;
}

function tryCall<T>(fn: () => T): IpcResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    if (e instanceof InvalidBackupFileError) {
      return { ok: false, code: 'INVALID_INPUT', message: e.message };
    }
    throw e;
  }
}

async function tryCallAsync<T>(fn: () => Promise<T>): Promise<IpcResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof InvalidBackupFileError) {
      return { ok: false, code: 'INVALID_INPUT', message: e.message };
    }
    // File-system failures (folder unwritable, disk full) are operator-facing.
    return {
      ok: false,
      code: 'INVALID_INPUT',
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

export function registerBackupHandlers(deps: BackupHandlerDeps): void {
  const folderOf = () =>
    loadAppSettings(deps.settingsPath).backup.folder ?? deps.defaultFolder;

  const readState = (): BackupState => {
    const s = loadAppSettings(deps.settingsPath).backup;
    const folder = s.folder ?? deps.defaultFolder;
    const backups = backupService.listBackups(folder);
    return {
      settings: { autoBackup: s.autoBackup, folder, retention: s.retention },
      backups,
      lastBackupAt: backups[0]?.createdAt ?? null,
      lastAutoBackupAt: s.lastAutoBackupAt,
    };
  };

  ipcMain.handle('backup:getState', (): IpcResult<BackupState> => tryCall(readState));

  ipcMain.handle(
    'backup:setSettings',
    (_e, patch: BackupSettingsPatch): IpcResult<BackupState> =>
      tryCall(() => {
        const current = loadAppSettings(deps.settingsPath);
        const retention =
          patch.retention === undefined
            ? current.backup.retention
            : Math.min(
                BACKUP_RETENTION_MAX,
                Math.max(BACKUP_RETENTION_MIN, Math.floor(patch.retention)),
              );
        saveAppSettings(deps.settingsPath, {
          ...current,
          backup: {
            ...current.backup,
            autoBackup: patch.autoBackup ?? current.backup.autoBackup,
            retention,
          },
        });
        return readState();
      }),
  );

  ipcMain.handle(
    'backup:chooseFolder',
    async (): Promise<IpcResult<BackupState | null>> =>
      tryCallAsync(async () => {
        const win = BrowserWindow.getFocusedWindow() ?? undefined;
        const r = await dialog.showOpenDialog(win!, {
          title: 'Pilih folder backup',
          defaultPath: folderOf(),
          properties: ['openDirectory', 'createDirectory'],
        });
        const picked = r.filePaths[0];
        if (r.canceled || !picked) return null;
        const current = loadAppSettings(deps.settingsPath);
        saveAppSettings(deps.settingsPath, {
          ...current,
          backup: { ...current.backup, folder: picked },
        });
        return readState();
      }),
  );

  ipcMain.handle(
    'backup:runNow',
    (): Promise<IpcResult<BackupFile>> =>
      tryCallAsync(() => {
        const s = loadAppSettings(deps.settingsPath).backup;
        return backupService.createBackup(
          {
            sqlite: deps.db.$client,
            folder: s.folder ?? deps.defaultFolder,
            retention: s.retention,
          },
          'manual',
        );
      }),
  );

  ipcMain.handle(
    'backup:chooseRestoreFile',
    async (): Promise<IpcResult<string | null>> =>
      tryCallAsync(async () => {
        const win = BrowserWindow.getFocusedWindow() ?? undefined;
        const r = await dialog.showOpenDialog(win!, {
          title: 'Pilih file backup untuk dipulihkan',
          defaultPath: folderOf(),
          filters: [{ name: 'Backup CLApp', extensions: ['sqlite'] }],
          properties: ['openFile'],
        });
        const picked = r.filePaths[0];
        return r.canceled || !picked ? null : picked;
      }),
  );

  /**
   * Destructive by design (CONTEXT §3): validate → copy the live DB first →
   * close → swap file → relaunch. The pre-restore copy is the undo path.
   */
  ipcMain.handle(
    'backup:restore',
    (_e, sourcePath: string): Promise<IpcResult<RestoreResult>> =>
      tryCallAsync(async () => {
        backupService.validateBackupFile(sourcePath);
        const s = loadAppSettings(deps.settingsPath).backup;
        const pre = await backupService.createBackup(
          {
            sqlite: deps.db.$client,
            folder: s.folder ?? deps.defaultFolder,
            retention: s.retention,
          },
          'pre-restore',
        );
        deps.db.$client.close();
        backupService.swapDatabaseFile(deps.dbPath, sourcePath);
        // Let the reply reach the renderer, then start fresh on the new file
        // (migrations + backup-before-migrate run again on the way up).
        setTimeout(() => {
          app.relaunch();
          app.exit(0);
        }, 400);
        return { preRestoreBackupPath: pre.path };
      }),
  );

  ipcMain.handle(
    'backup:openFolder',
    (): Promise<IpcResult<null>> =>
      tryCallAsync(async () => {
        const folder = folderOf();
        const err = await shell.openPath(folder);
        if (err) throw new Error(err);
        return null;
      }),
  );
}
