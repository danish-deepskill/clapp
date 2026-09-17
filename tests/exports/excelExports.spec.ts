import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import ExcelJS from 'exceljs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type DB, openDatabase, runMigrations } from '@main/db';
import { activityTypes } from '@main/db/schema';
import { exportFileName, exportService } from '@main/exports/exportService';
import { attendanceService } from '@main/services/attendanceService';
import { eventLogService } from '@main/services/eventLogService';
import { roleService, sessionTypeService } from '@main/services/masterDataService';
import { meetingService } from '@main/services/meetingService';
import { memberService } from '@main/services/memberService';
import { reportService } from '@main/services/reportService';
import { serkilerService } from '@main/services/serkilerService';
import type { NewMemberInput } from '@shared/member';

const MIGRATIONS = join(process.cwd(), 'src', 'main', 'db', 'migrations');
const clock = () => new Date('2026-05-25T10:00:00.000Z');
const PERIOD = { month: 5, year: 2026 };

const BASE: Omit<NewMemberInput, 'fullName' | 'gender'> = {
  lifeStage: 'Dewasa',
  maritalStatus: 'Menikah',
  bloodType: 'A',
  rhesus: 'Positif',
  household: { mode: 'create-new', address: null },
  logAs: 'none',
};

let db: DB;
let outDir: string;
let ids: Record<string, number>;

/** One realistic month: 4 adults + 1 child, 2 sessions, a meeting, a report. */
beforeAll(() => {
  db = openDatabase({ path: ':memory:', inMemory: true });
  runMigrations({ db, migrationsFolder: MIGRATIONS });
  outDir = process.env.CLAPP_XLSX_OUT ?? mkdtempSync(join(tmpdir(), 'clapp-xlsx-'));

  const sekretaris = roleService.create({ db }, 'Sekretaris');
  const imam = roleService.create({ db }, 'Imam');
  const a = memberService.addMember({ db }, { ...BASE, fullName: 'Ahmad Faisal', gender: 'Laki-Laki', roleId: imam.id });
  const b = memberService.addMember(
    { db },
    { ...BASE, fullName: 'Siti Aminah', gender: 'Perempuan', household: { mode: 'join-existing', householdId: a.householdId } },
  );
  const c = memberService.addMember({ db }, { ...BASE, fullName: 'Budi Santoso', gender: 'Laki-Laki', roleId: sekretaris.id });
  const d = memberService.addMember({ db }, { ...BASE, fullName: 'Dewi Lestari', gender: 'Perempuan', maritalStatus: 'Janda', lifeStage: 'Lansia' });
  const e = memberService.addMember(
    { db },
    { ...BASE, fullName: 'Anak Kecil', gender: 'Laki-Laki', lifeStage: 'Balita', maritalStatus: 'Belum Menikah', household: { mode: 'join-existing', householdId: a.householdId } },
  );
  ids = { a: a.id, b: b.id, c: c.id, d: d.id, e: e.id };
  for (const m of [a, c, d]) memberService.editMember({ db }, m.id, { isSerkiler: true });

  const hasda = sessionTypeService.create({ db }, 'Hasda');
  const quran = sessionTypeService.create({ db }, "Qur'an");
  const save = (typeId: number, date: string, rows: { memberId: number; status: 'H' | 'A' | 'S' | 'I' }[]) =>
    attendanceService.saveBatch({ db, clock }, { sessionTypeId: typeId, sessionDate: date, rows: rows.map((r) => ({ ...r, arrivalAt: null, donationAmount: null })) });
  save(hasda.id, '2026-05-10', [{ memberId: a.id, status: 'H' }, { memberId: b.id, status: 'S' }, { memberId: c.id, status: 'A' }, { memberId: d.id, status: 'H' }]);
  save(quran.id, '2026-05-17', [{ memberId: a.id, status: 'H' }, { memberId: b.id, status: 'H' }, { memberId: c.id, status: 'I' }]);

  db.insert(activityTypes).values({ name: 'Musyawarah Kelompok', sourceKind: 'meeting', meetingType: 'Musyawarah Kelompok' }).run();
  meetingService.save({ db, clock }, { meetingDate: '2026-05-12', type: 'Musyawarah Kelompok', title: 'Rapat Mei', resultNotes: null, suggestions: 'Tambah pengajian remaja', attendeeMemberIds: [a.id, c.id] });

  eventLogService.recordVital(db, { eventType: 'Lahir', eventDate: '2026-05-03', memberId: null, name: '(bayi) Aisyah', gender: 'Perempuan', notes: 'anak Pak Faisal' });
  eventLogService.recordMovement(db, { movementType: 'Sambung Baru', movementDate: '2026-05-08', memberId: c.id, notes: 'dari Solo' });

  reportService.saveReport({ db, clock }, {
    ...PERIOD,
    rencanaBece: '1',
    berasJimpitan: 'Sukses',
    fotocopyDalil: null,
    otherNotes: 'Disampaikan secara lisan',
    visitPlans: [{ waktu: 'Sabtu 30/05', tempat: 'Rumah Pak Agus', agenda: 'Silaturahmi' }],
    constructionProjects: [{ jenis: 'Revit Sukses', tujuan: 'Perbaikan atap', volume: '20 m2', dana: 'Rp 5.000.000' }],
    sick: [{ memberId: d.id, notes: 'Rawat jalan' }],
    familyVisits: [{ householdId: a.householdId, familyName: null, notes: 'Sudah dikunjungi' }],
    activities: [],
  });
  serkilerService.setParaf({ db }, { ...PERIOD, memberId: a.id, paraf: true });
  serkilerService.setIuran({ db }, { ...PERIOD, memberId: a.id, amount: 25000 });
});

