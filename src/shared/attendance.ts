import type { AttendanceStatus, Gender, LifeStage } from './enums';

export interface SessionRow {
  id: number;
  sessionDate: string;
  sessionTypeId: number;
  /** Materi sesi: bab/ayat/hadist yang dibahas. Nullable. */
  notes: string | null;
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
  /** Materi sesi (optional). Null/undefined leaves existing notes untouched on UPSERT. */
  notes?: string | null;
  rows: SaveBatchRow[];
}

export interface SaveBatchResult {
  session: SessionRow;
  savedCount: number;
  activityRecordsTouched: number;
}

/**
 * Per-session attendance counts used by drawer chrome (controls strip, footer)
 * and by save toast messages. `marked` = total - T, denominator for % calcs.
 */
export interface AttendanceTally {
  H: number;
  A: number;
  S: number;
  I: number;
  /** Members with no status set (belum diisi). */
  T: number;
  /** All members in the roster (H + A + S + I + T). */
  total: number;
  /** Members with any non-null status — denominator for % calculations. */
  marked: number;
}

// ─── Recap (read-only attendance matrix per period) ──────────────────────

export interface RecapSession {
  id: number;
  sessionDate: string;
  sessionTypeId: number;
  sessionTypeName: string;
}

export interface RecapMember {
  id: number;
  fullName: string;
  gender: Gender;
  lifeStage: LifeStage;
}

export interface RecapAttendance {
  memberId: number;
  sessionId: number;
  status: AttendanceStatus;
}

export interface LoadRecapInput {
  /** 1–12. */
  month: number;
  year: number;
}

export interface RecapData {
  /** Sessions in the period, ordered by date asc. */
  sessions: RecapSession[];
  /** Active + attendance-eligible members, ordered alphabetically. */
  members: RecapMember[];
  /** Saved attendance rows for sessions in this period (any status). */
  attendance: RecapAttendance[];
}

