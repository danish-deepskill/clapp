import type {
  Gender,
  MemberChangeType,
  MovementType,
  VitalEventType,
} from '../../shared/enums';
import type { DBLike } from '../db';
import {
  memberChanges,
  memberMovements,
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

// All writers accept `DB` so they're callable both standalone and inside a
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
};