afterAll(() => {
  db.$client.close();
  if (!process.env.CLAPP_XLSX_OUT) rmSync(outDir, { recursive: true, force: true });
});

async function roundTrip(kind: 'laporan' | 'rekap' | 'serkiler'): Promise<ExcelJS.Worksheet> {
  const wb = exportService.buildWorkbook({ db, clock }, kind, PERIOD);
  const path = join(outDir, exportFileName(kind, PERIOD));
  await wb.xlsx.writeFile(path);
  const back = new ExcelJS.Workbook();
  await back.xlsx.readFile(path);
  return back.worksheets[0]!;
}
const text = (ws: ExcelJS.Worksheet, ref: string) => {
  const v = ws.getCell(ref).value;
  if (v && typeof v === 'object' && 'result' in v) return v.result;
  return v;
};
const formula = (ws: ExcelJS.Worksheet, ref: string) => {
  const v = ws.getCell(ref).value;
  return v && typeof v === 'object' && 'formula' in v ? v.formula : null;
};

describe('exportFileName', () => {
  it('names files by document and period', () => {
    expect(exportFileName('laporan', PERIOD)).toBe('Laporan-Bulanan-2026-05.xlsx');
    expect(exportFileName('rekap', { month: 12, year: 2025 })).toBe('Rekap-Absensi-2025-12.xlsx');
  });
});

describe('Laporan Bulanan workbook', () => {
  it('lands every section on the template row when data fits the minimums', async () => {
    const ws = await roundTrip('laporan');
    expect(text(ws, 'B1')).toBe('SLM Kelompok Cilandak A');
    expect(text(ws, 'B2')).toBe('Bulan Mei Tahun 2026');
    const anchors: Record<string, string> = {
      C14: 'DATA JM MELAHIRKAN DAN MENINGGAL DUNIA DESA CILANDAK',
      C24: 'DATA JM PINDAH SAMBUNG dan SAMBUNG BARU DESA CILANDAK',
      C40: 'DATA JM YANG SEDANG SAKIT',
      C49: 'KEGIATAN KELOMPOK',
      C58: 'KELUARGA YANG SUDAH DIKUNJUNGI',
      C70: 'Prosentase Lima BAB',
      C75: 'ANJANGSANA',
      C80: 'PEMBANGUNAN',
      C86: 'RENCANA BECE',
      C87: 'BERAS JIMPITAN',
      C88: 'FOTOCOPY DALIL',
      C89: 'SARAN DAN MASUKAN',
      C94: 'Lain - Lain',
      G95: 'Sekretaris Kelompok',
      L95: 'Pembina Kelompok',
    };
    for (const [ref, want] of Object.entries(anchors)) expect(text(ws, ref), ref).toBe(want);
    expect(ws.model.merges).toEqual(expect.arrayContaining(['B1:R1', 'B4:K4', 'L4:O5', 'P4:R5', 'C17:G17', 'D91:R91']));
  });

  it('fills demografi from live counts with the template formulas', async () => {
    const ws = await roundTrip('laporan');
    // Balita L =1, Dewasa/Lansia: L = Faisal + Budi = 2, P = Siti (Dewi is Janda → O7)
    expect(text(ws, 'B7')).toBe(1);
    expect(text(ws, 'L7')).toBe(2);
    expect(text(ws, 'M7')).toBe(1);
    expect(text(ws, 'O7')).toBe(1);
    expect(formula(ws, 'P7')).toBe('B7+D7+F7+H7+J7+L7+N7');
    expect(text(ws, 'R7')).toBe(5);
  });

  it('marks births/moves by gender, lists sick, kegiatan, visits, saran, signatures', async () => {
    const ws = await roundTrip('laporan');
    expect(text(ws, 'C17')).toBe('(bayi) Aisyah');
    expect(text(ws, 'I17')).toBe(1); // MELAHIRKAN · P
    expect(text(ws, 'L17')).toBe('anak Pak Faisal');
    expect(formula(ws, 'H22')).toBe('SUM(H17:H21)');
    expect(text(ws, 'C27')).toBe('Budi Santoso');
    expect(text(ws, 'J27')).toBe(1); // SAMBUNG BARU · L
    expect(text(ws, 'C42')).toBe('Dewi Lestari');
    expect(text(ws, 'C51')).toBe('Musyawarah Kelompok');
    expect(text(ws, 'I51')).toBe('TERLAKSANA');
    expect(text(ws, 'L51')).toBe('12/05/2026');
    expect(text(ws, 'O51')).toBe(2);
    expect(text(ws, 'C60')).toBe('KK-001');
    expect(text(ws, 'E86')).toBe(': 1');
    expect(text(ws, 'D91')).toBe('Tambah pengajian remaja');
    expect(text(ws, 'E94')).toBe(': Disampaikan secara lisan');
    expect(text(ws, 'G99')).toBe('( Budi Santoso )');
    expect(text(ws, 'L99')).toBe('(  )');
  });

  it('writes Lima BAB as shares of the eligible roster', async () => {
    const ws = await roundTrip('laporan');
    // 4 eligible adults over 2 sessions: Faisal 100, Siti 100, Budi 50 (I), Dewi 50 → 2 lancar, 2 kurang lancar
    expect(text(ws, 'C73')).toBeCloseTo(0.5);
    expect(text(ws, 'G73')).toBeCloseTo(0.5);
    expect(ws.getCell('C73').numFmt).toBe('0%');
  });

  it('grows a section past the template minimum without breaking later anchors', async () => {
    for (let i = 0; i < 6; i++) {
      eventLogService.recordVital(db, { eventType: 'Lahir', eventDate: '2026-05-20', memberId: null, name: `Bayi ${i}`, gender: 'Laki-Laki' });
    }
    const ws = await roundTrip('laporan');
    // 7 vital rows now (5 min + 2 extra) → everything after shifts by 2.
    expect(text(ws, 'C26')).toBe('DATA JM PINDAH SAMBUNG dan SAMBUNG BARU DESA CILANDAK');
    expect(text(ws, 'C42')).toBe('DATA JM YANG SEDANG SAKIT');
    expect(formula(ws, 'H24')).toBe('SUM(H17:H23)');
  });
});

