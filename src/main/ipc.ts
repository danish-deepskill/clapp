import type { DB } from './db';

export interface IpcDeps {
  db: DB;
}

/**
 * Wire all domain handlers. Each domain file registers its own `<domain>:<action>`
 * channels via `ipcMain.handle`. Handlers stay thin — business logic lives in
 * `src/main/services/`.
 */
export function registerIpcHandlers(_deps: IpcDeps): void {
  // Domain handlers land here as PRs add screens:
  //   registerMemberHandlers(_deps);
  //   registerAttendanceHandlers(_deps);
  //   registerMeetingHandlers(_deps);
  //   registerReportHandlers(_deps);
  //   registerEventLogHandlers(_deps);
  //   registerSettingsHandlers(_deps);
  //   registerBackupHandlers(_deps);
}
