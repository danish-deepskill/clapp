import { fmtIDR } from '@renderer/lib/format';
import type { SerkilerRow } from '@shared/serkiler';

export interface FooterProps {
  rows: SerkilerRow[];
  periodLabel: string;
}

export function Footer({ rows, periodLabel }: FooterProps) {
  const total = rows.length;
  const signed = rows.filter((r) => r.paraf).length;
  const totalIuran = rows.reduce(
    (acc, r) => acc + (r.circulationAmount ?? 0),
    0,
  );
  const pct = total === 0 ? 0 : Math.round((signed / total) * 100);

  return (
    <div className="flex shrink-0 items-center gap-6 border-t border-rule-strong bg-surface px-5 py-3 text-[12.5px]">
      <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
        Periode {periodLabel}
      </span>

      <div className="flex items-center gap-3">
        <span className="text-ink-700">
          Sudah paraf{' '}
          <span className="font-mono font-bold text-ink-900">{signed}</span>
          <span className="text-ink-500"> / {total}</span>
        </span>
        <div className="h-2 w-[160px] overflow-hidden rounded-sm bg-ink-200">
          <div
            className="h-full bg-hadir transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-[11px] text-ink-500">{pct}%</span>
      </div>

      <span className="text-ink-300">·</span>

      <span className="text-ink-700">
        Total iuran terkumpul:{' '}
        <span className="font-mono font-bold text-ink-900">
          {fmtIDR(totalIuran)}
        </span>
      </span>
    </div>
  );
}
