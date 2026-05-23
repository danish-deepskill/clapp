import type { DB } from './db';
import { registerMasterDataHandlers } from './handlers/masterDataHandlers';

export interface IpcDeps {
  db: DB;
}

/**
 * Wire all domain handlers. Each domain file registers its own `<domain>:<action>`
 * channels via `ipcMain.handle`. Handlers stay thin — business logic lives in
 * `src/main/services/`.
 */
export function registerIpcHandlers(deps: IpcDeps): void {
  registerMasterDataHandlers(deps);
  // Future PRs add:
  //   registerMemberHandlers(deps);
  //   registerAttendanceHandlers(deps);
  //   registerMeetingHandlers(deps);
  //   registerReportHandlers(deps);
  //   registerEventLogHandlers(deps);
  //   registerBackupHandlers(deps);
}
