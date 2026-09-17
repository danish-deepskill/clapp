import { eq } from 'drizzle-orm';

import { isValidISODate, lastDayOfMonth } from '../../shared/dates';
import type { LifeStage, MaritalStatus } from '../../shared/enums';
import type { MemberAsOf, RosterAsOfInput } from '../../shared/history';
import { isPastPeriod } from '../../shared/period';
import type { DBLike } from '../db';
import {
  households,
  memberChanges,
  memberMovements,
  members,
  roles,
  vitalRecords,
} from '../db/schema';

export interface HistoryDeps {
  db: DBLike;
}

export class InvalidAsOfDateError extends Error {
  constructor(date: string) {
    super(`Tanggal "${date}" bukan format YYYY-MM-DD`);
    this.name = 'InvalidAsOfDateError';
  }
}

export interface RosterForPeriod {
  /** Month-end reconstruction date, or null when live membership was used. */
  asOf: string | null;
  members: MemberAsOf[];
}

interface UndoEvent {
  date: string;
  apply: (acc: MemberAccumulator) => void;
}

interface MemberAccumulator {
  existsAsOf: boolean;
  activeAsOf: boolean;
  lifeStage: LifeStage;
  maritalStatus: MaritalStatus;
  roleName: string | null;
}

function lookups(db: DBLike) {
  return {
    roleNameById: new Map(
      db.select().from(roles).all().map((r) => [r.id, r.name]),
    ),
    householdNoById: new Map(
      db
        .select({ id: households.id, householdNo: households.householdNo })
        .from(households)
        .all()
        .map((h) => [h.id, h.householdNo]),
    ),
  };
}

const byName = (a: MemberAsOf, b: MemberAsOf) =>
  a.fullName.localeCompare(b.fullName, 'id');

/** Current active membership in the same shape as a reconstruction. */
function liveRoster(db: DBLike): MemberAsOf[] {
  const { roleNameById, householdNoById } = lookups(db);
  return db
    .select()
    .from(members)
    .where(eq(members.isActive, true))
    .all()
    .map((m) => ({
      id: m.id,
      fullName: m.fullName,
      nickname: m.nickname,
      gender: m.gender,
      householdId: m.householdId,
      householdNo: householdNoById.get(m.householdId) ?? '',
      lifeStage: m.lifeStage,
      maritalStatus: m.maritalStatus,
      roleName: m.roleId ? (roleNameById.get(m.roleId) ?? null) : null,
    }))
    .sort(byName);
}

/**
 * Fold the event log backward from current `members` state to the roster
 * active as of `date` (CONTEXT §2 — history is derived, never copied).
 * Undo every event dated AFTER `date`:
 *   - arrival (Sambung Baru / Lahir) after D → member didn't exist yet
 *   - departure (Pindah Sambung / Meninggal) after D → was still active at D
 *   - Perubahan Kelas / Dapukan / Menikah after D → revert to its old value
 * Events are processed most-recent-first so a field reverts to the value in
 * effect at D (the oldValue of the earliest change after D).
 *
 * Limitation: members added without an arrival event (logAs='none' / seed)
 * have no logged join, so they're treated as having existed for all history.
 * Household assignment isn't event-logged → current KK is used.
 */
function reconstruct(db: DBLike, date: string): MemberAsOf[] {
  const { roleNameById, householdNoById } = lookups(db);

  // Collect undo-events (date > D) keyed by member.
  const eventsByMember = new Map<number, UndoEvent[]>();
  const push = (memberId: number, ev: UndoEvent) => {
    const list = eventsByMember.get(memberId);
    if (list) list.push(ev);
    else eventsByMember.set(memberId, [ev]);
  };

  for (const mv of db.select().from(memberMovements).all()) {
    if (mv.movementDate <= date) continue;
    push(mv.memberId, {
      date: mv.movementDate,
      apply: (acc) => {
        if (mv.movementType === 'Sambung Baru') acc.existsAsOf = false;
        else acc.activeAsOf = true; // Pindah Sambung → still here at D
      },
    });
  }

  for (const v of db.select().from(vitalRecords).all()) {
    if (v.memberId === null || v.eventDate <= date) continue;
    push(v.memberId, {
      date: v.eventDate,
      apply: (acc) => {
        if (v.eventType === 'Lahir') acc.existsAsOf = false;
        else acc.activeAsOf = true; // Meninggal → alive at D
      },
    });
  }

  for (const c of db.select().from(memberChanges).all()) {
    if (c.changeDate <= date) continue;
    push(c.memberId, {
      date: c.changeDate,
      apply: (acc) => {
        if (c.changeType === 'Perubahan Kelas' && c.oldValue) {
          acc.lifeStage = c.oldValue as LifeStage;
        } else if (c.changeType === 'Perubahan Dapukan') {
          acc.roleName = c.oldValue; // may be null (had no role)
        } else if (c.changeType === 'Menikah' && c.oldValue) {
          acc.maritalStatus = c.oldValue as MaritalStatus;
        }
      },
    });
  }

  const out: MemberAsOf[] = [];
  for (const m of db.select().from(members).all()) {
    const acc: MemberAccumulator = {
      existsAsOf: true,
      activeAsOf: m.isActive,
      lifeStage: m.lifeStage,
      maritalStatus: m.maritalStatus,
      roleName: m.roleId ? (roleNameById.get(m.roleId) ?? null) : null,
    };
    const evs = eventsByMember.get(m.id);
    if (evs) {
      // Most-recent first so reverts land on the value in effect at D.
      evs.sort((a, b) => b.date.localeCompare(a.date));
      for (const ev of evs) ev.apply(acc);
    }
    if (!acc.existsAsOf || !acc.activeAsOf) continue;
    out.push({
      id: m.id,
      fullName: m.fullName,
      nickname: m.nickname,
      gender: m.gender,
      householdId: m.householdId,
      householdNo: householdNoById.get(m.householdId) ?? '',
      lifeStage: acc.lifeStage,
      maritalStatus: acc.maritalStatus,
      roleName: acc.roleName,
    });
  }

  return out.sort(byName);
}

export const historyService = {
  /** Jama'ah "Riwayat" mode: the active roster as of an arbitrary past date. */
  reconstructRosterAsOf(
    deps: HistoryDeps,
    input: RosterAsOfInput,
  ): MemberAsOf[] {
    if (!isValidISODate(input.date)) {
      throw new InvalidAsOfDateError(input.date);
    }
    return reconstruct(deps.db, input.date);
  },

  /**
   * The one answer to "who were the jama'ah in this Bulan/Tahun": live
   * membership for the current or a future month, the month-end
   * reconstruction for a past month. Rekap, Laporan and Beranda all use
   * this so their figures agree, and a late finalize snapshots the roster
   * as it stood at month-end (HANDOFF §8 #10).
   */
  rosterForPeriod(
    db: DBLike,
    month: number,
    year: number,
    now: Date,
  ): RosterForPeriod {
    if (!isPastPeriod(month, year, now)) {
      return { asOf: null, members: liveRoster(db) };
    }
    const asOf = lastDayOfMonth(year, month);
    return { asOf, members: reconstruct(db, asOf) };
  },
};
