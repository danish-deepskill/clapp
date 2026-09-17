import { eq } from 'drizzle-orm';
import type { ZodIssue } from 'zod';

import { LIFE_STAGE } from '../../shared/enums';
import type {
  SeedCommitResult,
  SeedIssue,
  SeedPreview,
  SeedStatus,
} from '../../shared/seed';
import { SeedSchema, type Seed } from '../../shared/seedSchema';
import type { DB } from '../db';
import {
  activityTypes,
  households,
  members,
  roles,
  sessionTypes,
} from '../db/schema';

export interface SeedDeps {
  db: DB;
}

export class SeedAlreadyCommittedError extends Error {
  constructor(count: number) {
    super(
      `Database sudah berisi ${count} jama'ah — seed.json hanya diimpor sekali (pulihkan dari backup, bukan impor ulang)`,
    );
    this.name = 'SeedAlreadyCommittedError';
  }
}

/**
 * Provisional master data seeded alongside the roster (HANDOFF §12.2, §12.5).
 * All of it is operator-editable in Pengaturan; CONTEXT §6 lists the client
 * confirmations still pending. Extra role names found in seed.json are
 * appended so every member's role resolves.
 */
export const PROVISIONAL_ROLES = [
  'Imam',
  'Wakil',
  'Sekretaris',
  'Bendahara',
  'Penerobos',
  'KU',
  'KMM',
  'Aghnia',
  'Muballigh',
  'PJP',
] as const;

export const DEFAULT_SESSION_TYPES = [
  'Hasda',
  'Dalil-dalil',
  'Penerobos Desa',
  "Qur'an",
  'Q+K.Zakat',
  'Pengajian Ibu-Ibu',
  'Penderesan ASAD',
] as const;

export const DEFAULT_ACTIVITY_TYPES: readonly {
  name: string;
  sourceKind: 'meeting' | 'session';
  meetingType?: 'Musyawarah Kelompok' | 'Musyawarah 5 Unsur' | 'Pengkoreksian KU Bulanan';
  sessionType?: string;
}[] = [
  // Order = the manager's Laporan sheet (KEGIATAN KELOMPOK rows 1–6).
  { name: 'Penderesan ASAD', sourceKind: 'session', sessionType: 'Penderesan ASAD' },
  { name: 'Musyawarah Kelompok', sourceKind: 'meeting', meetingType: 'Musyawarah Kelompok' },
  { name: 'Musyawarah 5 Unsur', sourceKind: 'meeting', meetingType: 'Musyawarah 5 Unsur' },
  { name: 'Pengkoreksian KU Bulanan', sourceKind: 'meeting', meetingType: 'Pengkoreksian KU Bulanan' },
  { name: 'Pertemuan 5 Unsur', sourceKind: 'meeting', meetingType: 'Musyawarah 5 Unsur' },
  { name: 'Pengajian Ibu-Ibu Kelompok', sourceKind: 'session', sessionType: 'Pengajian Ibu-Ibu' },
];

/** `['households', 3, 'members', 1, 'birth_date']` → "KK #4 › Anggota #2 › birth_date". */
function humanPath(path: (string | number)[]): string {
  const parts: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    const next = path[i + 1];
    if (seg === 'households' && typeof next === 'number') {
      parts.push(`KK #${next + 1}`);
      i += 1;
    } else if (seg === 'members' && typeof next === 'number') {
      parts.push(`Anggota #${next + 1}`);
      i += 1;
    } else {
      parts.push(String(seg));
    }
  }
  return parts.length === 0 ? '(file)' : parts.join(' › ');
}

function toIssue(issue: ZodIssue): SeedIssue {
  return { path: humanPath(issue.path), message: issue.message };
}

/**
 * Zod skips object-level refinements when any field fails, so the one
 * cross-household rule (unique household_no) is checked here on the raw
 * shape and merged with the field issues — the operator sees everything
 * wrong with the file in one pass.
 */
function duplicateHouseholdIssues(raw: unknown): SeedIssue[] {
  const hh = (raw as { households?: unknown } | null)?.households;
  if (!Array.isArray(hh)) return [];
  const seen = new Map<string, number>();
  const issues: SeedIssue[] = [];
  hh.forEach((h, i) => {
    const no = (h as { household_no?: unknown } | null)?.household_no;
    if (typeof no !== 'string') return;
    const first = seen.get(no);
    if (first === undefined) {
      seen.set(no, i);
    } else {
      issues.push({
        path: humanPath(['households', i, 'household_no']),
        message: `Nomor KK  dipakai dua kali (juga di KK #)`,
      });
    }
  });
  return issues;
}

function previewOf(seed: Seed): Omit<SeedPreview, 'path'> {
  const all = seed.households.flatMap((h) => h.members);
  const active = all.filter((m) => m.is_active);
  const roleNames: string[] = [];
  for (const m of all) {
    if (m.role && !roleNames.includes(m.role)) roleNames.push(m.role);
  }
  return {
    kelompokName: seed.kelompok.name,
    region: seed.kelompok.region,
    households: seed.households.length,
    kk: seed.households.filter((h) => h.type === 'KK').length,
    kks: seed.households.filter((h) => h.type === 'KK-S').length,
    members: all.length,
    active: active.length,
    inactive: all.length - active.length,
    pengurus: all.filter((m) => m.role !== null).length,
    roles: roleNames,
    byStage: LIFE_STAGE.map((stage) => {
      const inStage = active.filter((m) => m.life_stage === stage);
      const male = inStage.filter((m) => m.gender === 'Laki-Laki').length;
      const female = inStage.filter((m) => m.gender === 'Perempuan').length;
      return { stage, male, female, total: male + female };
    }),
  };
}

