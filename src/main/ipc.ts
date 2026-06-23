import type { DB } from './db';
import { registerAttendanceHandlers } from './handlers/attendanceHandlers';
import { registerEventLogHandlers } from './handlers/eventLogHandlers';
import { registerHouseholdHandlers } from './handlers/householdHandlers';
import { registerMasterDataHandlers } from './handlers/masterDataHandlers';
import { registerMeetingHandlers } from './handlers/meetingHandlers';
import { registerMemberHandlers } from './handlers/memberHandlers';

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
  // Future PRs add: report, backup.
}
