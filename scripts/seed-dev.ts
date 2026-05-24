#!/usr/bin/env tsx
// Dev-only convenience: imports clapp-handoff/seed.json into the dev SQLite
// file so the Jamaah screen has data to render. The real first-run wizard
// (later PR) replaces this.
//
// Usage:
//   1. Close any running CLApp window (DB lock).
//   2. `npm run seed:dev`  (handles better-sqlite3 ABI rebuild via pre/post).
//   3. `npm run dev`       (reloads with seeded data visible).
//
// Optional CLI args:
//   tsx scripts/seed-dev.ts [--db <path>] [--seed <path>] [--force]

import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync, readFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';

import * as schema from '../src/main/db/schema';

// Minimal inline shape — full Zod validation lives in src/renderer/lib/seedSchema.ts
// (tsx can't resolve the @shared/* alias transitively from outside the renderer build).
interface SeedMember {
  full_name: string;
  nickname: string | null;
  gender: 'Laki-Laki' | 'Perempuan';
  life_stage:
    | 'Balita'
    | 'AUD'
    | 'Caberawit'
    | 'Pra Remaja'
    | 'Remaja'
    | 'Muda-mudi'
    | 'Dewasa'
    | 'Lansia';
  marital_status: 'Belum Menikah' | 'Menikah' | 'Janda' | 'Duda';
  blood_type: 'A' | 'B' | 'AB' | 'O' | 'Tidak Tahu';
  rhesus: 'Positif' | 'Negatif' | 'Tidak Tahu';
  birth_place: string | null;
  birth_date: string | null;
  is_head: boolean;
  is_active: boolean;
  role: string | null;
}
interface Seed {
  households: {
    household_no: string;
    type: 'KK' | 'KK-S';
    address: string | null;
    members: SeedMember[];
  }[];
}

function userDataPath(): string {
  const p = platform();
  if (p === 'win32') {
    return join(
      process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'),
      'clapp',
    );
  }
  if (p === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'clapp');
  }
  return join(
    process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'),
    'clapp',
  );
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const DB_PATH = arg('--db') ?? join(userDataPath(), 'clapp.sqlite');
const SEED_PATH =
  arg('--seed') ?? join(process.cwd(), 'clapp-handoff', 'seed.json');
const FORCE = process.argv.includes('--force');
const MIGRATIONS = join(process.cwd(), 'src', 'main', 'db', 'migrations');

console.log(`→ DB:   ${DB_PATH}`);
console.log(`→ Seed: ${SEED_PATH}`);

mkdirSync(dirname(DB_PATH), { recursive: true });
const sqlite = new Database(DB_PATH);
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('journal_mode = WAL');
const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: MIGRATIONS });

const existingCount = db.select().from(schema.members).all().length;
if (existingCount > 0 && !FORCE) {
  console.error(
    `✖ DB already has ${existingCount} members. Use --force to wipe + reseed.`,
  );
  process.exit(1);
}

if (FORCE && existingCount > 0) {
  console.log(`→ Wiping ${existingCount} existing members + households…`);
  // Delete in FK-safe order.
  sqlite.exec(`
    DELETE FROM activity_records;
    DELETE FROM family_visits;
    DELETE FROM sick_records;
    DELETE FROM monthly_reports;
    DELETE FROM circular_roster;
    DELETE FROM meeting_attendees;
    DELETE FROM meetings;
    DELETE FROM attendance;
    DELETE FROM sessions;
    DELETE FROM activity_types;
    DELETE FROM session_types;
    DELETE FROM member_changes;
    DELETE FROM member_movements;
    DELETE FROM vital_records;
    -- Break the FK cycle before deleting members.
    UPDATE households SET head_member_id = NULL;
    DELETE FROM members;
    DELETE FROM households;
  `);
}

