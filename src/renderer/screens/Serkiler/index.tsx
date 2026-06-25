import { useCallback, useEffect, useMemo, useState } from 'react';

import { Banner } from '@renderer/components/Banner';
import { useToast } from '@renderer/components/Toast';
import { availableYears, currentMonthYear } from '@renderer/lib/dates';
import { BULAN_ID } from '@shared/enums';
import type { SerkilerRow } from '@shared/serkiler';

import { FilterBar } from './FilterBar';
import { Footer } from './Footer';
import { PrintSheet } from './PrintSheet';
import { RosterTable } from './RosterTable';

export function Serkiler() {
  const initialPeriod = useMemo(() => currentMonthYear(), []);
  const [month, setMonth] = useState(initialPeriod.month);
  const [year, setYear] = useState(initialPeriod.year);

  const [rows, setRows] = useState<SerkilerRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { showToast } = useToast();

  const refresh = useCallback(async () => {
    setRows(null);
    setLoadError(null);
    try {
      const r = await window.clapp.serkiler.list({ month, year });
      if (!r.ok) {
        setLoadError(r.message);
        return;
      }
      setRows(r.data);
    } catch (e) {
      // A rejected IPC (stale main process, missing column, etc.) would
      // otherwise hang on "Memuat…" forever — surface it instead.
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [month, year]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleParaf = useCallback(
    async (memberId: number, paraf: boolean) => {
      setRows((prev) =>
        prev
          ? prev.map((r) => (r.memberId === memberId ? { ...r, paraf } : r))
          : prev,
      );
      const r = await window.clapp.serkiler.setParaf({
        month,
        year,
        memberId,
        paraf,
      });
      if (!r.ok) {
        showToast({ variant: 'error', message: r.message });
        await refresh();
      }
    },
    [month, year, refresh, showToast],
  );

  const handleIuran = useCallback(
    async (memberId: number, amount: number | null) => {
      setRows((prev) =>
        prev
          ? prev.map((r) =>
              r.memberId === memberId
                ? { ...r, circulationAmount: amount }
                : r,
            )
          : prev,
      );
      const r = await window.clapp.serkiler.setIuran({
        month,
        year,
        memberId,
        amount,
      });
      if (!r.ok) {
        showToast({ variant: 'error', message: r.message });
        await refresh();
      }
    },
    [month, year, refresh, showToast],
  );

  const yearChoices = useMemo(
    () => availableYears(initialPeriod.year - 5),
    [initialPeriod],
  );

  const periodLabel = `${BULAN_ID[month - 1]} ${year}`;
  const signedCount = (rows ?? []).filter((r) => r.paraf).length;

  return (
    <div className="flex h-full flex-col bg-paper print:hidden">
      <FilterBar
        month={month}
        year={year}
        onPeriodChange={({ month: m, year: y }) => {
          setMonth(m);
          setYear(y);
        }}
        availableYears={yearChoices}
        rosterCount={rows?.length ?? 0}
        signedCount={signedCount}
        onPrint={() => window.print()}
        printDisabled={(rows?.length ?? 0) === 0}
      />

      {loadError && (
        <div className="px-6 py-3">
          <Banner variant="danger">
            Gagal memuat roster: <b>{loadError}</b>
          </Banner>
        </div>
      )}

      {rows === null && !loadError && (
        <div className="flex flex-1 items-center justify-center font-mono text-[11px] uppercase tracking-wider text-ink-500">
          Memuat…
        </div>
      )}

      {rows && (
        <RosterTable
          rows={rows}
          onToggleParaf={handleParaf}
          onSetIuran={handleIuran}
          emptyLabel={`Belum ada jama'ah Serkiler.`}
        />
      )}

      {rows && rows.length > 0 && (
        <Footer rows={rows} periodLabel={periodLabel} />
      )}

      {rows && (
        <PrintSheet
          rows={rows}
          periodLabel={periodLabel}
          kelompokName="SLM Kelompok Cilandak A"
        />
      )}
    </div>
  );
}
