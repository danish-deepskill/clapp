import { clsx } from 'clsx';

import type { AttendanceStatus } from '@shared/enums';

interface PillDef {
  key: AttendanceStatus;
  label: string;
  /** Single-letter keyboard shortcut. */
  shortcut: string;
  /** Full descriptor for aria-label. */
  full: string;
  /** Tailwind classes for the active state. */
  on: string;
  /** Dot color for the inactive state. */
  dot: string;
}

const PILLS: PillDef[] = [
  {
    key: 'H',
    label: 'Hadir',
    shortcut: 'H',
    full: 'Hadir',
    on: 'border-hadir bg-hadir-bg text-hadir-ink',
    dot: 'bg-hadir',
  },
  {
    key: 'A',
    label: 'Alpa',
    shortcut: 'A',
    full: 'Alpa (tanpa keterangan)',
    on: 'border-alpa bg-alpa-bg text-alpa-ink',
    dot: 'bg-alpa',
  },
  {
    key: 'S',
    label: 'Sakit',
    shortcut: 'S',
    full: 'Sakit',
    on: 'border-sakit bg-sakit-bg text-sakit-ink',
    dot: 'bg-sakit',
  },
  {
    key: 'I',
    label: 'Izin',
    shortcut: 'I',
    full: 'Izin',
    on: 'border-izin bg-izin-bg text-izin-ink',
    dot: 'bg-izin',
  },
];

export interface StatusPillsProps {
  /** null = no selection (all pills off — the default for unmarked members). */
  value: AttendanceStatus | null;
  onChange: (next: AttendanceStatus) => void;
  /** Used for aria-label so screen readers know which row this belongs to. */
  rowLabel: string;
}

export function StatusPills({ value, onChange, rowLabel }: StatusPillsProps) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={`Status kehadiran ${rowLabel}`}>
      {PILLS.map((p) => {
        const active = p.key === value;
        return (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${p.full} (${p.shortcut})`}
            onClick={() => onChange(p.key)}
            className={clsx(
              'inline-flex h-7 items-center gap-1.5 rounded-sm border px-2.5 text-[12px] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-900/15',
              active
                ? p.on
                : 'border-ink-200 bg-surface text-ink-500 hover:border-rule-strong hover:text-ink-900',
            )}
          >
            <span
              className={clsx(
                'inline-block h-1.5 w-1.5 rounded-full',
                active ? p.dot : 'bg-ink-300',
              )}
              aria-hidden="true"
            />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

export { PILLS as STATUS_PILL_DEFS };