// Dev convenience: seed the 5 session_types listed in ERD.html so Absensi works
// out-of-the-box. Production day-1 starts empty and prompts the operator to
// seed via Pengaturan (CONTEXT §6.5 keeps the canonical list as open).
const DEV_SESSION_TYPES = [
  'Hasda',
  'Dalil-dalil',
  'Penerobos Desa',
  "Qur'an",
  'Q+K.Zakat',
];
const existingTypeCount = db.select().from(schema.sessionTypes).all().length;
if (existingTypeCount === 0) {
  db.insert(schema.sessionTypes)
    .values(DEV_SESSION_TYPES.map((name) => ({ name })))
    .run();
  // One session-linked activity_type so the §8 UPSERT trigger is exercisable in dev.
  const hasdaId = db
    .select()
    .from(schema.sessionTypes)
    .where(eq(schema.sessionTypes.name, 'Hasda'))
    .get()?.id;
  if (hasdaId) {
    db.insert(schema.activityTypes)
      .values({
        name: 'Pengajian Ibu-Ibu Kelompok',
        sourceKind: 'session',
        sessionTypeId: hasdaId,
      })
      .run();
  }
  // One meeting-linked activity_type so the Musyawarah §8 trigger is exercisable.
  db.insert(schema.activityTypes)
    .values({
      name: 'Musyawarah Kelompok Bulanan',
      sourceKind: 'meeting',
      meetingType: 'Musyawarah Kelompok',
    })
    .run();
  console.log(`→ Seeded ${DEV_SESSION_TYPES.length} session_types + 2 activity_types.`);
}

// Seed a tiny role set + assign a handful of members as Pengurus so the
// Musyawarah attendee picker has people to choose. Real role vocabulary is
// unconfirmed (CONTEXT §6 #2) — these are placeholders for dev only.
const DEV_ROLES = ['Imam', 'Wakil Imam', 'Sekretaris', 'Bendahara'];
const existingRoleCount = db.select().from(schema.roles).all().length;
if (existingRoleCount === 0) {
  // Position assigned contiguously by array index so the canonical "Imam,
  // Wakil Imam, Sekretaris, Bendahara" order shows up on first run (operator
  // can still drag-reorder in Pengaturan).
  db.insert(schema.roles)
    .values(DEV_ROLES.map((name, i) => ({ name, position: i })))
    .run();
  console.log(`→ Seeded ${DEV_ROLES.length} roles.`);
}

const seed = JSON.parse(readFileSync(SEED_PATH, 'utf-8')) as Seed;

let memberCount = 0;
db.transaction((tx) => {
  for (const hh of seed.households) {
    const inserted = tx
      .insert(schema.households)
      .values({
        householdNo: hh.household_no,
        type: hh.type,
        address: hh.address,
      })
      .returning({ id: schema.households.id })
      .get();
    let headId: number | null = null;
    for (const m of hh.members) {
      const memberRow = tx
        .insert(schema.members)
        .values({
          householdId: inserted.id,
          fullName: m.full_name,
          nickname: m.nickname,
          gender: m.gender,
          lifeStage: m.life_stage,
          maritalStatus: m.marital_status,
          bloodType: m.blood_type,
          rhesus: m.rhesus,
          birthPlace: m.birth_place,
          birthDate: m.birth_date,
          // role not seeded yet — feedback-roles-single-source memory: the
          // real wizard PR resolves role names against the seeded roles table.
          roleId: null,
          isActive: m.is_active,
        })
        .returning({ id: schema.members.id })
        .get();
      if (m.is_head) headId = memberRow.id;
      memberCount += 1;
    }
    if (headId) {
      tx.update(schema.households)
        .set({ headMemberId: headId })
        .where(eq(schema.households.id, inserted.id))
        .run();
    }
  }
});

// Assign roles to the first N adult members per role so the Musyawarah
// attendee picker has something to pick. Dev only — production seed leaves
// role_id null for all members.
const seededRoles = db.select().from(schema.roles).all();
if (seededRoles.length > 0) {
  const adults = db
    .select()
    .from(schema.members)
    .all()
    .filter(
      (m) =>
        m.isActive &&
        (m.lifeStage === 'Dewasa' || m.lifeStage === 'Muda-mudi') &&
        m.roleId === null,
    )
    .sort((a, b) => a.id - b.id);
  let assigned = 0;
  for (let i = 0; i < seededRoles.length && i < adults.length; i++) {
    const member = adults[i];
    const role = seededRoles[i];
    if (!member || !role) continue;
    db.update(schema.members)
      .set({ roleId: role.id })
      .where(eq(schema.members.id, member.id))
      .run();
    assigned += 1;
  }
  console.log(`→ Assigned ${assigned} members as Pengurus.`);
}

console.log(
  `✓ Seeded ${seed.households.length} households / ${memberCount} members.`,
);
sqlite.close();
