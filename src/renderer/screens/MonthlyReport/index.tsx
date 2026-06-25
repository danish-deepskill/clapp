import { useCallback, useEffect, useMemo, useState } from 'react';

import { Banner } from '@renderer/components/Banner';
import { ConfirmDialog } from '@renderer/components/ConfirmDialog';
import { useToast } from '@renderer/components/Toast';
import { availableYears, currentMonthYear } from '@renderer/lib/dates';
import { BULAN_ID } from '@shared/enums';
import type { ReportData, SaveReportInput } from '@shared/report';

import {
  AnjangsanaSection,
  KegiatanSection,
  KeluargaSection,
  LainLainSection,
  PembangunanSection,
  RingkasanSection,
  SakitSection,
  type EditableProps,
  type PickerHousehold,
  type PickerMember,
} from './EditableSections';
import { FilterBar } from './FilterBar';
import {
  DemografiSection,
  LimaBabSection,
  PeristiwaSection,
  SaranSection,
} from './ReadOnlySections';

function toDraft(r: ReportData): SaveReportInput {
  return {
    month: r.month,
    year: r.year,
    rencanaBece: r.rencanaBece,
    berasJimpitan: r.berasJimpitan,
    fotocopyDalil: r.fotocopyDalil,
    otherNotes: r.otherNotes,
    visitPlans: r.visitPlans,
    constructionProjects: r.constructionProjects,
    sick: r.sick.map((s) => ({ memberId: s.memberId, notes: s.notes })),
    familyVisits: r.familyVisits.map((v) => ({
      householdId: v.householdId,
      familyName: v.familyName,
      notes: v.notes,
    })),
    activities: r.activities.map((a) => ({
      activityTypeId: a.activityTypeId,
      activityName: a.activityName,
      status: a.status,
      executedDate: a.executedDate,
      attendeeCount: a.attendeeCount,
      location: a.location,
      sourceMeetingId: a.sourceMeetingId,
    })),
  };
}

export function MonthlyReport() {
  const initial = useMemo(() => currentMonthYear(), []);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  const [report, setReport] = useState<ReportData | null>(null);
  const [draft, setDraft] = useState<SaveReportInput | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmLock, setConfirmLock] = useState<null | 'lock' | 'unlock'>(null);

  const [members, setMembers] = useState<PickerMember[]>([]);
  const [households, setHouseholds] = useState<PickerHousehold[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    void (async () => {
      try {
        const [m, h] = await Promise.all([
          window.clapp.member.list({ activeOnly: true }),
          window.clapp.household.list(),
        ]);
        setMembers(m.map((x) => ({ id: x.id, fullName: x.fullName })));
        setHouseholds(
          h.map((x) => ({
            id: x.id,
            householdNo: x.householdNo,
            headMemberName: x.headMemberName,
          })),
        );
      } catch {
        // pickers stay empty; non-fatal
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setReport(null);
    setDraft(null);
    setLoadError(null);
    setDirty(false);
    try {
      const r = await window.clapp.report.get({ month, year });
      if (!r.ok) {
        setLoadError(r.message);
        return;
      }
      setReport(r.data);
      setDraft(toDraft(r.data));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [month, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchDraft = useCallback((patch: Partial<SaveReportInput>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    const r = await window.clapp.report.save(draft);
    setSaving(false);
    if (!r.ok) {
      showToast({ variant: 'error', message: r.message });
      return;
    }
    setReport(r.data);
    setDraft(toDraft(r.data));
    setDirty(false);
    showToast({ variant: 'success', message: 'Laporan disimpan.' });
  }, [draft, showToast]);

  const handleToggleLock = useCallback(async () => {
    const finalized = report?.finalizedAt != null;
    setConfirmLock(null);
    setSaving(true);
    const call = finalized
      ? window.clapp.report.unlock({ month, year })
      : window.clapp.report.finalize({ month, year });
    const r = await call;
    setSaving(false);
    if (!r.ok) {
      showToast({ variant: 'error', message: r.message });
      return;
    }
    setReport(r.data);
    setDraft(toDraft(r.data));
    setDirty(false);
    showToast({
      variant: 'success',
      message: finalized ? 'Laporan dibuka kembali.' : 'Laporan dikunci sebagai final.',
    });
  }, [report, month, year, showToast]);

  const yearChoices = useMemo(() => availableYears(initial.year - 5), [initial]);
  const periodLabel = `${BULAN_ID[month - 1]} ${year}`;
  const finalized = report?.finalizedAt != null;

  const editProps: EditableProps | null = draft
    ? { draft, onChange: patchDraft, members, households, disabled: finalized }
    : null;

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
        finalized={finalized}
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onToggleLock={() => setConfirmLock(finalized ? 'unlock' : 'lock')}
        onDownload={() =>
          showToast({
            variant: 'info',
            message: 'Ekspor Excel akan tersedia di pembaruan berikutnya.',
          })
        }
      />

      {loadError && (
        <div className="px-6 py-3">
          <Banner variant="danger">
            Gagal memuat laporan: <b>{loadError}</b>
          </Banner>
        </div>
      )}

      {finalized && (
        <div className="border-b border-rule bg-paper-2 px-6 py-2 text-[12.5px] text-ink-700">
          Laporan <b>{periodLabel}</b> sudah dikunci (final). Buka kunci untuk
          mengedit kembali.
        </div>
      )}

      {!report && !loadError && (
        <div className="flex flex-1 items-center justify-center font-mono text-[11px] uppercase tracking-wider text-ink-500">
          Memuat…
        </div>
      )}

      {report && editProps && (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto flex max-w-[860px] flex-col gap-[18px]">
            <DemografiSection data={report.demografi} />
            <LimaBabSection data={report.limaBab} />
            <KegiatanSection {...editProps} />
            <SakitSection {...editProps} />
            <KeluargaSection {...editProps} />
            <PeristiwaSection data={report.peristiwa} />
            <SaranSection data={report.saran} />
            <AnjangsanaSection {...editProps} />
            <PembangunanSection {...editProps} />
            <RingkasanSection {...editProps} />
            <LainLainSection {...editProps} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmLock !== null}
        onOpenChange={(o) => !o && setConfirmLock(null)}
        eyebrow="Konfirmasi"
        title={
          confirmLock === 'unlock'
            ? 'Buka kunci laporan?'
            : `Kunci laporan ${periodLabel} sebagai final?`
        }
        description={
          confirmLock === 'unlock' ? (
            <>Setelah dibuka, laporan bisa diedit lagi dan demografi dihitung ulang.</>
          ) : (
            <>
              Demografi & Lima Bab akan dibekukan apa adanya saat ini, dan semua
              input dikunci. Masih bisa dibuka kembali nanti.
            </>
          )
        }
        confirmLabel={confirmLock === 'unlock' ? 'Buka Kunci' : 'Kunci'}
        confirmVariant={confirmLock === 'unlock' ? 'primary' : 'primary'}
        onConfirm={() => void handleToggleLock()}
        busy={saving}
      />
    </div>
  );
}
