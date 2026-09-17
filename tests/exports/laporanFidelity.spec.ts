import { existsSync } from 'node:fs';
import { join } from 'node:path';

import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { type DB, openDatabase, runMigrations } from '@main/db';
import { activityTypes } from '@main/db/schema';
import { exportService } from '@main/exports/exportService';
import { DEFAULT_ACTIVITY_TYPES } from '@main/services/seedService';

/**
 * Fidelity against the manager's own workbook: with a template-sized month,
 * our Laporan must reproduce every merge, label, border weight and font the
 * four monthly sheets (01–04) have in common. Cells that differ between
 * those sheets are data (names, numbers, signatures) and are ignored.
 */
const SOURCE = join(process.cwd(), 'clapp-handoff', '05 I 18 Mei 2026 - SLM Cilandak.xlsx');
const MIGRATIONS = join(process.cwd(), 'src', 'main', 'db', 'migrations');

/** Data that merely repeats across the four months: month header, activity
 *  statuses, typed one-liners, a suggestion, and the signature names. */
const DATA_CELLS = new Set([
  'B2',
  'I51', 'I52', 'I53', 'I54', 'I55', 'I56',
  'D82', 'E86', 'E87', 'E88', 'D91', 'E94', 'G99', 'L99',
]);
/** Inconsistencies in the manager's file we deliberately don't copy: row 36
 *  of section 2 is the only data row whose KETERANGAN cells aren't merged. */
const SOURCE_QUIRK_MERGES = new Set(['L36:R36']);

type Val = string | number | null;
function val(c: ExcelJS.Cell): Val {
  const v = c.value;
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') {
    if ('result' in v) return (v.result as Val) ?? null;
    if ('richText' in v) return v.richText.map((r) => r.text).join('');
    return null;
  }
  return typeof v === 'string' || typeof v === 'number' ? v : null;
}

function parse(x: string): { col: number; row: number } {
  const mm = /^([A-Z]+)(\d+)$/.exec(x)!;
  let col = 0;
  for (const ch of mm[1]!) col = col * 26 + ch.charCodeAt(0) - 64;
  return { col, row: Number(mm[2]) };
}

/** Non-empty master cells (merged followers excluded). */
function masterCells(ws: ExcelJS.Worksheet): Map<string, Val> {
  const inMerge = new Set<string>();
  for (const m of ws.model.merges) {
    const [s, e] = m.split(':') as [string, string];
    const S = parse(s);
    const E = parse(e);
    for (let r = S.row; r <= E.row; r++) {
      for (let c = S.col; c <= E.col; c++) {
        const addr = `${ws.getColumn(c).letter}${r}`;
        if (addr !== s) inMerge.add(addr);
      }
    }
  }
  const out = new Map<string, Val>();
  ws.eachRow((row) =>
    row.eachCell((c) => {
      if (inMerge.has(c.address)) return;
      const v = val(c);
      if (v !== null && v !== '') out.set(c.address, v);
    }),
  );
  return out;
}

type Side = 'top' | 'bottom' | 'left' | 'right';
const SIDES: Side[] = ['top', 'bottom', 'left', 'right'];
const borders = (c: ExcelJS.Cell) => SIDES.map((s) => c.border?.[s]?.style ?? '-').join(',');
const fontOf = (c: ExcelJS.Cell) => {
  const f = c.font ?? {};
  return `${f.name ?? 'Calibri'}/${f.size ?? 11}/${f.bold ? 'B' : '-'}${f.italic ? 'I' : ''}`;
};


