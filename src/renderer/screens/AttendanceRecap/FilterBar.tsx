import { Plus } from 'lucide-react';
import { clsx } from 'clsx';

import { Button } from '@renderer/components/Button';
import {
  FilterCell,
  FilterSearch,
  FilterStrip,
} from '@renderer/components/FilterStrip';
import { Select } from '@renderer/components/Select';
import { BULAN_ID, type AttendanceStatus } from '@shared/enums';

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
      <FilterCell label="Bulan" minWidth={170}>
        <Select
          aria-label="Pilih bulan"
          value={String(month)}
          onValueChange={(v) => onPeriodChange({ month: Number(v), year })}
          items={BULAN_ID.map((name, i) => ({
            value: String(i + 1),
            label: name,
          }))}
          triggerClassName="border-0 bg-transparent px-0 h-7 hover:bg-transparent data-[state=open]:bg-transparent text-[14px] font-semibold text-ink-900"
        />
      </FilterCell>

      <FilterCell label="Tahun" minWidth={130}>
        <Select
          aria-label="Pilih tahun"
          value={String(year)}
          onValueChange={(v) => onPeriodChange({ month, year: Number(v) })}
          items={availableYears.map((y) => ({
            value: String(y),
            label: String(y),
          }))}
          triggerClassName="border-0 bg-transparent px-0 h-7 hover:bg-transparent data-[state=open]:bg-transparent text-[14px] font-semibold text-ink-900"
        />
      </FilterCell>

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
