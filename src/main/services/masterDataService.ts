import { eq, sql } from 'drizzle-orm';

import type {
  MasterDataItem,
  MasterDataKind,
  RemoveResult,
} from '../../shared/masterData';
import type { DB } from '../db';
import {
  activityRecords,
  activityTypes,
  members,
  roles,
  sessions,
  sessionTypes,
} from '../db/schema';

export type { MasterDataItem, MasterDataKind, RemoveResult };

export interface MasterDataDeps {
  db: DB;
}

export class DuplicateNameError extends Error {
  constructor(name: string) {
    super(`Nama "${name}" sudah dipakai`);
    this.name = 'DuplicateNameError';
  }
}

export class NotFoundError extends Error {
  constructor(id: number) {
    super(`Data dengan id ${id} tidak ditemukan`);
    this.name = 'NotFoundError';
  }
}

export class EmptyNameError extends Error {
  constructor() {
    super('Nama tidak boleh kosong');
    this.name = 'EmptyNameError';
  }
}

export class ReorderInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReorderInputError';
  }
}

function normalizeName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new EmptyNameError();
  return trimmed;
}

// ─── roles ─────────────────────────────────────────────────────────────────

export const roleService = {
  /** Ordered by operator-set position (Pengaturan drag-reorder). */
  list(deps: MasterDataDeps): MasterDataItem[] {
    return deps.db
      .select({ id: roles.id, name: roles.name, isActive: roles.isActive })
      .from(roles)
      .orderBy(roles.position)
      .all();
  },

  create(deps: MasterDataDeps, rawName: string): MasterDataItem {
    const name = normalizeName(rawName);
    return deps.db.transaction((tx) => {
      const existing = tx
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, name))
        .get();
      if (existing) throw new DuplicateNameError(name);
      // New roles land at the end of the order.
      const maxPos = Number(
        tx
          .select({ max: sql<number>`COALESCE(MAX(${roles.position}), -1)` })
          .from(roles)
          .get()?.max ?? -1,
      );
      const inserted = tx
        .insert(roles)
        .values({ name, position: maxPos + 1 })
        .returning({ id: roles.id, isActive: roles.isActive })
        .get();
      return { id: inserted.id, name, isActive: inserted.isActive };
    });
  },

  rename(deps: MasterDataDeps, id: number, rawName: string): MasterDataItem {
    const name = normalizeName(rawName);
    return deps.db.transaction((tx) => {
      const row = tx.select().from(roles).where(eq(roles.id, id)).get();
      if (!row) throw new NotFoundError(id);
      if (row.name === name) return { id, name, isActive: row.isActive };
      const dup = tx
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, name))
        .get();
      if (dup && dup.id !== id) throw new DuplicateNameError(name);
      tx.update(roles).set({ name }).where(eq(roles.id, id)).run();
      return { id, name, isActive: row.isActive };
    });
  },

  setActive(
    deps: MasterDataDeps,
    id: number,
    isActive: boolean,
  ): MasterDataItem {
    return deps.db.transaction((tx) => {
      const row = tx.select().from(roles).where(eq(roles.id, id)).get();
      if (!row) throw new NotFoundError(id);
      tx.update(roles).set({ isActive }).where(eq(roles.id, id)).run();
      return { id, name: row.name, isActive };
    });
  },

  remove(deps: MasterDataDeps, id: number): RemoveResult {
    return deps.db.transaction((tx) => {
      const row = tx.select().from(roles).where(eq(roles.id, id)).get();
      if (!row) throw new NotFoundError(id);
      const memberCount =
        tx
          .select({ count: sql<number>`count(*)` })
          .from(members)
          .where(eq(members.roleId, id))
          .get()?.count ?? 0;
      const count = Number(memberCount);
      if (count > 0) {
        return {
          removed: false,
          reason: 'has_references',
          count,
          references: "jama'ah",
        };
      }
      tx.delete(roles).where(eq(roles.id, id)).run();
      // Position gaps are fine — list() orders by ASC and operator never sees
      // the raw number; UNIQUE constraint only cares about non-collision.
      return { removed: true };
    });
  },

  /**
   * Rewrites every roles.position to 0..N-1 in the given order. Two-pass
   * inside one transaction so the UNIQUE(position) constraint never trips
   * mid-update (same trick householdService.reorder uses).
   */
  reorder(deps: MasterDataDeps, orderedIds: number[]): void {
    deps.db.transaction((tx) => {
      const existing = tx.select({ id: roles.id }).from(roles).all();
      if (orderedIds.length !== existing.length) {
        throw new ReorderInputError(
          `orderedIds must include all ${existing.length} roles (got ${orderedIds.length})`,
        );
      }
      if (new Set(orderedIds).size !== orderedIds.length) {
        throw new ReorderInputError('duplicate ids in orderedIds');
      }
      const known = new Set(existing.map((r) => r.id));
      for (const id of orderedIds) {
        if (!known.has(id)) {
          throw new ReorderInputError(`unknown role id ${id}`);
        }
      }
      // Pass 1: park into temporary high positions (negative range, no clash
      // with any future legitimate position which is always >= 0).
      orderedIds.forEach((id, i) => {
        tx.update(roles)
          .set({ position: -(i + 1) })
          .where(eq(roles.id, id))
          .run();
      });
      // Pass 2: final contiguous 0..N-1.
      orderedIds.forEach((id, i) => {
        tx.update(roles).set({ position: i }).where(eq(roles.id, id)).run();
      });
    });
  },
};

