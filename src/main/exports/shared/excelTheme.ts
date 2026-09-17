import type ExcelJS from 'exceljs';

/**
 * Shared conventions for the manager-facing workbooks. Values were read
 * from the manager's own file (see ../specs/README.md), so the exports open
 * looking like the sheets the pengurus already know.
 */

export const KELOMPOK_NAME = 'SLM Kelompok Cilandak A';
export const KELOMPOK_UPPER = 'KELOMPOK CILANDAK A';
/** Printed under the Rekap title in the manager's sheet. */
export const KELOMPOK_ADDRESS =
  'Jl. Lapangan Tembak Marinir No.2 Rt.007/01 Cilandak Timur, Pasar Minggu, Jakarta Selatan, 12560';

export const FONT = {
  arial: 'Arial',
  times: 'Times New Roman',
  calibri: 'Calibri',
} as const;

/** Header fill used on the Rekap sheet. */
export const GREEN_FILL = 'FFA8D08D';

export interface CellStyle {
  font?: Partial<ExcelJS.Font>;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  wrap?: boolean;
  /** Thin border on every cell of the (merged) range. */
  box?: boolean;
  fill?: string;
  numFmt?: string;
}

const THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  bottom: { style: 'thin' },
  left: { style: 'thin' },
  right: { style: 'thin' },
};

/** 1 → A, 27 → AA. */
export function colLetter(n: number): string {
  let s = '';
  let x = n;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

function parseRef(ref: string): { c1: number; r1: number; c2: number; r2: number } {
  const [a, b] = ref.split(':');
  const one = (s: string) => {
    const m = /^([A-Z]+)(\d+)$/.exec(s);
    if (!m || !m[1] || !m[2]) throw new Error(`bad cell ref ${s}`);
    let c = 0;
    for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64);
    return { c, r: Number(m[2]) };
  };
  const p = one(a!);
  const q = b ? one(b) : p;
  return { c1: p.c, r1: p.r, c2: q.c, r2: q.r };
}

/** Thin border on every cell in `range` (merged regions need every cell set). */
export function box(ws: ExcelJS.Worksheet, range: string): void {
  const { c1, r1, c2, r2 } = parseRef(range);
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) ws.getCell(r, c).border = THIN;
  }
}

/**
 * Write `value` into `ref` ("B7" or a range "B1:R1", which is merged first)
 * and apply the style to the master cell (borders to every cell).
 */
export function put(
  ws: ExcelJS.Worksheet,
  ref: string,
  value: ExcelJS.CellValue,
  style: CellStyle = {},
): ExcelJS.Cell {
  if (ref.includes(':')) ws.mergeCells(ref);
  const master = ws.getCell(ref.split(':')[0]!);
  master.value = value;
  if (style.font) master.font = style.font;
  master.alignment = {
    horizontal: style.align ?? 'left',
    vertical: style.valign ?? 'middle',
    wrapText: style.wrap ?? false,
  };
  if (style.fill) {
    master.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } };
    if (ref.includes(':')) {
      const { c1, r1, c2, r2 } = parseRef(ref);
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } };
        }
      }
    }
  }
  if (style.numFmt) master.numFmt = style.numFmt;
  if (style.box) box(ws, ref);
  return master;
}

/** "2026-05-18" → "18/05/2026" (the manager writes dates numerically). */
export function fmtDateDMY(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export type BorderWeight = 'thin' | 'medium' | 'double';
type Side = 'top' | 'bottom' | 'left' | 'right';

function setSide(cell: ExcelJS.Cell, side: Side, style: BorderWeight): void {
  cell.border = { ...(cell.border ?? {}), [side]: { style } };
}

/** Heavier border around the outside of `range` (inner lines untouched). */
export function outline(ws: ExcelJS.Worksheet, range: string, style: BorderWeight = 'medium'): void {
  const { c1, r1, c2, r2 } = parseRef(range);
  for (let c = c1; c <= c2; c++) {
    setSide(ws.getCell(r1, c), 'top', style);
    setSide(ws.getCell(r2, c), 'bottom', style);
  }
  for (let r = r1; r <= r2; r++) {
    setSide(ws.getCell(r, c1), 'left', style);
    setSide(ws.getCell(r, c2), 'right', style);
  }
}

/** One side of every cell in `range` — e.g. the double rule under a header row. */
export function edge(ws: ExcelJS.Worksheet, range: string, side: Side, style: BorderWeight): void {
  const { c1, r1, c2, r2 } = parseRef(range);
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) setSide(ws.getCell(r, c), side, style);
  }
}
