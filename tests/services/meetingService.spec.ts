import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { type DB, openDatabase, runMigrations } from '@main/db';
import {
  activityRecords,
  activityTypes,
  meetingAttendees,
  meetings,
  monthlyReports,
} from '@main/db/schema';
import { roleService } from '@main/services/masterDataService';
import {
  FutureMeetingDateError,
  InvalidMeetingInputError,
  MeetingNotFoundError,
  meetingService,
} from '@main/services/meetingService';
import { memberService } from '@main/services/memberService';
import type { MeetingType } from '@shared/enums';
import type { SaveMeetingInput } from '@shared/meeting';
import type { NewMemberInput } from '@shared/member';
import { InvalidPeriodError } from '@shared/period';

const MIGRATIONS = join(process.cwd(), 'src', 'main', 'db', 'migrations');

function freshDb(): DB {
  const db = openDatabase({ path: ':memory:', inMemory: true });
  runMigrations({ db, migrationsFolder: MIGRATIONS });
  return db;
}

const fixedClock = (iso = '2026-05-23T10:00:00.000Z') => () => new Date(iso);

const FAISAL: NewMemberInput = {
  fullName: 'Ahmad Faisal Rahman',
  nickname: 'Pak Faisal',
  gender: 'Laki-Laki',
  lifeStage: 'Dewasa',
  maritalStatus: 'Menikah',
  bloodType: 'A',
  rhesus: 'Positif',
  birthPlace: 'Jakarta',
  birthDate: '1978-03-12',
  household: { mode: 'create-new', address: 'Jl. Cilandak No. 42' },
  logAs: 'none',
};

const SITI: Omit<NewMemberInput, 'household'> = {
  fullName: 'Siti Aminah Putri',
  nickname: 'Bu Siti',
  gender: 'Perempuan',
  lifeStage: 'Dewasa',
  maritalStatus: 'Menikah',
  bloodType: 'B',
  rhesus: 'Positif',
  logAs: 'none',
};

function seedRole(db: DB, name: string): number {
  // Goes through the service so position auto-assigns + UNIQUE(position)
  // doesn't trip on the second insert.
  return roleService.create({ db }, name).id;
}

function seedActivityTypeMeeting(
  db: DB,
  name: string,
  meetingType: MeetingType,
) {
  return db
    .insert(activityTypes)
    .values({ name, sourceKind: 'meeting', meetingType })
    .returning({ id: activityTypes.id })
    .get();
}

interface SeededWorld {
  imamRoleId: number;
  sekretarisRoleId: number;
  /** Pengurus #1 (Imam). */
  faisal: { id: number };
  /** Pengurus #2 (Sekretaris). */
  siti: { id: number };
  /** Non-Pengurus (role_id = null). */
  andi: { id: number };
  /** Pengurus #3 (Imam). */
  budi: { id: number };
}

function seedWorld(db: DB): SeededWorld {
  const imamRoleId = seedRole(db, 'Imam');
  const sekretarisRoleId = seedRole(db, 'Sekretaris');

  const faisal = memberService.addMember(
    { db },
    { ...FAISAL, roleId: imamRoleId },
  );
  const siti = memberService.addMember(
    { db },
    {
      ...SITI,
      household: { mode: 'join-existing', householdId: faisal.householdId },
      roleId: sekretarisRoleId,
    },
  );
  const andi = memberService.addMember(
    { db },
    { ...FAISAL, fullName: 'Andi Pratama', roleId: null },
  );
  const budi = memberService.addMember(
    { db },
    { ...FAISAL, fullName: 'Budi Santoso', roleId: imamRoleId },
  );

  return {
    imamRoleId,
    sekretarisRoleId,
    faisal: { id: faisal.id },
    siti: { id: siti.id },
    andi: { id: andi.id },
    budi: { id: budi.id },
  };
}

