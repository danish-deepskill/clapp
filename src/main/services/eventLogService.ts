import type {
  Gender,
  MemberChangeType,
  MovementType,
  VitalEventType,
} from '../../shared/enums';
import type {
  EventGroup,
  EventLogEntry,
  LoadEventLogInput,
} from '../../shared/eventLog';
import { monthRange } from '../../shared/period';
import type { DB, DBLike } from '../db';
import {
  memberChanges,
  memberMovements,
  members,
  vitalRecords,
} from '../db/schema';

export interface VitalInput {
  eventType: VitalEventType;
  eventDate: string;
  memberId: number | null;
  name?: string | null;
  gender?: Gender | null;
  notes?: string | null;
}

export interface MovementLogInput {
  movementType: MovementType;
  movementDate: string;
  memberId: number;
  notes?: string | null;
}

export interface MemberChangeInput {
  changeType: MemberChangeType;
  changeDate: string;
  memberId: number;
  oldValue: string | null;
  newValue: string | null;
}

export interface EventLogDeps {
  db: DB;
}

// All writers accept `DBLike` so they're callable both standalone and inside a
// .transaction((tx) => ...) callback — drizzle's tx is structurally identical.

export const eventLogService = {
  recordVital(db: DBLike, input: VitalInput): void {
    db.insert(vitalRecords)
      .values({
        eventType: input.eventType,
        eventDate: input.eventDate,
        memberId: input.memberId,
        name: input.name ?? null,
        gender: input.gender ?? null,
        notes: input.notes ?? null,
      })
      .run();
  },

  recordMovement(db: DBLike, input: MovementLogInput): void {
    db.insert(memberMovements)
      .values({
        movementType: input.movementType,
        movementDate: input.movementDate,
        memberId: input.memberId,
        notes: input.notes ?? null,
      })
      .run();
  },

  recordChange(db: DBLike, input: MemberChangeInput): void {
    db.insert(memberChanges)
      .values({
        changeType: input.changeType,
        changeDate: input.changeDate,
        memberId: input.memberId,
        oldValue: input.oldValue,
        newValue: input.newValue,
      })
      .run();
  },

  /**
   * Read-only UNION over the three event-log tables, presented as one
   * chronological stream (CONTEXT §49). Filters by month/year period +
   * optionally by event group. Joins member name via member_id.
   */
  listByPeriod(
    deps: EventLogDeps,
    input: LoadEventLogInput,
  ): EventLogEntry[] {
    const { start, end } = monthRange(input.month, input.year);
    const groups = input.groups ?? [];
    const include = (g: EventGroup) => groups.length === 0 || groups.includes(g);

    const memberById = new Map(
      deps.db
        .select({ id: members.id, fullName: members.fullName })
        .from(members)
        .all()
        .map((m) => [m.id, m.fullName]),
    );

    const entries: EventLogEntry[] = [];

    if (include('vital')) {
      const rows = deps.db
        .select()
        .from(vitalRecords)
        .all()
        .filter((r) => r.eventDate >= start && r.eventDate < end);
      for (const r of rows) {
        entries.push({
          source: 'vital',
          id: r.id,
          date: r.eventDate,
          kind: r.eventType,
          memberId: r.memberId,
          memberName:
            (r.memberId !== null ? memberById.get(r.memberId) : null) ??
            r.name ??
            '(tidak diketahui)',
          gender: r.gender,
          notes: r.notes,
        });
      }
    }

    if (include('arrival-departure')) {
      const rows = deps.db
        .select()
        .from(memberMovements)
        .all()
        .filter((r) => r.movementDate >= start && r.movementDate < end);
      for (const r of rows) {
        entries.push({
          source: 'movement',
          id: r.id,
          date: r.movementDate,
          kind: r.movementType,
          memberId: r.memberId,
          memberName: memberById.get(r.memberId) ?? '(tidak diketahui)',
          notes: r.notes,
        });
      }
    }

    if (include('change')) {
      const rows = deps.db
        .select()
        .from(memberChanges)
        .all()
        .filter((r) => r.changeDate >= start && r.changeDate < end);
      for (const r of rows) {
        entries.push({
          source: 'change',
          id: r.id,
          date: r.changeDate,
          kind: r.changeType,
          memberId: r.memberId,
          memberName: memberById.get(r.memberId) ?? '(tidak diketahui)',
          oldValue: r.oldValue,
          newValue: r.newValue,
        });
      }
    }

    // Chronological asc; same-date tiebreak prefers life events first
    // (vital → movement → change) so arrivals show before subsequent edits.
    const SOURCE_ORDER = { vital: 0, movement: 1, change: 2 } as const;
    entries.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.source !== b.source)
        return SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source];
      return a.id - b.id;
    });

    return entries;
  },
};
