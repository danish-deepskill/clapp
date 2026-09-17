import { clsx } from 'clsx';
import { AlertTriangle, Check } from 'lucide-react';

import type { Screen } from '@renderer/components/NavBar';
import { SectionCard } from '@renderer/components/SectionCard';
import { fmtPeriodID } from '@renderer/lib/format';
import type { ActionItem } from '@shared/dashboard';

import { PanelTitle } from './PanelBits';

type Period = { month: number; year: number };

export interface ActionItemsPanelProps {
  items: ActionItem[];
  /** Navigate; `period` is handed to the target screen via periodStore. */
  onOpen: (screen: Screen, period?: Period) => void;
}

interface Presentation {
  key: string;
  severity: 'warn' | 'danger';
  title: string;
  sub: string;
  cta: string;
  screen: Screen;
  period?: Period;
}

/** Copy for each detected item — kept in the renderer so the service stays data-only. */
function present(item: ActionItem): Presentation {
  switch (item.kind) {
    case 'headless-household':
      return {
        key: `hh-${item.householdId}`,
        severity: 'danger',
        title: `KK ${item.householdNo} belum punya kepala keluarga aktif`,
        sub: "Pilih kepala keluarga baru lewat Edit KK di layar Jama'ah.",
        cta: 'Perbaiki',
        screen: "Jama'ah",
      };
    case 'unfinalized-report':
      return {
        key: `rep-${item.year}-${item.month}`,
        severity: 'warn',
        title: `Laporan ${fmtPeriodID(item)} belum dikunci`,
        sub: 'Periksa isi laporan lalu tekan Kunci agar angka demografi & Lima Bab dibekukan.',
        cta: 'Buka',
        screen: 'Laporan Bulanan',
        period: { month: item.month, year: item.year },
      };
    case 'pending-activities':
      return {
        key: `act-${item.year}-${item.month}`,
        severity: 'warn',
        title: `${item.activityNames.length} kegiatan ${fmtPeriodID(item)} belum terlaksana`,
        sub: `${item.activityNames.join(', ')} belum dicatat. Perbarui statusnya di Laporan Bulanan jika sudah dilakukan.`,
        cta: 'Buka',
        screen: 'Laporan Bulanan',
        period: { month: item.month, year: item.year },
      };
  }
}

export function ActionItemsPanel({ items, onOpen }: ActionItemsPanelProps) {
  const allClear = items.length === 0;
  return (
    <SectionCard
      label="Perlu Tindakan"
      title={<PanelTitle>— item yang perlu diselesaikan</PanelTitle>}
      collapsible={false}
      headerExtra={
        <span
          className={clsx(
            'inline-flex h-5 items-center gap-1 rounded-sm px-2 font-mono text-[10.5px] font-bold uppercase leading-none tracking-[0.04em] text-surface',
            allClear ? 'bg-hadir' : 'bg-izin',
          )}
        >
          {allClear ? (
            <>
              <Check size={10} strokeWidth={2.5} /> Beres
            </>
          ) : (
            `${items.length} item`
          )}
        </span>
      }
    >
      {allClear ? (
        <div className="flex items-center justify-center gap-2 bg-hadir-bg px-4 py-6 text-[13.5px] font-semibold text-hadir-ink">
          <Check size={14} strokeWidth={2} />
          Semua beres
        </div>
      ) : (
        items.map(present).map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onOpen(p.screen, p.period)}
            className="group flex w-full items-center gap-3.5 border-b border-rule px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#FFFDF8]"
          >
            <span
              className={clsx(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded border',
                p.severity === 'danger'
                  ? 'border-alpa bg-alpa-bg text-alpa-ink'
                  : 'border-izin bg-izin-bg text-izin-ink',
              )}
            >
              <AlertTriangle size={14} strokeWidth={1.6} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold tracking-tight text-ink-900">
                {p.title}
              </span>
              <span className="mt-0.5 block text-[12px] text-ink-500">
                {p.sub}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded border border-rule-strong bg-surface px-3 py-1.5 text-[12px] font-bold text-ink-700 transition-colors group-hover:border-ink-900 group-hover:bg-ink-900 group-hover:text-surface">
              {p.cta} →
            </span>
          </button>
        ))
      )}
    </SectionCard>
  );
}
