import { Plus } from 'lucide-react';
import { clsx } from 'clsx';

import { Button } from '@renderer/components/Button';
import {
  FilterCell,
  FilterSearch,
  FilterStrip,
} from '@renderer/components/FilterStrip';
import { PeriodSelect } from '@renderer/components/PeriodSelect';
import { type AttendanceStatus } from '@shared/enums';

const PILL_TOKENS: Record<
  AttendanceStatus,
  { label: string; dot: string; text: string }
> = {
  H: { label: 'Hadir', dot: 'bg-hadir', text: 'text-hadir-ink' },
  A: { label: 'Alpa', dot: 'bg-alpa', text: 'text-alpa-ink' },
  S: { label: 'Sakit', dot: 'bg-sakit', text: 'text-sakit-ink' },
  I: { label: 'Izin', dot: 'bg-izin', text: 'text-izin-ink' },
};

export interface RecapFilterBarProps {
  month: number;
  year: number;
  onPeriodChange: (next: { month: number; year: number }) => void;
  availableYears: number[];

  search: string;
  onSearchChange: (q: string) => void;

  sessionCount: number;
  memberCount: number;
  overallPct: number; // 0–100 integer

  /** Opens the AttendanceDrawer for today's date (new or existing session). */
  onCatatAbsensi: () => void;
  /** Disable the "+ Catat Absensi" button (e.g. when period is entirely in the future). */
  catatAbsensiDisabled?: boolean;
}

export function FilterBar({
  month,
  year,
  onPeriodChange,
  availableYears,
  search,
  onSearchChange,
  sessionCount,
  memberCount,
  overallPct,
  onCatatAbsensi,
  catatAbsensiDisabled,
}: RecapFilterBarProps) {
  return (
    <FilterStrip>
      <PeriodSelect
        month={month}
        year={year}
        onChange={onPeriodChange}
        availableYears={availableYears}
      />

      <FilterCell label="Jumlah Sesi" minWidth={130}>
        <span className="text-[14px] font-semibold text-ink-900">
          <span className="font-mono">{sessionCount}</span> sesi
        </span>
      </FilterCell>

      <FilterCell label="Jama'ah" minWidth={130}>
        <span className="text-[14px] font-semibold text-ink-900">
          <span className="font-mono">{memberCount}</span> orang
        </span>
      </FilterCell>

      <FilterCell label="Kehadiran Total" minWidth={150}>
        <span className="font-mono text-[14px] font-semibold text-ink-900">
          {sessionCount === 0 ? '—' : `${overallPct}%`}
        </span>
      </FilterCell>

      <FilterSearch
        value={search}
        onChange={onSearchChange}
        placeholder="Cari nama jama'ah…"
        ariaLabel="Cari jama'ah"
      />

      <FilterCell>
        <div className="flex items-center gap-3">
          {(['H', 'A', 'S', 'I'] as AttendanceStatus[]).map((k) => {
            const tok = PILL_TOKENS[k];
            return (
              <div
                key={k}
                className="flex items-center gap-1.5"
                title={tok.label}
              >
                <span className={clsx('h-2 w-2 rounded-sm', tok.dot)} />
                <span
                  className={clsx(
                    'font-mono text-[11px] font-semibold',
                    tok.text,
                  )}
                >
                  {k}
                </span>
              </div>
            );
          })}
        </div>
      </FilterCell>

      <FilterCell>
        <Button
          size="sm"
          icon={<Plus size={13} strokeWidth={1.8} />}
          onClick={onCatatAbsensi}
          disabled={catatAbsensiDisabled}
          title={
            catatAbsensiDisabled
              ? 'Tidak bisa mencatat absensi untuk bulan mendatang'
              : undefined
          }
        >
          Catat Absensi
        </Button>
      </FilterCell>
    </FilterStrip>
  );
}
