import type {
  ActivityRecordStatus,
  ActivitySourceKind,
  AttendanceStatus,
  BloodType,
  Gender,
  HouseholdType,
  LifeStage,
  MaritalStatus,
  MeetingType,
  MemberChangeType,
  MovementType,
  Rhesus,
  VitalEventType,
} from './enums';

export interface Household {
  id: number;
  householdNo: string;
  type: HouseholdType;
  headMemberId: number | null;
  address: string | null;
}

export interface Member {
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
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: number;
  name: string;
  isActive: boolean;
}

export interface SessionType {
  id: number;
  name: string;
  isActive: boolean;
}

export interface Session {
  id: number;
  sessionDate: string;
  sessionTypeId: number;
}

export interface Attendance {
  id: number;
  memberId: number;
  sessionId: number;
  status: AttendanceStatus;
  arrivalAt: Date | null;
  donationAmount: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Meeting {
  id: number;
  meetingDate: string;
  type: MeetingType;
  title: string;
  resultNotes: string | null;
  suggestions: string | null;
}

export interface CircularRosterEntry {
  id: number;
  memberId: number;
  period: string;
  paraf: boolean;
  circulationAmount: number | null;
}

export interface VitalRecord {
  id: number;
  eventType: VitalEventType;
  eventDate: string;
  memberId: number | null;
  name: string | null;
  gender: Gender | null;
  notes: string | null;
  createdAt: Date;
}

export interface MemberMovement {
  id: number;
  movementType: MovementType;
  movementDate: string;
  memberId: number;
  notes: string | null;
  createdAt: Date;
}

export interface MemberChange {
  id: number;
  changeType: MemberChangeType;
  changeDate: string;
  memberId: number;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
}

export interface MonthlyReport {
  id: number;
  month: number;
  year: number;
  limaBabLancar: number | null;
  limaBabKurangLancar: number | null;
  limaBabKurangSambung: number | null;
  limaBabTabayyun: number | null;
  rencanaBece: string | null;
  berasJimpitan: string | null;
  fotocopyDalil: string | null;
  otherNotes: string | null;
  visitPlans: VisitPlan[] | null;
  constructionProjects: ConstructionProject[] | null;
  finalizedAt: Date | null;
  demographicsSnapshot: DemographicsSnapshot | null;
}

export interface VisitPlan {
  time: string;
  place: string;
  agenda: string;
  notes: string;
}

export interface ConstructionProject {
  type: string;
  purpose: string;
  volume: string;
  funds: string;
  condition: string;
}

export interface DemographicsSnapshot {
  tahap: { name: LifeStage; L: number; P: number }[];
  janda: number;
  duda: number;
  totalActive: number;
  totalHouseholds: number;
}

export interface FamilyVisit {
  id: number;
  reportId: number;
  householdId: number | null;
  familyName: string | null;
  notes: string | null;
}

export interface SickRecord {
  id: number;
  reportId: number;
  memberId: number;
  notes: string | null;
  createdAt: Date;
}

export interface ActivityType {
  id: number;
  name: string;
  sourceKind: ActivitySourceKind;
  meetingType: MeetingType | null;
  sessionTypeId: number | null;
  isActive: boolean;
}

export interface ActivityRecord {
  id: number;
  reportId: number;
  activityTypeId: number;
  status: ActivityRecordStatus;
  executedDate: string | null;
  attendeeCount: number | null;
  location: string | null;
  sourceMeetingId: number | null;
}
