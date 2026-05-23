import { useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface SectionCardProps {
  /** Mono eyebrow label (uppercase tracked). */
  label: string;
  /** Optional title shown next to the label in normal-case Sans. */
  title?: ReactNode;
  /** Right-aligned mono meta text (e.g. "5 aktif · 7 total"). */
  meta?: ReactNode;
  /** Right-side decoration that participates in the header (e.g. a connection pill). */
  headerExtra?: ReactNode;
  /** Whether the header is interactive (clicking toggles collapse). Defaults to true. */
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** Controlled open state — when provided, `collapsible` toggles via callback. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

export function SectionCard({
  label,
  title,
  meta,
  headerExtra,
  collapsible = true,
  defaultCollapsed = false,
  open: controlledOpen,
  onOpenChange,
  children,
  className,
}: SectionCardProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(!defaultCollapsed);
  const open = controlledOpen ?? uncontrolledOpen;

  const toggle = () => {
    if (!collapsible) return;
    const next = !open;
    if (onOpenChange) onOpenChange(next);
    if (controlledOpen === undefined) setUncontrolledOpen(next);
  };

  const Header = collapsible ? 'button' : 'div';

  return (
    <section
      className={clsx(
        'overflow-hidden rounded border border-rule-strong bg-surface',
        className,
      )}
    >
      <Header
        type={collapsible ? 'button' : undefined}
        onClick={collapsible ? toggle : undefined}
        aria-expanded={collapsible ? open : undefined}
        className={clsx(
          'flex w-full items-center gap-3 border-b border-rule-strong bg-paper-2 px-4 py-3 text-left transition-colors',
          collapsible && 'hover:bg-[#EAE3D2]',
          !open && 'border-b-0',
        )}
      >
        {collapsible && (
          <ChevronDown
            size={12}
            className={clsx(
              'shrink-0 text-ink-700 transition-transform',
              !open && '-rotate-90',
            )}
          />
        )}
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-700">
          {label}
        </span>
        {title && (
          <span className="ml-1.5 text-[15px] font-semibold tracking-tight text-ink-900">
            {title}
          </span>
        )}
        <span className="flex-1" />
        {meta && (
          <span className="font-mono text-[11px] font-medium tracking-wide text-ink-500 [&_b]:font-semibold [&_b]:text-ink-900">
            {meta}
          </span>
        )}
        {headerExtra}
      </Header>
      <div className={clsx('bg-surface', !open && 'hidden')}>{children}</div>
    </section>
  );
}
