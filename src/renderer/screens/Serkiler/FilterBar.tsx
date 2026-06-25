import { Printer } from 'lucide-react';

import { Button } from '@renderer/components/Button';
import {
  FilterCell,
  FilterStrip,
} from '@renderer/components/FilterStrip';
import { Select } from '@renderer/components/Select';
import { BULAN_ID } from '@shared/enums';

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
