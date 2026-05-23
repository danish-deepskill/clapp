import type { CSSProperties } from 'react';

export interface Column {
  key: string;
  label: string;
  /** Fixed width in px. */
  width: number;
  /** Right-aligned (e.g. for numbers / currency). */
  align?: 'left' | 'center' | 'right';
  /** Monospace (Plex Mono for numbers / IDs). */
  mono?: boolean;
}

/**
 * Column widths tuned for the Attendance drawer (~760px wide). NAMA flexes
 * to fill remaining space so the row always spans the full drawer width
 * (no phantom empty column). STATUS is 300px to fit all four labelled pills
 * (Hadir / Alpa / Sakit / Izin ≈ 268px + cell padding 24px = 292px content).
 * CONTEXT §3 prioritizes label clarity for non-technical operators, so we
 * widen the column rather than abbreviate the pills.
 */
export const COLUMNS: Column[] = [
  { key: 'no', label: 'No', width: 40, align: 'right', mono: true },
  { key: 'nama', label: "Nama Jama'ah", width: 0 /* flex */ },
  { key: 'status', label: 'Status', width: 300, align: 'center' },
  { key: 'jam', label: 'Jam', width: 80, align: 'center', mono: true },
  { key: 'shodaqoh', label: 'Shodaqoh', width: 120, align: 'right', mono: true },
];

/**
 * Grid template: NAMA = minmax(200px, 1fr) so it never collapses below 200px
 * and absorbs any extra drawer width. All other columns fixed. The row always
 * fills the drawer body — no dead strip on the right.
 */
export function gridTemplate(): CSSProperties['gridTemplateColumns'] {
  return COLUMNS.map((c) =>
    c.key === 'nama' ? 'minmax(200px, 1fr)' : `${c.width}px`,
  ).join(' ');
}
