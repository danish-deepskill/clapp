// Column template shared by Jamaah list rows and the column header row.
// Sticky No.+Nama on the left, sticky Aksi on the right. Flat mode adds a
// No. KK column after Nama (insert at the marker).

export interface JamaahColumn {
  key: string;
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  /** Plex Mono / tabular nums column. */
  mono?: boolean;
}

export const COLUMNS_BASE: readonly JamaahColumn[] = [
  { key: 'no', label: 'No.', width: 56, align: 'right', mono: true },
  { key: 'nama', label: "Nama", width: 220 },
  { key: 'dapukan', label: 'Dapukan', width: 120 },
  { key: 'gender', label: 'L/P', width: 56, align: 'center', mono: true },
  { key: 'kelas', label: 'Kelas', width: 110, mono: true },
  { key: 'pernikahan', label: 'Pernikahan', width: 130 },
  { key: 'darah', label: 'Gol. Darah', width: 96, align: 'center', mono: true },
  { key: 'rhesus', label: 'Rhesus', width: 96, align: 'center', mono: true },
  { key: 'tempat', label: 'Tempat Lahir', width: 130 },
  { key: 'tanggal', label: 'Tanggal Lahir', width: 120, mono: true },
  { key: 'panggilan', label: 'Panggilan', width: 130 },
  { key: 'aksi', label: '', width: 48, align: 'center' },
];

export const NO_KK_COLUMN: JamaahColumn = {
  key: 'noKk',
  label: 'No. KK',
  width: 80,
  align: 'center',
  mono: true,
};

export function columnsFor(viewMode: 'grouped' | 'flat'): JamaahColumn[] {
  if (viewMode === 'grouped') return [...COLUMNS_BASE];
  // Flat mode: insert No. KK after Nama (index 1).
  return [
    COLUMNS_BASE[0]!,
    COLUMNS_BASE[1]!,
    NO_KK_COLUMN,
    ...COLUMNS_BASE.slice(2),
  ];
}

export function gridTemplate(cols: JamaahColumn[]): string {
  return cols.map((c) => `${c.width}px`).join(' ');
}

export function totalWidth(cols: JamaahColumn[]): number {
  return cols.reduce((acc, c) => acc + c.width, 0);
}
