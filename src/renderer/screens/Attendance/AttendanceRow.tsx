import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { clsx } from 'clsx';

import { fmtIDR } from '@renderer/lib/format';
import type { AttendanceStatus, Gender } from '@shared/enums';

import { COLUMNS, gridTemplate } from './columns';
import { STATUS_PILL_DEFS, StatusPills } from './StatusPills';

export interface AttendanceRowData {
  memberId: number;
  fullName: string;
  gender: Gender;
  /** null = unmarked (default for fresh rosters). */
  status: AttendanceStatus | null;
  arrivalAt: string | null;
  donationAmount: number | null;
}

export interface AttendanceRowProps {
  index: number;
  row: AttendanceRowData;
  onChange: (next: Partial<AttendanceRowData>) => void;
}

export function AttendanceRow({ index, row, onChange }: AttendanceRowProps) {
  const isHadir = row.status === 'H';
  const isAlpa = row.status === 'A';
  const isUnmarked = row.status === null;

  const onStatusChange = useCallback(
    (next: AttendanceStatus) => {
      // Click-on-active-pill toggles back to null (unmark).
      if (next === row.status) {
        onChange({ status: null, arrivalAt: null, donationAmount: null });
        return;
      }
      // CONTEXT §3 + prototype: arrival + shodaqoh only apply to Hadir.
      const reset = next === 'H' ? {} : { arrivalAt: null, donationAmount: null };
      onChange({ status: next, ...reset });
    },
    [row.status, onChange],
  );

  const onRowKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.target instanceof HTMLInputElement) return;
      const k = e.key.toUpperCase();
      const match = STATUS_PILL_DEFS.find((p) => p.shortcut === k);
      if (match) {
        e.preventDefault();
        onStatusChange(match.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        if (row.status !== null) {
          e.preventDefault();
          onChange({ status: null, arrivalAt: null, donationAmount: null });
        }
      }
    },
    [onStatusChange, onChange, row.status],
  );

  return (
    <div
      role="row"
      tabIndex={0}
      onKeyDown={onRowKeyDown}
      style={{ gridTemplateColumns: gridTemplate() }}
      className={clsx(
        'grid items-center border-b border-rule bg-surface transition-colors',
        'hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none',
        isAlpa && 'text-ink-400',
        isUnmarked && 'bg-paper-2/30',
      )}
    >
      <Cell column="no">{index + 1}</Cell>

      <Cell column="nama">
        <span
          className={clsx(
            'truncate text-[13.5px] font-medium',
            isAlpa ? 'text-ink-400' : 'text-ink-900',
          )}
          title={row.fullName}
        >
          {row.fullName}
          <span className="ml-2 font-mono text-[11px] font-normal text-ink-500">
            {row.gender === 'Laki-Laki' ? 'L' : 'P'}
          </span>
        </span>
      </Cell>

      <Cell column="status">
        <StatusPills
          value={row.status}
          onChange={onStatusChange}
          rowLabel={row.fullName}
        />
      </Cell>

      <Cell column="jam">
        <TimeInput
          value={row.arrivalAt}
          disabled={!isHadir}
          onCommit={(v) => onChange({ arrivalAt: v })}
          ariaLabel={`Jam datang ${row.fullName}`}
        />
      </Cell>

      <Cell column="shodaqoh">
        <DonationInput
          value={row.donationAmount}
          disabled={!isHadir}
          onCommit={(v) => onChange({ donationAmount: v })}
          ariaLabel={`Shodaqoh ${row.fullName}`}
        />
      </Cell>
    </div>
  );
}

function Cell({
  column,
  children,
}: {
  column: string;
  children: React.ReactNode;
}) {
  const def = COLUMNS.find((c) => c.key === column)!;
  return (
    <div
      className={clsx(
        'flex h-[38px] min-w-0 items-center border-r border-rule px-3',
        def.mono && 'font-mono text-[12.5px]',
        def.align === 'right' && 'justify-end',
        def.align === 'center' && 'justify-center',
        def.align === undefined && 'justify-start',
      )}
    >
      {children}
    </div>
  );
}

