import ExcelJS from 'exceljs';

import { BULAN_ID, type Gender } from '../../shared/enums';
import type { SerkilerRow } from '../../shared/serkiler';
import { FONT, put } from './shared/excelTheme';

export interface SerkilerExportRow extends SerkilerRow {
  gender: Gender;
}

export interface SerkilerExportData {
  month: number;
  year: number;
  rows: SerkilerExportRow[];
  /** Witness name for "Menyaksikan, IKEL CLA" (blank when unknown). */
  witness: string | null;
}

const calibri = (size: number, bold = false): Partial<ExcelJS.Font> => ({
  name: FONT.calibri,
  size,
  bold,
});

/**
 * Serkiler workbook after the manager's `Serkiler` sheet
 * (../specs/serkiler.md): two lists (Bapak-bapak, Ibu-ibu) each numbered
 * from 1, paraf slots alternating between two merged columns per row pair,
 * a witness block per list, a page break between lists.
 */
export function buildSerkilerWorkbook(data: SerkilerExportData): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Serkiler ${String(data.month).padStart(2, '0')}-${data.year}`, {
    pageSetup: {
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0, right: 0, top: 0, bottom: 0, header: 0, footer: 0 },
    },
  });
  [9.3, 5, 47.2, 25.5, 15.7, 13.2].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  const bulan = (BULAN_ID[data.month - 1] ?? '').toUpperCase();

  const lists: SerkilerExportRow[][] = [
    data.rows.filter((r) => r.gender === 'Laki-Laki'),
    data.rows.filter((r) => r.gender === 'Perempuan'),
  ].filter((l) => l.length > 0);

  let row = 2;
  lists.forEach((list, li) => {
    if (li > 0) {
      ws.getRow(row - 1).addPageBreak();
    }
    put(ws, `B${row}:F${row}`, 'SERKILER KELOMPOK', { font: calibri(20, true), align: 'center' });
    ws.getRow(row).height = 103.5;
    row += 1;
    put(ws, `B${row}`, '.', { font: calibri(16, true) });
    ws.getRow(row).height = 21;
    row += 1;
    const head = { font: calibri(16, true), align: 'center' as const, box: true };
    put(ws, `B${row}`, 'NO', head);
    put(ws, `C${row}`, 'NAMA', head);
    put(ws, `D${row}`, bulan, head);
    put(ws, `E${row}:F${row}`, 'PARAF', head);
    ws.getRow(row).height = 38.25;
    row += 1;

    for (let i = 0; i < list.length; i += 2) {
      const a = list[i]!;
      const b = list[i + 1];
      const rA = row;
      const rB = row + 1;
      const member = (r: number, m: SerkilerExportRow, n: number) => {
        put(ws, `B${r}`, n, { font: calibri(18), align: 'center', box: true });
        put(ws, `C${r}`, m.fullName, { font: calibri(18), box: true });
        put(ws, `D${r}`, m.circulationAmount ?? '', {
          font: calibri(14),
          align: 'center',
          box: true,
          numFmt: '#,##0',
        });
        ws.getRow(r).height = 24.75;
      };
      member(rA, a, i + 1);
      if (b) member(rB, b, i + 2);
      const slot = (m: SerkilerExportRow | undefined, n: number) =>
        m ? (m.paraf ? `✓ ${n}` : n) : '';
      const slotStyle = { font: calibri(12), align: 'left' as const, valign: 'top' as const, box: true };
      if (b) {
        put(ws, `E${rA}:E${rB}`, slot(a, i + 1), slotStyle);
        put(ws, `F${rA}:F${rB}`, slot(b, i + 2), slotStyle);
        row += 2;
      } else {
        put(ws, `E${rA}`, slot(a, i + 1), slotStyle);
        put(ws, `F${rA}`, '', slotStyle);
        row += 1;
      }
    }

    row += 3;
    put(ws, `B${row}:C${row}`, 'Menyaksikan, IKEL CLA', { font: calibri(14), align: 'center' });
    row += 3;
    put(ws, `B${row}:C${row}`, `( ${data.witness ?? ''} )`, { font: calibri(14), align: 'center' });
    row += 2;
  });

  return wb;
}
