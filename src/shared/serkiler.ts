/**
 * Serkiler = curated subset of jamaah for monthly iuran/paraf circulation.
 * Membership is the standing `members.is_serkiler` flag (toggled in Edit
 * Jama'ah). `circular_roster` rows hold per-period paraf + iuran, created
 * lazily on first edit. Resolves CONTEXT §6 #7 (standing, not per-period).
 */

export interface SerkilerRow {
  memberId: number;
  fullName: string;
  nickname: string | null;
  householdNo: string;
  paraf: boolean;
  /** Rupiah amount. Null = not yet recorded (different from 0). */
  circulationAmount: number | null;
}

export interface LoadSerkilerInput {
  /** 1–12. */
  month: number;
  year: number;
}

export interface UpdateParafInput {
  month: number;
  year: number;
  memberId: number;
  paraf: boolean;
}

export interface UpdateIuranInput {
  month: number;
  year: number;
  memberId: number;
  /** Null clears the amount. */
  amount: number | null;
}
