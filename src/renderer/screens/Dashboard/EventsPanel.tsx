import { SectionCard } from '@renderer/components/SectionCard';
import { fmtDateShortID, fmtPeriodID } from '@renderer/lib/format';
import { KindBadge } from '@renderer/screens/EventLog/EventTable';
import type { EventLogEntry } from '@shared/eventLog';

import { HeaderLink, PanelBody, PanelEmpty, PanelTitle } from './PanelBits';

export function EventsPanel({
  entries,
  period,
  onViewAll,
}: {
  entries: EventLogEntry[];
  period: { month: number; year: number };
  onViewAll: () => void;
}) {
  const periodLabel = fmtPeriodID(period);
  return (
    <SectionCard
      label="Peristiwa Bulan Ini"
      title={<PanelTitle>— mutasi jama'ah &amp; keluarga</PanelTitle>}
      collapsible={false}
      headerExtra={
        <HeaderLink onClick={onViewAll}>Buka Catatan Peristiwa</HeaderLink>
      }
    >
      <PanelBody>
        {entries.length === 0 ? (
          <PanelEmpty>Belum ada peristiwa di {periodLabel}.</PanelEmpty>
        ) : (
          entries.map((e) => (
            <div
              key={`${e.source}-${e.id}`}
              className="grid grid-cols-[70px_170px_1fr] items-center gap-3 border-b border-rule px-4 py-[11px] last:border-b-0"
            >
              <span className="font-mono text-[12px] font-medium text-ink-700">
                {fmtDateShortID(e.date)}
              </span>
              <KindBadge entry={e} />
              <span className="truncate text-[13.5px] font-medium tracking-tight text-ink-900">
                {e.memberName}
                <EventNote entry={e} />
              </span>
            </div>
          ))
        )}
      </PanelBody>
    </SectionCard>
  );
}

function EventNote({ entry }: { entry: EventLogEntry }) {
  if (entry.source === 'change') {
    return (
      <span className="ml-1.5 text-[12.5px] font-normal text-ink-500">
        — {entry.oldValue ?? '—'}
        <span className="mx-1 text-ink-400">→</span>
        {entry.newValue ?? '—'}
      </span>
    );
  }
  const notes = entry.notes?.trim();
  if (!notes) return null;
  return (
    <span className="ml-1.5 text-[12.5px] font-normal italic text-ink-500">
      — {notes}
    </span>
  );
}
