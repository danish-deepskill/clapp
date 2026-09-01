import { and, eq } from 'drizzle-orm';

import type {
  LoadSerkilerInput,
  SerkilerRow,
  UpdateIuranInput,
  UpdateParafInput,
} from '../../shared/serkiler';
import { monthKey } from '../../shared/period';
import type { DB } from '../db';
import { circularRoster, households, members } from '../db/schema';

export interface SerkilerDeps {
  db: DB;
}

export class InvalidSerkilerInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSerkilerInputError';
  }
}

export class MemberNotFoundError extends Error {
  constructor(id: number) {
    super(`Jama'ah id ${id} tidak ditemukan`);
    this.name = 'MemberNotFoundError';
  }
}

/** Upsert a circular_roster row's paraf/iuran; creates lazily if absent. */
function upsertRow(
  deps: SerkilerDeps,
  period: string,
  memberId: number,
  patch: { paraf?: boolean; circulationAmount?: number | null },
): void {
  const member = deps.db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.id, memberId))
    .get();
  if (!member) throw new MemberNotFoundError(memberId);

  const existing = deps.db
    .select({ id: circularRoster.id })
    .from(circularRoster)
    .where(
      and(
        eq(circularRoster.period, period),
        eq(circularRoster.memberId, memberId),
      ),
    )
    .get();

  if (existing) {
    deps.db
      .update(circularRoster)
      .set(patch)
      .where(eq(circularRoster.id, existing.id))
      .run();
  } else {
    deps.db
      .insert(circularRoster)
      .values({
        memberId,
        period,
        paraf: patch.paraf ?? false,
        circulationAmount: patch.circulationAmount ?? null,
      })
      .run();
  }
}

export const serkilerService = {
  /**
   * Roster for a period. Membership = active members flagged is_serkiler
   * UNION anyone with a circular_roster row for that period (preserves
   * history when a member is later un-flagged or deactivated). LEFT-joins
   * per-period paraf/iuran. Alpha-sorted.
   */
  list(deps: SerkilerDeps, input: LoadSerkilerInput): SerkilerRow[] {
    const period = monthKey(input.month, input.year);

    const flagged = deps.db
      .select({
        id: members.id,
        fullName: members.fullName,
        nickname: members.nickname,
        householdId: members.householdId,
      })
      .from(members)
      .where(and(eq(members.isActive, true), eq(members.isSerkiler, true)))
      .all();

    const rosterRows = deps.db
      .select({
        memberId: circularRoster.memberId,
        paraf: circularRoster.paraf,
        circulationAmount: circularRoster.circulationAmount,
      })
      .from(circularRoster)
      .where(eq(circularRoster.period, period))
      .all();
    const rowByMember = new Map(rosterRows.map((r) => [r.memberId, r]));

    // memberIds = flagged ∪ has-row-this-period.
    const memberIds = new Set<number>(flagged.map((m) => m.id));
    for (const r of rosterRows) memberIds.add(r.memberId);
    if (memberIds.size === 0) return [];

    // Resolve member + household details for the full set.
    const flaggedById = new Map(flagged.map((m) => [m.id, m]));
    const allMembers = deps.db.select().from(members).all();
    const memberById = new Map(allMembers.map((m) => [m.id, m]));
    const householdById = new Map(
      deps.db
        .select({ id: households.id, householdNo: households.householdNo })
        .from(households)
        .all()
        .map((h) => [h.id, h.householdNo]),
    );

    return [...memberIds]
      .map<SerkilerRow | null>((memberId) => {
        const m = flaggedById.get(memberId) ?? memberById.get(memberId);
        if (!m) return null;
        const row = rowByMember.get(memberId);
        return {
          memberId,
          fullName: m.fullName,
          nickname: m.nickname,
          householdNo: householdById.get(m.householdId) ?? '',
          paraf: row?.paraf ?? false,
          circulationAmount: row?.circulationAmount ?? null,
        };
      })
      .filter((r): r is SerkilerRow => r !== null)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'id'));
  },

  setParaf(deps: SerkilerDeps, input: UpdateParafInput): void {
    const period = monthKey(input.month, input.year);
    upsertRow(deps, period, input.memberId, { paraf: input.paraf });
  },

  setIuran(deps: SerkilerDeps, input: UpdateIuranInput): void {
    const period = monthKey(input.month, input.year);
    if (input.amount !== null) {
      if (!Number.isInteger(input.amount) || input.amount < 0) {
        throw new InvalidSerkilerInputError(
          `Jumlah iuran harus integer ≥ 0 (diterima ${input.amount})`,
        );
      }
    }
    upsertRow(deps, period, input.memberId, {
      circulationAmount: input.amount,
    });
  },
};
