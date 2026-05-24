import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export type IconButtonVariant = 'default' | 'danger' | 'warn';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: IconButtonVariant;
  /** Required for accessibility — icon-only buttons must have an explicit label. */
  'aria-label': string;
  children: ReactNode;
}

const VARIANT_HOVER: Record<IconButtonVariant, string> = {
  default: 'hover:bg-ink-200 hover:text-ink-900',
  danger: 'hover:bg-alpa-bg hover:text-alpa-ink',
  warn: 'hover:bg-sakit-bg hover:text-sakit-ink',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { variant = 'default', className, children, type, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={clsx(
          'inline-flex h-7 w-7 items-center justify-center rounded border-0 bg-transparent text-ink-500 transition-colors',
          VARIANT_HOVER[variant],
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
