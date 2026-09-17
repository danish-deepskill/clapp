import type { DB } from './db';
import { registerAttendanceHandlers } from './handlers/attendanceHandlers';
import { registerDashboardHandlers } from './handlers/dashboardHandlers';
import { registerEventLogHandlers } from './handlers/eventLogHandlers';
import { registerExportHandlers } from './handlers/exportHandlers';
import { registerHouseholdHandlers } from './handlers/householdHandlers';
import { registerMasterDataHandlers } from './handlers/masterDataHandlers';
import { registerMeetingHandlers } from './handlers/meetingHandlers';
import { registerMemberHandlers } from './handlers/memberHandlers';
import { registerReportHandlers } from './handlers/reportHandlers';
import { registerSeedHandlers } from './handlers/seedHandlers';
import { registerSerkilerHandlers } from './handlers/serkilerHandlers';

export interface IpcDeps {
  db: DB;
}

export function registerIpcHandlers(deps: IpcDeps): void {
  registerMasterDataHandlers(deps);
  registerMemberHandlers(deps);
  registerHouseholdHandlers(deps);
  registerAttendanceHandlers(deps);
  registerMeetingHandlers(deps);
  registerEventLogHandlers(deps);
  registerSerkilerHandlers(deps);
  registerReportHandlers(deps);
  registerDashboardHandlers(deps);
  registerSeedHandlers(deps);
  registerExportHandlers(deps);
  // Future PRs add: backup.
}
