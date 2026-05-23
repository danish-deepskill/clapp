import { sql } from 'drizzle-orm';
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import {
  ACTIVITY_RECORD_STATUS,
  ACTIVITY_SOURCE_KIND,
  ATTENDANCE_STATUS,
  BLOOD_TYPE,
  GENDER,
  HOUSEHOLD_TYPE,
  LIFE_STAGE,
  MARITAL_STATUS,
  MEETING_TYPE,
  MEMBER_CHANGE_TYPE,
  MOVEMENT_TYPE,
  RHESUS,
  VITAL_EVENT_TYPE,
} from '../../shared/enums';

// ─── Identity ──────────────────────────────────────────────────────────────

export const roles = sqliteTable('roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const households = sqliteTable(
  'households',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    householdNo: text('household_no').notNull(),
    type: text('type', { enum: HOUSEHOLD_TYPE }).notNull(),
    // Nullable to break the households↔members cycle on initial insert.
    headMemberId: integer('head_member_id'),
    address: text('address'),
  },
  (t) => ({
    householdNoUq: uniqueIndex('households_household_no_uq').on(t.householdNo),
  }),
);

export const members = sqliteTable('members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  householdId: integer('household_id')
    .notNull()
    .references(() => households.id),
  fullName: text('full_name').notNull(),
  nickname: text('nickname'),
  gender: text('gender', { enum: GENDER }).notNull(),
  lifeStage: text('life_stage', { enum: LIFE_STAGE }).notNull(),
  maritalStatus: text('marital_status', { enum: MARITAL_STATUS }).notNull(),
  bloodType: text('blood_type', { enum: BLOOD_TYPE }).notNull(),
  rhesus: text('rhesus', { enum: RHESUS }).notNull(),
  birthPlace: text('birth_place'),
  birthDate: text('birth_date'),
  roleId: integer('role_id').references(() => roles.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Attendance ────────────────────────────────────────────────────────────

export const sessionTypes = sqliteTable('session_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const sessions = sqliteTable(
  'sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionDate: text('session_date').notNull(),
    sessionTypeId: integer('session_type_id')
      .notNull()
      .references(() => sessionTypes.id),
  },
  (t) => ({
    typeDateUq: uniqueIndex('sessions_type_date_uq').on(
      t.sessionTypeId,
      t.sessionDate,
    ),
  }),
);

export const attendance = sqliteTable(
  'attendance',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id),
    sessionId: integer('session_id')
      .notNull()
      .references(() => sessions.id),
    status: text('status', { enum: ATTENDANCE_STATUS }).notNull(),
    arrivalAt: integer('arrival_at', { mode: 'timestamp' }),
    donationAmount: integer('donation_amount'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    memberSessionUq: uniqueIndex('attendance_member_session_uq').on(
      t.memberId,
      t.sessionId,
    ),
  }),
);

// ─── Meetings + Roster ─────────────────────────────────────────────────────

export const meetings = sqliteTable('meetings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingDate: text('meeting_date').notNull(),
  type: text('type', { enum: MEETING_TYPE }).notNull(),
  title: text('title').notNull(),
  resultNotes: text('result_notes'),
  suggestions: text('suggestions'),
});

export const meetingAttendees = sqliteTable(
  'meeting_attendees',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    meetingId: integer('meeting_id')
      .notNull()
      .references(() => meetings.id),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id),
  },
  (t) => ({
    meetingMemberUq: uniqueIndex('meeting_attendees_meeting_member_uq').on(
      t.meetingId,
      t.memberId,
    ),
  }),
);

export const circularRoster = sqliteTable('circular_roster', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: integer('member_id')
    .notNull()
    .references(() => members.id),
  period: text('period').notNull(),
  paraf: integer('paraf', { mode: 'boolean' }).notNull().default(false),
  circulationAmount: integer('circulation_amount'),
});

// ─── Event log (Catatan Peristiwa) ─────────────────────────────────────────

export const vitalRecords = sqliteTable('vital_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventType: text('event_type', { enum: VITAL_EVENT_TYPE }).notNull(),
  eventDate: text('event_date').notNull(),
  memberId: integer('member_id').references(() => members.id),
  name: text('name'),
  gender: text('gender', { enum: GENDER }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const memberMovements = sqliteTable('member_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  movementType: text('movement_type', { enum: MOVEMENT_TYPE }).notNull(),
  movementDate: text('movement_date').notNull(),
  memberId: integer('member_id')
    .notNull()
    .references(() => members.id),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const memberChanges = sqliteTable('member_changes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  changeType: text('change_type', { enum: MEMBER_CHANGE_TYPE }).notNull(),
  changeDate: text('change_date').notNull(),
  memberId: integer('member_id')
    .notNull()
    .references(() => members.id),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Monthly report ────────────────────────────────────────────────────────

export const monthlyReports = sqliteTable(
  'monthly_reports',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    month: integer('month').notNull(),
    year: integer('year').notNull(),
    limaBabLancar: integer('lima_bab_lancar'),
    limaBabKurangLancar: integer('lima_bab_kurang_lancar'),
    limaBabKurangSambung: integer('lima_bab_kurang_sambung'),
    limaBabTabayyun: integer('lima_bab_tabayyun'),
    rencanaBece: text('rencana_bece'),
    berasJimpitan: text('beras_jimpitan'),
    fotocopyDalil: text('fotocopy_dalil'),
    otherNotes: text('other_notes'),
    visitPlans: text('visit_plans', { mode: 'json' }),
    constructionProjects: text('construction_projects', { mode: 'json' }),
    finalizedAt: integer('finalized_at', { mode: 'timestamp' }),
    demographicsSnapshot: text('demographics_snapshot', { mode: 'json' }),
  },
  (t) => ({
    monthYearUq: uniqueIndex('monthly_reports_month_year_uq').on(
      t.month,
      t.year,
    ),
  }),
);

export const familyVisits = sqliteTable('family_visits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reportId: integer('report_id')
    .notNull()
    .references(() => monthlyReports.id),
  householdId: integer('household_id').references(() => households.id),
  familyName: text('family_name'),
  notes: text('notes'),
});

export const sickRecords = sqliteTable('sick_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reportId: integer('report_id')
    .notNull()
    .references(() => monthlyReports.id),
  memberId: integer('member_id')
    .notNull()
    .references(() => members.id),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const activityTypes = sqliteTable('activity_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sourceKind: text('source_kind', { enum: ACTIVITY_SOURCE_KIND }).notNull(),
  meetingType: text('meeting_type', { enum: MEETING_TYPE }),
  sessionTypeId: integer('session_type_id').references(() => sessionTypes.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const activityRecords = sqliteTable(
  'activity_records',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    reportId: integer('report_id')
      .notNull()
      .references(() => monthlyReports.id),
    activityTypeId: integer('activity_type_id')
      .notNull()
      .references(() => activityTypes.id),
    status: text('status', { enum: ACTIVITY_RECORD_STATUS }).notNull(),
    executedDate: text('executed_date'),
    attendeeCount: integer('attendee_count'),
    location: text('location'),
    sourceMeetingId: integer('source_meeting_id').references(() => meetings.id),
  },
  (t) => ({
    reportTypeUq: uniqueIndex('activity_records_report_type_uq').on(
      t.reportId,
      t.activityTypeId,
    ),
  }),
);
