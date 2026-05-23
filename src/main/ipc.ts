import type { DB } from './db';
import { registerHouseholdHandlers } from './handlers/householdHandlers';
import { registerMasterDataHandlers } from './handlers/masterDataHandlers';
import { registerMemberHandlers } from './handlers/memberHandlers';

export interface IpcDeps {
  db: DB;
}

export function registerIpcHandlers(deps: IpcDeps): void {
  registerMasterDataHandlers(deps);
  registerMemberHandlers(deps);
  registerHouseholdHandlers(deps);
  // Future PRs add: attendance, meeting, report, eventLog, backup.
}
