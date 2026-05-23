import { join } from 'node:path';

import { app } from 'electron';

/** Resolved paths for the live SQLite file, backups folder, and migrations. */
export function resolveDbPaths(): {
  dbPath: string;
  backupFolder: string;
  migrationsFolder: string;
} {
  const userData = app.getPath('userData');
  return {
    dbPath: join(userData, 'clapp.sqlite'),
    backupFolder: join(userData, 'backups'),
    migrationsFolder: app.isPackaged
      ? join(process.resourcesPath, 'db', 'migrations')
      : join(app.getAppPath(), 'src', 'main', 'db', 'migrations'),
  };
}