// ─── session_types ────────────────────────────────────────────────────────

export const sessionTypeService = {
  list(deps: MasterDataDeps): MasterDataItem[] {
    return deps.db
      .select({
        id: sessionTypes.id,
        name: sessionTypes.name,
        isActive: sessionTypes.isActive,
      })
      .from(sessionTypes)
      .orderBy(sessionTypes.name)
      .all();
  },

  create(deps: MasterDataDeps, rawName: string): MasterDataItem {
    const name = normalizeName(rawName);
    return deps.db.transaction((tx) => {
      const existing = tx
        .select({ id: sessionTypes.id })
        .from(sessionTypes)
        .where(eq(sessionTypes.name, name))
        .get();
      if (existing) throw new DuplicateNameError(name);
      const inserted = tx
        .insert(sessionTypes)
        .values({ name })
        .returning({ id: sessionTypes.id, isActive: sessionTypes.isActive })
        .get();
      return { id: inserted.id, name, isActive: inserted.isActive };
    });
  },

  rename(deps: MasterDataDeps, id: number, rawName: string): MasterDataItem {
    const name = normalizeName(rawName);
    return deps.db.transaction((tx) => {
      const row = tx
        .select()
        .from(sessionTypes)
        .where(eq(sessionTypes.id, id))
        .get();
      if (!row) throw new NotFoundError(id);
      if (row.name === name) return { id, name, isActive: row.isActive };
      const dup = tx
        .select({ id: sessionTypes.id })
        .from(sessionTypes)
        .where(eq(sessionTypes.name, name))
        .get();
      if (dup && dup.id !== id) throw new DuplicateNameError(name);
      tx.update(sessionTypes)
        .set({ name })
        .where(eq(sessionTypes.id, id))
        .run();
      return { id, name, isActive: row.isActive };
    });
  },

  setActive(
    deps: MasterDataDeps,
    id: number,
    isActive: boolean,
  ): MasterDataItem {
    return deps.db.transaction((tx) => {
      const row = tx
        .select()
        .from(sessionTypes)
        .where(eq(sessionTypes.id, id))
        .get();
      if (!row) throw new NotFoundError(id);
      tx.update(sessionTypes)
        .set({ isActive })
        .where(eq(sessionTypes.id, id))
        .run();
      return { id, name: row.name, isActive };
    });
  },

  remove(deps: MasterDataDeps, id: number): RemoveResult {
    return deps.db.transaction((tx) => {
      const row = tx
        .select()
        .from(sessionTypes)
        .where(eq(sessionTypes.id, id))
        .get();
      if (!row) throw new NotFoundError(id);

      const sessionCount = Number(
        tx
          .select({ count: sql<number>`count(*)` })
          .from(sessions)
          .where(eq(sessions.sessionTypeId, id))
          .get()?.count ?? 0,
      );
      const activityCount = Number(
        tx
          .select({ count: sql<number>`count(*)` })
          .from(activityTypes)
          .where(eq(activityTypes.sessionTypeId, id))
          .get()?.count ?? 0,
      );
      const total = sessionCount + activityCount;
      if (total > 0) {
        const refs = [
          sessionCount > 0 ? 'sesi pengajian' : null,
          activityCount > 0 ? 'jenis kegiatan' : null,
        ]
          .filter(Boolean)
          .join(' & ');
        return {
          removed: false,
          reason: 'has_references',
          count: total,
          references: refs,
        };
      }
      tx.delete(sessionTypes).where(eq(sessionTypes.id, id)).run();
      return { removed: true };
    });
  },
};

