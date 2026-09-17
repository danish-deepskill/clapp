import ExcelJS from 'exceljs';

import type { RecapData } from '../../shared/attendance';
import { BULAN_ID } from '../../shared/enums';
import {
  FONT,
  GREEN_FILL,
  KELOMPOK_ADDRESS,
  KELOMPOK_UPPER,
  colLetter,
  put,
} from './shared/excelTheme';

export interface RekapExportData extends RecapData {
  month: number;
  year: number;
}

/** The manager's sheet always shows at least five session columns. */
const MIN_SESSION_COLS = 5;
const FIRST_DATA_ROW = 8;

const calibri = (size: number, bold = false): Partial<ExcelJS.Font> => ({
  name: FONT.calibri,
  size,
  bold,
});

/**
 * Rekap Absensi workbook after the manager's `Rekap Absen` sheet
 * (../specs/rekap-absensi.md): one column per session, per-member % as
 * COUNTIF formulas, members grouped by household with a merged ordinal.
 */
export function buildRekapWorkbook(data: RekapExportData): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Rekap ${String(data.month).padStart(2, '0')}-${data.year}`, {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0, footer: 0 },
    },
    views: [{ state: 'frozen', ySplit: FIRST_DATA_ROW - 1, topLeftCell: `A${FIRST_DATA_ROW}` }],
  });

  const sessions = data.sessions;
  const nSess = sessions.length;
  const sessCols = Math.max(MIN_SESSION_COLS, nSess);
  const firstSess = 4; // D
  const lastSess = firstSess + sessCols - 1;
  const pctStart = lastSess + 1; // H, A, S, I, H+S+I
  const lastCol = pctStart + 4;
  const L = colLetter;

  ws.getColumn(1).width = 4.5;
  ws.getColumn(2).width = 8.2;
  ws.getColumn(3).width = 24.5;
  for (let c = firstSess; c <= lastSess; c++) ws.getColumn(c).width = 10.2;
  [9.5, 9.5, 8, 9.5, 8.5].forEach((w, i) => (ws.getColumn(pctStart + i).width = w));

  const bulan = BULAN_ID[data.month - 1] ?? '';
  put(ws, `B1:${L(lastCol)}2`, `ABSENSI PENGAJIAN ${KELOMPOK_UPPER} - ${bulan.toUpperCase()} ${data.year}`, {
    font: calibri(18, true),
    align: 'center',
  });
  put(ws, `B3:${L(lastCol)}3`, KELOMPOK_ADDRESS, { font: calibri(11), align: 'center' });

  const head = { font: calibri(11, true), align: 'center' as const, box: true, fill: GREEN_FILL };
  put(ws, 'B5:B7', 'No', head);
  put(ws, 'C5:C7', 'Nama', head);
  put(ws, `${L(firstSess)}5:${L(lastSess)}5`, `Bulan ${bulan} ${data.year}`, head);
  put(ws, `${L(pctStart)}5:${L(lastCol)}5`, 'Prosentase (%)', head);
  for (let i = 0; i < sessCols; i++) {
    const s = sessions[i];
    put(ws, `${L(firstSess + i)}6`, s?.sessionTypeName ?? '', head);
    put(ws, `${L(firstSess + i)}7`, s ? Number(s.sessionDate.slice(8, 10)) : '', head);
  }
  ['H', 'A', 'S', 'I', 'H+S+I'].forEach((label, i) => {
    put(ws, `${L(pctStart + i)}6:${L(pctStart + i)}7`, label, head);
  });
  put(ws, 'A5:A7', '', { box: true, fill: GREEN_FILL });

  // Body — household order, then name; ordinal per household merged in col A.
  const members = [...data.members].sort(
    (a, b) =>
      a.householdNo.localeCompare(b.householdNo) || a.fullName.localeCompare(b.fullName, 'id'),
  );
  const statusOf = new Map<string, string>();
  for (const a of data.attendance) statusOf.set(`${a.memberId}:${a.sessionId}`, a.status);

  const sessRange = (r: number) => `${L(firstSess)}${r}:${L(lastSess)}${r}`;
  let row = FIRST_DATA_ROW;
  let ordinal = 0;
  const colSums = [0, 0, 0, 0, 0]; // cached results for the AVERAGE footer
  let groupStart = row;
  let groupNo: string | null = null;
  const closeGroup = () => {
    if (groupNo === null) return;
    const range = groupStart === row - 1 ? `A${groupStart}` : `A${groupStart}:A${row - 1}`;
    put(ws, range, ordinal, { font: calibri(11), align: 'center', box: true });
  };
  members.forEach((m, i) => {
    if (m.householdNo !== groupNo) {
      closeGroup();
      groupNo = m.householdNo;
      groupStart = row;
      ordinal += 1;
    }
    put(ws, `B${row}`, i + 1, { font: calibri(11), align: 'center', box: true });
    put(ws, `C${row}`, m.fullName, { font: calibri(11), box: true });
    for (let c = 0; c < sessCols; c++) {
      const s = sessions[c];
      const st = s ? (statusOf.get(`${m.id}:${s.id}`) ?? '') : '';
      put(ws, `${L(firstSess + c)}${row}`, st, { font: calibri(12), align: 'center', box: true });
    }
    const pctStyle = { font: calibri(12), align: 'center' as const, box: true };
    if (nSess === 0) {
      for (let k = 0; k < 5; k++) put(ws, `${L(pctStart + k)}${row}`, '', pctStyle);
    } else {
      const counts = { H: 0, A: 0, S: 0, I: 0 };
      for (const s of sessions) {
        const st = statusOf.get(`${m.id}:${s.id}`) as keyof typeof counts | undefined;
        if (st) counts[st] += 1;
      }
      (['H', 'A', 'S', 'I'] as const).forEach((k, idx) => {
        colSums[idx]! += (counts[k] / nSess) * 100;
        put(
          ws,
          `${L(pctStart + idx)}${row}`,
          { formula: `COUNTIF(${sessRange(row)},"${k}")/${nSess}*100`, result: (counts[k] / nSess) * 100 },
          pctStyle,
        );
      });
      colSums[4]! += ((counts.H + counts.S + counts.I) / nSess) * 100;
      put(
        ws,
        `${L(pctStart + 4)}${row}`,
        {
          formula: `${L(pctStart)}${row}+${L(pctStart + 2)}${row}+${L(pctStart + 3)}${row}`,
          result: ((counts.H + counts.S + counts.I) / nSess) * 100,
        },
        { ...pctStyle, font: calibri(11) },
      );
    }
    row += 1;
  });
  closeGroup();
  const lastMemberRow = row - 1;

  // Footer: column averages ("Prosentase 5 BAB jamaah") + overall total.
  if (members.length > 0 && nSess > 0) {
    row += 1;
    put(ws, `B${row}:${L(lastSess)}${row}`, 'Prosentase 5 BAB jamaah', { font: calibri(11, true) });
    for (let k = 0; k < 5; k++) {
      const col = L(pctStart + k);
      put(ws, `${col}${row}`, { formula: `AVERAGE(${col}${FIRST_DATA_ROW}:${col}${lastMemberRow})`, result: colSums[k]! / members.length }, {
        font: calibri(11, true),
        align: 'center',
        box: true,
        numFmt: '0.0',
      });
    }
    const avgRow = row;
    row += 1;
    ['H', 'A', 'S', 'I', 'H+S+I'].forEach((label, k) =>
      put(ws, `${L(pctStart + k)}${row}`, label, { font: calibri(11, true), align: 'center', box: true }),
    );
    row += 2;
    put(ws, `${L(lastSess - 2)}${row}:${L(lastSess)}${row}`, 'TOTAL', { font: calibri(11, true), align: 'center', box: true });
    put(
      ws,
      `${L(pctStart)}${row}`,
      {
        formula: `${L(pctStart)}${avgRow}+${L(pctStart + 2)}${avgRow}+${L(pctStart + 3)}${avgRow}`,
        result: (colSums[0]! + colSums[2]! + colSums[3]!) / members.length,
      },
      { font: calibri(11, true), align: 'center', box: true, numFmt: '0.0' },
    );
    put(ws, `${L(pctStart + 1)}${row}`, 'H+S+I', { font: calibri(11, true), align: 'center', box: true });
  }

  return wb;
}
