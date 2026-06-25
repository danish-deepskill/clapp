import { ipcMain } from 'electron';

import type { IpcResult } from '../../shared/ipc';
import type {
  EditMemberInput,
  MemberFilter,
  MemberRow,
  NewMemberInput,
  RecordMovementInput,
} from '../../shared/member';
import type { MemberAsOf, RosterAsOfInput } from '../../shared/history';
import type { IpcDeps } from '../ipc';
import {
  InvalidAsOfDateError,
  historyService,
} from '../services/historyService';
import { HouseholdNotFoundError } from '../services/householdService';
import {
  AlreadyInactiveError,
  HeadReassignmentRequiredError,
  MemberNotFoundError,
  memberService,
} from '../services/memberService';

function tryCall<T>(fn: () => T): IpcResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    if (
      e instanceof MemberNotFoundError ||
      e instanceof HouseholdNotFoundError
    ) {
      return { ok: false, code: 'NOT_FOUND', message: e.message };
    }
    if (e instanceof AlreadyInactiveError) {
      return { ok: false, code: 'EMPTY', message: e.message };
    }
    if (e instanceof HeadReassignmentRequiredError) {
      return {
        ok: false,
        code: 'DUPLICATE',
        message: e.message,
      };
    }
    if (e instanceof InvalidAsOfDateError) {
      return { ok: false, code: 'INVALID_INPUT', message: e.message };
    }
    throw e;
  }
}

export function registerMemberHandlers(deps: IpcDeps): void {
  ipcMain.handle(
    'member:list',
    (_e, filter: MemberFilter = {}): MemberRow[] =>
      memberService.list({ db: deps.db }, filter),
  );

  ipcMain.handle(
    'member:get',
    (_e, id: number): MemberRow | null =>
      memberService.get({ db: deps.db }, id),
  );

  ipcMain.handle(
    'member:add',
    (_e, input: NewMemberInput): IpcResult<MemberRow> =>
      tryCall(() => memberService.addMember({ db: deps.db }, input)),
  );

  ipcMain.handle(
    'member:edit',
    (_e, id: number, input: EditMemberInput): IpcResult<MemberRow> =>
      tryCall(() => memberService.editMember({ db: deps.db }, id, input)),
  );

  ipcMain.handle(
    'member:recordMovement',
    (_e, input: RecordMovementInput): IpcResult<MemberRow> =>
      tryCall(() => memberService.recordMovement({ db: deps.db }, input)),
  );

  ipcMain.handle(
    'member:rosterAsOf',
    (_e, input: RosterAsOfInput): IpcResult<MemberAsOf[]> =>
      tryCall(() => historyService.reconstructRosterAsOf({ db: deps.db }, input)),
  );
}
