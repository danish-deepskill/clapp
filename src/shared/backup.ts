/** Backup & restore (HANDOFF §12.7, OPERATIONS "Backup & restore"). */

export type BackupKind = 'auto' | 'manual' | 'pre-restore' | 'pre-migration';

export interface BackupSettings {
  /** Daily automatic snapshot (checked on launch and hourly while running). */
  autoBackup: boolean;
  /** Absolute folder path. Operators point this at a Drive/OneDrive folder. */
  folder: string;
  /** How many AUTOMATIC copies to keep; manual and pre-restore copies are never rotated. */
  retention: number;
}

export interface BackupFile {
  fileName: string;
  path: string;
  sizeBytes: number;
  /** ISO timestamp parsed from the file name (local time when it was taken). */
  createdAt: string;
  kind: BackupKind;
}

export interface BackupState {
  settings: BackupSettings;
  /** Newest first. */
  backups: BackupFile[];
  /** Newest backup of any kind in the folder, or null. */
  lastBackupAt: string | null;
  /** When the daily automatic backup last ran, or null. */
  lastAutoBackupAt: string | null;
}

export type BackupSettingsPatch = Partial<Pick<BackupSettings, 'autoBackup' | 'retention'>>;

export interface RestoreResult {
  /** Copy of the live database taken right before it was replaced. */
  preRestoreBackupPath: string;
}

export const BACKUP_RETENTION_DEFAULT = 14;
export const BACKUP_RETENTION_MIN = 1;
export const BACKUP_RETENTION_MAX = 60;
