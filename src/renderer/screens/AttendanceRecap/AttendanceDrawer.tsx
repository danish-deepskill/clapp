import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ConfirmDialog } from '@renderer/components/ConfirmDialog';
import { Drawer } from '@renderer/components/Drawer';
import { useToast } from '@renderer/components/Toast';
import { fmtDateID } from '@renderer/lib/format';
import type { AttendanceRowData } from '@renderer/screens/Attendance/AttendanceRow';
import { RosterTable } from '@renderer/screens/Attendance/RosterTable';
import type { AttendanceTally, RosterRow } from '@shared/attendance';
import type { MasterDataItem } from '@shared/masterData';

import { DrawerControls } from './AttendanceDrawerControls';
import { DrawerFooter } from './AttendanceDrawerFooter';

export interface AttendanceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Date this drawer is editing (set when the parent opened the drawer). */
  sessionDate: string;
  /** Earliest selectable date in the Tanggal picker (first day of Rekap's period). */
  minDate: string;
  /** Latest selectable date in the Tanggal picker (min(today, last day of period)). */
  maxDate: string;
  /** Active session types — passed in so the drawer doesn't re-fetch. */
  sessionTypes: MasterDataItem[];
  /** Called after a successful save so the parent (Rekap) can refresh its matrix. */
  onSaved: () => void;
}

