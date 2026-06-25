import { ipcMain } from 'electron';

import type { IpcResult } from '../../shared/ipc';
import type {
  LoadSerkilerInput,
  SerkilerRow,
  UpdateIuranInput,
  UpdateParafInput,
} from '../../shared/serkiler';
import type { IpcDeps } from '../ipc';
import {
  InvalidSerkilerInputError,
  InvalidSerkilerPeriodError,
  MemberNotFoundError,
  serkilerService,
} from '../services/serkilerService';

function tryCall<T>(fn: () => T): IpcResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    if (e instanceof MemberNotFoundError) {
      return { ok: false, code: 'NOT_FOUND', message: e.message };
    }
    if (
      e instanceof InvalidSerkilerInputError ||
      e instanceof InvalidSerkilerPeriodError
    ) {
      return { ok: false, code: 'INVALID_INPUT', message: e.message };
    }
    throw e;
  }
}

export function registerSerkilerHandlers(deps: IpcDeps): void {
  ipcMain.handle(
    'serkiler:list',
    (_e, input: LoadSerkilerInput): IpcResult<SerkilerRow[]> =>
      tryCall(() => serkilerService.list({ db: deps.db }, input)),
  );

  ipcMain.handle(
    'serkiler:setParaf',
    (_e, input: UpdateParafInput): IpcResult<null> =>
      tryCall(() => {
        serkilerService.setParaf({ db: deps.db }, input);
        return null;
      }),
  );

  ipcMain.handle(
    'serkiler:setIuran',
    (_e, input: UpdateIuranInput): IpcResult<null> =>
      tryCall(() => {
        serkilerService.setIuran({ db: deps.db }, input);
        return null;
      }),
  );
}