function makeSave(
  overrides: Partial<SaveMeetingInput> = {},
): SaveMeetingInput {
  return {
    meetingDate: '2026-05-20',
    type: 'Musyawarah Kelompok',
    title: 'Persiapan pengajian bulanan Mei',
    resultNotes: 'Catatan hasil rapat.',
    suggestions: 'Saran perbaikan.',
    attendeeMemberIds: [],
    ...overrides,
  };
}

// ─── eligibleAttendees (Pengurus filter) ──────────────────────────────────

describe('meetingService.eligibleAttendees', () => {
  it('returns only members with non-null role_id, joined with role name', () => {
    const db = freshDb();
    const w = seedWorld(db);

    const list = meetingService.eligibleAttendees({ db });
    const ids = list.map((a) => a.memberId);
    expect(ids).toContain(w.faisal.id);
    expect(ids).toContain(w.siti.id);
    expect(ids).toContain(w.budi.id);
    expect(ids).not.toContain(w.andi.id);

    const faisalRow = list.find((a) => a.memberId === w.faisal.id);
    expect(faisalRow?.roleName).toBe('Imam');
  });

  it('excludes inactive members', () => {
    const db = freshDb();
    const w = seedWorld(db);
    memberService.recordMovement(
      { db },
      { memberId: w.siti.id, kind: 'Pindah Sambung', date: '2026-05-20' },
    );
    const ids = meetingService.eligibleAttendees({ db }).map((a) => a.memberId);
    expect(ids).not.toContain(w.siti.id);
    expect(ids).toContain(w.faisal.id);
  });

  it('sorts by role position (roles.position ASC), then by name within role', () => {
    const db = freshDb();
    const w = seedWorld(db);
    const list = meetingService.eligibleAttendees({ db });
    // seedWorld inserts Imam first, then Sekretaris. Imams: Faisal + Budi (alpha).
    expect(list.map((a) => a.fullName)).toEqual([
      'Ahmad Faisal Rahman', // Imam
      'Budi Santoso',         // Imam
      'Siti Aminah Putri',    // Sekretaris
    ]);
    // Sanity: confirms the order isn't coincidentally alphabetical overall.
    expect(list[0]?.roleName).toBe('Imam');
    expect(list[2]?.roleName).toBe('Sekretaris');
    // (touch w to silence unused-var if it ever becomes one)
    expect(w.imamRoleId).toBeLessThan(w.sekretarisRoleId);
  });

  it('role order beats alphabetical: late-alphabet role member appears before early-alphabet sekretaris', () => {
    const db = freshDb();
    const imamId = seedRole(db, 'Imam');
    const sekretarisId = seedRole(db, 'Sekretaris');
    // Sekretaris with a name that sorts BEFORE the Imam.
    memberService.addMember(
      { db },
      { ...FAISAL, fullName: 'Aaron Sekretaris', roleId: sekretarisId },
    );
    memberService.addMember(
      { db },
      { ...FAISAL, fullName: 'Zaid Imam', roleId: imamId },
    );
    const names = meetingService.eligibleAttendees({ db }).map((a) => a.fullName);
    // Imam (role inserted first) wins over alphabet.
    expect(names).toEqual(['Zaid Imam', 'Aaron Sekretaris']);
  });

  it('returns empty when no one has a role assigned', () => {
    const db = freshDb();
    memberService.addMember({ db }, FAISAL);
    expect(meetingService.eligibleAttendees({ db })).toEqual([]);
  });

  it('still includes members whose role has been retired, with roleIsActive=false', () => {
    const db = freshDb();
    const w = seedWorld(db);
    // Retire Sekretaris (Siti's role) in Pengaturan.
    roleService.setActive({ db }, w.sekretarisRoleId, false);

    const list = meetingService.eligibleAttendees({ db });
    const siti = list.find((a) => a.memberId === w.siti.id);
    expect(siti).toBeDefined();
    expect(siti?.roleIsActive).toBe(false);

    // Members on active roles still have roleIsActive=true.
    const faisal = list.find((a) => a.memberId === w.faisal.id);
    expect(faisal?.roleIsActive).toBe(true);
  });
});

