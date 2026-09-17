import type { LifeStage } from './enums';

/** First-run wizard (HANDOFF §6, §12.3; OPERATIONS "Seed / first-run import"). */

export interface SeedStatus {
  /** True once any member row exists — the wizard self-disables (OPERATIONS). */
  hasMembers: boolean;
}

export interface SeedIssue {
  /** Human path, e.g. "KK #4 › Anggota #2 › birth_date". */
  path: string;
  message: string;
}

export interface SeedStageRow {
  stage: LifeStage;
  male: number;
  female: number;
  total: number;
}

export interface SeedPreview {
  /** Absolute path of the file that was validated. */
  path: string;
  kelompokName: string;
  region: string;
  households: number;
  kk: number;
  kks: number;
  members: number;
  active: number;
  inactive: number;
  /** Members with a non-null role. */
  pengurus: number;
  /** Distinct role names in the file, in first-appearance order. */
  roles: string[];
  /** Active members by life stage × gender (the Laporan demografi grid). */
  byStage: SeedStageRow[];
}

export type SeedPreviewResult =
  | { ok: true; preview: SeedPreview }
  | { ok: false; issues: SeedIssue[] };

export interface SeedCommitResult {
  households: number;
  members: number;
  roles: number;
  sessionTypes: number;
  activityTypes: number;
}