export function AttendanceDrawer({
  open,
  onOpenChange,
  sessionDate,
  minDate,
  maxDate,
  sessionTypes,
  onSaved,
}: AttendanceDrawerProps) {
  const { showToast } = useToast();

  const [sessionTypeId, setSessionTypeId] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState<string>(sessionDate);
  const [search, setSearch] = useState('');
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const initialRosterRef = useRef<RosterRow[] | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<number | null>(null);
  const savedTypeIdRef = useRef<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [pendingDate, setPendingDate] = useState<string | null>(null);

  // Sync the internal date when the drawer reopens for a new date.
  useEffect(() => {
    if (open) {
      setCurrentDate(sessionDate);
      setSearch('');
    }
  }, [open, sessionDate]);

  // ─── Load roster when drawer opens or date changes inside ─────────────

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setRoster(null);
    initialRosterRef.current = null;
    setLoadError(null);

    void (async () => {
      const result = await window.clapp.attendance.loadRoster({
        sessionDate: currentDate,
      });
      if (cancelled) return;
      if (!result.ok) {
        setLoadError(result.message);
        return;
      }
      setRoster(result.data.roster);
      initialRosterRef.current = result.data.roster;
      const session = result.data.session;
      setSavedSessionId(session?.id ?? null);
      savedTypeIdRef.current = session?.sessionTypeId ?? null;
      if (session) {
        setSessionTypeId(session.sessionTypeId);
      } else {
        // New session — default to first active type.
        const firstActive = sessionTypes.find((t) => t.isActive);
        setSessionTypeId(firstActive?.id ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, currentDate, sessionTypes]);

  // ─── Row edits ────────────────────────────────────────────────────────

  const onRowChange = useCallback(
    (memberId: number, patch: Partial<AttendanceRowData>) => {
      setRoster((prev) =>
        prev
          ? prev.map((r) =>
              r.memberId === memberId
                ? {
                    ...r,
                    ...(patch.status !== undefined ? { status: patch.status } : {}),
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

  // ─── Derived state ────────────────────────────────────────────────────

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
    savedTypeIdRef.current !== null && sessionTypeId !== savedTypeIdRef.current;
  const dirty = rosterDirty || typeChanged;

  const visibleRows = useMemo(() => {
    if (!roster) return [];
    if (!search.trim()) return roster;
    const q = search.trim().toLowerCase();
    return roster.filter((r) => r.fullName.toLowerCase().includes(q));
  }, [roster, search]);

  // ─── Save / reset / close ─────────────────────────────────────────────

  const onSave = useCallback(async () => {
    if (sessionTypeId === null || !dirty || saving || !roster) return;
    setSaving(true);

    // Fast path: only type changed on a saved session → relabel.
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
      showToast({ variant: 'success', message: <>Jenis sesi diperbarui</> });
      onSaved();
      onOpenChange(false);
      return;
    }

    // Full save: send the whole roster (service handles null = DELETE).
    const result = await window.clapp.attendance.saveBatch({
      sessionTypeId,
      sessionDate: currentDate,
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
    onSaved();
    onOpenChange(false);
  }, [
    roster,
    sessionTypeId,
    currentDate,
    dirty,
    rosterDirty,
    typeChanged,
    savedSessionId,
    saving,
    tally.H,
    tally.marked,
    showToast,
    onSaved,
    onOpenChange,
  ]);

  const onReset = useCallback(() => {
    const init = initialRosterRef.current;
    if (init) setRoster(init);
    if (savedTypeIdRef.current !== null) {
      setSessionTypeId(savedTypeIdRef.current);
    }
  }, []);

  /** Bulk-fill remaining (null status) members as Alpa. */
  const onFillRemainingAlpa = useCallback(() => {
    setRoster((prev) =>
      prev
        ? prev.map((r) => (r.status === null ? { ...r, status: 'A' } : r))
        : prev,
    );
  }, []);

  // Dirty-guard on close.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && dirty && !saving) {
        setConfirmClose(true);
        return;
      }
      onOpenChange(next);
    },
    [dirty, saving, onOpenChange],
  );

  // Dirty-guard on date change (back-dating / corrections).
  const handleDateChange = useCallback(
    (iso: string) => {
      if (iso === currentDate) return;
      if (dirty) {
        setPendingDate(iso);
        return;
      }
      setCurrentDate(iso);
    },
    [currentDate, dirty],
  );

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={handleOpenChange}
        eyebrow={savedSessionId !== null ? 'Sesi tersimpan · edit' : 'Sesi baru'}
        title="Catat Absensi"
        width={760}
        bodyLayout="manual"
        footer={
          <DrawerFooter
            tally={tally}
            totalShodaqoh={totalShodaqoh}
            dirty={dirty}
            saving={saving}
            onSave={onSave}
            onReset={onReset}
            onFillRemainingAlpa={onFillRemainingAlpa}
          />
        }
      >
        <DrawerControls
          sessionTypes={sessionTypes}
          sessionTypeId={sessionTypeId}
          onSessionTypeChange={setSessionTypeId}
          sessionDate={currentDate}
          onSessionDateChange={handleDateChange}
          minDate={minDate}
          maxDate={maxDate}
          search={search}
          onSearchChange={setSearch}
        />

        {loadError && (
          <div className="border-b border-rule bg-alpa-bg px-5 py-2 text-[12.5px] text-alpa-ink">
            Gagal memuat: <b>{loadError}</b>
          </div>
        )}

        {roster === null && !loadError && (
          <div className="flex flex-1 items-center justify-center font-mono text-[11px] uppercase tracking-wider text-ink-500">
            Memuat…
          </div>
        )}

        {roster && <RosterTable rows={visibleRows} onRowChange={onRowChange} />}
      </Drawer>

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        eyebrow="Buang perubahan?"
        title="Tutup tanpa simpan"
        description={
          <>Ada perubahan yang belum disimpan. Tutup tetap akan membuangnya.</>
        }
        confirmLabel="Buang & Tutup"
        cancelLabel="Tetap Buka"
        confirmVariant="danger"
        onConfirm={() => {
          setConfirmClose(false);
          onOpenChange(false);
        }}
      />

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
            <b>{fmtDateID(currentDate)}</b>. Lanjut ke{' '}
            <b>{pendingDate ? fmtDateID(pendingDate) : '—'}</b> akan membuang
            perubahan ini.
          </>
        }
        confirmLabel="Buang & Lanjutkan"
        cancelLabel="Tetap di Sini"
        confirmVariant="danger"
        onConfirm={() => {
          if (pendingDate !== null) setCurrentDate(pendingDate);
          setPendingDate(null);
        }}
      />
    </>
  );
}
