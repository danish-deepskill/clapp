import { useEffect, useMemo, useState } from 'react';

import { Banner } from '@renderer/components/Banner';
import { availableYears, currentMonthYear } from '@renderer/lib/dates';
import { BULAN_ID } from '@shared/enums';
import type { EventLogEntry } from '@shared/eventLog';

import { EventTable } from './EventTable';
import { FilterBar, type EventGroupSelection } from './FilterBar';
import { Footer } from './Footer';

export function EventLog() {
  const initialPeriod = useMemo(() => currentMonthYear(), []);
  const [month, setMonth] = useState(initialPeriod.month);
  const [year, setYear] = useState(initialPeriod.year);
  const [group, setGroup] = useState<EventGroupSelection>('all');

  const [entries, setEntries] = useState<EventLogEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Always fetch the full period (no IPC group filter) — the footer tally
  // should reflect everything in the month regardless of the active chip,
  // and re-fetching on every chip change would make counts blink.
  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    setLoadError(null);
    void (async () => {
      const r = await window.clapp.eventLog.list({ month, year });
      if (cancelled) return;
      if (!r.ok) {
        setLoadError(r.message);
        return;
      }
      setEntries(r.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [month, year]);

  const SOURCE_FOR_GROUP = {
    vital: 'vital',
    'arrival-departure': 'movement',
    change: 'change',
  } as const;

  const visibleEntries = useMemo(() => {
    if (!entries || group === 'all') return entries ?? [];
    const target = SOURCE_FOR_GROUP[group];
    return entries.filter((e) => e.source === target);
  }, [entries, group]);

  const yearChoices = useMemo(
    () => availableYears(initialPeriod.year - 5),
    [initialPeriod],
  );

  const periodLabel = `${BULAN_ID[month - 1]} ${year}`;

  return (
    <div className="flex h-full flex-col bg-paper">
      <FilterBar
        month={month}
        year={year}
        onPeriodChange={({ month: m, year: y }) => {
          setMonth(m);
          setYear(y);
        }}
        availableYears={yearChoices}
        selectedGroup={group}
        onGroupChange={setGroup}
        totalCount={visibleEntries.length}
      />

      {loadError && (
        <div className="px-6 py-3">
          <Banner variant="danger">
            Gagal memuat catatan peristiwa: <b>{loadError}</b>
          </Banner>
        </div>
      )}

      {entries === null && !loadError && (
        <div className="flex flex-1 items-center justify-center font-mono text-[11px] uppercase tracking-wider text-ink-500">
          Memuat…
        </div>
      )}

      {entries && (
        <>
          <EventTable
            entries={visibleEntries}
            emptyLabel={`Tidak ada peristiwa di ${periodLabel}.`}
          />
          <Footer entries={entries} periodLabel={periodLabel} />
        </>
      )}
    </div>
  );
}
