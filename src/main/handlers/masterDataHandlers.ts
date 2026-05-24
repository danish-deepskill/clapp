import { ipcMain } from 'electron';

import type { IpcResult } from '../../shared/ipc';
import {
  MASTER_DATA_KINDS,
  type MasterDataItem,
  type RemoveResult,
} from '../../shared/masterData';
import type { IpcDeps } from '../ipc';
import {
  DuplicateNameError,
  EmptyNameError,
  NotFoundError,
  ReorderInputError,
  masterDataServices,
  roleService,
} from '../services/masterDataService';

function tryCall<T>(fn: () => T): IpcResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    if (e instanceof DuplicateNameError) {
      return { ok: false, code: 'DUPLICATE', message: e.message };
    }
    if (e instanceof EmptyNameError) {
      return { ok: false, code: 'EMPTY', message: e.message };
    }
    if (e instanceof NotFoundError) {
      return { ok: false, code: 'NOT_FOUND', message: e.message };
    }
    if (e instanceof ReorderInputError) {
      return { ok: false, code: 'INVALID_INPUT', message: e.message };
    }
    throw e;
  }
}

export function registerMasterDataHandlers(deps: IpcDeps): void {
  for (const kind of MASTER_DATA_KINDS) {
    const svc = masterDataServices[kind];

    ipcMain.handle(
      `masterData:${kind}:list`,
      (): MasterDataItem[] => svc.list({ db: deps.db }),
    );

    ipcMain.handle(
      `masterData:${kind}:create`,
      (_e, name: string): IpcResult<MasterDataItem> =>
        tryCall(() => svc.create({ db: deps.db }, name)),
    );

    ipcMain.handle(
      `masterData:${kind}:rename`,
      (_e, id: number, name: string): IpcResult<MasterDataItem> =>
        tryCall(() => svc.rename({ db: deps.db }, id, name)),
    );

    ipcMain.handle(
      `masterData:${kind}:setActive`,
      (_e, id: number, isActive: boolean): IpcResult<MasterDataItem> =>
        tryCall(() => svc.setActive({ db: deps.db }, id, isActive)),
    );

    ipcMain.handle(
      `masterData:${kind}:remove`,
      (_e, id: number): IpcResult<RemoveResult> =>
        tryCall(() => svc.remove({ db: deps.db }, id)),
    );
  }

  // Roles-only: operator drag-reorder. Other master-data lists don't need
  // ordering (Pengaturan sorts by name; no UI consumer depends on order).
  ipcMain.handle(
    'masterData:roles:reorder',
    (_e, orderedIds: number[]): IpcResult<null> =>
      tryCall(() => {
        roleService.reorder({ db: deps.db }, orderedIds);
        return null;
      }),
  );
}