// ─── save (create) + listByPeriod + get ───────────────────────────────────

describe('meetingService.save (create)', () => {
  let db: DB;
  let w: SeededWorld;
  beforeEach(() => {
    db = freshDb();
    w = seedWorld(db);
  });

  it('creates a meeting + attendees in one transaction; get() round-trips', () => {
    const result = meetingService.save(
      { db, clock: fixedClock() },
      makeSave({
        attendeeMemberIds: [w.faisal.id, w.siti.id],
      }),
    );
    expect(result.meeting.id).toBeGreaterThan(0);
    expect(result.meeting.attendees).toHaveLength(2);

    const detail = meetingService.get({ db }, result.meeting.id);
    expect(detail.title).toBe('Persiapan pengajian bulanan Mei');
    expect(detail.resultNotes).toBe('Catatan hasil rapat.');
    expect(detail.suggestions).toBe('Saran perbaikan.');
    expect(detail.attendees.map((a) => a.memberId).sort()).toEqual(
      [w.faisal.id, w.siti.id].sort(),
    );
  });

  it('trims whitespace from title', () => {
    const r = meetingService.save(
      { db, clock: fixedClock() },
      makeSave({ title: '  Rapat sore  ' }),
    );
    expect(r.meeting.title).toBe('Rapat sore');
  });

  it('rejects empty title (after trim)', () => {
    expect(() =>
      meetingService.save({ db, clock: fixedClock() }, makeSave({ title: '   ' })),
    ).toThrow(InvalidMeetingInputError);
  });

  it('rejects future meetingDate', () => {
    expect(() =>
      meetingService.save(
        { db, clock: fixedClock('2026-05-23T10:00:00.000Z') },
        makeSave({ meetingDate: '2026-05-24' }),
      ),
    ).toThrow(FutureMeetingDateError);
  });

  it('rejects malformed meetingDate', () => {
    expect(() =>
      meetingService.save(
        { db, clock: fixedClock() },
        makeSave({ meetingDate: '20-05-2026' }),
      ),
    ).toThrow(InvalidMeetingInputError);
  });

  it('rejects duplicate memberId in attendees', () => {
    expect(() =>
      meetingService.save(
        { db, clock: fixedClock() },
        makeSave({ attendeeMemberIds: [w.faisal.id, w.faisal.id] }),
      ),
    ).toThrow(InvalidMeetingInputError);
  });

  it('rejects attendee that is not Pengurus (role_id IS NULL)', () => {
    expect(() =>
      meetingService.save(
        { db, clock: fixedClock() },
        makeSave({ attendeeMemberIds: [w.faisal.id, w.andi.id] }),
      ),
    ).toThrow(InvalidMeetingInputError);
  });

  it('rejects attendee that does not exist', () => {
    expect(() =>
      meetingService.save(
        { db, clock: fixedClock() },
        makeSave({ attendeeMemberIds: [99999] }),
      ),
    ).toThrow(InvalidMeetingInputError);
  });

  it('accepts zero attendees (operator may save before picking)', () => {
    const r = meetingService.save(
      { db, clock: fixedClock() },
      makeSave({ attendeeMemberIds: [] }),
    );
    expect(r.meeting.attendees).toEqual([]);
  });
});

// ─── save (update) + attendee diff ────────────────────────────────────────

