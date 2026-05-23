/**
 * Types crossing the IPC boundary for master-data CRUD. These live in
 * `shared/` so the renderer and preload can import them without reaching
 * into `src/main/`.
 */

export interface MasterDataItem {
  id: number;
  name: string;
  isActive: boolean;
}

export type RemoveResult =
  | { removed: true }
  | {
      removed: false;
      reason: 'has_references';
      count: number;
      /** User-facing label describing where references live. */
      references: string;
    };

export const MASTER_DATA_KINDS = [
  'roles',
  'sessionTypes',
  'activityTypes',
] as const;

export type MasterDataKind = (typeof MASTER_DATA_KINDS)[number];
