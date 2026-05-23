import {
  ChevronDown,
  Filter,
  LayoutList,
  Plus,
  Search,
  Table,
} from 'lucide-react';
import { clsx } from 'clsx';

import { GENDER, LIFE_STAGE } from '@shared/enums';
import type { Gender, LifeStage } from '@shared/enums';
import type { MemberFilter } from '@shared/member';

import { Button } from '@renderer/components/Button';
import { Checkbox } from '@renderer/components/Checkbox';
import { Popover } from '@renderer/components/Popover';
import { SegmentedControl } from '@renderer/components/SegmentedControl';

export type ViewMode = 'grouped' | 'flat';

export interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  filter: MemberFilter;
  onFilterChange: (f: MemberFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  totalActive: number;
  totalFiltered: number;
  onAddClick: () => void;
}

export function FilterBar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  totalActive,
  totalFiltered,
  onAddClick,
}: FilterBarProps) {
  const activeFilterCount =
    (filter.lifeStage ? 1 : 0) +
    (filter.gender ? 1 : 0) +
    (filter.activeOnly ? 1 : 0) +
    (filter.pengurusOnly ? 1 : 0);

  return (
    <div className="flex items-stretch border-b border-rule bg-surface-2">
      <div className="flex flex-col justify-center gap-1 border-r border-rule px-4 py-2.5">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
          Tampilan
        </span>
        <SegmentedControl<ViewMode>
          aria-label="Tampilan daftar"
          value={viewMode}
          onChange={onViewModeChange}
          items={[
            {
              value: 'grouped',
              label: 'Per KK',
              icon: <LayoutList size={13} strokeWidth={1.6} />,
            },
            {
              value: 'flat',
              label: 'Daftar',
              icon: <Table size={13} strokeWidth={1.6} />,
            },
          ]}
        />
      </div>

      <div className="flex flex-1 items-center gap-2.5 border-r border-rule px-4">
        <Search
          size={14}
          strokeWidth={1.6}
          className="shrink-0 text-ink-500"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari nama atau nomor jama'ah…"
          aria-label="Cari jama'ah"
          className="h-full w-full appearance-none border-0 bg-transparent font-sans text-sm text-ink-900 outline-none placeholder:text-ink-400 focus-visible:!ring-0 focus-visible:!ring-offset-0"
        />
      </div>

      <div className="flex items-center border-r border-rule px-4 py-2.5">
        <Popover
          align="end"
          trigger={
            <button
              type="button"
              className={clsx(
                'inline-flex h-9 items-center gap-2 rounded border border-rule-strong bg-surface px-3 font-sans text-[13px] font-medium text-ink-900 transition-colors',
                'hover:border-ink-700 hover:bg-[#FFFDF8]',
                activeFilterCount > 0 && 'border-ink-900',
              )}
            >
              <Filter size={14} strokeWidth={1.6} className="text-ink-500" />
              Filter
              {activeFilterCount > 0 && (
                <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-sm bg-ink-900 px-1 font-mono text-[10px] font-bold text-surface">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown
                size={13}
                strokeWidth={1.6}
                className="text-ink-500"
              />
            </button>
          }
        >
          <FilterPanel filter={filter} onChange={onFilterChange} />
        </Popover>
      </div>

      <div className="flex items-center border-r border-rule px-4 py-2.5">
        <span className="font-mono text-[11px] leading-tight text-ink-500">
          <span className="font-semibold text-ink-900">{totalFiltered}</span>{' '}
          ditampilkan
          <br />
          <span className="font-semibold text-ink-900">{totalActive}</span>{' '}
          aktif
        </span>
      </div>

      <div className="flex items-center px-4 py-2.5">
        <Button
          icon={<Plus size={13} strokeWidth={1.8} />}
          onClick={onAddClick}
        >
          Tambah Jama'ah
        </Button>
      </div>
    </div>
  );
}

function FilterPanel({
  filter,
  onChange,
}: {
  filter: MemberFilter;
  onChange: (f: MemberFilter) => void;
}) {
  return (
    <div className="w-[300px] p-4">
      <div className="mb-4">
        <SectionLabel>Kelas</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          <Chip
            selected={!filter.lifeStage}
            onClick={() => onChange({ ...filter, lifeStage: undefined })}
          >
            Semua
          </Chip>
          {LIFE_STAGE.map((s) => (
            <Chip
              key={s}
              selected={filter.lifeStage === s}
              onClick={() => onChange({ ...filter, lifeStage: s as LifeStage })}
            >
              {s}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <SectionLabel>Gender</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          <Chip
            selected={!filter.gender}
            onClick={() => onChange({ ...filter, gender: undefined })}
          >
            Semua
          </Chip>
          {GENDER.map((g) => (
            <Chip
              key={g}
              selected={filter.gender === g}
              onClick={() => onChange({ ...filter, gender: g as Gender })}
            >
              {g}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 border-t border-rule pt-3">
        <label className="flex cursor-default items-center gap-2.5 text-[13px] text-ink-900">
          <Checkbox
            aria-label="Hanya jama'ah aktif"
            checked={!!filter.activeOnly}
            onCheckedChange={(c) => onChange({ ...filter, activeOnly: c })}
          />
          Hanya jama'ah aktif
        </label>
        <label className="flex cursor-default items-center gap-2.5 text-[13px] text-ink-900">
          <Checkbox
            aria-label="Hanya pengurus"
            checked={!!filter.pengurusOnly}
            onCheckedChange={(c) => onChange({ ...filter, pengurusOnly: c })}
          />
          Hanya pengurus (punya dapukan)
        </label>
      </div>

      <button
        type="button"
        onClick={() => onChange({})}
        className="mt-4 font-mono text-[11px] uppercase tracking-wider text-ink-500 hover:text-ink-900"
      >
        Reset filter
      </button>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
      {children}
    </div>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex h-7 items-center rounded-sm border px-2.5 text-[12px] font-medium transition-colors',
        selected
          ? 'border-ink-900 bg-ink-900 text-surface'
          : 'border-rule bg-surface text-ink-700 hover:border-rule-strong hover:text-ink-900',
      )}
    >
      {children}
    </button>
  );
}
