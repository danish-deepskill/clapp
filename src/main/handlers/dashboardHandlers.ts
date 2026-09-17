import { ipcMain } from 'electron';

import type { DashboardData } from '../../shared/dashboard';
import type { IpcResult } from '../../shared/ipc';
import { InvalidPeriodError } from '../../shared/period';
import type { IpcDeps } from '../ipc';
import { dashboardService } from '../services/dashboardService';

function tryCall<T>(fn: () => T): IpcResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    if (e instanceof InvalidPeriodError) {
      return { ok: false, code: 'INVALID_INPUT', message: e.message };
    }
    throw e;
  }
}

export function registerDashboardHandlers(deps: IpcDeps): void {
  ipcMain.handle(
    'dashboard:get',
    (): IpcResult<DashboardData> =>
      tryCall(() => dashboardService.get({ db: deps.db })),
  );

  ipcMain.handle(
    'dashboard:actionItemCount',
    (): IpcResult<number> =>
      tryCall(() => dashboardService.actionItems({ db: deps.db }).length),
  );
}
