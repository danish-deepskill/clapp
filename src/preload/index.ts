import { contextBridge, ipcRenderer } from 'electron';

import type {
  LoadRecapInput,
  LoadRosterInput,
  LoadRosterResult,
  RecapData,
  SaveBatchInput,
  SaveBatchResult,
  SessionRow,
} from '../shared/attendance';
import type {
  EditHouseholdInput,
  HouseholdRow,
} from '../shared/household';
import type { IpcResult } from '../shared/ipc';
import type {
  EventLogEntry,
  LoadEventLogInput,
} from '../shared/eventLog';
import type {
  MasterDataItem,
  MasterDataKind,
  RemoveResult,
} from '../shared/masterData';
import type {
  EligibleAttendee,
  LoadMeetingsInput,
  MeetingDetail,
  MeetingListItem,
  SaveMeetingInput,
  SaveMeetingResult,
} from '../shared/meeting';
import type { MemberAsOf, RosterAsOfInput } from '../shared/history';
import type {
  EditMemberInput,
  MemberFilter,
  MemberRow,
  NewMemberInput,
  RecordMovementInput,
} from '../shared/member';
import type {
  FinalizeInput,
  LoadReportInput,
  ReportData,
  SaveReportInput,
} from '../shared/report';
import type {
  LoadSerkilerInput,
  SerkilerRow,
  UpdateIuranInput,
  UpdateParafInput,
} from '../shared/serkiler';

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
    roles: {
      ...masterDataNamespace('roles'),
      reorder: (orderedIds: number[]): Promise<IpcResult<null>> =>
        ipcRenderer.invoke('masterData:roles:reorder', orderedIds),
    },
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
    rosterAsOf: (input: RosterAsOfInput): Promise<IpcResult<MemberAsOf[]>> =>
      ipcRenderer.invoke('member:rosterAsOf', input),
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
    reorder: (orderedIds: number[]): Promise<IpcResult<null>> =>
      ipcRenderer.invoke('household:reorder', orderedIds),
  },
  attendance: {
    loadRoster: (input: LoadRosterInput): Promise<IpcResult<LoadRosterResult>> =>
      ipcRenderer.invoke('attendance:roster:load', input),
    saveBatch: (input: SaveBatchInput): Promise<IpcResult<SaveBatchResult>> =>
      ipcRenderer.invoke('attendance:saveBatch', input),
    relabelSessionType: (input: {
      sessionId: number;
      newSessionTypeId: number;
    }): Promise<IpcResult<SessionRow>> =>
      ipcRenderer.invoke('attendance:session:relabel', input),
    loadRecap: (input: LoadRecapInput): Promise<IpcResult<RecapData>> =>
      ipcRenderer.invoke('attendance:recap:load', input),
  },
  eventLog: {
    list: (input: LoadEventLogInput): Promise<IpcResult<EventLogEntry[]>> =>
      ipcRenderer.invoke('eventLog:list', input),
  },
  report: {
    get: (input: LoadReportInput): Promise<IpcResult<ReportData>> =>
      ipcRenderer.invoke('report:get', input),
    save: (input: SaveReportInput): Promise<IpcResult<ReportData>> =>
      ipcRenderer.invoke('report:save', input),
    finalize: (input: FinalizeInput): Promise<IpcResult<ReportData>> =>
      ipcRenderer.invoke('report:finalize', input),
    unlock: (input: FinalizeInput): Promise<IpcResult<ReportData>> =>
      ipcRenderer.invoke('report:unlock', input),
  },
  serkiler: {
    list: (input: LoadSerkilerInput): Promise<IpcResult<SerkilerRow[]>> =>
      ipcRenderer.invoke('serkiler:list', input),
    setParaf: (input: UpdateParafInput): Promise<IpcResult<null>> =>
      ipcRenderer.invoke('serkiler:setParaf', input),
    setIuran: (input: UpdateIuranInput): Promise<IpcResult<null>> =>
      ipcRenderer.invoke('serkiler:setIuran', input),
  },
  meeting: {
    list: (input: LoadMeetingsInput): Promise<IpcResult<MeetingListItem[]>> =>
      ipcRenderer.invoke('meeting:list', input),
    get: (id: number): Promise<IpcResult<MeetingDetail>> =>
      ipcRenderer.invoke('meeting:get', id),
    save: (input: SaveMeetingInput): Promise<IpcResult<SaveMeetingResult>> =>
      ipcRenderer.invoke('meeting:save', input),
    delete: (id: number): Promise<IpcResult<null>> =>
      ipcRenderer.invoke('meeting:delete', id),
    eligibleAttendees: (): Promise<IpcResult<EligibleAttendee[]>> =>
      ipcRenderer.invoke('meeting:eligibleAttendees'),
  },
} as const;

contextBridge.exposeInMainWorld('clapp', api);

export type ClappAPI = typeof api;
