// Browse-time columns. Golongan Darah + Rhesus are emergency-lookup fields,
// kept out of the table — they live in the DetailPanel.

export interface JamaahColumn {
  key: string;
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  mono?: boolean;
}

export const COLUMNS_BASE: readonly JamaahColumn[] = [
  { key: 'no', label: 'No.', width: 56, align: 'right', mono: true },
  { key: 'nama', label: "Nama Jama'ah", width: 230 },
  { key: 'dapukan', label: 'Dapukan', width: 120 },
  { key: 'gender', label: 'L/P', width: 56, align: 'center', mono: true },
  { key: 'kelas', label: 'Kelas', width: 110, mono: true },
  { key: 'pernikahan', label: 'Status Pernikahan', width: 160 },
  { key: 'panggilan', label: 'Panggilan', width: 130 },
  { key: 'tempat', label: 'Tempat Lahir', width: 130 },
  { key: 'tanggal', label: 'Tanggal Lahir', width: 150, mono: true },
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
  return [
    COLUMNS_BASE[0]!,
    COLUMNS_BASE[1]!,
    NO_KK_COLUMN,
    ...COLUMNS_BASE.slice(2),
  ];
}

// Inserts a `1fr` spacer right before the last (aksi) column so the chevron
// pins to the viewport's right edge when the table is narrower than the
// window. Renderers must skip the spacer position when iterating cells.
export function gridTemplate(cols: JamaahColumn[]): string {
  const last = cols.length - 1;
  const fixed = cols.slice(0, last).map((c) => `${c.width}px`);
  return [...fixed, '1fr', `${cols[last]!.width}px`].join(' ');
}

export function minTableWidth(cols: JamaahColumn[]): number {
  return cols.reduce((acc, c) => acc + c.width, 0);
}
