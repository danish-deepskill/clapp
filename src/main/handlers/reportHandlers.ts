import { ipcMain } from 'electron';

import type { IpcResult } from '../../shared/ipc';
import type {
  FinalizeInput,
  LoadReportInput,
  ReportData,
  SaveReportInput,
} from '../../shared/report';
import { InvalidPeriodError } from '../../shared/period';
import type { IpcDeps } from '../ipc';
import {
  ReportLockedError,
  ReportNotFoundError,
  reportService,
} from '../services/reportService';

function tryCall<T>(fn: () => T): IpcResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    if (e instanceof ReportNotFoundError) {
      return { ok: false, code: 'NOT_FOUND', message: e.message };
    }
    if (e instanceof ReportLockedError) {
      return { ok: false, code: 'DUPLICATE', message: e.message };
    }
    if (e instanceof InvalidPeriodError) {
      return { ok: false, code: 'INVALID_INPUT', message: e.message };
    }
    throw e;
  }
}

export function registerReportHandlers(deps: IpcDeps): void {
  ipcMain.handle(
    'report:get',
    (_e, input: LoadReportInput): IpcResult<ReportData> =>
      tryCall(() => reportService.getReport({ db: deps.db }, input)),
  );

  ipcMain.handle(
    'report:save',
    (_e, input: SaveReportInput): IpcResult<ReportData> =>
      tryCall(() => reportService.saveReport({ db: deps.db }, input)),
  );

  ipcMain.handle(
    'report:finalize',
    (_e, input: FinalizeInput): IpcResult<ReportData> =>
      tryCall(() => reportService.finalize({ db: deps.db }, input)),
  );

  ipcMain.handle(
    'report:unlock',
    (_e, input: FinalizeInput): IpcResult<ReportData> =>
      tryCall(() => reportService.unlock({ db: deps.db }, input)),
  );
}
