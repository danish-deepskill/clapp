import { clsx } from 'clsx';

import type { RosterRow } from '@shared/attendance';

import { AttendanceRow, type AttendanceRowData } from './AttendanceRow';
import { COLUMNS, gridTemplate } from './columns';

export interface RosterTableProps {
  /** Pre-filtered rows (search / etc. handled by parent). */
  rows: RosterRow[];
  onRowChange: (memberId: number, patch: Partial<AttendanceRowData>) => void;
}

export function RosterTable({ rows, onRowChange }: RosterTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-[13px] text-ink-500">
          Tidak ada jama'ah yang cocok dengan pencarian.
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

      {rows.map((r, i) => (
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
      ))}
    </div>
  );
}
