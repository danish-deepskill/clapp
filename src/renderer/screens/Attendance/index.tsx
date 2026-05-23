import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Banner } from '@renderer/components/Banner';
import { ConfirmDialog } from '@renderer/components/ConfirmDialog';
import { useToast } from '@renderer/components/Toast';
import { fmtDateID } from '@renderer/lib/format';
import type { RosterRow } from '@shared/attendance';
import type { MasterDataItem } from '@shared/masterData';

import type { AttendanceRowData } from './AttendanceRow';
import {
  FilterBar,
  type AttendanceTally,
  type GenderFilter,
} from './FilterBar';
import { Footer } from './Footer';
import { RosterTable } from './RosterTable';

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function Attendance() {
  const { showToast } = useToast();

  const [sessionTypes, setSessionTypes] = useState<MasterDataItem[]>([]);
  const [sessionTypeId, setSessionTypeId] = useState<number | null>(null);
  const [sessionDate, setSessionDate] = useState<string>(todayISO());
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');

  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const initialRosterRef = useRef<RosterRow[] | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<number | null>(null);
  const savedTypeIdRef = useRef<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Date the operator wants to switch to, pending unsaved-changes confirmation. */
  const [pendingDate, setPendingDate] = useState<string | null>(null);

  // ─── Initial load: session types ────────────────────────────────────────

  useEffect(() => {
    void (async () => {
      try {
        const list = await window.clapp.masterData.sessionTypes.list();
        setSessionTypes(list);
        const firstActive = list.find((t) => t.isActive);
        if (firstActive) setSessionTypeId(firstActive.id);
      } catch (err: unknown) {
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  // ─── Roster load on DATE change (per one-pengajian-per-day rule) ───────

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setRoster(null);
      initialRosterRef.current = null;
      const result = await window.clapp.attendance.loadRoster({ sessionDate });
      if (cancelled) return;
      if (!result.ok) {
        setLoadError(result.message);
        return;
      }
      setLoadError(null);
      setRoster(result.data.roster);
      initialRosterRef.current = result.data.roster;
      const session = result.data.session;
      setSavedSessionId(session?.id ?? null);
      savedTypeIdRef.current = session?.sessionTypeId ?? null;
      // If a session exists for this date, the Jenis dropdown follows it.
      if (session) setSessionTypeId(session.sessionTypeId);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionDate]);

  // ─── Row edits ──────────────────────────────────────────────────────────

  const onRowChange = useCallback(
    (memberId: number, patch: Partial<AttendanceRowData>) => {
      setRoster((prev) =>
        prev
          ? prev.map((r) =>
              r.memberId === memberId
                ? {
                    ...r,
                    ...(patch.status !== undefined
                      ? { status: patch.status }
                      : {}),
                    ...(patch.arrivalAt !== undefined
                      ? { arrivalAt: patch.arrivalAt }
                      : {}),
                    ...(patch.donationAmount !== undefined
                      ? { donationAmount: patch.donationAmount }
                      : {}),
                  }
                : r,
            )
          : prev,
      );
    },
    [],
  );

  // ─── Tally + dirty ──────────────────────────────────────────────────────

  const tally = useMemo<AttendanceTally>(() => {
    const t: AttendanceTally = { H: 0, A: 0, S: 0, I: 0, T: 0, total: 0, marked: 0 };
    for (const r of roster ?? []) {
      t.total += 1;
      if (r.status === null) {
        t.T += 1;
      } else {
        t[r.status] += 1;
        t.marked += 1;
      }
    }
    return t;
  }, [roster]);

  const totalShodaqoh = useMemo(
    () =>
      (roster ?? []).reduce(
        (acc, r) => acc + (r.status === 'H' ? r.donationAmount ?? 0 : 0),
        0,
      ),
    [roster],
  );

  const rosterDirty = useMemo(() => {
    const init = initialRosterRef.current;
    if (!roster || !init) return false;
    if (roster.length !== init.length) return true;
    return roster.some((r, i) => {
      const a = init[i];
      if (!a) return true;
      return (
        a.memberId !== r.memberId ||
        a.status !== r.status ||
        a.arrivalAt !== r.arrivalAt ||
        a.donationAmount !== r.donationAmount
      );
    });
  }, [roster]);

  const typeChanged =
    savedTypeIdRef.current !== null &&
    sessionTypeId !== savedTypeIdRef.current;

  const dirty = rosterDirty || typeChanged;

  // ─── Guarded DATE change (different date = different event) ─────────────

  const onSessionDateChange = useCallback(
    (iso: string) => {
      if (iso === sessionDate) return;
      if (dirty) {
        setPendingDate(iso);
        return;
      }
      setSessionDate(iso);
    },
    [sessionDate, dirty],
  );

  // ─── Jenis change is METADATA only — no reload, no guard ────────────────

  const onSessionTypeChange = useCallback((id: number) => {
    setSessionTypeId(id);
  }, []);

  // ─── Save ───────────────────────────────────────────────────────────────

  const onSave = useCallback(async () => {
    if (sessionTypeId === null || !dirty || saving || !roster) return;

    setSaving(true);

    // If this is a saved session and only the type changed → fast path: relabel.
    if (savedSessionId !== null && !rosterDirty && typeChanged) {
      const result = await window.clapp.attendance.relabelSessionType({
        sessionId: savedSessionId,
        newSessionTypeId: sessionTypeId,
      });
      setSaving(false);
      if (!result.ok) {
        showToast({ variant: 'error', message: result.message });
        return;
      }
      savedTypeIdRef.current = sessionTypeId;
      showToast({
        variant: 'success',
        message: <>Jenis sesi diperbarui</>,
      });
      return;
    }

    // Otherwise: full saveBatch. Send the WHOLE roster — service UPSERTs
    // non-null rows and DELETEs rows where the operator unmarked someone.
    const result = await window.clapp.attendance.saveBatch({
      sessionTypeId,
      sessionDate,
      rows: roster.map((r) => ({
        memberId: r.memberId,
        status: r.status,
        arrivalAt: r.arrivalAt,
        donationAmount: r.donationAmount,
      })),
    });
    setSaving(false);
    if (!result.ok) {
      showToast({ variant: 'error', message: result.message });
      return;
    }
    initialRosterRef.current = roster;
    setSavedSessionId(result.data.session.id);
    savedTypeIdRef.current = result.data.session.sessionTypeId;
    const triggered = result.data.activityRecordsTouched;
    showToast({
      variant: 'success',
      message: (
        <>
          Tersimpan · <b>{tally.H}</b> hadir dari <b>{tally.marked}</b> ditandai
          {triggered > 0 && ' · Kegiatan bulanan diperbarui'}
        </>
      ),
    });
  }, [
    roster,
    sessionTypeId,
    sessionDate,
    dirty,
    rosterDirty,
    typeChanged,
    savedSessionId,
    saving,
    tally.H,
    tally.marked,
    showToast,
  ]);

  const onReset = useCallback(() => {
    const init = initialRosterRef.current;
    if (init) setRoster(init);
    if (savedTypeIdRef.current !== null) {
      setSessionTypeId(savedTypeIdRef.current);
    }
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────

  const noActiveTypes =
    sessionTypes.length > 0 && sessionTypes.every((t) => !t.isActive);
  const emptyTypes = sessionTypes.length === 0;

  return (
    <div className="flex h-full flex-col bg-paper">
      <FilterBar
        sessionTypes={sessionTypes}
        sessionTypeId={sessionTypeId}
        onSessionTypeChange={onSessionTypeChange}
        sessionDate={sessionDate}
        onSessionDateChange={onSessionDateChange}
        maxDate={todayISO()}
        search={search}
        onSearchChange={setSearch}
        genderFilter={genderFilter}
        onGenderFilterChange={setGenderFilter}
        tally={tally}
        sessionStatus={savedSessionId !== null ? 'editing' : 'new'}
      />

      {loadError && (
        <div className="px-6 py-3">
          <Banner variant="danger">
            Gagal memuat: <b>{loadError}</b>
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

      {sessionTypeId !== null && roster === null && !loadError && (
        <div className="flex flex-1 items-center justify-center font-mono text-[11px] uppercase tracking-wider text-ink-500">
          Memuat…
        </div>
      )}

      {sessionTypeId !== null && roster && (
        <>
          <RosterTable
            rows={roster}
            search={search}
            genderFilter={genderFilter}
            onRowChange={onRowChange}
          />
          <Footer
            tally={tally}
            totalShodaqoh={totalShodaqoh}
            dirty={dirty}
            saving={saving}
            onSave={onSave}
            onReset={onReset}
          />
        </>
      )}

      <ConfirmDialog
        open={pendingDate !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDate(null);
        }}
        eyebrow="Buang perubahan?"
        title="Pindah ke tanggal lain"
        description={
          <>
            Ada perubahan yang belum disimpan untuk{' '}
            <b>{fmtDateID(sessionDate)}</b>. Lanjut ke{' '}
            <b>{pendingDate ? fmtDateID(pendingDate) : '—'}</b> akan membuang
            perubahan ini.
          </>
        }
        confirmLabel="Buang & Lanjutkan"
        cancelLabel="Tetap di Sini"
        confirmVariant="danger"
        onConfirm={() => {
          if (pendingDate !== null) setSessionDate(pendingDate);
          setPendingDate(null);
        }}
      />
    </div>
  );
}
