import type { AttendanceStatus, Gender, LifeStage } from './enums';

export interface SessionRow {
  id: number;
  sessionDate: string;
  sessionTypeId: number;
}

/**
 * One row per active member. `status` is null when no attendance was ever
 * saved for this (member, session) — the operator must explicitly mark.
 * Saved rows always carry a non-null status (DB column is NOT NULL).
 */
export interface RosterRow {
  memberId: number;
  fullName: string;
  nickname: string | null;
  gender: Gender;
  lifeStage: LifeStage;
  roleName: string | null;
  isHead: boolean;
  householdNo: string;
  status: AttendanceStatus | null;
  arrivalAt: string | null;
  donationAmount: number | null;
}

export interface LoadRosterInput {
  sessionDate: string;
}

export interface LoadRosterResult {
  /** The (at most one) session for that date — type included so UI can prefill. */
  session: SessionRow | null;
  roster: RosterRow[];
}

export interface SaveBatchRow {
  memberId: number;
  /**
   * Non-null → UPSERT attendance row.
   * Null → DELETE the existing attendance row for this (member, session).
   *        Lets the operator unmark a previously-saved member.
   */
  status: AttendanceStatus | null;
  arrivalAt: string | null;
  donationAmount: number | null;
}

export interface SaveBatchInput {
  sessionTypeId: number;
  sessionDate: string;
  rows: SaveBatchRow[];
}

export interface SaveBatchResult {
  session: SessionRow;
  savedCount: number;
  activityRecordsTouched: number;
}
