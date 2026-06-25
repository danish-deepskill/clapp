import type { Gender, LifeStage, MaritalStatus } from './enums';

/** A member's reconstructed state as of a past month-end. */
export interface MemberAsOf {
  id: number;
  fullName: string;
  nickname: string | null;
  gender: Gender;
  householdId: number;
  /** Current household number (household moves aren't event-logged). */
  householdNo: string;
  lifeStage: LifeStage;
  maritalStatus: MaritalStatus;
  roleName: string | null;
}

export interface RosterAsOfInput {
  /** Month-end ISO date (YYYY-MM-DD) to reconstruct as of. */
  date: string;
}
