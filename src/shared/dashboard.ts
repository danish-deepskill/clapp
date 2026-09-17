import type { EventLogEntry } from './eventLog';
import type { MeetingListItem } from './meeting';

/**
 * Beranda payload. CONTEXT §3: the dashboard is actionable-only — a
 * "Perlu Tindakan" list of things the app detects as incomplete, one quiet
 * roster line, an orientation line, and recent-record panels (HANDOFF §4).
 * No stat cards, no charts (CONTEXT §1).
 */

export type ActionItem =
  | {
      /** Past month with pengajian/musyawarah activity whose Laporan isn't locked. */
      kind: 'unfinalized-report';
      month: number;
      year: number;
    }
  | {
      /** Active activity types still 'Belum' for the current (unlocked) month. */
      kind: 'pending-activities';
      month: number;
      year: number;
      /** Sorted by name (id-ID collation). */
      activityNames: string[];
    }
  | {
      /** Household with ≥1 active member but no active head. */
      kind: 'headless-household';
      householdId: number;
      householdNo: string;
    };

export interface RecentSession {
  sessionId: number;
  sessionDate: string;
  sessionTypeName: string;
  /** Rows with status H. */
  hadir: number;
  /** Rows saved for attendance-eligible members (H + A + S + I). */
  marked: number;
  /** Attendance-eligible roster for the session's period — the same denominator Rekap uses. */
  rosterSize: number;
  /** (H + S + I) / rosterSize × 100, rounded. 0 when the roster is empty. */
  pct: number;
}

export interface DashboardData {
  /** Current period per the main-process clock. */
  period: { month: number; year: number };
  totals: {
    activeMembers: number;
    /** Households with ≥1 active member. */
    households: number;
    /** Active members flagged into the Serkiler rotation. */
    serkilerMembers: number;
  };
  /** Latest date across sessions, meetings and event-log rows; null when empty. */
  lastInputDate: string | null;
  /** Danger items first, then unfinalized reports (newest first), then pending activities. */
  actionItems: ActionItem[];
  /** Newest first, at most RECENT_LIMIT. */
  recentSessions: RecentSession[];
  /** Newest first, at most RECENT_LIMIT. */
  recentMeetings: MeetingListItem[];
  /** Current month's Catatan Peristiwa, newest first. */
  eventsThisMonth: EventLogEntry[];
}

export const RECENT_LIMIT = 5;

/**
 * Only months this far back are nagged as "belum dikunci". Older months can
 * still be locked from Laporan Bulanan; they just stop crowding Beranda.
 */
export const UNFINALIZED_LOOKBACK_MONTHS = 12;
