import { ipcMain } from 'electron';

import type { IpcResult } from '../../shared/ipc';
import type {
  EligibleAttendee,
  LoadMeetingsInput,
  MeetingDetail,
  MeetingListItem,
  SaveMeetingInput,
  SaveMeetingResult,
} from '../../shared/meeting';
import { InvalidPeriodError } from '../../shared/period';
import type { IpcDeps } from '../ipc';
import {
  FutureMeetingDateError,
  InvalidMeetingInputError,
  MeetingNotFoundError,
  meetingService,
} from '../services/meetingService';

function tryCall<T>(fn: () => T): IpcResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    if (e instanceof MeetingNotFoundError) {
      return { ok: false, code: 'NOT_FOUND', message: e.message };
    }
    if (e instanceof FutureMeetingDateError) {
      return { ok: false, code: 'FUTURE_DATE', message: e.message };
    }
    if (
      e instanceof InvalidMeetingInputError ||
      e instanceof InvalidPeriodError
    ) {
      return { ok: false, code: 'INVALID_INPUT', message: e.message };
    }
    throw e;
  }
}

export function registerMeetingHandlers(deps: IpcDeps): void {
  ipcMain.handle(
    'meeting:list',
    (_e, input: LoadMeetingsInput): IpcResult<MeetingListItem[]> =>
      tryCall(() => meetingService.listByPeriod({ db: deps.db }, input)),
  );

  ipcMain.handle(
    'meeting:get',
    (_e, id: number): IpcResult<MeetingDetail> =>
      tryCall(() => meetingService.get({ db: deps.db }, id)),
  );

  ipcMain.handle(
    'meeting:save',
    (_e, input: SaveMeetingInput): IpcResult<SaveMeetingResult> =>
      tryCall(() => meetingService.save({ db: deps.db }, input)),
  );

  ipcMain.handle(
    'meeting:delete',
    (_e, id: number): IpcResult<null> =>
      tryCall(() => {
        meetingService.remove({ db: deps.db }, id);
        return null;
      }),
  );

  ipcMain.handle(
    'meeting:eligibleAttendees',
    (): IpcResult<EligibleAttendee[]> =>
      tryCall(() => meetingService.eligibleAttendees({ db: deps.db })),
  );
}
