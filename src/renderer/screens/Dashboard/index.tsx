import { useCallback, useEffect, useState } from 'react';

import { Banner } from '@renderer/components/Banner';
import type { Screen } from '@renderer/components/NavBar';
import { useClock } from '@renderer/lib/useClock';
import { useActionItemsStore } from '@renderer/store/actionItemsStore';
import { usePeriodStore } from '@renderer/store/periodStore';
import type { DashboardData } from '@shared/dashboard';

import { ActionItemsPanel } from './ActionItemsPanel';
import { EventsPanel } from './EventsPanel';
import { Hero } from './Hero';
import { QuickActions } from './QuickActions';
import { RecentMeetingsPanel, RecentSessionsPanel } from './RecentPanels';

export interface DashboardProps {
  onNavigate: (screen: Screen) => void;
}

/**
 * Beranda (HANDOFF §4 "/"). Composition per CONTEXT §3: hero + Perlu
 * Tindakan + Tindakan Cepat + recent panels. Stat cards from the prototype
 * are intentionally absent (CONTEXT §1 rejects decorative dashboards).
 */
export function Dashboard({ onNavigate }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const setCount = useActionItemsStore((s) => s.setCount);

  // One minute-aligned clock drives the hero and, when the wall calendar
  // rolls into a new month, a refetch — so an app left open overnight on
  // the 31st doesn't keep presenting last month as "bulan ini".
  const now = useClock();
  const liveMonth = `${now.getFullYear()}-${now.getMonth()}`;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await window.clapp.dashboard.get();
        if (cancelled) return;
        if (!r.ok) {
          setLoadError(r.message);
          return;
        }
        setData(r.data);
        setLoadError(null);
        setCount(r.data.actionItems.length);
      } catch (err: unknown) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setCount, liveMonth]);

  /** Navigate, optionally handing a period to the target (see periodStore). */
  const open = useCallback(
    (screen: Screen, period?: { month: number; year: number }) => {
      usePeriodStore.getState().setPendingPeriod(period ?? null);
      onNavigate(screen);
    },
    [onNavigate],
  );

  return (
    <div className="h-full overflow-y-auto bg-paper">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-[22px] px-7 pb-8 pt-6">
        <Hero data={data} now={now} />

        {loadError && (
          <Banner variant="danger">
            Gagal memuat beranda: <b>{loadError}</b>
          </Banner>
        )}

        {data === null && !loadError && (
          <div className="flex items-center justify-center py-16 font-mono text-[11px] uppercase tracking-wider text-ink-500">
            Memuat…
          </div>
        )}

        {data && (
          <>
            <ActionItemsPanel items={data.actionItems} onOpen={open} />
            <QuickActions data={data} onNavigate={(s) => open(s)} />
            <div className="grid grid-cols-[1.1fr_1fr] gap-[18px]">
              <RecentSessionsPanel
                sessions={data.recentSessions}
                onViewAll={() => open('Rekap Absensi')}
              />
              <RecentMeetingsPanel
                meetings={data.recentMeetings}
                onViewAll={() => open('Musyawarah')}
              />
            </div>
            <EventsPanel
              entries={data.eventsThisMonth}
              period={data.period}
              onViewAll={() => open('Catatan Peristiwa')}
            />
          </>
        )}
      </div>
    </div>
  );
}