export const seedService = {
  status(deps: SeedDeps): SeedStatus {
    return { hasMembers: deps.db.select().from(members).all().length > 0 };
  },

  /** Validate parsed JSON against the import contract; never touches the DB. */
  parse(
    raw: unknown,
  ):
    | { ok: true; seed: Seed; preview: Omit<SeedPreview, 'path'> }
    | { ok: false; issues: SeedIssue[] } {
    const result = SeedSchema.safeParse(raw);
    const issues = [
      ...(result.success ? [] : result.error.issues.map(toIssue)),
      ...duplicateHouseholdIssues(raw),
    ];
    if (!result.success || issues.length > 0) return { ok: false, issues };
    return { ok: true, seed: result.data, preview: previewOf(result.data) };
  },

  /**
   * One-time import in a single transaction (HANDOFF §12.3 step 6): master
   * data, households (head nullable), members, then head_member_id once the
   * member rows exist. Refuses if any member already exists — after this,
   * SQLite is the source of truth and recovery means backup restore.
   */
  commit(deps: SeedDeps, seed: Seed): SeedCommitResult {
    return deps.db.transaction((tx) => {
      const existing = tx.select().from(members).all().length;
      if (existing > 0) throw new SeedAlreadyCommittedError(existing);

      // Roles: provisional list first (keeps HANDOFF order), then any extra
      // names the file uses, so every member's role resolves by name.
      const roleNames: string[] = [...PROVISIONAL_ROLES];
      for (const h of seed.households) {
        for (const m of h.members) {
          if (m.role && !roleNames.includes(m.role)) roleNames.push(m.role);
        }
      }
      const existingRoles = tx.select().from(roles).all();
      const roleIdByName = new Map(existingRoles.map((r) => [r.name, r.id]));
      let position = existingRoles.reduce((max, r) => Math.max(max, r.position), 0);
      for (const name of roleNames) {
        if (roleIdByName.has(name)) continue;
        position += 1;
        const row = tx
          .insert(roles)
          .values({ name, position })
          .returning({ id: roles.id })
          .get();
        roleIdByName.set(name, row.id);
      }

      // Session types + activity types (HANDOFF §12.5), skipping names that
      // already exist so a Pengaturan-edited list isn't clobbered.
      const sessionTypeIdByName = new Map(
        tx.select().from(sessionTypes).all().map((s) => [s.name, s.id]),
      );
      let sessionTypesAdded = 0;
      for (const name of DEFAULT_SESSION_TYPES) {
        if (sessionTypeIdByName.has(name)) continue;
        const row = tx
          .insert(sessionTypes)
          .values({ name })
          .returning({ id: sessionTypes.id })
          .get();
        sessionTypeIdByName.set(name, row.id);
        sessionTypesAdded += 1;
      }
      const existingActivityNames = new Set(
        tx.select().from(activityTypes).all().map((a) => a.name),
      );
      let activityTypesAdded = 0;
      for (const at of DEFAULT_ACTIVITY_TYPES) {
        if (existingActivityNames.has(at.name)) continue;
        tx.insert(activityTypes)
          .values({
            name: at.name,
            sourceKind: at.sourceKind,
            meetingType: at.meetingType ?? null,
            sessionTypeId: at.sessionType
              ? (sessionTypeIdByName.get(at.sessionType) ?? null)
              : null,
          })
          .run();
        activityTypesAdded += 1;
      }

      // Roster.
      let memberCount = 0;
      for (const h of seed.households) {
        const hh = tx
          .insert(households)
          .values({ householdNo: h.household_no, type: h.type, address: h.address })
          .returning({ id: households.id })
          .get();
        let headId: number | null = null;
        for (const m of h.members) {
          const row = tx
            .insert(members)
            .values({
              householdId: hh.id,
              fullName: m.full_name,
              nickname: m.nickname,
              gender: m.gender,
              lifeStage: m.life_stage,
              maritalStatus: m.marital_status,
              bloodType: m.blood_type,
              rhesus: m.rhesus,
              birthPlace: m.birth_place,
              birthDate: m.birth_date,
              roleId: m.role ? (roleIdByName.get(m.role) ?? null) : null,
              isActive: m.is_active,
            })
            .returning({ id: members.id })
            .get();
          if (m.is_head) headId = row.id;
          memberCount += 1;
        }
        if (headId !== null) {
          tx.update(households)
            .set({ headMemberId: headId })
            .where(eq(households.id, hh.id))
            .run();
        }
      }

      return {
        households: seed.households.length,
        members: memberCount,
        roles: roleIdByName.size,
        sessionTypes: sessionTypesAdded,
        activityTypes: activityTypesAdded,
      };
    });
  },
};
