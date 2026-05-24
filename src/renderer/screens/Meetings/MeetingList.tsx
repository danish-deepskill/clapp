import { clsx } from 'clsx';

import { BULAN_SHORT } from '@shared/enums';
import type { MeetingListItem } from '@shared/meeting';

export interface MeetingListProps {
  items: MeetingListItem[];
  selectedId: number | null;
  /** True when a new (unsaved) meeting is being edited. */
  newDraft: { title: string } | null;
  onSelect: (id: number) => void;
  emptyLabel: string;
}

export function MeetingList({
  items,
  selectedId,
  newDraft,
  onSelect,
  emptyLabel,
}: MeetingListProps) {
  return (
    <div className="flex h-full w-[320px] shrink-0 flex-col border-r border-rule bg-surface">
      <div className="border-b border-rule px-4 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
        Daftar musyawarah
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 && newDraft === null && (
          <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-ink-500">
            {emptyLabel}
          </div>
        )}

        {newDraft !== null && (
          <ListItem
            isNew
            isSelected={selectedId === null}
            onClick={() => undefined}
            dateLabel="Baru"
            typeLabel="(belum disimpan)"
            title={newDraft.title.trim() || '(judul kosong)'}
            attendeeCount={0}
          />
        )}

        {items.map((m) => (
          <ListItem
            key={m.id}
            isSelected={selectedId === m.id}
            onClick={() => onSelect(m.id)}
            dateLabel={formatShortDate(m.meetingDate)}
            typeLabel={m.type}
            title={m.title}
            attendeeCount={m.attendeeCount}
          />
        ))}
      </div>
    </div>
  );
}

function ListItem({
  isSelected,
  isNew,
  onClick,
  dateLabel,
  typeLabel,
  title,
  attendeeCount,
}: {
  isSelected: boolean;
  isNew?: boolean;
  onClick: () => void;
  dateLabel: string;
  typeLabel: string;
  title: string;
  attendeeCount: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-full flex-col gap-1 border-b border-rule px-4 py-3 text-left transition-colors',
        'focus-visible:outline-none focus-visible:!ring-0 focus-visible:bg-[#FFF8E2]',
        isSelected
          ? 'bg-surface shadow-[inset_3px_0_0_#1B1814]'
          : 'hover:bg-surface-2',
        isNew && 'shadow-[inset_3px_0_0_var(--alpa,#B23A3A)]',
      )}
    >
      <div className="flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-500">
        <span className="text-ink-700">{dateLabel}</span>
        <span className="text-ink-300">·</span>
        <span className="truncate">{typeLabel}</span>
      </div>
      <div
        className={clsx(
          'truncate text-[13.5px] font-medium',
          isSelected || isNew ? 'text-ink-900' : 'text-ink-700',
        )}
        title={title}
      >
        {title}
      </div>
      <div className="font-mono text-[11px] text-ink-500">
        {isNew ? '—' : `${attendeeCount} hadir`}
      </div>
    </button>
  );
}

function formatShortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m || !m[1] || !m[2] || !m[3]) return iso;
  const day = Number(m[3]);
  const month = Number(m[2]) - 1;
  const monthLabel = BULAN_SHORT[month] ?? '';
  return `${String(day).padStart(2, '0')} ${monthLabel}`;
}
