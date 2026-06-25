import {
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  ClipboardList,
  Filter,
  History,
  LayoutList,
  Plus,
  Table,
} from 'lucide-react';
import { clsx } from 'clsx';

import { GENDER, LIFE_STAGE } from '@shared/enums';
import type { Gender, LifeStage } from '@shared/enums';
import type { MemberFilter } from '@shared/member';

import { Button } from '@renderer/components/Button';
import { Checkbox } from '@renderer/components/Checkbox';
import {
  FilterCell,
  FilterSearch,
  FilterStrip,
} from '@renderer/components/FilterStrip';
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
  /** True when every visible KK in grouped view is currently collapsed. */
  allCollapsed: boolean;
  onToggleCollapseAll: () => void;
  /** False in flat view or when no households are visible. */
  canToggleCollapseAll: boolean;
  /** Mode Pendataan Awal — silences Catatan Peristiwa writes from member ops. */
  setupMode: boolean;
  onSetupModeChange: (next: boolean) => void;
  /** Enter the read-only past-month reconstruction view. */
  onOpenHistory: () => void;
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
  allCollapsed,
  onToggleCollapseAll,
  canToggleCollapseAll,
  setupMode,
  onSetupModeChange,
  onOpenHistory,
}: FilterBarProps) {
  const activeFilterCount =
    (filter.lifeStage ? 1 : 0) +
    (filter.gender ? 1 : 0) +
    (filter.activeOnly ? 1 : 0) +
    (filter.pengurusOnly ? 1 : 0);

  return (
    <FilterStrip>
      <FilterCell label="Tampilan">
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
      </FilterCell>

      {canToggleCollapseAll && (
        <FilterCell>
          <Button
            variant="ghost"
            size="sm"
            icon={
              allCollapsed ? (
                <ChevronsUpDown size={13} strokeWidth={1.7} />
              ) : (
                <ChevronsDownUp size={13} strokeWidth={1.7} />
              )
            }
            onClick={onToggleCollapseAll}
          >
            {allCollapsed ? 'Buka Semua' : 'Tutup Semua'}
          </Button>
        </FilterCell>
      )}

      <FilterSearch
        value={search}
        onChange={onSearchChange}
        placeholder="Cari nama atau nomor jama'ah…"
        ariaLabel="Cari jama'ah"
      />

      <FilterCell>
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
      </FilterCell>

      <FilterCell>
        <span className="font-mono text-[11px] leading-tight text-ink-500">
          <span className="font-semibold text-ink-900">{totalFiltered}</span>{' '}
          ditampilkan
          <br />
          <span className="font-semibold text-ink-900">{totalActive}</span>{' '}
          aktif
        </span>
      </FilterCell>

      <FilterCell>
        <button
          type="button"
          onClick={onOpenHistory}
          title="Lihat keadaan jama'ah pada bulan-bulan lalu"
          className="inline-flex h-9 items-center gap-2 rounded border border-rule bg-surface px-3 font-sans text-[13px] font-medium text-ink-700 transition-colors hover:border-rule-strong hover:text-ink-900"
        >
          <History size={14} strokeWidth={1.6} />
          Riwayat
        </button>
      </FilterCell>

      <FilterCell>
        <button
          type="button"
          onClick={() => onSetupModeChange(!setupMode)}
          title={
            setupMode
              ? 'Matikan Mode Setup — kembali mencatat perubahan ke Catatan Peristiwa'
              : 'Nyalakan untuk bulk-entry tanpa membanjiri Catatan Peristiwa'
          }
          className={clsx(
            'inline-flex h-9 items-center gap-2 rounded border px-3 font-sans text-[13px] font-medium transition-colors',
            setupMode
              ? 'border-[#E8C97A] bg-[#FFF8E2] text-[#5A3F0F] hover:border-[#B17A1F]'
              : 'border-rule bg-surface text-ink-700 hover:border-rule-strong hover:text-ink-900',
          )}
        >
          <ClipboardList size={14} strokeWidth={1.6} />
          Mode Setup
          {setupMode && (
            <span className="inline-flex h-[18px] items-center rounded-sm bg-[#B17A1F] px-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-surface">
              ON
            </span>
          )}
        </button>
      </FilterCell>

      <FilterCell>
        <Button
          icon={<Plus size={13} strokeWidth={1.8} />}
          onClick={onAddClick}
        >
          Tambah Jama'ah
        </Button>
      </FilterCell>
    </FilterStrip>
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
