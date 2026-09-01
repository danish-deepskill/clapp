import { FilterCell } from '@renderer/components/FilterStrip';
import { Select } from '@renderer/components/Select';
import { BULAN_ID } from '@shared/enums';

export interface PeriodSelectProps {
  month: number;
  year: number;
  onChange: (next: { month: number; year: number }) => void;
  availableYears: number[];
}

const NAKED_TRIGGER =
  'border-0 bg-transparent px-0 h-7 hover:bg-transparent data-[state=open]:bg-transparent text-[14px] font-semibold text-ink-900';

/**
 * Bulan + Tahun selector cells for a FilterStrip — the shared period picker
 * used by every month-filtered browse screen (CONTEXT §3: two dropdowns,
 * never a combined month-year picker).
 */
export function PeriodSelect({
  month,
  year,
  onChange,
  availableYears,
}: PeriodSelectProps) {
  return (
    <>
      <FilterCell label="Bulan" minWidth={170}>
        <Select
          aria-label="Pilih bulan"
          value={String(month)}
          onValueChange={(v) => onChange({ month: Number(v), year })}
          items={BULAN_ID.map((name, i) => ({
            value: String(i + 1),
            label: name,
          }))}
          triggerClassName={NAKED_TRIGGER}
        />
      </FilterCell>

      <FilterCell label="Tahun" minWidth={130}>
        <Select
          aria-label="Pilih tahun"
          value={String(year)}
          onValueChange={(v) => onChange({ month, year: Number(v) })}
          items={availableYears.map((y) => ({
            value: String(y),
            label: String(y),
          }))}
          triggerClassName={NAKED_TRIGGER}
        />
      </FilterCell>
    </>
  );
}
