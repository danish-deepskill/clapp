import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      data-invalid={invalid ? 'true' : undefined}
      className={clsx(
        'h-10 w-full appearance-none rounded border bg-surface px-3 font-sans text-sm text-ink-900 outline-none transition-colors',
        'placeholder:text-ink-400',
        'hover:bg-[#FFFDF8] hover:border-rule-strong',
        'focus:bg-white focus:border-ink-900 focus:shadow-[0_0_0_3px_rgba(27,24,20,0.08)]',
        invalid &&
          'border-alpa bg-[#FFF8F6] hover:border-alpa focus:border-alpa focus:shadow-[0_0_0_3px_rgba(178,58,58,0.10)]',
        !invalid && 'border-rule',
        className,
      )}
      {...rest}
    />
  );
});
