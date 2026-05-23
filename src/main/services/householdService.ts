import { eq, sql } from 'drizzle-orm';

import type { HouseholdType } from '../../shared/enums';
import type {
  EditHouseholdInput,
  HouseholdRow,
} from '../../shared/household';
import type { DB, DBLike } from '../db';
import { households, members } from '../db/schema';

export interface HouseholdDeps {
  db: DB;
}

export class HouseholdNotFoundError extends Error {
  constructor(id: number) {
    super(`KK dengan id ${id} tidak ditemukan`);
    this.name = 'HouseholdNotFoundError';
  }
}

export class InvalidHeadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidHeadError';
  }
}

export class ReorderInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReorderInputError';
  }
}

function nextHouseholdNo(db: DBLike): string {
  const row = db
    .select({
      max: sql<number>`COALESCE(MAX(CAST(${households.householdNo} AS INTEGER)), 0)`,
    })
    .from(households)
    .get();
  return String(Number(row?.max ?? 0) + 1).padStart(3, '0');
}

function listRows(db: DBLike): HouseholdRow[] {
  const hhs = db.select().from(households).orderBy(households.householdNo).all();
  const allMembers = db.select().from(members).all();
  return hhs.map((hh) => {
    const inHh = allMembers.filter((m) => m.householdId === hh.id);
    const head = hh.headMemberId
      ? (allMembers.find((m) => m.id === hh.headMemberId) ?? null)
      : null;
    return {
      id: hh.id,
      householdNo: hh.householdNo,
      type: hh.type,
      headMemberId: hh.headMemberId,
      headMemberName: head?.fullName ?? null,
      headMemberNickname: head?.nickname ?? null,
      address: hh.address,
      memberCount: inHh.length,
      activeMemberCount: inHh.filter((m) => m.isActive).length,
    };
  });
}

function getRow(db: DBLike, id: number): HouseholdRow | null {
  return listRows(db).find((h) => h.id === id) ?? null;
}

export const householdService = {
  list(deps: HouseholdDeps): HouseholdRow[] {
    return listRows(deps.db);
  },

  get(deps: HouseholdDeps, id: number): HouseholdRow | null {
    return getRow(deps.db, id);
  },

  /**
   * Creates a household with the next contiguous householdNo. Caller assigns
   * head_member_id after the head member row exists (FK cycle).
   */
  create(
    db: DBLike,
    input: { type: HouseholdType; address?: string | null },
  ): { id: number; householdNo: string } {
    const householdNo = nextHouseholdNo(db);
    return db
      .insert(households)
      .values({
        householdNo,
        type: input.type,
        address: input.address ?? null,
      })
      .returning({ id: households.id, householdNo: households.householdNo })
      .get();
  },

  /**
   * Reassigns the household head. New head must belong to the household and
   * be currently active. No event-log entry — head reassignment is metadata.
   */
  setHead(db: DBLike, householdId: number, newHeadMemberId: number): void {
    const hh = db
      .select()
      .from(households)
      .where(eq(households.id, householdId))
      .get();
    if (!hh) throw new HouseholdNotFoundError(householdId);
    const candidate = db
      .select()
      .from(members)
      .where(eq(members.id, newHeadMemberId))
      .get();
    if (!candidate || candidate.householdId !== householdId) {
      throw new InvalidHeadError(
        `Jama'ah id ${newHeadMemberId} bukan anggota KK id ${householdId}`,
      );
    }
    if (!candidate.isActive) {
      throw new InvalidHeadError(
        `Jama'ah id ${newHeadMemberId} tidak aktif — kepala KK harus aktif`,
      );
    }
    db.update(households)
      .set({ headMemberId: newHeadMemberId })
      .where(eq(households.id, householdId))
      .run();
  },

  update(
    deps: HouseholdDeps,
    id: number,
    input: EditHouseholdInput,
  ): HouseholdRow {
    return deps.db.transaction((tx) => {
      const hh = tx.select().from(households).where(eq(households.id, id)).get();
      if (!hh) throw new HouseholdNotFoundError(id);
      if (input.headMemberId !== undefined) {
        this.setHead(tx, id, input.headMemberId);
      }
      if (input.address !== undefined) {
        tx.update(households)
          .set({ address: input.address })
          .where(eq(households.id, id))
          .run();
      }
      return getRow(tx, id)!;
    });
  },

  /**
   * Rewrites every household_no to be contiguous "001"..."NNN" in the given
   * order. Two-pass inside one transaction so the unique constraint on
   * household_no never trips mid-update.
   */
  reorder(deps: HouseholdDeps, orderedIds: number[]): void {
    deps.db.transaction((tx) => {
      const existing = tx.select({ id: households.id }).from(households).all();
      if (orderedIds.length !== existing.length) {
        throw new ReorderInputError(
          `orderedIds must include all ${existing.length} households (got ${orderedIds.length})`,
        );
      }
      if (new Set(orderedIds).size !== orderedIds.length) {
        throw new ReorderInputError('duplicate ids in orderedIds');
      }
      const known = new Set(existing.map((h) => h.id));
      for (const id of orderedIds) {
        if (!known.has(id)) {
          throw new ReorderInputError(`unknown household id ${id}`);
        }
      }
      // Pass 1: shift to temporary unique names so pass 2 can rewrite freely.
      orderedIds.forEach((id, i) => {
        tx.update(households)
          .set({ householdNo: `TMP-${i}` })
          .where(eq(households.id, id))
          .run();
      });
      // Pass 2: final contiguous "001"..."NNN".
      orderedIds.forEach((id, i) => {
        tx.update(households)
          .set({ householdNo: String(i + 1).padStart(3, '0') })
          .where(eq(households.id, id))
          .run();
      });
    });
  },

  /**
   * Earliest-joined active member, excluding the current head. UI pre-selects
   * this when prompting for a new head (CONTEXT §2 #11).
   */
  suggestNewHead(deps: HouseholdDeps, householdId: number): number | null {
    const hh = deps.db
      .select()
      .from(households)
      .where(eq(households.id, householdId))
      .get();
    if (!hh) return null;
    const candidates = deps.db
      .select()
      .from(members)
      .where(eq(members.householdId, householdId))
      .orderBy(members.createdAt, members.id)
      .all()
      .filter((m) => m.isActive && m.id !== hh.headMemberId);
    return candidates[0]?.id ?? null;
  },
};
