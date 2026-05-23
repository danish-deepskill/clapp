import { join } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { type DB, openDatabase, runMigrations } from '@main/db';
import {
  activityRecords,
  activityTypes,
  households,
  members,
  monthlyReports,
  roles,
  sessions,
  sessionTypes,
} from '@main/db/schema';
import {
  DuplicateNameError,
  EmptyNameError,
  NotFoundError,
  activityTypeService,
  masterDataServices,
  roleService,
  sessionTypeService,
} from '@main/services/masterDataService';

const MIGRATIONS_FOLDER = join(process.cwd(), 'src', 'main', 'db', 'migrations');

function freshDb(): DB {
  const db = openDatabase({ path: ':memory:', inMemory: true });
  runMigrations({ db, migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}

// ─── role service ───────────────────────────────────────────────────────────

describe('roleService', () => {
  let db: DB;
  beforeEach(() => {
    db = freshDb();
  });

  describe('list', () => {
    it('returns empty array on a fresh database', () => {
      expect(roleService.list({ db })).toEqual([]);
    });

    it('includes both active and inactive roles, alphabetized', () => {
      roleService.create({ db }, 'Imam');
      const wakil = roleService.create({ db }, 'Wakil');
      roleService.create({ db }, 'Bendahara');
      roleService.setActive({ db }, wakil.id, false);

      const items = roleService.list({ db });
      expect(items.map((i) => i.name)).toEqual(['Bendahara', 'Imam', 'Wakil']);
      expect(items.find((i) => i.name === 'Wakil')?.isActive).toBe(false);
    });
  });

  describe('create', () => {
    it('creates with isActive=true by default', () => {
      const role = roleService.create({ db }, 'Imam');
      expect(role).toEqual({
        id: expect.any(Number),
        name: 'Imam',
        isActive: true,
      });
    });

    it('trims surrounding whitespace', () => {
      const role = roleService.create({ db }, '  Imam  ');
      expect(role.name).toBe('Imam');
    });

    it('rejects empty / whitespace-only names', () => {
      expect(() => roleService.create({ db }, '')).toThrow(EmptyNameError);
      expect(() => roleService.create({ db }, '   ')).toThrow(EmptyNameError);
    });

    it('rejects duplicate name with DuplicateNameError', () => {
      roleService.create({ db }, 'Imam');
      expect(() => roleService.create({ db }, 'Imam')).toThrow(DuplicateNameError);
    });

    it('is case-sensitive — "Imam" and "imam" are different roles', () => {
      roleService.create({ db }, 'Imam');
      expect(() => roleService.create({ db }, 'imam')).not.toThrow();
    });
  });

  describe('rename', () => {
    it('updates the name', () => {
      const role = roleService.create({ db }, 'Imam');
      const renamed = roleService.rename({ db }, role.id, 'Imam Besar');
      expect(renamed.name).toBe('Imam Besar');
      expect(roleService.list({ db })[0]?.name).toBe('Imam Besar');
    });

    it('is a no-op when renamed to the same name (does not trip duplicate check)', () => {
      const role = roleService.create({ db }, 'Imam');
      expect(() => roleService.rename({ db }, role.id, 'Imam')).not.toThrow();
    });

    it('rejects rename that collides with another row', () => {
      const imam = roleService.create({ db }, 'Imam');
      roleService.create({ db }, 'Wakil');
      expect(() => roleService.rename({ db }, imam.id, 'Wakil')).toThrow(
        DuplicateNameError,
      );
    });

    it('throws NotFoundError if id does not exist', () => {
      expect(() => roleService.rename({ db }, 999, 'Imam')).toThrow(NotFoundError);
    });
  });

  describe('setActive', () => {
    it('soft-retires (flips is_active to false), does not delete', () => {
      const role = roleService.create({ db }, 'Imam');
      roleService.setActive({ db }, role.id, false);
      const items = roleService.list({ db });
      expect(items).toHaveLength(1);
      expect(items[0]?.isActive).toBe(false);
    });

    it('can reactivate', () => {
      const role = roleService.create({ db }, 'Imam');
      roleService.setActive({ db }, role.id, false);
      roleService.setActive({ db }, role.id, true);
      expect(roleService.list({ db })[0]?.isActive).toBe(true);
    });

    it('throws NotFoundError if id does not exist', () => {
      expect(() => roleService.setActive({ db }, 999, false)).toThrow(NotFoundError);
    });
  });

  describe('remove', () => {
    it('hard-deletes when nothing references the role', () => {
      const role = roleService.create({ db }, 'Imam');
      const result = roleService.remove({ db }, role.id);
      expect(result).toEqual({ removed: true });
      expect(roleService.list({ db })).toEqual([]);
    });

    it('refuses to delete when a member references the role', () => {
      const role = roleService.create({ db }, 'Imam');
      const hh = db
        .insert(households)
        .values({ householdNo: '001', type: 'KK' })
        .returning({ id: households.id })
        .get();
      db.insert(members)
        .values({
          householdId: hh.id,
          fullName: 'Ahmad Faisal',
          gender: 'Laki-Laki',
          lifeStage: 'Dewasa',
          maritalStatus: 'Menikah',
          bloodType: 'A',
          rhesus: 'Positif',
          roleId: role.id,
        })
        .run();

      const result = roleService.remove({ db }, role.id);
      expect(result).toEqual({
        removed: false,
        reason: 'has_references',
        count: 1,
        references: "jama'ah",
      });
      // Role still present after refused delete.
      expect(roleService.list({ db })).toHaveLength(1);
    });

    it('throws NotFoundError if id does not exist', () => {
      expect(() => roleService.remove({ db }, 999)).toThrow(NotFoundError);
    });
  });
});

// ─── session_type service ─────────────────────────────────────────────────────

describe('sessionTypeService', () => {
  let db: DB;
  beforeEach(() => {
    db = freshDb();
  });

  it('creates, lists, renames, soft-retires (same pattern as roles)', () => {
    const hasda = sessionTypeService.create({ db }, 'Hasda');
    sessionTypeService.create({ db }, 'Dalil-dalil');
    sessionTypeService.rename({ db }, hasda.id, 'Hasda Sore');
    sessionTypeService.setActive({ db }, hasda.id, false);

    const items = sessionTypeService.list({ db });
    expect(items.map((i) => i.name)).toEqual(['Dalil-dalil', 'Hasda Sore']);
    expect(items.find((i) => i.name === 'Hasda Sore')?.isActive).toBe(false);
  });

  it('rejects duplicate names', () => {
    sessionTypeService.create({ db }, 'Hasda');
    expect(() => sessionTypeService.create({ db }, 'Hasda')).toThrow(
      DuplicateNameError,
    );
  });

  describe('remove', () => {
    it('hard-deletes when no references', () => {
      const t = sessionTypeService.create({ db }, 'Hasda');
      expect(sessionTypeService.remove({ db }, t.id)).toEqual({ removed: true });
    });

    it('refuses delete when a session references the type', () => {
      const t = sessionTypeService.create({ db }, 'Hasda');
      db.insert(sessions)
        .values({ sessionDate: '2026-05-23', sessionTypeId: t.id })
        .run();

      const result = sessionTypeService.remove({ db }, t.id);
      expect(result).toEqual({
        removed: false,
        reason: 'has_references',
        count: 1,
        references: 'sesi pengajian',
      });
    });

    it('refuses delete when an activity_type references the session_type', () => {
      const t = sessionTypeService.create({ db }, 'Hasda');
      db.insert(activityTypes)
        .values({
          name: 'Pengajian Ibu-Ibu Kelompok',
          sourceKind: 'session',
          sessionTypeId: t.id,
        })
        .run();

      const result = sessionTypeService.remove({ db }, t.id);
      expect(result).toMatchObject({
        removed: false,
        reason: 'has_references',
        count: 1,
        references: 'jenis kegiatan',
      });
    });

    it('aggregates count across all reference sources', () => {
      const t = sessionTypeService.create({ db }, 'Hasda');
      db.insert(sessions)
        .values({ sessionDate: '2026-05-23', sessionTypeId: t.id })
        .run();
      db.insert(sessions)
        .values({ sessionDate: '2026-05-30', sessionTypeId: t.id })
        .run();
      db.insert(activityTypes)
        .values({
          name: 'Penderesan ASAD',
          sourceKind: 'session',
          sessionTypeId: t.id,
        })
        .run();

      const result = sessionTypeService.remove({ db }, t.id);
      expect(result).toMatchObject({
        removed: false,
        reason: 'has_references',
        count: 3,
        references: 'sesi pengajian & jenis kegiatan',
      });
    });
  });
});

// ─── activity_type service ────────────────────────────────────────────────────

describe('activityTypeService', () => {
  let db: DB;
  beforeEach(() => {
    db = freshDb();
  });

  it('defaults new activity_types to sourceKind=manual', () => {
    activityTypeService.create({ db }, 'Bakti Sosial');
    const row = db
      .select({
        name: activityTypes.name,
        sourceKind: activityTypes.sourceKind,
        meetingType: activityTypes.meetingType,
        sessionTypeId: activityTypes.sessionTypeId,
      })
      .from(activityTypes)
      .get();
    expect(row).toEqual({
      name: 'Bakti Sosial',
      sourceKind: 'manual',
      meetingType: null,
      sessionTypeId: null,
    });
  });

  it('rejects duplicate names', () => {
    activityTypeService.create({ db }, 'Musyawarah Kelompok');
    expect(() =>
      activityTypeService.create({ db }, 'Musyawarah Kelompok'),
    ).toThrow(DuplicateNameError);
  });

  it('soft-retires via setActive', () => {
    const t = activityTypeService.create({ db }, 'Musyawarah Kelompok');
    activityTypeService.setActive({ db }, t.id, false);
    expect(activityTypeService.list({ db })[0]?.isActive).toBe(false);
  });

  describe('remove', () => {
    it('hard-deletes when no activity_records reference it', () => {
      const t = activityTypeService.create({ db }, 'Musyawarah Kelompok');
      expect(activityTypeService.remove({ db }, t.id)).toEqual({ removed: true });
    });

    it('refuses delete when an activity_record references it', () => {
      const t = activityTypeService.create({ db }, 'Musyawarah Kelompok');
      const report = db
        .insert(monthlyReports)
        .values({ month: 5, year: 2026 })
        .returning({ id: monthlyReports.id })
        .get();
      db.insert(activityRecords)
        .values({
          reportId: report.id,
          activityTypeId: t.id,
          status: 'Terlaksana',
        })
        .run();

      const result = activityTypeService.remove({ db }, t.id);
      expect(result).toEqual({
        removed: false,
        reason: 'has_references',
        count: 1,
        references: 'laporan bulanan',
      });
    });
  });
});

// ─── shared shape ────────────────────────────────────────────────────────────

describe('masterDataServices map', () => {
  it('exposes the three kinds with identical CRUD surfaces', () => {
    expect(Object.keys(masterDataServices)).toEqual([
      'roles',
      'sessionTypes',
      'activityTypes',
    ]);
    for (const svc of Object.values(masterDataServices)) {
      expect(typeof svc.list).toBe('function');
      expect(typeof svc.create).toBe('function');
      expect(typeof svc.rename).toBe('function');
      expect(typeof svc.setActive).toBe('function');
      expect(typeof svc.remove).toBe('function');
    }
  });
});

// ─── transaction rollback ────────────────────────────────────────────────────

describe('transaction safety', () => {
  let db: DB;
  beforeEach(() => {
    db = freshDb();
  });

  it('rolls back create on duplicate-name error (no orphan row)', () => {
    roleService.create({ db }, 'Imam');
    const before = roleService.list({ db }).length;
    try {
      roleService.create({ db }, 'Imam');
    } catch {
      // expected
    }
    expect(roleService.list({ db })).toHaveLength(before);
  });
});

// Direct reference so unused-import linter doesn't complain when @main/db tables
// are imported purely for FK-violation tests above.
void roles;
void sessions;
