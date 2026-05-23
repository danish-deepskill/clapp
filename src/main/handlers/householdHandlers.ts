import { ipcMain } from 'electron';

import type {
  EditHouseholdInput,
  HouseholdRow,
} from '../../shared/household';
import type { IpcResult } from '../../shared/ipc';
import type { IpcDeps } from '../ipc';
import {
  HouseholdNotFoundError,
  InvalidHeadError,
  householdService,
} from '../services/householdService';

function tryCall<T>(fn: () => T): IpcResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    if (e instanceof HouseholdNotFoundError) {
      return { ok: false, code: 'NOT_FOUND', message: e.message };
    }
    if (e instanceof InvalidHeadError) {
      return { ok: false, code: 'DUPLICATE', message: e.message };
    }
    throw e;
  }
}

export function registerHouseholdHandlers(deps: IpcDeps): void {
  ipcMain.handle(
    'household:list',
    (): HouseholdRow[] => householdService.list({ db: deps.db }),
  );

  ipcMain.handle(
    'household:get',
    (_e, id: number): HouseholdRow | null =>
      householdService.get({ db: deps.db }, id),
  );

  ipcMain.handle(
    'household:update',
    (_e, id: number, input: EditHouseholdInput): IpcResult<HouseholdRow> =>
      tryCall(() => householdService.update({ db: deps.db }, id, input)),
  );

  ipcMain.handle(
    'household:suggestNewHead',
    (_e, householdId: number): number | null =>
      householdService.suggestNewHead({ db: deps.db }, householdId),
  );
}
