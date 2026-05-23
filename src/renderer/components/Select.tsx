import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { type ReactNode, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface SelectItem {
  value: string;
  label: ReactNode;
}

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  items: SelectItem[];
  /** Required for screen readers. */
  'aria-label': string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    value,
    onValueChange,
    placeholder,
    items,
    disabled,
    className,
    triggerClassName,
    'aria-label': ariaLabel,
  },
  ref,
) {
  return (
    <RadixSelect.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <RadixSelect.Trigger
        ref={ref}
        aria-label={ariaLabel}
        className={clsx(
          'inline-flex h-9 items-center justify-between gap-2 rounded border border-rule bg-surface px-3 font-sans text-sm text-ink-900 outline-none transition-colors',
          'hover:bg-[#FFFDF8] hover:border-rule-strong',
          'data-[state=open]:border-ink-900 data-[state=open]:bg-white',
          'focus-visible:border-ink-900 focus-visible:shadow-[0_0_0_3px_rgba(27,24,20,0.08)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          triggerClassName,
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon className="text-ink-500">
          <ChevronDown size={14} strokeWidth={1.6} />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={clsx(
            'z-[60] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded border border-rule-strong bg-surface shadow-[0_14px_32px_-8px_rgba(0,0,0,0.18),0_2px_6px_rgba(0,0,0,0.06)]',
            className,
          )}
        >
          <RadixSelect.Viewport className="py-1">
            {items.map((item) => (
              <RadixSelect.Item
                key={item.value}
                value={item.value}
                className="relative flex h-8 cursor-default select-none items-center gap-2 pl-7 pr-3 text-sm text-ink-700 outline-none data-[highlighted]:bg-surface-2 data-[highlighted]:text-ink-900 data-[state=checked]:font-semibold data-[state=checked]:text-ink-900"
              >
                <RadixSelect.ItemIndicator className="absolute left-2 inline-flex items-center justify-center">
                  <Check size={12} strokeWidth={2} />
                </RadixSelect.ItemIndicator>
                <RadixSelect.ItemText>{item.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
});