describe('meetingService.save (update)', () => {
  let db: DB;
  let w: SeededWorld;
  let meetingId: number;
  beforeEach(() => {
    db = freshDb();
    w = seedWorld(db);
    const created = meetingService.save(
      { db, clock: fixedClock() },
      makeSave({ attendeeMemberIds: [w.faisal.id, w.siti.id] }),
    );
    meetingId = created.meeting.id;
  });

  it('updates fields in place; same id, no new row', () => {
    meetingService.save(
      { db, clock: fixedClock() },
      makeSave({
        id: meetingId,
        title: 'Rapat lanjutan',
        resultNotes: 'Sudah disepakati.',
        suggestions: null,
        attendeeMemberIds: [w.faisal.id, w.siti.id],
      }),
    );
    expect(db.select().from(meetings).all()).toHaveLength(1);
    const detail = meetingService.get({ db }, meetingId);
    expect(detail.title).toBe('Rapat lanjutan');
    expect(detail.suggestions).toBe(null);
  });

  it('adds new attendees + removes dropped ones (diff, not delete-all-reinsert)', () => {
    // Start: faisal, siti. Update to: faisal, budi.
    meetingService.save(
      { db, clock: fixedClock() },
      makeSave({
        id: meetingId,
        attendeeMemberIds: [w.faisal.id, w.budi.id],
      }),
    );
    const detail = meetingService.get({ db }, meetingId);
    expect(detail.attendees.map((a) => a.memberId).sort()).toEqual(
      [w.faisal.id, w.budi.id].sort(),
    );
    // Total junction rows match: no orphaned siti row left behind.
    const all = db.select().from(meetingAttendees).all();
    expect(all).toHaveLength(2);
  });

  it('clears all attendees if next list is empty', () => {
    meetingService.save(
      { db, clock: fixedClock() },
      makeSave({ id: meetingId, attendeeMemberIds: [] }),
    );
    expect(meetingService.get({ db }, meetingId).attendees).toEqual([]);
    expect(db.select().from(meetingAttendees).all()).toHaveLength(0);
  });

  it('throws MeetingNotFoundError when updating a non-existent id', () => {
    expect(() =>
      meetingService.save(
        { db, clock: fixedClock() },
        makeSave({ id: 99999, attendeeMemberIds: [] }),
      ),
    ).toThrow(MeetingNotFoundError);
  });
});

// ─── §8 activity_records trigger ──────────────────────────────────────────

