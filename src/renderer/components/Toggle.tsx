import * as RadixToggle from '@radix-ui/react-toggle';
import { clsx } from 'clsx';

export interface ToggleProps {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  /** Required for screen readers — describes what is being toggled. */
  'aria-label': string;
  title?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({
  pressed,
  onPressedChange,
  disabled,
  className,
  title,
  'aria-label': ariaLabel,
}: ToggleProps) {
  return (
    <RadixToggle.Root
      pressed={pressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      data-on={pressed ? '1' : '0'}
      className={clsx(
        'relative inline-block h-5 w-9 shrink-0 rounded-full border-0 p-0 transition-colors disabled:opacity-50',
        pressed ? 'bg-hadir' : 'bg-ink-300',
        className,
      )}
    >
      <i
        aria-hidden="true"
        className={clsx(
          'absolute left-0.5 top-0.5 block h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-transform',
          pressed && 'translate-x-4',
        )}
      />
    </RadixToggle.Root>
  );
}
