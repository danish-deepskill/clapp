import { type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface FormFieldProps {
  label: ReactNode;
  /** Marked required visually (red asterisk). Default false. */
  required?: boolean;
  /** Inline error shown below the input, also turns its border red via aria-invalid. */
  error?: string | null;
  /** Optional sub-label / hint below the label. */
  hint?: ReactNode;
  /** Full-width by default; pass narrow grid-col helpers via className. */
  className?: string;
  children: ReactNode;
}

export function FormField({
  label,
  required,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  return (
    <label className={clsx('flex flex-col gap-1.5', className)}>
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-medium text-ink-700">
          {label}
          {required && <span className="ml-1 text-alpa">*</span>}
        </span>
        {hint && (
          <span className="text-[11px] italic text-ink-500">{hint}</span>
        )}
      </span>
      {children}
      {error && (
        <span className="text-[11.5px] font-medium text-alpa-ink">{error}</span>
      )}
    </label>
  );
}

/** 2-column grid for stacking FormFields in modal bodies. */
export function FormGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">{children}</div>
  );
}

/** Section header inside a modal — mono eyebrow + thin rule. */
export function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
        {title}
      </p>
      {children}
    </div>
  );
}