describe('meetingService §8 activity_records trigger', () => {
  let db: DB;
  let w: SeededWorld;
  beforeEach(() => {
    db = freshDb();
    w = seedWorld(db);
  });

  it('UPSERTs activity_records when meeting type matches a meeting-sourced activity_type', () => {
    const at = seedActivityTypeMeeting(
      db,
      'Musyawarah Kelompok Bulanan',
      'Musyawarah Kelompok',
    );

    const r = meetingService.save(
      { db, clock: fixedClock() },
      makeSave({
        type: 'Musyawarah Kelompok',
        meetingDate: '2026-05-20',
        attendeeMemberIds: [w.faisal.id],
      }),
    );
    expect(r.activityRecordsTouched).toBe(1);

    const ar = db
      .select()
      .from(activityRecords)
      .where(eq(activityRecords.activityTypeId, at.id))
      .get();
    expect(ar?.status).toBe('Terlaksana');
    expect(ar?.executedDate).toBe('2026-05-20');
    expect(ar?.sourceMeetingId).toBe(r.meeting.id);
  });

  it('does NOT trigger for type=Lainnya (no matching activity_type seeded)', () => {
    seedActivityTypeMeeting(db, 'Musyawarah Kelompok Bulanan', 'Musyawarah Kelompok');
    seedActivityTypeMeeting(db, 'Musyawarah 5 Unsur', 'Musyawarah 5 Unsur');
    seedActivityTypeMeeting(db, 'Pengkoreksian KU', 'Pengkoreksian KU Bulanan');

    const r = meetingService.save(
      { db, clock: fixedClock() },
      makeSave({ type: 'Lainnya', attendeeMemberIds: [] }),
    );
    expect(r.activityRecordsTouched).toBe(0);
    expect(db.select().from(activityRecords).all()).toHaveLength(0);
  });

  it('creates monthly_reports row when none exists for the meeting period', () => {
    seedActivityTypeMeeting(db, 'MK', 'Musyawarah Kelompok');

    expect(db.select().from(monthlyReports).all()).toHaveLength(0);
    meetingService.save(
      { db, clock: fixedClock() },
      makeSave({ meetingDate: '2026-05-20', attendeeMemberIds: [] }),
    );
    const reports = db.select().from(monthlyReports).all();
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ month: 5, year: 2026 });
  });

  it('reuses existing monthly_reports row instead of creating a duplicate', () => {
    seedActivityTypeMeeting(db, 'MK', 'Musyawarah Kelompok');
    db.insert(monthlyReports).values({ month: 5, year: 2026 }).run();

    meetingService.save(
      { db, clock: fixedClock() },
      makeSave({ meetingDate: '2026-05-20', attendeeMemberIds: [] }),
    );
    expect(db.select().from(monthlyReports).all()).toHaveLength(1);
  });

  it('UPSERT is idempotent: re-saving same meeting keeps one activity_record', () => {
    seedActivityTypeMeeting(db, 'MK', 'Musyawarah Kelompok');
    const r1 = meetingService.save(
      { db, clock: fixedClock() },
      makeSave({ attendeeMemberIds: [] }),
    );
    meetingService.save(
      { db, clock: fixedClock() },
      makeSave({ id: r1.meeting.id, title: 'Edit', attendeeMemberIds: [] }),
    );
    expect(db.select().from(activityRecords).all()).toHaveLength(1);
  });

  it('parses YYYY-MM-DD without timezone slippage at month boundary', () => {
    seedActivityTypeMeeting(db, 'MK', 'Musyawarah Kelompok');
    // 2026-04-30 — must land in month=4, not month=3 or 5.
    meetingService.save(
      { db, clock: fixedClock('2026-05-23T10:00:00.000Z') },
      makeSave({ meetingDate: '2026-04-30', attendeeMemberIds: [] }),
    );
    const report = db.select().from(monthlyReports).get();
    expect(report).toMatchObject({ month: 4, year: 2026 });
  });

  it('respects activity_types.is_active=false (does not trigger)', () => {
    db.insert(activityTypes)
      .values({
        name: 'Musyawarah Kelompok',
        sourceKind: 'meeting',
        meetingType: 'Musyawarah Kelompok',
        isActive: false,
      })
      .run();
    const r = meetingService.save(
      { db, clock: fixedClock() },
      makeSave({ attendeeMemberIds: [] }),
    );
    expect(r.activityRecordsTouched).toBe(0);
  });

  it('triggers multiple activity_types if more than one is mapped to the same meeting_type', () => {
    seedActivityTypeMeeting(db, 'MK Lap-1', 'Musyawarah Kelompok');
    seedActivityTypeMeeting(db, 'MK Lap-2', 'Musyawarah Kelompok');
    const r = meetingService.save(
      { db, clock: fixedClock() },
      makeSave({ attendeeMemberIds: [] }),
    );
    expect(r.activityRecordsTouched).toBe(2);
    expect(db.select().from(activityRecords).all()).toHaveLength(2);
  });
});

// ─── listByPeriod ─────────────────────────────────────────────────────────

describe('meetingService.listByPeriod', () => {
  let db: DB;
  let w: SeededWorld;
  beforeEach(() => {
    db = freshDb();
    w = seedWorld(db);
  });

  it('returns meetings in date-ascending order within the month bounds', () => {
    // Far-future clock so past dates aren't blocked by FutureMeetingDateError.
    const farFuture = () => new Date('2099-12-31');
    meetingService.save(
      { db, clock: farFuture },
      makeSave({ meetingDate: '2026-05-20', title: 'B' }),
    );
    meetingService.save(
      { db, clock: farFuture },
      makeSave({ meetingDate: '2026-05-05', title: 'A' }),
    );
    meetingService.save(
      { db, clock: farFuture },
      makeSave({ meetingDate: '2026-04-30', title: 'OUT' }),
    );
    meetingService.save(
      { db, clock: farFuture },
      makeSave({ meetingDate: '2026-06-01', title: 'OUT2' }),
    );

    const list = meetingService.listByPeriod({ db }, { month: 5, year: 2026 });
    expect(list.map((m) => m.title)).toEqual(['A', 'B']);
  });

  it('attaches attendeeCount derived from the junction', () => {
    const farFuture = () => new Date('2099-12-31');
    const r = meetingService.save(
      { db, clock: farFuture },
      makeSave({
        meetingDate: '2026-05-20',
        attendeeMemberIds: [w.faisal.id, w.siti.id, w.budi.id],
      }),
    );
    const list = meetingService.listByPeriod({ db }, { month: 5, year: 2026 });
    const me = list.find((m) => m.id === r.meeting.id);
    expect(me?.attendeeCount).toBe(3);
  });

  it('returns empty array for a month with no meetings', () => {
    expect(meetingService.listByPeriod({ db }, { month: 5, year: 2026 })).toEqual(
      [],
    );
  });

  it('rejects invalid month/year', () => {
    expect(() =>
      meetingService.listByPeriod({ db }, { month: 13, year: 2026 }),
    ).toThrow(InvalidPeriodError);
    expect(() =>
      meetingService.listByPeriod({ db }, { month: 5, year: 1500 }),
    ).toThrow(InvalidPeriodError);
  });
});

