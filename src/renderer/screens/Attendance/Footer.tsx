import { Check } from 'lucide-react';
import { clsx } from 'clsx';

import { Button } from '@renderer/components/Button';
import { fmtIDR } from '@renderer/lib/format';

import type { AttendanceTally } from './FilterBar';

export interface FooterProps {
  tally: AttendanceTally;
  totalShodaqoh: number;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}

export function Footer({
  tally,
  totalShodaqoh,
  dirty,
  saving,
  onSave,
  onReset,
}: FooterProps) {
  // % Hadir computed over MARKED members only (per CONTEXT §2: H+S+I / total).
  const hadirRate =
    tally.marked > 0
      ? Math.round(((tally.H + tally.S + tally.I) / tally.marked) * 100)
      : 0;

  return (
    <div className="flex items-center gap-4 border-t border-rule-strong bg-surface px-4 py-2.5">
      {/* Left: tally */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
          Rekap Sesi
        </span>
        <Stat label="Hadir" count={tally.H} accent="text-hadir-ink" />
        <Stat label="Alpa" count={tally.A} accent="text-alpa-ink" />
        <Stat label="Sakit" count={tally.S} accent="text-sakit-ink" />
        <Stat label="Izin" count={tally.I} accent="text-izin-ink" />
        {tally.T > 0 && <Stat label="Belum Diisi" count={tally.T} accent="text-ink-500" />}
        <Divider />
        <Stat label="% Hadir" count={`${hadirRate}%`} accent="text-ink-900" />
        <Divider />
        <Stat
          label="Shodaqoh"
          count={fmtIDR(totalShodaqoh)}
          accent="text-ink-900"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: dirty badge + actions */}
      {dirty && (
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#E8C97A] bg-[#FFF4D6] px-2 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-izin-ink">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-izin animate-pulse" />
          Belum disimpan
        </span>
      )}
      <Button variant="ghost" size="sm" disabled={!dirty || saving} onClick={onReset}>
        Batal
      </Button>
      <Button
        size="sm"
        icon={<Check size={13} strokeWidth={1.8} />}
        disabled={!dirty || saving}
        onClick={onSave}
      >
        {saving ? 'Menyimpan…' : 'Simpan Absensi'}
      </Button>
    </div>
  );
}

function Stat({
  label,
  count,
  accent,
}: {
  label: string;
  count: number | string;
  accent: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5" title={label}>
      <span className={clsx('font-mono text-[16px] font-semibold leading-none', accent)}>
        {count}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-500">
        {label}
      </span>
    </span>
  );
}

function Divider() {
  return <span className="h-5 w-px bg-rule" aria-hidden="true" />;
}
