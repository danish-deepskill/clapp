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

export const COLUMNS: Column[] = [
  { key: 'no', label: 'No', width: 52, align: 'right', mono: true },
  { key: 'nama', label: "Nama Jama'ah", width: 0 /* 1fr */ },
  { key: 'status', label: 'Status Kehadiran', width: 360 },
  { key: 'jam', label: 'Jam Datang', width: 110, align: 'center', mono: true },
  { key: 'shodaqoh', label: 'Shodaqoh', width: 150, align: 'right', mono: true },
];

/**
 * Grid template with the Nama column flexing (1fr). Extends with a trailing
 * 1fr spacer so scroll content stretches past the table on wide windows.
 */
export function gridTemplate(): CSSProperties['gridTemplateColumns'] {
  return COLUMNS.map((c) =>
    c.key === 'nama' ? 'minmax(220px, 1fr)' : `${c.width}px`,
  ).join(' ');
}