// ─── Inputs ─────────────────────────────────────────────────────────────────
// Pattern: track a local draft string; sync to parent only on blur or when
// the parent value changes from outside. Avoids re-mounting (focus loss) and
// avoids reformat-while-typing.

function useDraft(canonical: string, externalChanged: unknown) {
  const [draft, setDraft] = useState(canonical);
  const lastExternal = useRef(externalChanged);
  useEffect(() => {
    if (lastExternal.current !== externalChanged) {
      lastExternal.current = externalChanged;
      setDraft(canonical);
    }
  }, [canonical, externalChanged]);
  return [draft, setDraft] as const;
}

// ─── TimeInput (HH:MM, auto-insert colon) ───────────────────────────────────

interface TimeInputProps {
  value: string | null;
  disabled: boolean;
  onCommit: (next: string | null) => void;
  ariaLabel: string;
}

function isoToHHMM(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function hhmmToIso(hhmm: string): string | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!m || !m[1] || !m[2]) return null;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.toISOString();
}

function TimeInput({ value, disabled, onCommit, ariaLabel }: TimeInputProps) {
  const canonical = isoToHHMM(value);
  const [draft, setDraft] = useDraft(canonical, value);

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={disabled ? '—' : 'HH:MM'}
      value={disabled ? '' : draft}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => {
        let v = e.target.value.replace(/[^\d:]/g, '');
        if (v.length === 2 && !v.includes(':')) v = `${v}:`;
        if (v.length > 5) v = v.slice(0, 5);
        setDraft(v);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={() => {
        const v = draft.trim();
        if (v === '') {
          if (value !== null) onCommit(null);
        } else {
          const iso = hhmmToIso(v);
          if (iso) onCommit(iso);
          else setDraft(canonical); // revert invalid
        }
      }}
      className={clsx(
        'h-7 w-full border-0 bg-transparent text-center font-mono text-[12.5px] outline-none placeholder:text-ink-300',
        'focus-visible:!ring-0 focus-visible:!ring-offset-0',
        'focus:bg-[#FFF8E2]',
        disabled && 'cursor-not-allowed text-ink-400',
      )}
    />
  );
}

// ─── DonationInput (IDR thousands, live-formatted, mono) ───────────────────

interface DonationInputProps {
  value: number | null;
  disabled: boolean;
  onCommit: (next: number | null) => void;
  ariaLabel: string;
}

function formatDonation(n: number | null): string {
  return n === null || n === 0 ? '' : fmtIDR(n);
}

function DonationInput({ value, disabled, onCommit, ariaLabel }: DonationInputProps) {
  const canonical = formatDonation(value);
  const [draft, setDraft] = useDraft(canonical, value);

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={disabled ? '—' : 'Rp 0'}
      value={disabled ? '' : draft}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => {
        const el = e.target;
        const raw = el.value;
        const caretBefore = el.selectionStart ?? raw.length;
        const digitsBeforeCaret = raw.slice(0, caretBefore).replace(/\D/g, '').length;
        const digits = raw.replace(/\D/g, '');
        const formatted = digits ? fmtIDR(Number(digits)) : '';
        setDraft(formatted);
        onCommit(digits ? Number(digits) : null);
        // Restore caret after React commits the new value, anchored to digit count.
        requestAnimationFrame(() => {
          let count = 0;
          let pos = formatted.length;
          for (let i = 0; i < formatted.length; i++) {
            if (/\d/.test(formatted[i] ?? '')) {
              count += 1;
              if (count >= digitsBeforeCaret) {
                pos = i + 1;
                break;
              }
            }
          }
          el.setSelectionRange(pos, pos);
        });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={() => {
        if (draft.trim() === '' && value !== null) onCommit(null);
      }}
      className={clsx(
        'h-7 w-full border-0 bg-transparent text-right font-mono text-[12.5px] outline-none placeholder:text-ink-300',
        'focus-visible:!ring-0 focus-visible:!ring-offset-0',
        'focus:bg-[#FFF8E2]',
        disabled && 'cursor-not-allowed text-ink-400',
      )}
    />
  );
}
