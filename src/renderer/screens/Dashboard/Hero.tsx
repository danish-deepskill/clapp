import { currentMonthYear } from '@renderer/lib/dates';
import {
  fmtDateID,
  fmtDateNumericID,
  fmtDay,
  fmtPeriodID,
  fmtTimeHHMM,
} from '@renderer/lib/format';
import type { DashboardData } from '@shared/dashboard';

export function Hero({ data, now }: { data: DashboardData | null; now: Date }) {
  const periodLabel = fmtPeriodID(data?.period ?? currentMonthYear(now));

  return (
    <section className="flex items-center justify-between gap-6 rounded border border-rule-strong bg-surface px-7 pb-[22px] pt-6">
      <div className="min-w-0">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-500">
          SLM Cilandak A
        </p>
        <h1 className="text-[24px] font-bold leading-[1.15] tracking-tight text-ink-900">
          Selamat datang, Operator
        </h1>
        <p className="mt-1.5 text-[13.5px] text-ink-700 [&_b]:font-mono [&_b]:font-semibold [&_b]:text-ink-900">
          Periode aktif: <b>{periodLabel}</b>
          {data && (
            <>
              <Dot />
              <b>{data.totals.activeMembers}</b> jama'ah aktif
              <Dot />
              <b>{data.totals.households}</b> KK
              <Dot />
              {data.lastInputDate ? (
                <>
                  Input terakhir: <b>{fmtDateID(data.lastInputDate)}</b>
                </>
              ) : (
                'Belum ada input'
              )}
            </>
          )}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[13px] font-medium text-ink-700">{fmtDay(now)}</div>
        <div className="mt-0.5 font-mono text-[28px] font-bold leading-none text-ink-900">
          {fmtDateNumericID(now)}
        </div>
        <div className="mt-1 font-mono text-[13px] font-medium text-ink-500">
          {fmtTimeHHMM(now)} WIB
        </div>
      </div>
    </section>
  );
}

function Dot() {
  return <span className="mx-2 text-ink-300">·</span>;
}
