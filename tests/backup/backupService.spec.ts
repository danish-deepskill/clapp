import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runAutoBackupIfDue } from '@main/backup/autoBackup';
import {
  backupFileName,
  backupService,
  InvalidBackupFileError,
  parseBackupFileName,
} from '@main/backup/backupService';
import { type DB, openDatabase, runMigrations } from '@main/db';
import { members } from '@main/db/schema';
import {
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  saveAppSettings,
} from '@main/settings/appSettings';
import { memberService } from '@main/services/memberService';

const MIGRATIONS = join(process.cwd(), 'src', 'main', 'db', 'migrations');

let root: string;
let dbPath: string;
let folder: string;
let db: DB;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'clapp-backup-'));
  dbPath = join(root, 'clapp.sqlite');
  folder = join(root, 'backups');
  db = openDatabase({ path: dbPath });
  runMigrations({ db, migrationsFolder: MIGRATIONS });
  memberService.addMember(
    { db },
    {
      fullName: 'Ahmad Faisal Rahman',
      gender: 'Laki-Laki',
      lifeStage: 'Dewasa',
      maritalStatus: 'Menikah',
      bloodType: 'A',
      rhesus: 'Positif',
      household: { mode: 'create-new', address: null },
      logAs: 'none',
    },
  );
});

afterEach(() => {
  if (db.$client.open) db.$client.close();
  rmSync(root, { recursive: true, force: true });
});

const at = (iso: string) => () => new Date(iso);

// ─── Naming ────────────────────────────────────────────────────────────────

describe('backupFileName / parseBackupFileName', () => {
  it('follows HANDOFF §12.7 and round-trips through the parser', () => {
    const now = new Date(2026, 4, 18, 20, 14, 9); // local 18 Mei 2026 20:14:09
    expect(backupFileName(now, 'auto')).toBe('clapp-backup-2026-05-18-20-14-09.sqlite');
    expect(backupFileName(now, 'manual')).toBe('clapp-backup-2026-05-18-20-14-09-manual.sqlite');
    expect(backupFileName(now, 'pre-restore')).toBe(
      'clapp-backup-2026-05-18-20-14-09-pre-restore.sqlite',
    );
    expect(parseBackupFileName(backupFileName(now, 'manual'))).toEqual({
      kind: 'manual',
      createdAt: now.toISOString(),
    });
    expect(parseBackupFileName('clapp-pre-migration-2026-09-15_19-41-56.sqlite')?.kind).toBe(
      'pre-migration',
    );
    expect(parseBackupFileName('notes.txt')).toBe(null);
    expect(parseBackupFileName('clapp.sqlite')).toBe(null);
  });
});

// ─── createBackup / listBackups / rotate ───────────────────────────────────

describe('backupService.createBackup', () => {
  it('writes a valid, openable copy into the folder (created on demand)', async () => {
    expect(existsSync(folder)).toBe(false);
    const b = await backupService.createBackup(
      { sqlite: db.$client, folder, retention: 14, clock: at('2026-05-18T13:14:09.000Z') },
      'manual',
    );
    expect(b.kind).toBe('manual');
    expect(existsSync(b.path)).toBe(true);
    expect(b.sizeBytes).toBeGreaterThan(0);
    expect(() => backupService.validateBackupFile(b.path)).not.toThrow();
    // The copy carries the data.
    const copy = openDatabase({ path: b.path });
    expect(copy.select().from(members).all()).toHaveLength(1);
    copy.$client.close();
  });

  it('rotates automatic copies beyond retention but never manual ones', async () => {
    const stamps = [
      '2026-05-10T01:00:00.000Z',
      '2026-05-11T01:00:00.000Z',
      '2026-05-12T01:00:00.000Z',
    ];
    for (const s of stamps) {
      await backupService.createBackup(
        { sqlite: db.$client, folder, retention: 2, clock: at(s) },
        'auto',
      );
    }
    await backupService.createBackup(
      { sqlite: db.$client, folder, retention: 2, clock: at('2026-05-09T01:00:00.000Z') },
      'manual',
    );
    // A later auto backup triggers rotation: 2 newest autos + the manual survive.
    await backupService.createBackup(
      { sqlite: db.$client, folder, retention: 2, clock: at('2026-05-13T01:00:00.000Z') },
      'auto',
    );
    const list = backupService.listBackups(folder);
    expect(list.map((b) => b.kind)).toEqual(['auto', 'auto', 'manual']);
    expect(list[0]!.createdAt > list[1]!.createdAt).toBe(true);
    expect(readdirSync(folder)).toHaveLength(3);
  });

  it('listBackups ignores unrelated files and a missing folder', () => {
    expect(backupService.listBackups(join(root, 'nope'))).toEqual([]);
    rmSync(folder, { recursive: true, force: true });
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, 'readme.txt'), 'x');
    expect(backupService.listBackups(folder)).toEqual([]);
  });
});

