import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';

import { scheduleAutoBackup } from './backup/autoBackup';
import { openDatabase, resolveDbPaths, runMigrations, type DB } from './db';
import { registerBackupHandlers } from './handlers/backupHandlers';
import { registerIpcHandlers } from './ipc';
import { registerUpdateHandlers, scheduleLaunchUpdateCheck } from './handlers/updateHandlers';
import { createMainWindow } from './window';

let db: DB | null = null;

app.whenReady().then(async () => {
  const { dbPath, backupFolder, migrationsFolder } = resolveDbPaths();
  const settingsPath = join(app.getPath('userData'), 'settings.json');
  // HANDOFF §12.7 default; operators repoint it at a Drive/OneDrive folder.
  const defaultBackupFolder = join(app.getPath('documents'), 'CLApp', 'backups');

  db = openDatabase({ path: dbPath });
  runMigrations({ db, migrationsFolder, dbPath, backupFolder });

  registerIpcHandlers({ db });
  registerBackupHandlers({
    db,
    dbPath,
    settingsPath,
    defaultFolder: defaultBackupFolder,
  });

  const stopAutoBackup = scheduleAutoBackup({
    sqlite: db.$client,
    settingsPath,
    defaultFolder: defaultBackupFolder,
    log: (m) => console.error(`[backup] ${m}`),
  });
  app.on('will-quit', stopAutoBackup);

  registerUpdateHandlers();
  const win = createMainWindow();
  const stopUpdateCheck = scheduleLaunchUpdateCheck(win);
  app.on('will-quit', stopUpdateCheck);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
