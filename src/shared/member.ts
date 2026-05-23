import type {
  BloodType,
  Gender,
  LifeStage,
  MaritalStatus,
  Rhesus,
} from './enums';

export interface MemberRow {
  id: number;
  householdId: number;
  fullName: string;
  nickname: string | null;
  gender: Gender;
  lifeStage: LifeStage;
  maritalStatus: MaritalStatus;
  bloodType: BloodType;
  rhesus: Rhesus;
  birthPlace: string | null;
  birthDate: string | null;
  roleId: number | null;
  roleName: string | null;
  isActive: boolean;
  isHead: boolean;
}

export type AddMemberLogAs = 'Lahir' | 'Sambung Baru' | 'none';

export type HouseholdChoice =
  | { mode: 'create-new'; address?: string | null }
  | { mode: 'join-existing'; householdId: number };

export interface NewMemberInput {
  fullName: string;
  nickname?: string | null;
  gender: Gender;
  lifeStage: LifeStage;
  maritalStatus: MaritalStatus;
  bloodType: BloodType;
  rhesus: Rhesus;
  birthPlace?: string | null;
  birthDate?: string | null;
  roleId?: number | null;
  household: HouseholdChoice;
  logAs: AddMemberLogAs;
  logDate?: string;
  logNotes?: string | null;
}

export interface EditMemberInput {
  fullName?: string;
  nickname?: string | null;
  gender?: Gender;
  lifeStage?: LifeStage;
  maritalStatus?: MaritalStatus;
  bloodType?: BloodType;
  rhesus?: Rhesus;
  birthPlace?: string | null;
  birthDate?: string | null;
  roleId?: number | null;
  household?: HouseholdChoice;
}

export type MovementKind = 'Pindah Sambung' | 'Meninggal';

export interface RecordMovementInput {
  memberId: number;
  kind: MovementKind;
  date: string;
  notes?: string | null;
  /** Required if the affected member is currently their household's head. */
  newHeadMemberId?: number;
}

export interface MemberFilter {
  search?: string;
  lifeStage?: LifeStage;
  gender?: Gender;
  activeOnly?: boolean;
  pengurusOnly?: boolean;
}
