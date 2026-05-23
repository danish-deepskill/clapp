import { type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface SegmentedItem<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  items: SegmentedItem<T>[];
  /** Required for screen readers — describes the group. */
  'aria-label': string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  items,
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={clsx(
        'inline-flex h-9 items-stretch overflow-hidden rounded border border-rule bg-surface',
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(item.value)}
            className={clsx(
              'inline-flex items-center gap-1.5 border-r border-rule px-3 font-sans text-[13px] font-medium tracking-tight transition-colors last:border-r-0',
              selected
                ? 'bg-ink-900 text-surface'
                : 'text-ink-700 hover:bg-surface-2 hover:text-ink-900',
            )}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
