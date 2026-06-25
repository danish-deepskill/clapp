import { clsx } from 'clsx';

import { Checkbox } from '@renderer/components/Checkbox';
import type { SerkilerRow } from '@shared/serkiler';

import { IuranInput } from './IuranInput';

export interface RosterTableProps {
  rows: SerkilerRow[];
  onToggleParaf: (memberId: number, paraf: boolean) => void;
  onSetIuran: (memberId: number, amount: number | null) => void;
  emptyLabel: string;
}

const GRID = 'grid-cols-[56px_minmax(200px,1fr)_180px_200px]';

export function RosterTable({
  rows,
  onToggleParaf,
  onSetIuran,
  emptyLabel,
}: RosterTableProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div
        className={clsx(
          'sticky top-0 z-[2] grid h-9 border-b border-rule-strong bg-paper-2',
          GRID,
        )}
      >
        <Header align="right">No.</Header>
        <Header>Nama Jama'ah</Header>
        <Header align="right">Iuran (Rp)</Header>
        <Header>Paraf</Header>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-[14px] font-medium text-ink-700">{emptyLabel}</p>
          <p className="mt-1 text-[12.5px] text-ink-500">
            Tandai jama'ah dengan <b>Termasuk rotasi Serkiler</b> di layar
            Jama'ah agar muncul di sini.
          </p>
        </div>
      ) : (
        rows.map((r, i) => (
          <Row
            key={r.memberId}
            index={i}
            rowNumber={i + 1}
            row={r}
            onToggleParaf={onToggleParaf}
            onSetIuran={onSetIuran}
          />
        ))
      )}
    </div>
  );
}

function Header({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: 'right';
}) {
  return (
    <div
      className={clsx(
        'flex h-full items-center border-r border-rule px-4 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-700 last:border-r-0',
        align === 'right' && 'justify-end',
      )}
    >
      {children}
    </div>
  );
}

function Row({
  index,
  rowNumber,
  row,
  onToggleParaf,
  onSetIuran,
}: {
  index: number;
  rowNumber: number;
  row: SerkilerRow;
  onToggleParaf: (memberId: number, paraf: boolean) => void;
  onSetIuran: (memberId: number, amount: number | null) => void;
}) {
  return (
    <div
      className={clsx(
        'grid h-[44px] items-center transition-colors hover:bg-paper-2',
        index % 2 === 0 ? 'bg-surface' : 'bg-surface-2',
        GRID,
      )}
    >
      <Cell align="right">
        <span className="font-mono text-[12.5px] text-ink-500">{rowNumber}</span>
      </Cell>
      <Cell>
        <span className="truncate text-[13.5px] font-medium text-ink-900">
          {row.fullName}
          <span className="ml-2 font-mono text-[10.5px] font-normal text-ink-500">
            KK-{row.householdNo}
          </span>
        </span>
      </Cell>
      <Cell align="right" noPad>
        <IuranInput
          value={row.circulationAmount}
          onCommit={(v) => onSetIuran(row.memberId, v)}
          ariaLabel={`Iuran ${row.fullName}`}
        />
      </Cell>
      <Cell>
        <label className="flex cursor-default items-center gap-2.5 text-[13px] text-ink-700">
          <Checkbox
            aria-label={`Paraf ${row.fullName}`}
            checked={row.paraf}
            onCheckedChange={(v) => onToggleParaf(row.memberId, v)}
          />
          {row.paraf ? (
            <span className="font-medium text-hadir-ink">Sudah paraf</span>
          ) : (
            <span className="text-ink-500">Belum paraf</span>
          )}
        </label>
      </Cell>
    </div>
  );
}

function Cell({
  children,
  align,
  noPad,
}: {
  children: React.ReactNode;
  align?: 'right';
  noPad?: boolean;
}) {
  return (
    <div
      className={clsx(
        'flex h-full min-w-0 items-center border-r border-rule last:border-r-0',
        !noPad && 'px-4',
        align === 'right' && 'justify-end',
      )}
    >
      {children}
    </div>
  );
}
