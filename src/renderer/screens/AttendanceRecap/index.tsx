import { useCallback, useEffect, useMemo, useState } from 'react';

import { Banner } from '@renderer/components/Banner';
import {
  availableYears,
  currentMonthYear,
  firstDayOfMonth,
  lastDayOfMonth,
  todayISO,
} from '@renderer/lib/dates';
import type { RecapData } from '@shared/attendance';
import type { MasterDataItem } from '@shared/masterData';

import { AttendanceDrawer } from './AttendanceDrawer';
import { FilterBar } from './FilterBar';
import { RecapTable } from './RecapTable';

export function AttendanceRecap() {
  const initialPeriod = useMemo(() => currentMonthYear(), []);
  const [month, setMonth] = useState(initialPeriod.month);
  const [year, setYear] = useState(initialPeriod.year);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<RecapData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // ─── Session types loaded once for the drawer ─────────────────────────
  const [sessionTypes, setSessionTypes] = useState<MasterDataItem[]>([]);
  useEffect(() => {
    void (async () => {
      try {
        const list = await window.clapp.masterData.sessionTypes.list();
        setSessionTypes(list);
      } catch {
        // non-fatal; drawer renders empty-types banner if list is empty.
      }
    })();
  }, []);

  // ─── Period bounds (drawer date picker is constrained to current month) ─
  const periodStart = useMemo(() => firstDayOfMonth(year, month), [year, month]);
  const periodEnd = useMemo(() => lastDayOfMonth(year, month), [year, month]);
  /** Furthest selectable date in drawer = min(today, periodEnd). */
  const drawerMaxDate = useMemo(() => {
    const today = todayISO();
    return today < periodEnd ? today : periodEnd;
  }, [periodEnd]);
  /** True when the entire period is in the future — no valid date to enter. */
  const periodInFuture = todayISO() < periodStart;

  // ─── Drawer state ─────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDate, setDrawerDate] = useState<string>(todayISO());

  const openDrawerFor = useCallback((date: string) => {
    setDrawerDate(date);
    setDrawerOpen(true);
  }, []);

  /** Default date for the "+ Catat Absensi" button: clamp today into [periodStart, periodEnd]. */
  const defaultEntryDate = useCallback(() => {
    const today = todayISO();
    if (today < periodStart) return periodStart;
    if (today > periodEnd) return periodEnd;
    return today;
  }, [periodStart, periodEnd]);

  // ─── Load recap data ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setLoadError(null);
    void (async () => {
      const result = await window.clapp.attendance.loadRecap({ month, year });
      if (cancelled) return;
      if (!result.ok) {
        setLoadError(result.message);
        return;
      }
      setData(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [month, year, reloadKey]);

  const yearChoices = useMemo(() => availableYears(initialPeriod.year - 5), [initialPeriod]);

  const overallPct = useMemo(() => {
    if (!data || data.sessions.length === 0 || data.members.length === 0) return 0;
    const denom = data.sessions.length * data.members.length;
    let pos = 0;
    for (const a of data.attendance) {
      if (a.status === 'H' || a.status === 'S' || a.status === 'I') pos += 1;
    }
    return Math.round((pos / denom) * 100);
  }, [data]);

  const noActiveTypes =
    sessionTypes.length > 0 && sessionTypes.every((t) => !t.isActive);
  const emptyTypes = sessionTypes.length === 0;

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
        search={search}
        onSearchChange={setSearch}
        sessionCount={data?.sessions.length ?? 0}
        memberCount={data?.members.length ?? 0}
        overallPct={overallPct}
        onCatatAbsensi={() => openDrawerFor(defaultEntryDate())}
        catatAbsensiDisabled={periodInFuture}
      />

      {loadError && (
        <div className="px-6 py-3">
          <Banner variant="danger">
            Gagal memuat rekap: <b>{loadError}</b>
          </Banner>
        </div>
      )}

      {(emptyTypes || noActiveTypes) && (
        <div className="px-6 py-3">
          <Banner variant="info">
            Belum ada jenis pengajian. Tambahkan di{' '}
            <b>Pengaturan → Master Data → Jenis Pengajian</b> sebelum mencatat
            absensi.
          </Banner>
        </div>
      )}

      {!loadError && data === null && (
        <div className="flex flex-1 items-center justify-center font-mono text-[11px] uppercase tracking-wider text-ink-500">
          Memuat…
        </div>
      )}

      {data && (
        <RecapTable
          data={data}
          search={search}
          onSessionClick={openDrawerFor}
        />
      )}

      <AttendanceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        sessionDate={drawerDate}
        minDate={periodStart}
        maxDate={drawerMaxDate}
        sessionTypes={sessionTypes}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
