import { clsx } from 'clsx';

import { SectionCard } from '@renderer/components/SectionCard';
import { fmtDateShortID } from '@renderer/lib/format';
import { pctClass } from '@renderer/screens/AttendanceRecap/RecapTable';
import type { RecentSession } from '@shared/dashboard';
import type { MeetingType } from '@shared/enums';
import type { MeetingListItem } from '@shared/meeting';

import { HeaderLink, PanelBody, PanelEmpty } from './PanelBits';

// ─── Sesi Absensi Terbaru ────────────────────────────────────────────────

export function RecentSessionsPanel({
  sessions,
  onViewAll,
}: {
  sessions: RecentSession[];
  onViewAll: () => void;
}) {
  return (
    <SectionCard
      label="Sesi Absensi Terbaru"
      collapsible={false}
      headerExtra={<HeaderLink onClick={onViewAll}>Lihat Rekap</HeaderLink>}
    >
      <PanelBody>
        {sessions.length === 0 ? (
          <PanelEmpty>Belum ada sesi absensi tercatat.</PanelEmpty>
        ) : (
          sessions.map((s) => (
            <div
              key={s.sessionId}
              className="grid grid-cols-[70px_1fr_90px_60px] items-center gap-3 border-b border-rule px-4 py-[11px] last:border-b-0"
            >
              <span className="font-mono text-[12px] font-semibold text-ink-900">
                {fmtDateShortID(s.sessionDate)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-medium text-ink-900">
                  {s.sessionTypeName}
                </span>
                <span className="mt-0.5 block font-mono text-[11.5px] tracking-wide text-ink-500">
                  {s.marked}/{s.rosterSize} tercatat
                </span>
              </span>
              <span className="text-right font-mono text-[13px] text-ink-700">
                <b className="font-bold text-hadir-ink">{s.hadir}</b> hadir
              </span>
              <span
                className={clsx(
                  'text-right font-mono text-[13px]',
                  pctClass(s.pct, s.rosterSize),
                )}
              >
                {s.rosterSize === 0 ? '—' : `${s.pct}%`}
              </span>
            </div>
          ))
        )}
      </PanelBody>
    </SectionCard>
  );
}

// ─── Musyawarah Terbaru ──────────────────────────────────────────────────

const TYPE_SHORT: Record<MeetingType, string> = {
  'Musyawarah Kelompok': 'Kelompok',
  'Musyawarah 5 Unsur': '5 Unsur',
  'Pengkoreksian KU Bulanan': 'Pengkoreksian KU',
  Lainnya: 'Lainnya',
};

export function RecentMeetingsPanel({
  meetings,
  onViewAll,
}: {
  meetings: MeetingListItem[];
  onViewAll: () => void;
}) {
  return (
    <SectionCard
      label="Musyawarah Terbaru"
      collapsible={false}
      headerExtra={<HeaderLink onClick={onViewAll}>Lihat Semua</HeaderLink>}
    >
      <PanelBody>
        {meetings.length === 0 ? (
          <PanelEmpty>Belum ada musyawarah tercatat.</PanelEmpty>
        ) : (
          meetings.map((m) => (
            <div
              key={m.id}
              className="grid grid-cols-[70px_130px_1fr_70px] items-center gap-3 border-b border-rule px-4 py-[11px] last:border-b-0"
            >
              <span className="font-mono text-[12px] font-medium text-ink-700">
                {fmtDateShortID(m.meetingDate)}
              </span>
              {/* Neutral tag on purpose — meeting types carry no status meaning. */}
              <span className="inline-flex h-5 w-fit items-center whitespace-nowrap rounded-sm border border-rule-strong bg-surface-2 px-[7px] text-[10.5px] font-semibold tracking-[0.04em] text-ink-700">
                {TYPE_SHORT[m.type]}
              </span>
              <span
                className="truncate text-[13.5px] font-medium tracking-tight text-ink-900"
                title={m.title}
              >
                {m.title}
              </span>
              <span className="text-right font-mono text-[11.5px] font-medium text-ink-500">
                <b className="mr-0.5 text-[12.5px] font-semibold text-ink-900">
                  {m.attendeeCount}
                </b>
                hadir
              </span>
            </div>
          ))
        )}
      </PanelBody>
    </SectionCard>
  );
}
