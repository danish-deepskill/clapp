import {
  ClipboardCheck,
  FileText,
  MessagesSquare,
  Printer,
  ScrollText,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { Screen } from '@renderer/components/NavBar';
import { fmtPeriodID } from '@renderer/lib/format';
import type { DashboardData } from '@shared/dashboard';

import { SectionLabel } from './PanelBits';

export interface QuickActionsProps {
  data: DashboardData;
  onNavigate: (screen: Screen) => void;
}

interface Card {
  screen: Screen;
  icon: LucideIcon;
  title: string;
  sub: string;
}

export function QuickActions({ data, onNavigate }: QuickActionsProps) {
  const { activeMembers, households, serkilerMembers } = data.totals;
  const periodLabel = fmtPeriodID(data.period);

  // Icons are uniformly ink-900: the four status colors are reserved for
  // their meanings (HANDOFF §3), so the prototype's per-card tints are dropped.
  const cards: Card[] = [
    {
      screen: 'Rekap Absensi',
      icon: ClipboardCheck,
      title: 'Catat Absensi',
      sub: 'Input kehadiran sesi pengajian',
    },
    {
      screen: "Jama'ah",
      icon: Users,
      title: "Jama'ah & KK",
      sub: `Daftar ${activeMembers} jama'ah aktif di ${households} KK`,
    },
    {
      screen: 'Catatan Peristiwa',
      icon: ScrollText,
      title: 'Catatan Peristiwa',
      sub: 'Riwayat lahir, meninggal, pindah & sambung baru',
    },
    {
      screen: 'Musyawarah',
      icon: MessagesSquare,
      title: 'Musyawarah',
      sub: 'Catat pertemuan baru & notulen',
    },
    {
      screen: 'Serkiler',
      icon: Printer,
      title: 'Cetak Serkiler',
      sub: `Lembar edaran untuk ${serkilerMembers} jama'ah roster`,
    },
    {
      screen: 'Laporan Bulanan',
      icon: FileText,
      title: 'Laporan Bulanan',
      sub: `Susun & kunci laporan ${periodLabel}`,
    },
  ];

  return (
    <section>
      <SectionLabel>Tindakan Cepat</SectionLabel>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.screen}
              type="button"
              onClick={() => onNavigate(c.screen)}
              className="group flex items-start gap-3.5 rounded border border-rule bg-surface px-[18px] py-4 text-left transition-colors hover:border-ink-700 hover:bg-[#FFFDF8]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-ink-900 text-surface">
                <Icon size={18} strokeWidth={1.6} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[14.5px] font-semibold tracking-tight text-ink-900">
                  {c.title}
                </span>
                <span className="text-[12.5px] leading-[1.4] text-ink-500">
                  {c.sub}
                </span>
              </span>
              <span className="self-center font-mono text-[18px] text-ink-300 transition-all group-hover:translate-x-[3px] group-hover:text-ink-700">
                ›
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
