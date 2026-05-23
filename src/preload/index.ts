import { contextBridge, ipcRenderer } from 'electron';

import type { IpcResult } from '../shared/ipc';
import type {
  MasterDataItem,
  MasterDataKind,
  RemoveResult,
} from '../shared/masterData';

interface MasterDataNamespace {
  list(): Promise<MasterDataItem[]>;
  create(name: string): Promise<IpcResult<MasterDataItem>>;
  rename(id: number, name: string): Promise<IpcResult<MasterDataItem>>;
  setActive(id: number, isActive: boolean): Promise<IpcResult<MasterDataItem>>;
  remove(id: number): Promise<IpcResult<RemoveResult>>;
}

function masterDataNamespace(kind: MasterDataKind): MasterDataNamespace {
  return {
    list: () => ipcRenderer.invoke(`masterData:${kind}:list`),
    create: (name) => ipcRenderer.invoke(`masterData:${kind}:create`, name),
    rename: (id, name) =>
      ipcRenderer.invoke(`masterData:${kind}:rename`, id, name),
    setActive: (id, isActive) =>
      ipcRenderer.invoke(`masterData:${kind}:setActive`, id, isActive),
    remove: (id) => ipcRenderer.invoke(`masterData:${kind}:remove`, id),
  };
}

const api = {
  masterData: {
    roles: masterDataNamespace('roles'),
    sessionTypes: masterDataNamespace('sessionTypes'),
    activityTypes: masterDataNamespace('activityTypes'),
  },
  // Future namespaces land here as PRs add them:
  //   member: { list, create, edit, ... },
  //   attendance: { list, save, ... },
} as const;

contextBridge.exposeInMainWorld('clapp', api);

export type ClappAPI = typeof api;
