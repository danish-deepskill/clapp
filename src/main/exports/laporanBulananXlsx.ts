import ExcelJS from 'exceljs';

import { BULAN_ID, type Gender } from '../../shared/enums';
import type { EventLogEntry } from '../../shared/eventLog';
import type { Demografi, ReportData } from '../../shared/report';
import {
  FONT,
  KELOMPOK_NAME,
  box,
  edge,
  fmtDateDMY,
  outline,
  put,
  type CellStyle,
} from './shared/excelTheme';

export interface LaporanExportData {
  report: ReportData;
  /** Gender of members named in Pindah Sambung / Sambung Baru rows. */
  genderByMemberId: Record<number, Gender>;
  /** Signature names (blank when the role has no single active holder). */
  signatures: { sekretaris: string | null; pembina: string | null };
}

/** Template minimums (rows the manager's sheet always shows). */
const MIN = {
  vital: 5,
  movement: 11,
  sick: 6,
  activities: 6,
  families: 8,
  visits: 2,
  construction: 2,
  saran: 3,
} as const;

const arial = (size: number, bold = false, italic = false): Partial<ExcelJS.Font> => ({
  name: FONT.arial,
  size,
  bold,
  italic,
});
const times = (size: number, bold = false): Partial<ExcelJS.Font> => ({
  name: FONT.times,
  size,
  bold,
});

function stage(d: Demografi, name: string, key: 'male' | 'female'): number {
  return d.byStage.find((s) => s.stage === name)?.[key] ?? 0;
}

const COLS = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'];

/**
 * Laporan Bulanan workbook, cell-for-cell after the manager's monthly sheet
 * (../specs/laporan-bulanan.md, verified by tests/exports/laporanFidelity):
 * same merges, labels, fonts, border weights. Sections grow when a month has
 * more rows than the template; they never shrink below it.
 */
