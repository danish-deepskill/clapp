import { contextBridge, ipcRenderer } from 'electron';

import type {
  EditHouseholdInput,
  HouseholdRow,
} from '../shared/household';
import type { IpcResult } from '../shared/ipc';
import type {
  MasterDataItem,
  MasterDataKind,
  RemoveResult,
} from '../shared/masterData';
import type {
  EditMemberInput,
  MemberFilter,
  MemberRow,
  NewMemberInput,
  RecordMovementInput,
} from '../shared/member';

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
  member: {
    list: (filter: MemberFilter = {}): Promise<MemberRow[]> =>
      ipcRenderer.invoke('member:list', filter),
    get: (id: number): Promise<MemberRow | null> =>
      ipcRenderer.invoke('member:get', id),
    add: (input: NewMemberInput): Promise<IpcResult<MemberRow>> =>
      ipcRenderer.invoke('member:add', input),
    edit: (
      id: number,
      input: EditMemberInput,
    ): Promise<IpcResult<MemberRow>> =>
      ipcRenderer.invoke('member:edit', id, input),
    recordMovement: (
      input: RecordMovementInput,
    ): Promise<IpcResult<MemberRow>> =>
      ipcRenderer.invoke('member:recordMovement', input),
  },
  household: {
    list: (): Promise<HouseholdRow[]> => ipcRenderer.invoke('household:list'),
    get: (id: number): Promise<HouseholdRow | null> =>
      ipcRenderer.invoke('household:get', id),
    update: (
      id: number,
      input: EditHouseholdInput,
    ): Promise<IpcResult<HouseholdRow>> =>
      ipcRenderer.invoke('household:update', id, input),
    suggestNewHead: (householdId: number): Promise<number | null> =>
      ipcRenderer.invoke('household:suggestNewHead', householdId),
  },
} as const;

contextBridge.exposeInMainWorld('clapp', api);

export type ClappAPI = typeof api;
