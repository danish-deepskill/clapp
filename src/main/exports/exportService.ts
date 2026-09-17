import type ExcelJS from 'exceljs';
import { and, eq } from 'drizzle-orm';

import type { ExportInput, ExportKind } from '../../shared/export';
import type { Gender } from '../../shared/enums';
import { assertMonthYear } from '../../shared/period';
import type { DB } from '../db';
import { members, roles } from '../db/schema';
import { attendanceService } from '../services/attendanceService';
import { reportService } from '../services/reportService';
import { serkilerService } from '../services/serkilerService';
import { buildLaporanWorkbook, type LaporanExportData } from './laporanBulananXlsx';
import { buildRekapWorkbook, type RekapExportData } from './rekapAbsensiXlsx';
import { buildSerkilerWorkbook, type SerkilerExportData } from './serkilerXlsx';

export interface ExportDeps {
  db: DB;
  clock?: () => Date;
}

const FILE_PREFIX: Record<ExportKind, string> = {
  laporan: 'Laporan-Bulanan',
  rekap: 'Rekap-Absensi',
  serkiler: 'Serkiler',
};

export function exportFileName(kind: ExportKind, input: ExportInput): string {
  return `${FILE_PREFIX[kind]}-${input.year}-${String(input.month).padStart(2, '0')}.xlsx`;
}

/** Full name of the single active member holding `roleName`, else null. */
function roleHolder(db: DB, roleName: string): string | null {
  const role = db.select().from(roles).where(eq(roles.name, roleName)).get();
  if (!role) return null;
  const holders = db
    .select({ fullName: members.fullName })
    .from(members)
    .where(and(eq(members.roleId, role.id), eq(members.isActive, true)))
    .all();
  return holders.length === 1 ? holders[0]!.fullName : null;
}

function genderByMemberId(db: DB): Record<number, Gender> {
  const out: Record<number, Gender> = {};
  for (const m of db.select({ id: members.id, gender: members.gender }).from(members).all()) {
    out[m.id] = m.gender;
  }
  return out;
}

/** Composes each document's data from the same services the screens use. */
export const exportService = {
  laporanData(deps: ExportDeps, input: ExportInput): LaporanExportData {
    return {
      report: reportService.getReport(deps, input),
      genderByMemberId: genderByMemberId(deps.db),
      signatures: {
        sekretaris: roleHolder(deps.db, 'Sekretaris'),
        pembina: roleHolder(deps.db, 'Pembina'),
      },
    };
  },

  rekapData(deps: ExportDeps, input: ExportInput): RekapExportData {
    return { ...attendanceService.loadRecap(deps, input), month: input.month, year: input.year };
  },

  serkilerData(deps: ExportDeps, input: ExportInput): SerkilerExportData {
    const gender = genderByMemberId(deps.db);
    return {
      month: input.month,
      year: input.year,
      rows: serkilerService
        .list(deps, input)
        .map((r) => ({ ...r, gender: gender[r.memberId] ?? 'Laki-Laki' })),
      witness: roleHolder(deps.db, 'Imam'),
    };
  },

  buildWorkbook(deps: ExportDeps, kind: ExportKind, input: ExportInput): ExcelJS.Workbook {
    assertMonthYear(input.month, input.year);
    switch (kind) {
      case 'laporan':
        return buildLaporanWorkbook(this.laporanData(deps, input));
      case 'rekap':
        return buildRekapWorkbook(this.rekapData(deps, input));
      case 'serkiler':
        return buildSerkilerWorkbook(this.serkilerData(deps, input));
    }
  },
};
