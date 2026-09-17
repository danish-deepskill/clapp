import type { ReactNode } from 'react';

/** Mono eyebrow above a free-standing section (e.g. "Tindakan Cepat"). */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
        {children}
      </span>
    </div>
  );
}

/** Normal-case subtitle next to a SectionCard label ("— mutasi jama'ah"). */
export function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <span className="text-[14px] font-medium text-ink-500">{children}</span>
  );
}

/** "Lihat Semua →" style link in a SectionCard header. */
export function HeaderLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-7 rounded-sm px-2 text-[12px] font-semibold text-ink-700 transition-colors hover:bg-ink-200 hover:text-ink-900"
    >
      {children} →
    </button>
  );
}

/** Scrollable list body for a recent-records panel. */
export function PanelBody({ children }: { children: ReactNode }) {
  return <div className="max-h-[340px] overflow-y-auto">{children}</div>;
}

export function PanelEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="px-[18px] py-[30px] text-center text-[13px] italic text-ink-500">
      {children}
    </div>
  );
}
