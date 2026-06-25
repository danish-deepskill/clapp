import { clsx } from 'clsx';

import { RoleBadge } from '@renderer/components/badges';
import type { MemberAsOf } from '@shared/history';

export interface AsOfRosterProps {
  rows: MemberAsOf[];
  emptyLabel: string;
}

const GRID =
  'grid-cols-[48px_minmax(200px,1fr)_56px_120px_minmax(140px,1fr)_110px]';

/** Read-only reconstructed roster for a past month. */
export function AsOfRoster({ rows, emptyLabel }: AsOfRosterProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div
        className={clsx(
          'sticky top-0 z-[2] grid h-9 border-b border-rule-strong bg-paper-2',
          GRID,
        )}
      >
        <Head right>No.</Head>
        <Head>Nama Jama'ah</Head>
        <Head center>L/P</Head>
        <Head>Kelas</Head>
        <Head>Dapukan</Head>
        <Head>No. KK</Head>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-[14px] font-medium text-ink-700">{emptyLabel}</p>
        </div>
      ) : (
        rows.map((m, i) => (
          <div
            key={m.id}
            className={clsx(
              'grid h-[38px] items-center text-[13px]',
              i % 2 === 0 ? 'bg-surface' : 'bg-surface-2',
              GRID,
            )}
          >
            <Cell right mono muted>{i + 1}</Cell>
            <Cell>
              <span className="truncate font-medium text-ink-900">{m.fullName}</span>
            </Cell>
            <Cell center mono>{m.gender === 'Laki-Laki' ? 'L' : 'P'}</Cell>
            <Cell mono>{m.lifeStage}</Cell>
            <Cell>{m.roleName ? <RoleBadge name={m.roleName} /> : <Dash />}</Cell>
            <Cell mono>KK-{m.householdNo}</Cell>
          </div>
        ))
      )}
    </div>
  );
}

function Head({
  children,
  right,
  center,
}: {
  children: React.ReactNode;
  right?: boolean;
  center?: boolean;
}) {
  return (
    <div
      className={clsx(
        'flex h-full items-center border-r border-rule px-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-700 last:border-r-0',
        right && 'justify-end',
        center && 'justify-center',
      )}
    >
      {children}
    </div>
  );
}

function Cell({
  children,
  right,
  center,
  mono,
  muted,
}: {
  children: React.ReactNode;
  right?: boolean;
  center?: boolean;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={clsx(
        'flex h-full min-w-0 items-center border-r border-rule px-3 last:border-r-0',
        right && 'justify-end',
        center && 'justify-center',
        mono && 'font-mono tabular-nums',
        muted ? 'text-ink-500' : 'text-ink-900',
      )}
    >
      {children}
    </div>
  );
}

function Dash() {
  return <span className="text-ink-400">—</span>;
}
