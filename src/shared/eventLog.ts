import type {
  Gender,
  MemberChangeType,
  MovementType,
  VitalEventType,
} from './enums';

/**
 * Discriminated union over the three event-log tables. CONTEXT §49: presented
 * as one chronological stream in Catatan Peristiwa, never as 3 separate tables.
 */
export type EventLogEntry =
  | {
      source: 'vital';
      id: number;
      date: string;
      kind: VitalEventType;
      memberId: number | null;
      /** Name of the member if linked, else the standalone `name` field. */
      memberName: string;
      gender: Gender | null;
      notes: string | null;
    }
  | {
      source: 'movement';
      id: number;
      date: string;
      kind: MovementType;
      memberId: number;
      memberName: string;
      notes: string | null;
    }
  | {
      source: 'change';
      id: number;
      date: string;
      kind: MemberChangeType;
      memberId: number;
      memberName: string;
      oldValue: string | null;
      newValue: string | null;
    };

/** Top-level event categories — collapse 7 backing kinds into 4 filter chips. */
export const EVENT_GROUPS = ['vital', 'arrival-departure', 'change'] as const;
export type EventGroup = (typeof EVENT_GROUPS)[number];

export interface LoadEventLogInput {
  month: number;
  year: number;
  /** Empty = all groups. */
  groups?: EventGroup[];
}