// ─── Daily rule ────────────────────────────────────────────────────────────

describe('backupService.isAutoBackupDue', () => {
  const now = new Date(2026, 4, 18, 9, 0, 0);
  it('is due when never run, when last run was yesterday, or on garbage input', () => {
    expect(backupService.isAutoBackupDue(null, now)).toBe(true);
    expect(backupService.isAutoBackupDue(new Date(2026, 4, 17, 23, 59).toISOString(), now)).toBe(true);
    expect(backupService.isAutoBackupDue('not-a-date', now)).toBe(true);
  });
  it('is not due when it already ran on the same calendar day', () => {
    expect(backupService.isAutoBackupDue(new Date(2026, 4, 18, 0, 5).toISOString(), now)).toBe(false);
  });
});

describe('runAutoBackupIfDue', () => {
  it('backs up once per day and records lastAutoBackupAt; honours the toggle', async () => {
    const settingsPath = join(root, 'settings.json');
    const deps = { sqlite: db.$client, settingsPath, defaultFolder: folder, clock: at('2026-05-18T02:00:00.000Z') };
    expect(await runAutoBackupIfDue(deps)).toBe(true);
    expect(backupService.listBackups(folder)).toHaveLength(1);
    expect(loadAppSettings(settingsPath).backup.lastAutoBackupAt).toBe('2026-05-18T02:00:00.000Z');
    // Same day → no second copy.
    expect(await runAutoBackupIfDue({ ...deps, clock: at('2026-05-18T10:00:00.000Z') })).toBe(false);
    expect(backupService.listBackups(folder)).toHaveLength(1);
    // Toggle off → never.
    const s = loadAppSettings(settingsPath);
    saveAppSettings(settingsPath, { ...s, backup: { ...s.backup, autoBackup: false } });
    expect(await runAutoBackupIfDue({ ...deps, clock: at('2026-05-20T10:00:00.000Z') })).toBe(false);
  });
});

// ─── Restore ───────────────────────────────────────────────────────────────

describe('backupService.validateBackupFile', () => {
  it('rejects a missing file, a non-SQLite file, and a SQLite file without members', () => {
    expect(() => backupService.validateBackupFile(join(root, 'missing.sqlite'))).toThrow(
      InvalidBackupFileError,
    );
    const junk = join(root, 'junk.sqlite');
    writeFileSync(junk, 'this is not a database');
    expect(() => backupService.validateBackupFile(junk)).toThrow(InvalidBackupFileError);
    const foreign = openDatabase({ path: join(root, 'foreign.sqlite') });
    foreign.$client.exec('CREATE TABLE t (a)');
    foreign.$client.close();
    expect(() => backupService.validateBackupFile(join(root, 'foreign.sqlite'))).toThrow(
      /bukan database CLApp/,
    );
  });
});

describe('backupService.swapDatabaseFile', () => {
  it('replaces the live file and drops stale -wal/-shm', async () => {
    const snapshot = await backupService.createBackup(
      { sqlite: db.$client, folder, retention: 14 },
      'manual',
    );
    // Mutate live after the snapshot, then "restore" the snapshot.
    memberService.addMember(
      { db },
      {
        fullName: 'Siti Aminah',
        gender: 'Perempuan',
        lifeStage: 'Dewasa',
        maritalStatus: 'Menikah',
        bloodType: 'B',
        rhesus: 'Positif',
        household: { mode: 'create-new', address: null },
        logAs: 'none',
      },
    );
    expect(db.select().from(members).all()).toHaveLength(2);
    db.$client.close();
    writeFileSync(`${dbPath}-wal`, 'stale');
    writeFileSync(`${dbPath}-shm`, 'stale');

    backupService.swapDatabaseFile(dbPath, snapshot.path);
    expect(existsSync(`${dbPath}-wal`)).toBe(false);
    expect(existsSync(`${dbPath}-shm`)).toBe(false);

    db = openDatabase({ path: dbPath });
    expect(db.select().from(members).all()).toHaveLength(1);
  });
});

// ─── Settings file ─────────────────────────────────────────────────────────

describe('appSettings', () => {
  it('defaults when missing or corrupt, round-trips, and sanitises bad values', () => {
    const p = join(root, 'cfg', 'settings.json');
    expect(loadAppSettings(p)).toEqual(DEFAULT_APP_SETTINGS);
    saveAppSettings(p, {
      backup: { autoBackup: false, folder: '/tmp/x', retention: 7, lastAutoBackupAt: null },
    });
    expect(loadAppSettings(p).backup).toMatchObject({ autoBackup: false, folder: '/tmp/x', retention: 7 });
    writeFileSync(p, '{ not json');
    expect(loadAppSettings(p)).toEqual(DEFAULT_APP_SETTINGS);
    writeFileSync(p, JSON.stringify({ backup: { retention: -3, folder: '   ' } }));
    expect(loadAppSettings(p).backup).toMatchObject({ retention: 14, folder: null });
  });
});
