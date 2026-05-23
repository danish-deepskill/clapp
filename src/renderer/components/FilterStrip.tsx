import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { clsx } from 'clsx';

/**
 * Horizontal strip of filter / control cells that sits below the NavBar on
 * browse-heavy screens (Members, Attendance, AttendanceRecap, …).
 *
 * Conventions baked in here so screens stay consistent:
 * - `bg-surface-2` background
 * - `border-rule` hairline dividers between cells (last cell auto-omits right border)
 * - Bottom border separates the strip from the content below
 */
export function FilterStrip({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-stretch border-b border-rule bg-surface-2">
      {children}
    </div>
  );
}

export interface FilterCellProps {
  /** Mono uppercase label above the content (stacks). Omit for status/action cells (inline). */
  label?: string;
  /** Minimum width in px — useful for selectors so they don't collapse below the label. */
  minWidth?: number;
  /** Take remaining horizontal space. Use for one cell per strip at most. */
  flex?: boolean;
  /** Replace default `px-4 py-2.5` padding (rare). */
  className?: string;
  children: ReactNode;
}

/**
 * One cell in a {@link FilterStrip}. Two modes:
 * - With `label`: stacks label above content.
 * - Without `label`: inline (single row), used for tally pills / status badges / action buttons.
 */
export function FilterCell({
  label,
  minWidth,
  flex,
  className,
  children,
}: FilterCellProps) {
  const outer = clsx(
    'flex items-stretch border-r border-rule last:border-r-0',
    flex && 'flex-1',
  );
  const inner = clsx(
    'flex w-full px-4 py-2.5',
    label ? 'flex-col justify-center gap-1' : 'items-center',
    className,
  );
  return (
    <div
      className={outer}
      style={minWidth !== undefined ? { minWidth: `${minWidth}px` } : undefined}
    >
      <div className={inner}>
        {label && (
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            {label}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

export interface FilterSearchProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Defaults to `placeholder ?? 'Cari'`. */
  ariaLabel?: string;
}

/**
 * Borderless search input. Always flexes to fill remaining strip width.
 * Uses the screen-wide naked-search convention (transparent bg, no focus ring).
 */
export function FilterSearch({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: FilterSearchProps) {
  return (
    <div className="flex flex-1 items-center gap-2.5 border-r border-rule px-4 last:border-r-0">
      <Search size={14} strokeWidth={1.6} className="shrink-0 text-ink-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder ?? 'Cari'}
        className="h-full w-full appearance-none border-0 bg-transparent font-sans text-sm text-ink-900 outline-none placeholder:text-ink-400 focus-visible:!ring-0 focus-visible:!ring-offset-0"
      />
    </div>
  );
}
