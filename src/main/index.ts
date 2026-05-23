import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';

import { openDatabase, resolveDbPaths, runMigrations, type DB } from './db';
import { registerIpcHandlers } from './ipc';
import { createMainWindow } from './window';

let db: DB | null = null;

app.whenReady().then(async () => {
  const { dbPath, backupFolder, migrationsFolder } = resolveDbPaths();

  db = openDatabase({ path: dbPath });
  runMigrations({ db, migrationsFolder, dbPath, backupFolder });

  registerIpcHandlers({ db });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Suppress unused-import warning when in-bundle path resolution moves around.
void join;
