import { useMemo } from 'react';
import { clsx } from 'clsx';

import type { RosterRow } from '@shared/attendance';

import { AttendanceRow, type AttendanceRowData } from './AttendanceRow';
import { COLUMNS, gridTemplate } from './columns';
import type { GenderFilter } from './FilterBar';

export interface RosterTableProps {
  rows: RosterRow[];
  search: string;
  genderFilter: GenderFilter;
  onRowChange: (memberId: number, patch: Partial<AttendanceRowData>) => void;
}

export function RosterTable({
  rows,
  search,
  genderFilter,
  onRowChange,
}: RosterTableProps) {
  const filtered = useMemo(() => {
    let out = rows;
    if (genderFilter !== 'all') {
      out = out.filter((r) => r.gender === genderFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((r) => r.fullName.toLowerCase().includes(q));
    }
    return out;
  }, [rows, search, genderFilter]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-500">
          Tidak ada jama'ah aktif
        </p>
        <p className="mt-2 max-w-md text-[13px] text-ink-700">
          Belum ada jama'ah aktif yang dapat dicatat kehadirannya. Tambah jama'ah
          via menu <b>Jama'ah</b>.
        </p>
      </div>
    );
  }

  return (
    // Header + body share ONE scroll container so column edges stay aligned
    // regardless of whether the scrollbar is visible. Header uses position:sticky.
    <div className="flex-1 overflow-y-auto" role="rowgroup">
      <div
        role="rowgroup"
        style={{ gridTemplateColumns: gridTemplate() }}
        className="sticky top-0 z-10 grid border-b border-rule-strong bg-paper-2"
      >
        {COLUMNS.map((c) => (
          <div
            key={c.key}
            className={clsx(
              'flex h-8 items-center border-r border-rule px-3',
              'font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500',
              c.align === 'right' && 'justify-end',
              c.align === 'center' && 'justify-center',
            )}
          >
            {c.label}
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-[13px] text-ink-500">
            Tidak ada jama'ah yang cocok dengan pencarian.
          </p>
        </div>
      ) : (
        filtered.map((r, i) => (
          <AttendanceRow
            key={r.memberId}
            index={i}
            row={{
              memberId: r.memberId,
              fullName: r.fullName,
              gender: r.gender,
              status: r.status,
              arrivalAt: r.arrivalAt,
              donationAmount: r.donationAmount,
            }}
            onChange={(patch) => onRowChange(r.memberId, patch)}
          />
        ))
      )}
    </div>
  );
}
