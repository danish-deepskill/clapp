import { clsx } from 'clsx';

import { fmtDateID } from '@renderer/lib/format';
import type { EventLogEntry } from '@shared/eventLog';

export interface EventTableProps {
  entries: EventLogEntry[];
  emptyLabel: string;
}

const GRID = 'grid-cols-[140px_180px_minmax(180px,1fr)_minmax(220px,2fr)]';

export function EventTable({ entries, emptyLabel }: EventTableProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className={clsx('sticky top-0 z-[2] grid h-9 border-b border-rule-strong bg-paper-2', GRID)}>
        <Header>Tanggal</Header>
        <Header>Jenis</Header>
        <Header>Nama</Header>
        <Header>Catatan</Header>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-[14px] font-medium text-ink-700">{emptyLabel}</p>
          <p className="mt-1 text-[12.5px] text-ink-500">
            Coba ganti Bulan / Tahun atau filter jenis di atas.
          </p>
        </div>
      ) : (
        entries.map((e, i) => (
          <Row key={`${e.source}-${e.id}`} entry={e} index={i} />
        ))
      )}
    </div>
  );
}

function Header({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center border-r border-rule px-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-700 last:border-r-0">
      {children}
    </div>
  );
}

function Row({ entry, index }: { entry: EventLogEntry; index: number }) {
  return (
    <div
      className={clsx(
        'grid h-[42px] items-center transition-colors hover:bg-paper-2',
        index % 2 === 0 ? 'bg-surface' : 'bg-surface-2',
        GRID,
      )}
    >
      <Cell>
        <span className="font-mono text-[12.5px]">
          {fmtDateID(entry.date)}
        </span>
      </Cell>
      <Cell>
        <KindBadge entry={entry} />
      </Cell>
      <Cell>
        <span className="truncate text-[13.5px] font-medium text-ink-900">
          {entry.memberName}
        </span>
      </Cell>
      <Cell>
        <Catatan entry={entry} />
      </Cell>
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-w-0 items-center border-r border-rule px-3 last:border-r-0">
      {children}
    </div>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────────

interface BadgeTokens {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

function tokensFor(entry: EventLogEntry): BadgeTokens {
  switch (entry.kind) {
    case 'Lahir':
      return {
        bg: 'bg-hadir-bg',
        text: 'text-hadir-ink',
        border: 'border-hadir',
        dot: 'bg-hadir',
      };
    case 'Meninggal':
      return {
        bg: 'bg-ink-200',
        text: 'text-ink-900',
        border: 'border-ink-900',
        dot: 'bg-ink-900',
      };
    case 'Sambung Baru':
      return {
        bg: 'bg-izin-bg',
        text: 'text-izin-ink',
        border: 'border-izin',
        dot: 'bg-izin',
      };
    case 'Pindah Sambung':
      return {
        bg: 'bg-sakit-bg',
        text: 'text-sakit-ink',
        border: 'border-sakit',
        dot: 'bg-sakit',
      };
    default:
      // Menikah / Perubahan Kelas / Perubahan Dapukan
      return {
        bg: 'bg-surface-2',
        text: 'text-ink-700',
        border: 'border-rule-strong',
        dot: 'bg-ink-500',
      };
  }
}

function KindBadge({ entry }: { entry: EventLogEntry }) {
  const t = tokensFor(entry);
  return (
    <span
      className={clsx(
        'inline-flex h-[24px] items-center gap-1.5 rounded-sm border px-2 font-sans text-[11.5px] font-semibold',
        t.bg,
        t.text,
        t.border,
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', t.dot)} />
      {entry.kind}
    </span>
  );
}

function Catatan({ entry }: { entry: EventLogEntry }) {
  if (entry.source === 'change') {
    return (
      <span className="truncate text-[13px] text-ink-700">
        <span className="text-ink-500 line-through decoration-ink-300">
          {entry.oldValue ?? '—'}
        </span>
        <span className="mx-1.5 text-ink-400">→</span>
        <span className="font-medium text-ink-900">
          {entry.newValue ?? '—'}
        </span>
      </span>
    );
  }
  const notes = entry.source === 'movement' ? entry.notes : entry.notes;
  if (!notes || notes.trim() === '') {
    return <span className="text-[13px] italic text-ink-400">—</span>;
  }
  return (
    <span className="truncate text-[13px] text-ink-700" title={notes}>
      {notes}
    </span>
  );
}
