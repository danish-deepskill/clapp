import type { ReactNode } from 'react';

/** Bullet-dot prefix + content. Used in modal footer consequence hints. */
export function HintLine({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-700" />
      <span>{children}</span>
    </span>
  );
}

/** Inline pill for token-like values inside a HintLine (KK numbers, types). */
export function HintPill({ children }: { children: ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex items-center rounded-sm border border-rule bg-surface px-1.5 py-px align-[-1px] font-mono text-[11px] font-bold tracking-tight text-ink-900">
      {children}
    </span>
  );
}
