import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

import { fmtIDR } from '@renderer/lib/format';

export interface IuranInputProps {
  value: number | null;
  onCommit: (next: number | null) => void;
  ariaLabel: string;
}

/** Live-formatted Rp input with caret preservation; commits on blur. */
export function IuranInput({ value, onCommit, ariaLabel }: IuranInputProps) {
  const canonical = value === null ? '' : fmtIDR(value);
  const [draft, setDraft] = useState(canonical);
  const lastExternal = useRef(value);

  useEffect(() => {
    if (lastExternal.current !== value) {
      lastExternal.current = value;
      setDraft(canonical);
    }
  }, [value, canonical]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft}
      aria-label={ariaLabel}
      placeholder="Rp 0"
      onChange={(e) => {
        const el = e.target;
        const raw = el.value;
        const caretBefore = el.selectionStart ?? raw.length;
        const digitsBeforeCaret = raw
          .slice(0, caretBefore)
          .replace(/\D/g, '').length;
        const digits = raw.replace(/\D/g, '');
        const formatted = digits ? fmtIDR(Number(digits)) : '';
        setDraft(formatted);
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
        const digits = draft.replace(/\D/g, '');
        if (digits === '') {
          if (value !== null) onCommit(null);
        } else {
          const n = Number(digits);
          if (n !== value) onCommit(n);
        }
      }}
      className={clsx(
        'h-9 w-full appearance-none border-0 bg-transparent px-4 text-right font-mono text-[13px] text-ink-900 outline-none',
        'placeholder:text-ink-300',
        'focus:bg-[#FFF8E2] focus:shadow-[inset_0_0_0_2px_#325E8C]',
        'focus-visible:!ring-0 focus-visible:!ring-offset-0',
      )}
    />
  );
}
