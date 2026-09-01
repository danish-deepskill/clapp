import { ipcMain } from 'electron';

import type {
  LoadRecapInput,
  LoadRosterInput,
  LoadRosterResult,
  RecapData,
  SaveBatchInput,
  SaveBatchResult,
  SessionRow,
} from '../../shared/attendance';
import type { IpcResult } from '../../shared/ipc';
import { InvalidPeriodError } from '../../shared/period';
import type { IpcDeps } from '../ipc';
import {
  FutureDateError,
  InvalidAttendanceInputError,
  OneSessionPerDateError,
  SessionTypeNotFoundError,
  attendanceService,
} from '../services/attendanceService';

function tryCall<T>(fn: () => T): IpcResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    if (e instanceof SessionTypeNotFoundError) {
      return { ok: false, code: 'NOT_FOUND', message: e.message };
    }
    if (e instanceof FutureDateError) {
      return { ok: false, code: 'FUTURE_DATE', message: e.message };
    }
    if (e instanceof OneSessionPerDateError) {
      return { ok: false, code: 'DUPLICATE', message: e.message };
    }
    if (
      e instanceof InvalidAttendanceInputError ||
      e instanceof InvalidPeriodError
    ) {
      return { ok: false, code: 'INVALID_INPUT', message: e.message };
    }
    throw e;
  }
}

export function registerAttendanceHandlers(deps: IpcDeps): void {
  ipcMain.handle(
    'attendance:roster:load',
    (_e, input: LoadRosterInput): IpcResult<LoadRosterResult> =>
      tryCall(() => attendanceService.loadRoster({ db: deps.db }, input)),
  );

  ipcMain.handle(
    'attendance:saveBatch',
    (_e, input: SaveBatchInput): IpcResult<SaveBatchResult> =>
      tryCall(() => attendanceService.saveBatch({ db: deps.db }, input)),
  );

  ipcMain.handle(
    'attendance:session:relabel',
    (
      _e,
      input: { sessionId: number; newSessionTypeId: number },
    ): IpcResult<SessionRow> =>
      tryCall(() => attendanceService.relabelSessionType({ db: deps.db }, input)),
  );

  ipcMain.handle(
    'attendance:recap:load',
    (_e, input: LoadRecapInput): IpcResult<RecapData> =>
      tryCall(() => attendanceService.loadRecap({ db: deps.db }, input)),
  );
}
