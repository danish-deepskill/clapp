import { clsx } from 'clsx';

import type { SeedPreview } from '@shared/seed';

/** Read-only demografi grid + counts, in the register of Laporan's Demografi. */
export function PreviewPanel({ preview }: { preview: SeedPreview }) {
  const visible = preview.byStage.filter((s) => s.total > 0);
  return (
    <section className="overflow-hidden rounded border border-rule-strong bg-surface">
      <div className="flex items-center gap-2.5 border-b border-rule-strong bg-paper-2 px-4 py-[11px]">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-700">
          Pratinjau
        </span>
        <span className="text-[14px] font-medium text-ink-500">
          — {preview.region} Kelompok {preview.kelompokName}
        </span>
        <span className="flex-1" />
        <span className="truncate font-mono text-[11px] text-ink-500" title={preview.path}>
          {preview.path.split(/[\\/]/).pop()}
        </span>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        <p className="text-[13.5px] text-ink-700 [&_b]:font-mono [&_b]:font-semibold [&_b]:text-ink-900">
          <b>{preview.members}</b> jama'ah dalam <b>{preview.households}</b> KK (
          <b>{preview.kk}</b> KK · <b>{preview.kks}</b> KK-S) · <b>{preview.pengurus}</b> dengan
          Dapukan · <b>{preview.inactive}</b> nonaktif
        </p>

        <div className="overflow-hidden rounded border border-rule">
          <div className="grid grid-cols-[1fr_70px_70px_80px] bg-paper-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-700">
            <Cell head>Kelas (aktif)</Cell>
            <Cell head right>L</Cell>
            <Cell head right>P</Cell>
            <Cell head right>Total</Cell>
          </div>
          {visible.map((s, i) => (
            <div
              key={s.stage}
              className={clsx(
                'grid grid-cols-[1fr_70px_70px_80px]',
                i % 2 === 0 ? 'bg-surface' : 'bg-surface-2',
              )}
            >
              <Cell>{s.stage}</Cell>
              <Cell right mono>{s.male}</Cell>
              <Cell right mono>{s.female}</Cell>
              <Cell right mono strong>{s.total}</Cell>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_70px_70px_80px] border-t border-rule-strong bg-paper-2">
            <Cell strong>Jumlah aktif</Cell>
            <Cell right mono strong>{sum(preview.byStage, 'male')}</Cell>
            <Cell right mono strong>{sum(preview.byStage, 'female')}</Cell>
            <Cell right mono strong>{preview.active}</Cell>
          </div>
        </div>

        {preview.roles.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
              Dapukan di file
            </span>
            {preview.roles.map((r) => (
              <span
                key={r}
                className="inline-flex h-[22px] items-center rounded-sm border border-izin bg-izin-bg px-2 font-sans text-[11px] font-semibold tracking-[0.03em] leading-none text-izin-ink"
              >
                {r}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function sum(rows: SeedPreview['byStage'], key: 'male' | 'female'): number {
  return rows.reduce((a, r) => a + r[key], 0);
}

function Cell({
  children,
  head,
  right,
  mono,
  strong,
}: {
  children: React.ReactNode;
  head?: boolean;
  right?: boolean;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={clsx(
        'flex h-9 items-center px-3 text-[13px]',
        head ? 'h-8' : 'text-ink-900',
        right && 'justify-end',
        mono && 'font-mono',
        strong && 'font-semibold',
      )}
    >
      {children}
    </div>
  );
}
