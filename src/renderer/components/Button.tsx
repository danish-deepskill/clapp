import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'danger-ghost';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Optional leading icon — usually a 13×13 lucide icon. */
  icon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'border border-ink-900 bg-ink-900 text-surface hover:enabled:bg-black disabled:bg-ink-300 disabled:border-ink-300 disabled:text-surface',
  ghost:
    'border border-rule-strong bg-transparent text-ink-900 hover:enabled:bg-surface-2 disabled:text-ink-300 disabled:border-ink-200',
  danger:
    'border border-alpa bg-alpa text-surface hover:enabled:bg-[#9A2F2F] disabled:bg-ink-300 disabled:border-ink-300',
  'danger-ghost':
    'border border-alpa-bg bg-transparent text-alpa-ink hover:enabled:bg-alpa-bg hover:enabled:border-alpa disabled:text-ink-300 disabled:border-ink-200',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'h-9 px-4 text-[13.5px]',
  sm: 'h-[30px] px-3 text-[12.5px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, className, children, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded font-sans font-semibold tracking-[0.01em]',
        'transition-colors disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});
