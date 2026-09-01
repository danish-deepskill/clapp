import { ipcMain } from 'electron';

import type { EventLogEntry, LoadEventLogInput } from '../../shared/eventLog';
import type { IpcResult } from '../../shared/ipc';
import { InvalidPeriodError } from '../../shared/period';
import type { IpcDeps } from '../ipc';
import { eventLogService } from '../services/eventLogService';

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

export function registerEventLogHandlers(deps: IpcDeps): void {
  ipcMain.handle(
    'eventLog:list',
    (_e, input: LoadEventLogInput): IpcResult<EventLogEntry[]> =>
      tryCall(() => eventLogService.listByPeriod({ db: deps.db }, input)),
  );
}
