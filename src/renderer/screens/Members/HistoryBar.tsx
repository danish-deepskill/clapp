import { ArrowLeft } from 'lucide-react';

import { Button } from '@renderer/components/Button';
import {
  FilterCell,
  FilterStrip,
} from '@renderer/components/FilterStrip';
import { PeriodSelect } from '@renderer/components/PeriodSelect';

export interface HistoryBarProps {
  month: number;
  year: number;
  onPeriodChange: (next: { month: number; year: number }) => void;
  availableYears: number[];
  count: number;
  onExit: () => void;
}

export function HistoryBar({
  month,
  year,
  onPeriodChange,
  availableYears,
  count,
  onExit,
}: HistoryBarProps) {
  return (
    <FilterStrip>
      <FilterCell>
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={13} strokeWidth={1.7} />}
          onClick={onExit}
        >
          Kembali ke Sekarang
        </Button>
      </FilterCell>

      <PeriodSelect
        month={month}
        year={year}
        onChange={onPeriodChange}
        availableYears={availableYears}
      />

      <FilterCell label="Jumlah Aktif" minWidth={140}>
        <span className="text-[14px] font-semibold text-ink-900">
          <span className="font-mono">{count}</span> jama'ah
        </span>
      </FilterCell>

      <FilterCell flex>
        <span className="text-[12px] italic text-ink-500">
          Keadaan akhir bulan — direkonstruksi dari Catatan Peristiwa. Hanya-baca.
        </span>
      </FilterCell>
    </FilterStrip>
  );
}
