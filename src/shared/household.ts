import type { HouseholdType } from './enums';

export interface HouseholdRow {
  id: number;
  householdNo: string;
  type: HouseholdType;
  headMemberId: number | null;
  headMemberName: string | null;
  headMemberNickname: string | null;
  address: string | null;
  memberCount: number;
  activeMemberCount: number;
}

export interface EditHouseholdInput {
  address?: string | null;
  headMemberId?: number;
}