// ─── remove ────────────────────────────────────────────────────────────────

describe('meetingService.remove', () => {
  it('deletes the meeting + attendees in one txn, nulls activity_records backlink', () => {
    const db = freshDb();
    const w = seedWorld(db);
    seedActivityTypeMeeting(db, 'MK', 'Musyawarah Kelompok');

    const r = meetingService.save(
      { db, clock: fixedClock() },
      makeSave({ attendeeMemberIds: [w.faisal.id, w.siti.id] }),
    );

    // Pre-conditions: 2 attendees + 1 activity_record pointing at the meeting.
    expect(db.select().from(meetingAttendees).all()).toHaveLength(2);
    const arBefore = db
      .select()
      .from(activityRecords)
      .where(eq(activityRecords.sourceMeetingId, r.meeting.id))
      .all();
    expect(arBefore).toHaveLength(1);

    meetingService.remove({ db }, r.meeting.id);

    expect(db.select().from(meetings).all()).toHaveLength(0);
    expect(db.select().from(meetingAttendees).all()).toHaveLength(0);
    // activity_record is kept (Terlaksana may still be true), but backlink cleared.
    const arAfter = db.select().from(activityRecords).all();
    expect(arAfter).toHaveLength(1);
    expect(arAfter[0]?.sourceMeetingId).toBe(null);
  });

  it('throws MeetingNotFoundError when the id does not exist', () => {
    const db = freshDb();
    expect(() => meetingService.remove({ db }, 99999)).toThrow(
      MeetingNotFoundError,
    );
  });
});

// ─── Type-change leaves old activity_record alone (self-heals at finalize) ─

describe('meetingService.save (type change semantics)', () => {
  it('changing type does NOT clear the old type’s activity_record (intentional)', () => {
    const db = freshDb();
    const w = seedWorld(db);
    const mkAt = seedActivityTypeMeeting(db, 'MK', 'Musyawarah Kelompok');
    const m5At = seedActivityTypeMeeting(db, 'M5', 'Musyawarah 5 Unsur');

    const r = meetingService.save(
      { db, clock: fixedClock() },
      makeSave({
        type: 'Musyawarah Kelompok',
        attendeeMemberIds: [w.faisal.id],
      }),
    );
    // Now change type to 5 Unsur.
    meetingService.save(
      { db, clock: fixedClock() },
      makeSave({
        id: r.meeting.id,
        type: 'Musyawarah 5 Unsur',
        attendeeMemberIds: [w.faisal.id],
      }),
    );

    const all = db.select().from(activityRecords).all();
    const ar5 = all.find((a) => a.activityTypeId === m5At.id);
    const arMk = all.find((a) => a.activityTypeId === mkAt.id);
    expect(ar5?.status).toBe('Terlaksana');
    // Old MK record kept — Laporan Bulanan recomputes from buckets at finalize.
    expect(arMk?.status).toBe('Terlaksana');
  });
});
