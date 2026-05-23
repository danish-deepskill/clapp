import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Required for screen readers. */
  'aria-label': string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  className,
  'aria-label': ariaLabel,
}: CheckboxProps) {
  return (
    <RadixCheckbox.Root
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(v === true)}
      disabled={disabled}
      aria-label={ariaLabel}
      className={clsx(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-rule-strong bg-surface transition-colors',
        'hover:border-ink-700',
        'data-[state=checked]:border-ink-900 data-[state=checked]:bg-ink-900 data-[state=checked]:text-surface',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <RadixCheckbox.Indicator>
        <Check size={11} strokeWidth={2.5} />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
}
