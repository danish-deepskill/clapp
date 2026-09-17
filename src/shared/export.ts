/** Excel exports (HANDOFF §7, §12.4). Layouts: src/main/exports/specs/. */

export type ExportKind = 'laporan' | 'rekap' | 'serkiler';

export interface ExportInput {
  month: number;
  year: number;
}

export interface ExportResult {
  path: string;
  fileName: string;
}