describe('Rekap Absensi workbook', () => {
  it('lays out title, session columns, per-member COUNTIF %, KK grouping and footer', async () => {
    const ws = await roundTrip('rekap');
    expect(text(ws, 'B1')).toBe('ABSENSI PENGAJIAN KELOMPOK CILANDAK A - MEI 2026');
    expect(text(ws, 'D5')).toBe('Bulan Mei 2026');
    expect(text(ws, 'D6')).toBe('Hasda');
    expect(text(ws, 'E6')).toBe("Qur'an");
    expect(text(ws, 'D7')).toBe(10);
    expect(text(ws, 'E7')).toBe(17);
    expect(ws.model.merges).toEqual(expect.arrayContaining(['D5:H5', 'I5:M5', 'A8:A9']));
    // KK 001: Faisal + Siti (sorted by name); KK 002 Budi; KK 003 Dewi
    expect(text(ws, 'C8')).toBe('Ahmad Faisal');
    expect(text(ws, 'C9')).toBe('Siti Aminah');
    expect(text(ws, 'A8')).toBe(1);
    expect(text(ws, 'A10')).toBe(2);
    expect(text(ws, 'D8')).toBe('H');
    expect(text(ws, 'E9')).toBe('H');
    expect(formula(ws, 'I8')).toBe('COUNTIF(D8:H8,"H")/2*100');
    expect(text(ws, 'I8')).toBe(100);
    expect(formula(ws, 'M9')).toBe('I9+K9+L9');
    expect(text(ws, 'B13')).toBe('Prosentase 5 BAB jamaah');
    expect(formula(ws, 'I13')).toBe('AVERAGE(I8:I11)');
    expect(ws.views[0]?.state).toBe('frozen');
  });
});

describe('Serkiler workbook', () => {
  it('splits by gender with restarting numbers, paired paraf slots, month header and witness', async () => {
    const ws = await roundTrip('serkiler');
    expect(text(ws, 'B2')).toBe('SERKILER KELOMPOK');
    expect(text(ws, 'D4')).toBe('MEI');
    // Bapak-bapak: Ahmad Faisal (paraf + iuran), Budi Santoso
    expect(text(ws, 'B5')).toBe(1);
    expect(text(ws, 'C5')).toBe('Ahmad Faisal');
    expect(text(ws, 'D5')).toBe(25000);
    expect(text(ws, 'E5')).toBe('✓ 1');
    expect(text(ws, 'C6')).toBe('Budi Santoso');
    expect(text(ws, 'F5')).toBe(2);
    expect(ws.model.merges).toEqual(expect.arrayContaining(['E5:E6', 'F5:F6', 'E4:F4']));
    expect(text(ws, 'B10')).toBe('Menyaksikan, IKEL CLA');
    expect(text(ws, 'B13')).toBe('( Ahmad Faisal )');
    // Ibu-ibu list restarts at 1 on a new page
    let ibuRow = 0;
    ws.eachRow((row, n) => { if (row.getCell(3).value === 'Dewi Lestari') ibuRow = n; });
    expect(ibuRow).toBeGreaterThan(13);
    expect(text(ws, `B${ibuRow}`)).toBe(1);
    expect(ws.getRow(ibuRow - 3).height).toBe(103.5);
  });
});
