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
  /** Standing membership in the Serkiler iuran rotation. */
  isSerkiler: boolean;
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
  /** Mode Pendataan Awal — skip all Catatan Peristiwa writes for this call. */
  silentLog?: boolean;
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
  isSerkiler?: boolean;
  household?: HouseholdChoice;
  /** Mode Pendataan Awal — skip member_changes log writes for this call. */
  silentLog?: boolean;
}

export type MovementKind = 'Pindah Sambung' | 'Meninggal';

export interface RecordMovementInput {
  memberId: number;
  kind: MovementKind;
  date: string;
  notes?: string | null;
  /** Required if the affected member is currently their household's head. */
  newHeadMemberId?: number;
  /** Mode Pendataan Awal — skip Catatan Peristiwa writes (state change still applies). */
  silentLog?: boolean;
}

export interface MemberFilter {
  search?: string;
  lifeStage?: LifeStage;
  gender?: Gender;
  activeOnly?: boolean;
  pengurusOnly?: boolean;
}
