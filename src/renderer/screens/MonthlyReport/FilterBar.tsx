import { Download, Lock, LockOpen } from 'lucide-react';
import { clsx } from 'clsx';

import { Button } from '@renderer/components/Button';
import {
  FilterCell,
  FilterStrip,
} from '@renderer/components/FilterStrip';
import { Select } from '@renderer/components/Select';
import { BULAN_ID } from '@shared/enums';

export interface ReportFilterBarProps {
  month: number;
  year: number;
  onPeriodChange: (next: { month: number; year: number }) => void;
  availableYears: number[];

  finalized: boolean;
  dirty: boolean;
  saving: boolean;

  onSave: () => void;
  onToggleLock: () => void;
  onDownload: () => void;
}

export function FilterBar({
  month,
  year,
  onPeriodChange,
  availableYears,
  finalized,
  dirty,
  saving,
  onSave,
  onToggleLock,
  onDownload,
}: ReportFilterBarProps) {
  return (
    <FilterStrip>
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

      <FilterCell label="Status" minWidth={150}>
        <span
          className={clsx(
            'inline-flex h-[22px] items-center gap-1.5 rounded-sm px-2 font-mono text-[10.5px] font-semibold uppercase tracking-wider',
            finalized
              ? 'bg-ink-900 text-surface'
              : 'bg-sakit-bg text-sakit-ink',
          )}
        >
          {finalized ? 'Final · Terkunci' : 'Draf'}
        </span>
      </FilterCell>

      <FilterCell flex>
        {!finalized && dirty && (
          <span className="font-mono text-[11px] uppercase tracking-wider text-izin-ink">
            Belum disimpan
          </span>
        )}
      </FilterCell>

      {!finalized && (
        <FilterCell>
          <Button size="sm" onClick={onSave} disabled={!dirty || saving}>
            Simpan
          </Button>
        </FilterCell>
      )}

      <FilterCell>
        <Button
          variant="ghost"
          size="sm"
          icon={<Download size={13} strokeWidth={1.7} />}
          onClick={onDownload}
        >
          Unduh
        </Button>
      </FilterCell>

      <FilterCell>
        <Button
          variant={finalized ? 'ghost' : 'primary'}
          size="sm"
          icon={
            finalized ? (
              <LockOpen size={13} strokeWidth={1.7} />
            ) : (
              <Lock size={13} strokeWidth={1.7} />
            )
          }
          onClick={onToggleLock}
          disabled={saving}
        >
          {finalized ? 'Buka Kunci' : 'Kunci'}
        </Button>
      </FilterCell>
    </FilterStrip>
  );
}