export function buildLaporanWorkbook(data: LaporanExportData): ExcelJS.Workbook {
  const { report: r } = data;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Laporan ${String(r.month).padStart(2, '0')}-${r.year}`, {
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0, footer: 0 },
    },
  });
  ws.properties.defaultRowHeight = 15;
  ws.getColumn(1).width = 2;
  for (let c = 2; c <= 18; c++) ws.getColumn(c).width = 10.7;

  // ── Header ────────────────────────────────────────────────────────────
  put(ws, 'B1:R1', KELOMPOK_NAME, { font: arial(14, true), align: 'center' });
  put(ws, 'B2:R2', `Bulan ${BULAN_ID[r.month - 1]} Tahun ${r.year}`, {
    font: arial(14, true),
    align: 'center',
  });
  ws.getRow(1).height = 18;
  ws.getRow(2).height = 18;

  // ── Demografi (rows 4–7): Times New Roman, medium outline, double under row 6
  const th: CellStyle = { font: times(14), align: 'center' };
  put(ws, 'B4:K4', 'BELUM MENIKAH', th);
  put(ws, 'L4:O5', 'MENIKAH', th);
  put(ws, 'P4:R5', 'JUMLAH', th);
  put(ws, 'B5:C5', 'BALITA & AUD', th);
  put(ws, 'D5:E5', 'CABE RAWIT', th);
  put(ws, 'F5:G5', 'Pra REMAJA', th);
  put(ws, 'H5:I5', 'REMAJA', th);
  put(ws, 'J5:K5', 'MUDA-MUDI', th);
  const row6 = ['L', 'P', 'L', 'P', 'L', 'P', 'L', 'P', 'L', 'P', 'L', 'P', 'Duda', 'Janda', 'L', 'P', 'TOTAL'];
  row6.forEach((label, i) => put(ws, `${COLS[i]}6`, label, th));
  for (const n of [4, 5, 6]) ws.getRow(n).height = 18;

  const d = r.demografi;
  const adultsMale = stage(d, 'Dewasa', 'male') + stage(d, 'Lansia', 'male');
  const adultsFemale = stage(d, 'Dewasa', 'female') + stage(d, 'Lansia', 'female');
  const row7: number[] = [
    stage(d, 'Balita', 'male') + stage(d, 'AUD', 'male'),
    stage(d, 'Balita', 'female') + stage(d, 'AUD', 'female'),
    stage(d, 'Caberawit', 'male'),
    stage(d, 'Caberawit', 'female'),
    stage(d, 'Pra Remaja', 'male'),
    stage(d, 'Pra Remaja', 'female'),
    stage(d, 'Remaja', 'male'),
    stage(d, 'Remaja', 'female'),
    stage(d, 'Muda-mudi', 'male'),
    stage(d, 'Muda-mudi', 'female'),
    Math.max(0, adultsMale - d.duda),
    Math.max(0, adultsFemale - d.janda),
    d.duda,
    d.janda,
  ];
  const tv: CellStyle = { font: times(16), align: 'center' };
  row7.forEach((v, i) => put(ws, `${COLS[i]}7`, v, tv));
  const totalL = row7[0]! + row7[2]! + row7[4]! + row7[6]! + row7[8]! + row7[10]! + row7[12]!;
  const totalP = row7[1]! + row7[3]! + row7[5]! + row7[7]! + row7[9]! + row7[11]! + row7[13]!;
  put(ws, 'P7', { formula: 'B7+D7+F7+H7+J7+L7+N7', result: totalL }, tv);
  put(ws, 'Q7', { formula: 'C7+E7+G7+I7+K7+M7+O7', result: totalP }, tv);
  put(ws, 'R7', { formula: 'P7+Q7', result: totalL + totalP }, { font: times(22, true), align: 'center' });
  ws.getRow(7).height = 28;
  box(ws, 'B4:R7');
  edge(ws, 'B6:R6', 'bottom', 'double');
  outline(ws, 'B4:R7');

  const note: CellStyle = { font: arial(10) };
  put(ws, 'B8', 'CATATAN :', note);
  put(ws, 'C8', 'AUD&Balita : 0-6 Tahun', note);
  put(ws, 'F8', 'L : Laki-laki', note);
  put(ws, 'C9', 'Cabe Rawit : 1-6 SD', note);
  put(ws, 'F9', 'P : Perempuan', note);
  put(ws, 'C10', 'Pra Remaja : 1-3 SMP', note);
  put(ws, 'C11', 'Remaja : 1-3 SMA', note);
  put(ws, 'C12', 'Muda-mudi : Lulus SMA- Menikah', note);

  // ── Numbered sections ─────────────────────────────────────────────────
  let row = 14;
  const h12b: CellStyle = { font: arial(12, true), align: 'center' };
  const h10: CellStyle = { font: arial(10), align: 'center' };
  const numCell: CellStyle = { font: arial(12), align: 'center' };
  const nameCell: CellStyle = { font: arial(10), align: 'left' };
  const markCell: CellStyle = { font: arial(10), align: 'center' };
  const setH = (n: number, h = 15.75) => {
    ws.getRow(n).height = h;
  };
  const title = (n: number, text: string, ref = `C${row}`, size = 12) => {
    put(ws, `B${row}`, n, { font: arial(12, true), align: 'center' });
    put(ws, ref, text, { font: arial(size, true) });
    setH(row, 16);
    row += 1;
  };
  /** Thin grid + medium outline + double rule under the header rows. */
  const finishTable = (from: number, to: number, headerRows: number, left = 'B', right = 'R') => {
    box(ws, `${left}${from}:${right}${to}`);
    edge(ws, `${left}${from + headerRows - 1}:${right}${from + headerRows - 1}`, 'bottom', 'double');
    outline(ws, `${left}${from}:${right}${to}`);
  };
  const jumlahRow = (from: number, to: number) => {
    put(ws, `B${row}:G${row}`, 'Jumlah', h12b);
    for (const c of ['H', 'I', 'J', 'K']) {
      put(ws, `${c}${row}`, { formula: `SUM(${c}${from}:${c}${to})`, result: 0 }, markCell);
    }
    put(ws, `L${row}:R${row}`, '');
    setH(row);
    row += 1;
  };

  // 1 · Melahirkan & Meninggal
  title(1, 'DATA JM MELAHIRKAN DAN MENINGGAL DUNIA DESA CILANDAK');
  let tableFrom = row;
  put(ws, `B${row}:B${row + 1}`, 'NO', h12b);
  put(ws, `C${row}:G${row + 1}`, 'NAMA', h12b);
  put(ws, `H${row}:I${row}`, 'MELAHIRKAN', h10);
  put(ws, `J${row}:K${row}`, 'MENINGGAL', h10);
  put(ws, `L${row}:R${row + 1}`, 'KETERANGAN', h10);
  ['H', 'I', 'J', 'K'].forEach((c, i) => put(ws, `${c}${row + 1}`, i % 2 === 0 ? 'L' : 'P', h10));
  setH(row);
  setH(row + 1);
  row += 2;
  const vitalRows = Math.max(MIN.vital, r.peristiwa.vital.length);
  const vitalFrom = row;
  for (let i = 0; i < vitalRows; i++) {
    const e = r.peristiwa.vital[i];
    put(ws, `B${row}`, i + 1, numCell);
    put(ws, `C${row}:G${row}`, e?.memberName ?? '', nameCell);
    const marks = ['', '', '', ''];
    if (e && e.source === 'vital') {
      const female = e.gender === 'Perempuan';
      marks[(e.kind === 'Lahir' ? 0 : 2) + (female ? 1 : 0)] = '1';
    }
    ['H', 'I', 'J', 'K'].forEach((c, k) => put(ws, `${c}${row}`, marks[k] ? 1 : '', markCell));
    put(ws, `L${row}:R${row}`, e && e.source === 'vital' ? (e.notes ?? '') : '', markCell);
    setH(row, i < 4 ? 16 : 15.75);
    row += 1;
  }
  jumlahRow(vitalFrom, row - 1);
  finishTable(tableFrom, row - 1, 2);
  row += 1;

  // 2 · Pindah Sambung & Sambung Baru
  title(2, 'DATA JM PINDAH SAMBUNG dan SAMBUNG BARU DESA CILANDAK');
  tableFrom = row;
  put(ws, `B${row}:B${row + 1}`, 'NO', h12b);
  put(ws, `C${row}:G${row + 1}`, 'NAMA', h12b);
  put(ws, `H${row}:I${row}`, 'PINDAH SAMBUNG', h12b);
  put(ws, `J${row}:K${row}`, 'SAMBUNG BARU', h12b);
  put(ws, `L${row}:R${row + 1}`, 'KETERANGAN', h12b);
  ['H', 'I', 'J', 'K'].forEach((c, i) => put(ws, `${c}${row + 1}`, i % 2 === 0 ? 'L' : 'P', h12b));
  setH(row);
  setH(row + 1);
  row += 2;
  const movRows = Math.max(MIN.movement, r.peristiwa.movement.length);
  const movFrom = row;
  for (let i = 0; i < movRows; i++) {
    const e: EventLogEntry | undefined = r.peristiwa.movement[i];
    put(ws, `B${row}`, i + 1, numCell);
    put(ws, `C${row}:G${row}`, e?.memberName ?? '', nameCell);
    const marks = ['', '', '', ''];
    if (e && e.source === 'movement') {
      const female = data.genderByMemberId[e.memberId] === 'Perempuan';
      marks[(e.kind === 'Pindah Sambung' ? 0 : 2) + (female ? 1 : 0)] = '1';
    }
    ['H', 'I', 'J', 'K'].forEach((c, k) => put(ws, `${c}${row}`, marks[k] ? 1 : '', markCell));
    put(ws, `L${row}:R${row}`, e && e.source === 'movement' ? (e.notes ?? '') : '', markCell);
    setH(row);
    row += 1;
  }
  jumlahRow(movFrom, row - 1);
  finishTable(tableFrom, row - 1, 2);
  row += 1;

  // 3 · Sedang sakit
  title(3, 'DATA JM YANG SEDANG SAKIT');
  tableFrom = row;
  put(ws, `B${row}`, 'NO', h12b);
  put(ws, `C${row}:K${row}`, 'NAMA', h12b);
  put(ws, `L${row}:R${row}`, 'KETERANGAN', h12b);
  setH(row);
  row += 1;
  for (let i = 0; i < Math.max(MIN.sick, r.sick.length); i++) {
    const s = r.sick[i];
    put(ws, `B${row}`, i + 1, numCell);
    put(ws, `C${row}:K${row}`, s?.memberName ?? '', { font: arial(12), align: 'left' });
    put(ws, `L${row}:R${row}`, s?.notes ?? '', { font: arial(12), align: 'center' });
    setH(row);
    row += 1;
  }
  finishTable(tableFrom, row - 1, 1);
  row += 1;

  // 4 · Kegiatan kelompok
  title(4, 'KEGIATAN KELOMPOK');
  tableFrom = row;
  put(ws, `B${row}`, 'NO', h12b);
  put(ws, `C${row}:H${row}`, 'KEGIATAN', h12b);
  put(ws, `I${row}:K${row}`, 'STATUS', h12b);
  put(ws, `L${row}:N${row}`, 'TANGGAL PELAKSANAAN', h12b);
  put(ws, `O${row}:P${row}`, 'JUMLAH HADIR', h12b);
  put(ws, `Q${row}:R${row}`, 'TEMPAT', h12b);
  setH(row);
  row += 1;
  for (let i = 0; i < Math.max(MIN.activities, r.activities.length); i++) {
    const a = r.activities[i];
    put(ws, `B${row}`, i + 1, numCell);
    put(ws, `C${row}:H${row}`, a?.activityName ?? '', { font: arial(12), align: 'left' });
    put(ws, `I${row}:K${row}`, a ? (a.status === 'Terlaksana' ? 'TERLAKSANA' : 'BELUM') : '', {
      font: arial(12, false, true),
      align: 'center',
    });
    put(ws, `L${row}:N${row}`, fmtDateDMY(a?.executedDate), h12b);
    put(ws, `O${row}:P${row}`, a?.attendeeCount ?? '', h12b);
    put(ws, `Q${row}:R${row}`, a?.location ?? '', h12b);
    setH(row);
    row += 1;
  }
  finishTable(tableFrom, row - 1, 1);
  row += 1;

  // 5 · Keluarga yang sudah dikunjungi
  title(5, 'KELUARGA YANG SUDAH DIKUNJUNGI');
  tableFrom = row;
  put(ws, `B${row}`, 'NO', h12b);
  put(ws, `C${row}:K${row}`, 'NAMA KELUARGA', h12b);
  put(ws, `L${row}:R${row}`, 'KETERANGAN', h12b);
  setH(row);
  row += 1;
  for (let i = 0; i < Math.max(MIN.families, r.familyVisits.length); i++) {
    const f = r.familyVisits[i];
    put(ws, `B${row}`, i + 1, numCell);
    put(ws, `C${row}:K${row}`, f ? (f.familyName ?? f.householdLabel ?? '') : '', nameCell);
    put(ws, `L${row}:R${row}`, f?.notes ?? '', markCell);
    setH(row);
    row += 1;
  }
  finishTable(tableFrom, row - 1, 1);
  row += 2;

  // 6 · Prosentase Lima BAB — each label/value block is its own medium box.
  put(ws, `B${row}`, 6, { font: arial(12, true), align: 'center' });
  put(ws, `C${row}:E${row}`, 'Prosentase Lima BAB', h12b);
  put(ws, `F${row}:Q${row}`, 'SIFATNYA SECARA KESELURUHAN, IZIN DIHITUNG HADIR', h12b);
  outline(ws, `C${row}:E${row}`);
  outline(ws, `F${row}:Q${row}`);
  setH(row);
  row += 2;
  const labels: [string, string][] = [
    [`C${row}:E${row}`, 'LANCAR : > 60 %'],
    [`G${row}:J${row}`, 'KURANG LANCAR : 20 - 60 %'],
    [`L${row}:N${row}`, 'KRG SAMBUNG : < 20 %'],
    [`O${row}:Q${row}`, 'TABAYYUN : 0 %'],
  ];
  for (const [ref, text] of labels) {
    put(ws, ref, text, h12b);
    outline(ws, ref);
  }
  setH(row);
  row += 1;
  const lb = r.limaBab;
  const eligible = lb.lancar + lb.kurangLancar + lb.kurangSambung + lb.tabayyun;
  const pct = (n: number): ExcelJS.CellValue =>
    lb.sessionCount === 0 || eligible === 0 ? '' : n / eligible;
  const pctCell: CellStyle = { font: arial(20), align: 'center', numFmt: '0%' };
  const values: [string, number][] = [
    [`C${row}:E${row}`, lb.lancar],
    [`G${row}:J${row}`, lb.kurangLancar],
    [`L${row}:N${row}`, lb.kurangSambung],
    [`O${row}:Q${row}`, lb.tabayyun],
  ];
  for (const [ref, n] of values) {
    put(ws, ref, pct(n), pctCell);
    outline(ws, ref);
  }
  setH(row);
  row += 2;

  // 7 · Anjangsana
  title(7, 'ANJANGSANA');
  tableFrom = row;
  const hb: CellStyle = { font: arial(11, true), align: 'center' };
  put(ws, `C${row}`, 'No', hb);
  put(ws, `D${row}`, 'Waktu', hb);
  put(ws, `E${row}:H${row}`, 'Tempat', hb);
  put(ws, `I${row}:J${row}`, 'Acara', hb);
  put(ws, `K${row}:N${row}`, 'Keterangan', hb);
  setH(row);
  row += 1;
  for (let i = 0; i < Math.max(MIN.visits, r.visitPlans.length); i++) {
    const v = r.visitPlans[i];
    put(ws, `C${row}`, v ? i + 1 : '', hb);
    put(ws, `D${row}`, v?.waktu ?? '', hb);
    put(ws, `E${row}:H${row}`, v?.tempat ?? '', hb);
    put(ws, `I${row}:J${row}`, v?.agenda ?? '', hb);
    put(ws, `K${row}:N${row}`, '', hb);
    setH(row);
    row += 1;
  }
  finishTable(tableFrom, row - 1, 1, 'C', 'N');
  row += 1;

  // 8 · Pembangunan
  title(8, 'PEMBANGUNAN', `C${row}:E${row}`, 11);
  tableFrom = row;
  put(ws, `C${row}`, 'No', hb);
  put(ws, `D${row}:F${row}`, 'Jenis', hb);
  put(ws, `G${row}:I${row}`, 'Kegunaan', hb);
  put(ws, `J${row}:K${row}`, 'Volume/Luas', hb);
  put(ws, `L${row}:N${row}`, 'Dana', hb);
  put(ws, `O${row}:P${row}`, 'Kondisi', hb);
  setH(row);
  row += 1;
  const pc: CellStyle = { font: arial(11), align: 'center', wrap: true };
  for (let i = 0; i < Math.max(MIN.construction, r.constructionProjects.length); i++) {
    const p = r.constructionProjects[i];
    put(ws, `C${row}`, p ? i + 1 : '', pc);
    put(ws, `D${row}:F${row}`, p?.jenis ?? '', pc);
    put(ws, `G${row}:I${row}`, p?.tujuan ?? '', pc);
    put(ws, `J${row}:K${row}`, p?.volume ?? '', pc);
    put(ws, `L${row}:N${row}`, p?.dana ?? '', pc);
    put(ws, `O${row}:P${row}`, '', pc);
    setH(row);
    row += 1;
  }
  finishTable(tableFrom, row - 1, 1, 'C', 'P');
  row += 2;

  // 9–11 · One-liners
  const oneLiner = (n: number, label: string, value: string | null) => {
    put(ws, `B${row}`, n, { font: arial(12, true), align: 'center' });
    put(ws, `C${row}`, label, { font: arial(11, true) });
    const cell = put(ws, `E${row}`, `: ${value ?? ''}`, { font: arial(11, true) });
    cell.border = { bottom: { style: 'thin' } };
    setH(row);
    row += 1;
  };
  oneLiner(9, 'RENCANA BECE', r.rencanaBece);
  oneLiner(10, 'BERAS JIMPITAN', r.berasJimpitan);
  oneLiner(11, 'FOTOCOPY DALIL', r.fotocopyDalil);

  // 12 · Saran dan masukan (thin grid only, as in the manager's sheet)
  put(ws, `B${row}`, 12, { font: arial(12, true), align: 'center' });
  put(ws, `C${row}`, 'SARAN DAN MASUKAN', { font: arial(11, true) });
  setH(row);
  row += 1;
  tableFrom = row;
  put(ws, `C${row}`, 'NO', hb);
  put(ws, `D${row}:R${row}`, 'SARAN DAN MASUKAN', hb);
  setH(row);
  row += 1;
  for (let i = 0; i < Math.max(MIN.saran, r.saran.length); i++) {
    const s = r.saran[i];
    put(ws, `C${row}`, s ? i + 1 : '', hb);
    put(ws, `D${row}:R${row}`, s?.suggestions ?? '', { font: arial(11, true), align: 'center', wrap: true });
    setH(row);
    row += 1;
  }
  box(ws, `C${tableFrom}:R${row - 1}`);

  // Lain-lain (the manager's sheet numbers this "12" again; we continue).
  put(ws, `B${row}`, 13, { font: arial(12, true), align: 'center' });
  put(ws, `C${row}:D${row}`, 'Lain - Lain', { font: arial(11, true) });
  put(ws, `E${row}`, `: ${r.otherNotes ?? ''}`, { font: arial(11, true) });
  setH(row);
  row += 1;

  // Signatures
  put(ws, `G${row}:I${row}`, 'Sekretaris Kelompok', { font: arial(11), align: 'center' });
  put(ws, `L${row}:N${row}`, 'Pembina Kelompok', { font: arial(11), align: 'center' });
  setH(row);
  row += 4;
  put(ws, `G${row}:I${row}`, `( ${data.signatures.sekretaris ?? ''} )`, { font: arial(11), align: 'center' });
  put(ws, `L${row}:N${row}`, `( ${data.signatures.pembina ?? ''} )`, { font: arial(11), align: 'center' });
  setH(row);

  return wb;
}
