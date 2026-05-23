import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, Info } from 'lucide-react';

export type BannerVariant = 'info' | 'warn' | 'danger';

export interface BannerProps {
  variant?: BannerVariant;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BannerVariant, string> = {
  info: 'bg-surface-2 border-rule text-ink-700 [&_b]:text-ink-900 [&_svg]:text-ink-500',
  warn: 'bg-[#FFF8E2] border-[#E8C97A] text-[#7A5A14] [&_b]:text-[#5A3F0F] [&_svg]:text-[#B17A1F]',
  danger:
    'bg-[#FCF6F4] border-[#E9CFCB] text-alpa-ink [&_b]:text-alpa-ink [&_svg]:text-alpa',
};

const DEFAULT_ICONS: Record<BannerVariant, ReactNode> = {
  info: <Info size={14} strokeWidth={1.4} />,
  warn: <AlertTriangle size={14} strokeWidth={1.5} />,
  danger: <AlertTriangle size={14} strokeWidth={1.5} />,
};

export function Banner({
  variant = 'info',
  children,
  icon,
  className,
}: BannerProps) {
  return (
    <div
      role={variant === 'danger' ? 'alert' : 'note'}
      className={clsx(
        'flex max-w-[560px] items-start gap-2.5 rounded border px-3.5 py-3 text-[13px] leading-relaxed',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">{icon ?? DEFAULT_ICONS[variant]}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
