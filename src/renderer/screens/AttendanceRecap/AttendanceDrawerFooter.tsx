import { Check } from 'lucide-react';
import { clsx } from 'clsx';

import { Button } from '@renderer/components/Button';
import { fmtIDR } from '@renderer/lib/format';
import type { AttendanceTally } from '@shared/attendance';

export interface DrawerFooterProps {
  tally: AttendanceTally;
  totalShodaqoh: number;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  /** Bulk-fill remaining (status=null) members as Alpa. */
  onFillRemainingAlpa: () => void;
}

/**
 * Compact drawer footer. Drops % Hadir (visible in Rekap matrix behind the
 * drawer) and "Belum Disimpan" pulsing badge (drawer chrome + dirty Save
 * button already convey state).
 */
export function DrawerFooter({
  tally,
  totalShodaqoh,
  dirty,
  saving,
  onSave,
  onReset,
  onFillRemainingAlpa,
}: DrawerFooterProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 text-[12px]">
        <Stat count={tally.H} accent="text-hadir-ink" label="H" />
        <Stat count={tally.A} accent="text-alpa-ink" label="A" />
        <Stat count={tally.S} accent="text-sakit-ink" label="S" />
        <Stat count={tally.I} accent="text-izin-ink" label="I" />
        {tally.T > 0 && (
          <Stat count={tally.T} accent="text-ink-500" label="—" />
        )}
        <span className="h-4 w-px bg-rule" aria-hidden="true" />
        <span className="font-mono text-[13px] font-semibold text-ink-900">
          {fmtIDR(totalShodaqoh)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={tally.T === 0 || saving}
          onClick={onFillRemainingAlpa}
          title={
            tally.T === 0
              ? 'Tidak ada yang belum diisi'
              : `Tandai ${tally.T} jama'ah yang belum diisi sebagai Alpa`
          }
        >
          Sisa Alpa ({tally.T})
        </Button>
        <Button variant="ghost" size="sm" disabled={!dirty || saving} onClick={onReset}>
          Batal
        </Button>
        <Button
          size="sm"
          icon={<Check size={13} strokeWidth={1.8} />}
          disabled={!dirty || saving}
          onClick={onSave}
        >
          {saving ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>
    </div>
  );
}

function Stat({
  count,
  accent,
  label,
}: {
  count: number;
  accent: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={clsx('font-mono text-[14px] font-semibold leading-none', accent)}>
        {count}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-500">
        {label}
      </span>
    </span>
  );
}
