import type {
  ActivityRecordStatus,
  ActivitySourceKind,
  LifeStage,
} from './enums';
import type { EventLogEntry } from './eventLog';

// ─── Computed (read-only) sections ─────────────────────────────────────────

export interface DemografiStageRow {
  stage: LifeStage;
  male: number;
  female: number;
  total: number;
}

export interface Demografi {
  byStage: DemografiStageRow[];
  /** Active members with marital_status Janda (informational sub-count). */
  janda: number;
  /** Active members with marital_status Duda. */
  duda: number;
  totalMale: number;
  totalFemale: number;
  total: number;
}

export interface LimaBab {
  /** % Hadir > 60. */
  lancar: number;
  /** 20 ≤ % ≤ 60. */
  kurangLancar: number;
  /** 0 < % < 20. */
  kurangSambung: number;
  /** % == 0 (never present in the period). */
  tabayyun: number;
  /** Sessions in the period — 0 means buckets aren't meaningful yet. */
  sessionCount: number;
}

export interface SaranEntry {
  meetingId: number;
  meetingTitle: string;
  meetingType: string;
  suggestions: string;
}

export interface Peristiwa {
  /** Lahir + Meninggal. */
  vital: EventLogEntry[];
  /** Pindah Sambung + Sambung Baru. */
  movement: EventLogEntry[];
}

// ─── Editable child rows ───────────────────────────────────────────────────

export interface SickRow {
  memberId: number;
  /** Resolved for display; ignored on save. */
  memberName?: string;
  notes: string | null;
}

export interface FamilyVisitRow {
  /** Either a real household or a free-text family name. */
  householdId: number | null;
  familyName: string | null;
  /** Resolved household label for display; ignored on save. */
  householdLabel?: string;
  notes: string | null;
}

export interface ActivityRow {
  activityTypeId: number;
  /** Resolved for display; ignored on save. */
  activityName?: string;
  sourceKind?: ActivitySourceKind;
  status: ActivityRecordStatus;
  executedDate: string | null;
  attendeeCount: number | null;
  location: string | null;
  /** Set by §8 trigger when auto-filled from a meeting; read-only. */
  sourceMeetingId?: number | null;
}

/** Anjangsana — next-month visit plans (monthly_reports.visit_plans JSON). */
export interface VisitPlan {
  waktu: string;
  tempat: string;
  agenda: string;
}

/** Pembangunan — construction projects (monthly_reports.construction_projects JSON). */
export interface ConstructionProject {
  jenis: string;
  tujuan: string;
  volume: string;
  dana: string;
}

// ─── Aggregate report ──────────────────────────────────────────────────────

export interface ReportData {
  month: number;
  year: number;
  /** ISO timestamp when locked; null = draft/open. */
  finalizedAt: string | null;

  // Computed (live when draft; frozen snapshot when finalized).
  demografi: Demografi;
  limaBab: LimaBab;
  peristiwa: Peristiwa;
  saran: SaranEntry[];

  // Editable free fields.
  rencanaBece: string | null;
  berasJimpitan: string | null;
  fotocopyDalil: string | null;
  otherNotes: string | null;
  visitPlans: VisitPlan[];
  constructionProjects: ConstructionProject[];

  // Editable child tables.
  sick: SickRow[];
  familyVisits: FamilyVisitRow[];
  activities: ActivityRow[];
}

export interface LoadReportInput {
  month: number;
  year: number;
}

/** Editable payload — computed sections are never sent back. */
export interface SaveReportInput {
  month: number;
  year: number;
  rencanaBece: string | null;
  berasJimpitan: string | null;
  fotocopyDalil: string | null;
  otherNotes: string | null;
  visitPlans: VisitPlan[];
  constructionProjects: ConstructionProject[];
  sick: SickRow[];
  familyVisits: FamilyVisitRow[];
  activities: ActivityRow[];
}

export interface FinalizeInput {
  month: number;
  year: number;
}
