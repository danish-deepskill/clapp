import type { Gender, LifeStage, MeetingType } from './enums';

export interface MeetingListItem {
  id: number;
  meetingDate: string;
  type: MeetingType;
  title: string;
  attendeeCount: number;
}

export interface MeetingAttendee {
  memberId: number;
  fullName: string;
  gender: Gender;
  lifeStage: LifeStage;
  roleName: string;
}

export interface MeetingDetail {
  id: number;
  meetingDate: string;
  type: MeetingType;
  title: string;
  resultNotes: string | null;
  suggestions: string | null;
  attendees: MeetingAttendee[];
}

export interface LoadMeetingsInput {
  month: number;
  year: number;
}

export interface SaveMeetingInput {
  /** Omit for create; pass an id for update. */
  id?: number;
  meetingDate: string;
  type: MeetingType;
  title: string;
  resultNotes: string | null;
  suggestions: string | null;
  attendeeMemberIds: number[];
}

export interface SaveMeetingResult {
  meeting: MeetingDetail;
  activityRecordsTouched: number;
}

/** Member subset returned for the attendee picker (Pengurus only). */
export interface EligibleAttendee {
  memberId: number;
  fullName: string;
  gender: Gender;
  lifeStage: LifeStage;
  roleName: string;
}
