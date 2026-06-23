import { clsx } from 'clsx';

import type { EventLogEntry } from '@shared/eventLog';
import type {
  MemberChangeType,
  MovementType,
  VitalEventType,
} from '@shared/enums';

type Kind = VitalEventType | MovementType | MemberChangeType;

// Display order matches event severity / life cycle, not alphabetical.
const KIND_DISPLAY: { kind: Kind; dotClass: string }[] = [
  { kind: 'Lahir', dotClass: 'bg-hadir' },
  { kind: 'Meninggal', dotClass: 'bg-ink-900' },
  { kind: 'Sambung Baru', dotClass: 'bg-izin' },
  { kind: 'Pindah Sambung', dotClass: 'bg-sakit' },
  { kind: 'Menikah', dotClass: 'bg-ink-500' },
  { kind: 'Perubahan Kelas', dotClass: 'bg-ink-500' },
  { kind: 'Perubahan Dapukan', dotClass: 'bg-ink-500' },
];

export interface FooterProps {
  /** ALL entries in the current period, regardless of active group filter. */
  entries: EventLogEntry[];
  periodLabel: string;
}

export function Footer({ entries, periodLabel }: FooterProps) {
  const counts = new Map<Kind, number>();
  for (const e of entries) {
    counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  }
  const visible = KIND_DISPLAY.filter(({ kind }) => (counts.get(kind) ?? 0) > 0);

  return (
    <div className="flex shrink-0 items-center gap-4 border-t border-rule-strong bg-surface px-5 py-2.5">
      <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
        Periode {periodLabel}
      </span>
      <span className="text-[14px] text-ink-700">
        <span className="font-mono font-bold text-ink-900">
          {entries.length}
        </span>{' '}
        peristiwa
      </span>
      {visible.length > 0 && (
        <span className="text-ink-300">·</span>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {visible.map(({ kind, dotClass }) => (
          <span
            key={kind}
            className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-700"
          >
            <span className={clsx('h-1.5 w-1.5 rounded-full', dotClass)} />
            <span className="font-mono font-semibold text-ink-900">
              {counts.get(kind)}
            </span>
            {kind}
          </span>
        ))}
      </div>
    </div>
  );
}
