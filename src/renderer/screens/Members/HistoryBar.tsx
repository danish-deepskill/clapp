import { ArrowLeft } from 'lucide-react';

import { Button } from '@renderer/components/Button';
import {
  FilterCell,
  FilterStrip,
} from '@renderer/components/FilterStrip';
import { Select } from '@renderer/components/Select';
import { BULAN_ID } from '@shared/enums';

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

      <FilterCell label="Bulan" minWidth={170}>
        <Select
          aria-label="Pilih bulan"
          value={String(month)}
          onValueChange={(v) => onPeriodChange({ month: Number(v), year })}
          items={BULAN_ID.map((name, i) => ({ value: String(i + 1), label: name }))}
          triggerClassName="border-0 bg-transparent px-0 h-7 hover:bg-transparent data-[state=open]:bg-transparent text-[14px] font-semibold text-ink-900"
        />
      </FilterCell>

      <FilterCell label="Tahun" minWidth={130}>
        <Select
          aria-label="Pilih tahun"
          value={String(year)}
          onValueChange={(v) => onPeriodChange({ month, year: Number(v) })}
          items={availableYears.map((y) => ({ value: String(y), label: String(y) }))}
          triggerClassName="border-0 bg-transparent px-0 h-7 hover:bg-transparent data-[state=open]:bg-transparent text-[14px] font-semibold text-ink-900"
        />
      </FilterCell>

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
