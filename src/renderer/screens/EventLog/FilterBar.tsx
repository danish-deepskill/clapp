import { clsx } from 'clsx';

import {
  FilterCell,
  FilterStrip,
} from '@renderer/components/FilterStrip';
import { Select } from '@renderer/components/Select';
import { BULAN_ID } from '@shared/enums';
import type { EventGroup } from '@shared/eventLog';

export interface EventGroupOption {
  value: EventGroup;
  label: string;
  /** Tailwind color for the dot. */
  dotClass: string;
}

const GROUP_OPTIONS: EventGroupOption[] = [
  { value: 'vital', label: 'Lahir & Meninggal', dotClass: 'bg-hadir' },
  {
    value: 'arrival-departure',
    label: 'Sambung & Pindah',
    dotClass: 'bg-izin',
  },
  { value: 'change', label: 'Perubahan Data', dotClass: 'bg-sakit' },
];

export type EventGroupSelection = EventGroup | 'all';

export interface EventLogFilterBarProps {
  month: number;
  year: number;
  onPeriodChange: (next: { month: number; year: number }) => void;
  availableYears: number[];

  selectedGroup: EventGroupSelection;
  onGroupChange: (next: EventGroupSelection) => void;

  totalCount: number;
}

export function FilterBar({
  month,
  year,
  onPeriodChange,
  availableYears,
  selectedGroup,
  onGroupChange,
  totalCount,
}: EventLogFilterBarProps) {
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

      <FilterCell label="Jumlah Peristiwa" minWidth={160}>
        <span className="text-[14px] font-semibold text-ink-900">
          <span className="font-mono">{totalCount}</span> peristiwa
        </span>
      </FilterCell>

      <FilterCell flex>
        <div
          role="radiogroup"
          aria-label="Filter jenis peristiwa"
          className="flex items-center gap-2"
        >
          <Chip
            active={selectedGroup === 'all'}
            onClick={() => onGroupChange('all')}
          >
            Semua
          </Chip>
          {GROUP_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              active={selectedGroup === opt.value}
              onClick={() => onGroupChange(opt.value)}
            >
              <span
                className={clsx('h-1.5 w-1.5 rounded-full', opt.dotClass)}
              />
              {opt.label}
            </Chip>
          ))}
        </div>
      </FilterCell>
    </FilterStrip>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={clsx(
        'inline-flex h-[30px] items-center gap-1.5 rounded-sm border px-3 text-[12.5px] font-medium transition-colors',
        active
          ? 'border-ink-900 bg-ink-900 text-surface'
          : 'border-ink-200 bg-surface text-ink-700 hover:border-ink-300 hover:text-ink-900',
      )}
    >
      {children}
    </button>
  );
}