// ─── activity_types ────────────────────────────────────────────────────────

export const activityTypeService = {
  list(deps: MasterDataDeps): MasterDataItem[] {
    return deps.db
      .select({
        id: activityTypes.id,
        name: activityTypes.name,
        isActive: activityTypes.isActive,
      })
      .from(activityTypes)
      .orderBy(activityTypes.name)
      .all();
  },

  /**
   * Creates a new activity_type with `source_kind='manual'`. Advanced fields
   * (meeting_type, session_type_id) are intentionally not exposed in
   * Pengaturan PR1 — they're seeded once and only changed via a future
   * advanced-editor PR.
   */
  create(deps: MasterDataDeps, rawName: string): MasterDataItem {
    const name = normalizeName(rawName);
    return deps.db.transaction((tx) => {
      const existing = tx
        .select({ id: activityTypes.id })
        .from(activityTypes)
        .where(eq(activityTypes.name, name))
        .get();
      if (existing) throw new DuplicateNameError(name);
      const inserted = tx
        .insert(activityTypes)
        .values({ name, sourceKind: 'manual' })
        .returning({ id: activityTypes.id, isActive: activityTypes.isActive })
        .get();
      return { id: inserted.id, name, isActive: inserted.isActive };
    });
  },

  rename(deps: MasterDataDeps, id: number, rawName: string): MasterDataItem {
    const name = normalizeName(rawName);
    return deps.db.transaction((tx) => {
      const row = tx
        .select()
        .from(activityTypes)
        .where(eq(activityTypes.id, id))
        .get();
      if (!row) throw new NotFoundError(id);
      if (row.name === name) return { id, name, isActive: row.isActive };
      const dup = tx
        .select({ id: activityTypes.id })
        .from(activityTypes)
        .where(eq(activityTypes.name, name))
        .get();
      if (dup && dup.id !== id) throw new DuplicateNameError(name);
      tx.update(activityTypes)
        .set({ name })
        .where(eq(activityTypes.id, id))
        .run();
      return { id, name, isActive: row.isActive };
    });
  },

  setActive(
    deps: MasterDataDeps,
    id: number,
    isActive: boolean,
  ): MasterDataItem {
    return deps.db.transaction((tx) => {
      const row = tx
        .select()
        .from(activityTypes)
        .where(eq(activityTypes.id, id))
        .get();
      if (!row) throw new NotFoundError(id);
      tx.update(activityTypes)
        .set({ isActive })
        .where(eq(activityTypes.id, id))
        .run();
      return { id, name: row.name, isActive };
    });
  },

  remove(deps: MasterDataDeps, id: number): RemoveResult {
    return deps.db.transaction((tx) => {
      const row = tx
        .select()
        .from(activityTypes)
        .where(eq(activityTypes.id, id))
        .get();
      if (!row) throw new NotFoundError(id);
      const count = Number(
        tx
          .select({ count: sql<number>`count(*)` })
          .from(activityRecords)
          .where(eq(activityRecords.activityTypeId, id))
          .get()?.count ?? 0,
      );
      if (count > 0) {
        return {
          removed: false,
          reason: 'has_references',
          count,
          references: 'laporan bulanan',
        };
      }
      tx.delete(activityTypes).where(eq(activityTypes.id, id)).run();
      return { removed: true };
    });
  },
};

// Helper used by handlers to look up the right service by kind.
export const masterDataServices = {
  roles: roleService,
  sessionTypes: sessionTypeService,
  activityTypes: activityTypeService,
} as const;
