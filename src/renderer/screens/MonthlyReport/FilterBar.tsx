import { Download, Lock, LockOpen } from 'lucide-react';
import { clsx } from 'clsx';

import { Button } from '@renderer/components/Button';
import {
  FilterCell,
  FilterStrip,
} from '@renderer/components/FilterStrip';
import { PeriodSelect } from '@renderer/components/PeriodSelect';

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
      <PeriodSelect
        month={month}
        year={year}
        onChange={onPeriodChange}
        availableYears={availableYears}
      />

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
