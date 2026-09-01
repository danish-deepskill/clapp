import { Printer } from 'lucide-react';

import { Button } from '@renderer/components/Button';
import {
  FilterCell,
  FilterStrip,
} from '@renderer/components/FilterStrip';
import { PeriodSelect } from '@renderer/components/PeriodSelect';

export interface SerkilerFilterBarProps {
  month: number;
  year: number;
  onPeriodChange: (next: { month: number; year: number }) => void;
  availableYears: number[];

  rosterCount: number;
  signedCount: number;

  onPrint: () => void;
  printDisabled?: boolean;
}

export function FilterBar({
  month,
  year,
  onPeriodChange,
  availableYears,
  rosterCount,
  signedCount,
  onPrint,
  printDisabled,
}: SerkilerFilterBarProps) {
  return (
    <FilterStrip>
      <PeriodSelect
        month={month}
        year={year}
        onChange={onPeriodChange}
        availableYears={availableYears}
      />

      <FilterCell label="Roster" minWidth={140}>
        <span className="text-[14px] font-semibold text-ink-900">
          <span className="font-mono">{rosterCount}</span> jama'ah
        </span>
      </FilterCell>

      <FilterCell label="Sudah Paraf" minWidth={140}>
        <span className="text-[14px] font-semibold text-ink-900">
          <span className="font-mono">{signedCount}</span>
          <span className="text-ink-500"> / {rosterCount}</span>
        </span>
      </FilterCell>

      <FilterCell flex>
        <span className="text-[12px] italic text-ink-500">
          Anggota diatur lewat "Termasuk Serkiler" di Jama'ah. Cetak lembar
          kosong → kelilingkan untuk paraf → catat kembali di sini.
        </span>
      </FilterCell>

      <FilterCell>
        <Button
          size="sm"
          icon={<Printer size={13} strokeWidth={1.7} />}
          onClick={onPrint}
          disabled={printDisabled}
        >
          Cetak Lembar
        </Button>
      </FilterCell>
    </FilterStrip>
  );
}