const WEIGHT: Record<string, number> = { '-': 0, hair: 1, thin: 2, medium: 3, double: 4, thick: 5 };
function heavier(a: string, b: string): string {
  return (WEIGHT[a] ?? 0) >= (WEIGHT[b] ?? 0) ? a : b;
}
function mergeBoxes(ws: ExcelJS.Worksheet) {
  return ws.model.merges.map((m) => {
    const [s, e] = m.split(':') as [string, string];
    return { s: parse(s), e: parse(e) };
  });
}
/** Edge between (r,c) and its right/bottom neighbour lies inside one merge? */
function insideMerge(boxes: ReturnType<typeof mergeBoxes>, r: number, c: number, dir: 'right' | 'bottom'): boolean {
  const r2 = dir === 'bottom' ? r + 1 : r;
  const c2 = dir === 'right' ? c + 1 : c;
  return boxes.some((b) => r >= b.s.row && r2 <= b.e.row && c >= b.s.col && c2 <= b.e.col);
}
function edgeMap(ws: ExcelJS.Worksheet, rows: number, cols: number): Map<string, string> {
  const boxes = mergeBoxes(ws);
  const side = (r: number, c: number, s: Side) => (r < 1 || c < 1 ? '-' : (ws.getCell(r, c).border?.[s]?.style ?? '-'));
  const out = new Map<string, string>();
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      if (c >= 1 && !insideMerge(boxes, r, c, 'bottom')) {
        out.set(`h:${r}:${c}`, heavier(side(r, c, 'bottom'), side(r + 1, c, 'top')));
      }
      if (r >= 1 && !insideMerge(boxes, r, c, 'right')) {
        out.set(`v:${r}:${c}`, heavier(side(r, c, 'right'), side(r, c + 1, 'left')));
      }
    }
  }
  return out;
}
function diffEdges(a: ExcelJS.Worksheet, b: ExcelJS.Worksheet, rows: number, cols: number): string[] {
  const ea = edgeMap(a, rows, cols);
  const eb = edgeMap(b, rows, cols);
  const out: string[] = [];
  for (const [k, wa] of ea) {
    const wb = eb.get(k) ?? '-';
    if (wa !== wb) {
      const [kind, r, c] = k.split(':');
      const addr = `${String.fromCharCode(64 + Number(c))}${r}`;
      out.push(`${kind === 'h' ? 'below' : 'right of'} ${addr}: theirs ${wa} | ours ${wb}`);
    }
  }
  return out;
}

// The workbook holds real names and is gitignored; the check runs wherever it exists.
describe.skipIf(!existsSync(SOURCE))("Laporan Bulanan fidelity vs the manager's sheets", () => {
  it('reproduces template merges, labels, border weights and fonts for a template-sized month', async () => {
    const src = new ExcelJS.Workbook();
    await src.xlsx.readFile(SOURCE);
    const sheets = ['01', '02', '03', '04'].map((n) => src.getWorksheet(n)!);
    const theirs = sheets[3]!;
    const maps = sheets.map(masterCells);
    const template = new Map<string, string>();
    for (const [addr, v] of maps[0]!) {
      if (typeof v !== 'string') continue;
      if (maps.every((m) => m.get(addr) === v)) template.set(addr, v);
    }
    expect(template.size).toBeGreaterThan(80);

    const db: DB = openDatabase({ path: ':memory:', inMemory: true });
    runMigrations({ db, migrationsFolder: MIGRATIONS });
    for (const at of DEFAULT_ACTIVITY_TYPES) {
      db.insert(activityTypes)
        .values({ name: at.name, sourceKind: at.sourceKind, meetingType: at.meetingType ?? null })
        .run();
    }
    const ours = exportService.buildWorkbook(
      { db, clock: () => new Date('2026-03-15T00:00:00.000Z') },
      'laporan',
      { month: 3, year: 2026 },
    ).worksheets[0]!;
    const ourCells = masterCells(ours);

    // Labels
    const labelDiffs: string[] = [];
    for (const [addr, want] of template) {
      if (DATA_CELLS.has(addr)) continue;
      const got = ourCells.get(addr);
      if (got !== want) labelDiffs.push(`${addr}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got ?? null)}`);
    }
    expect(labelDiffs, labelDiffs.join('\n')).toEqual([]);

    // Merges
    const theirMerges = [...new Set(theirs.model.merges)].sort();
    const ourMerges = [...new Set(ours.model.merges)].sort();
    const missing = theirMerges.filter((m) => !ourMerges.includes(m));
    const extra = ourMerges.filter((m) => !theirMerges.includes(m) && !SOURCE_QUIRK_MERGES.has(m));
    expect(missing, `in the manager's sheet but not ours: ${missing.join(' ')}`).toEqual([]);
    expect(extra, `ours but not the manager's: ${extra.join(' ')}`).toEqual([]);

    // Effective grid: each edge between two cells is the heavier of the two
    // sides that touch it (a spreadsheet stores a shared line on either
    // neighbour), and edges inside a merged block are never drawn.
    const edgeDiffs = diffEdges(theirs, ours, 99, 18);
    expect(edgeDiffs, `${edgeDiffs.length} edges:\n${edgeDiffs.slice(0, 60).join('\n')}`).toEqual([]);

    // Fonts on every template label
    const fontDiffs: string[] = [];
    for (const addr of template.keys()) {
      if (DATA_CELLS.has(addr)) continue;
      const want = fontOf(theirs.getCell(addr));
      const got = fontOf(ours.getCell(addr));
      if (want !== got) fontDiffs.push(`${addr}: theirs ${want} | ours ${got}`);
    }
    expect(fontDiffs, fontDiffs.join('\n')).toEqual([]);
    db.$client.close();
  });
});
