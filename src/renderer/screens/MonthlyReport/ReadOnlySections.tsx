import { clsx } from 'clsx';

import { fmtDateID } from '@renderer/lib/format';
import type {
  Demografi,
  LimaBab,
  Peristiwa,
  SaranEntry,
} from '@shared/report';

import { ReportSection } from './ReportSection';

// ─── Demografi ─────────────────────────────────────────────────────────────

export function DemografiSection({ data }: { data: Demografi }) {
  const visible = data.byStage.filter((s) => s.total > 0);
  return (
    <ReportSection title="Demografi" readOnly hint="Jumlah jama'ah aktif saat ini">
      <div className="overflow-hidden rounded border border-rule-strong">
        <div className="grid grid-cols-[1fr_70px_70px_80px] bg-paper-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-600">
          <Cell head>Kelas</Cell>
          <Cell head right>L</Cell>
          <Cell head right>P</Cell>
          <Cell head right>Total</Cell>
        </div>
        {visible.map((s) => (
          <div key={s.stage} className="grid grid-cols-[1fr_70px_70px_80px] bg-surface">
            <Cell>{s.stage}</Cell>
            <Cell right mono>{s.male}</Cell>
            <Cell right mono>{s.female}</Cell>
            <Cell right mono>{s.total}</Cell>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_70px_70px_80px] bg-surface-2 font-semibold">
          <Cell>TOTAL Jama'ah</Cell>
          <Cell right mono>{data.totalMale}</Cell>
          <Cell right mono>{data.totalFemale}</Cell>
          <Cell right mono>{data.total}</Cell>
        </div>
      </div>
      <div className="mt-2 flex gap-5 font-mono text-[11px] text-ink-500">
        <span>Janda: <b className="text-ink-900">{data.janda}</b></span>
        <span>Duda: <b className="text-ink-900">{data.duda}</b></span>
      </div>
    </ReportSection>
  );
}

function Cell({
  children,
  head,
  right,
  mono,
}: {
  children: React.ReactNode;
  head?: boolean;
  right?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      className={clsx(
        'border-b border-r border-rule px-3.5 py-2 text-[13px] last:border-r-0',
        right && 'text-right',
        mono && 'font-mono tabular-nums',
        !head && 'text-ink-900',
      )}
    >
      {children}
    </div>
  );
}

// ─── Lima Bab ──────────────────────────────────────────────────────────────

export function LimaBabSection({ data }: { data: LimaBab }) {
  const buckets = [
    { label: 'Lancar', range: '> 60%', count: data.lancar, tone: 'text-hadir-ink' },
    { label: 'Kurang Lancar', range: '20–60%', count: data.kurangLancar, tone: 'text-sakit-ink' },
    { label: 'Kurang Sambung', range: '< 20%', count: data.kurangSambung, tone: 'text-alpa-ink' },
    { label: 'Tabayyun', range: '0%', count: data.tabayyun, tone: 'text-alpa-ink' },
  ];
  return (
    <ReportSection
      title="Lima Bab"
      readOnly
      hint="% Hadir = (H + S + I) ÷ jumlah sesi pengajian dalam periode"
    >
      {data.sessionCount === 0 ? (
        <p className="text-[12.5px] italic text-ink-500">
          Belum ada sesi pengajian di periode ini — Lima Bab belum bisa dihitung.
        </p>
      ) : (
        <div className="grid grid-cols-4 overflow-hidden rounded border border-rule-strong">
          {buckets.map((b, i) => (
            <div
              key={b.label}
              className={clsx(
                'flex flex-col gap-1 border-rule px-4 py-3',
                i < 3 && 'border-r',
                b.label === 'Tabayyun' && 'bg-alpa-bg',
              )}
            >
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                {b.label}
              </span>
              <span className="font-mono text-[11px] text-ink-400">{b.range}</span>
              <span className={clsx('font-mono text-[20px] font-bold', b.tone)}>
                {b.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </ReportSection>
  );
}

// ─── Peristiwa ─────────────────────────────────────────────────────────────

export function PeristiwaSection({ data }: { data: Peristiwa }) {
  const all = [...data.vital, ...data.movement];
  return (
    <ReportSection
      title="Peristiwa"
      readOnly
      hint="Lahir / Meninggal / Pindah / Sambung Baru — dari Catatan Peristiwa"
    >
      {all.length === 0 ? (
        <p className="text-[12.5px] italic text-ink-500">
          Tidak ada peristiwa di periode ini.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {all.map((e) => (
            <div
              key={`${e.source}-${e.id}`}
              className="grid grid-cols-[110px_140px_1fr] items-center gap-3 text-[13px]"
            >
              <span className="font-mono text-[12px] text-ink-500">
                {fmtDateID(e.date)}
              </span>
              <span className="font-medium text-ink-900">{e.kind}</span>
              <span className="truncate text-ink-700">{e.memberName}</span>
            </div>
          ))}
        </div>
      )}
    </ReportSection>
  );
}

// ─── Saran (from Musyawarah) ───────────────────────────────────────────────

export function SaranSection({ data }: { data: SaranEntry[] }) {
  return (
    <ReportSection
      title="Saran & Masukan"
      readOnly
      hint="Dikumpulkan dari saran musyawarah dalam periode"
    >
      {data.length === 0 ? (
        <p className="text-[12.5px] italic text-ink-500">
          Belum ada saran musyawarah di periode ini.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {data.map((s, i) => (
            <li key={s.meetingId} className="flex gap-3 text-[13px]">
              <span className="font-mono text-[12px] text-ink-400">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap leading-[1.55] text-ink-900">
                  {s.suggestions}
                </p>
                <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-wider text-ink-500">
                  {s.meetingType} · {s.meetingTitle}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </ReportSection>
  );
}
