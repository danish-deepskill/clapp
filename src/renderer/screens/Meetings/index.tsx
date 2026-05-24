import { useCallback, useEffect, useMemo, useState } from 'react';

import { Banner } from '@renderer/components/Banner';
import { ConfirmDialog } from '@renderer/components/ConfirmDialog';
import { useToast } from '@renderer/components/Toast';
import {
  availableYears,
  currentMonthYear,
  todayISO,
} from '@renderer/lib/dates';
import type {
  EligibleAttendee,
  MeetingDetail,
  MeetingListItem,
} from '@shared/meeting';

import { FilterBar } from './FilterBar';
import { MeetingEditor, type MeetingDraft } from './MeetingEditor';
import { MeetingList } from './MeetingList';

const EMPTY_DRAFT_DATE = todayISO();

function emptyDraft(): MeetingDraft {
  return {
    meetingDate: EMPTY_DRAFT_DATE,
    type: 'Musyawarah Kelompok',
    title: '',
    resultNotes: '',
    suggestions: '',
    attendeeMemberIds: [],
  };
}

function detailToDraft(d: MeetingDetail): MeetingDraft {
  return {
    meetingDate: d.meetingDate,
    type: d.type,
    title: d.title,
    resultNotes: d.resultNotes ?? '',
    suggestions: d.suggestions ?? '',
    attendeeMemberIds: d.attendees.map((a) => a.memberId).sort((a, b) => a - b),
  };
}

function draftsEqual(a: MeetingDraft, b: MeetingDraft): boolean {
  if (
    a.meetingDate !== b.meetingDate ||
    a.type !== b.type ||
    a.title !== b.title ||
    a.resultNotes !== b.resultNotes ||
    a.suggestions !== b.suggestions
  ) {
    return false;
  }
  if (a.attendeeMemberIds.length !== b.attendeeMemberIds.length) return false;
  const ax = [...a.attendeeMemberIds].sort((x, y) => x - y);
  const bx = [...b.attendeeMemberIds].sort((x, y) => x - y);
  for (let i = 0; i < ax.length; i++) if (ax[i] !== bx[i]) return false;
  return true;
}

export function Meetings() {
  const initialPeriod = useMemo(() => currentMonthYear(), []);
  const [month, setMonth] = useState(initialPeriod.month);
  const [year, setYear] = useState(initialPeriod.year);

  const [items, setItems] = useState<MeetingListItem[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [eligible, setEligible] = useState<EligibleAttendee[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await window.clapp.meeting.eligibleAttendees();
      if (cancelled || !r.ok) return;
      setEligible(r.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Load list whenever period changes ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setListError(null);
    void (async () => {
      const r = await window.clapp.meeting.list({ month, year });
      if (cancelled) return;
      if (!r.ok) {
        setListError(r.message);
        return;
      }
      setItems(r.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [month, year, reloadKey]);

  // ─── Selection + draft ────────────────────────────────────────────────
  // selectedId === null AND newDraft !== null  → editing a new (unsaved) meeting
  // selectedId === <id> AND loadedDetail set    → editing an existing meeting
  // selectedId === null AND newDraft === null   → nothing selected (split view shows hint)
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newDraft, setNewDraft] = useState<MeetingDraft | null>(null);
  const [loadedDetail, setLoadedDetail] = useState<MeetingDetail | null>(null);
  const [editDraft, setEditDraft] = useState<MeetingDraft | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Existing meetings open in read mode; explicit Edit button unlocks form. */
  const [isEditing, setIsEditing] = useState(false);
  const { showToast } = useToast();

  // Load detail when selectedId changes (and we're not on the new-draft path)
  useEffect(() => {
    if (selectedId === null) {
      setLoadedDetail(null);
      setEditDraft(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setLoadedDetail(null);
    setEditDraft(null);
    setDetailError(null);
    void (async () => {
      const r = await window.clapp.meeting.get(selectedId);
      if (cancelled) return;
      if (!r.ok) {
        setDetailError(r.message);
        return;
      }
      setLoadedDetail(r.data);
      setEditDraft(detailToDraft(r.data));
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const activeDraft = newDraft ?? editDraft;
  const baseline = newDraft
    ? emptyDraft()
    : loadedDetail
      ? detailToDraft(loadedDetail)
      : null;
  const isDirty = activeDraft && baseline ? !draftsEqual(activeDraft, baseline) : false;

  const setActiveDraft = useCallback(
    (next: MeetingDraft) => {
      if (newDraft !== null) {
        setNewDraft(next);
      } else {
        setEditDraft(next);
      }
    },
    [newDraft],
  );

  const handleNewMeeting = useCallback(() => {
    setSelectedId(null);
    setEditDraft(null);
    setLoadedDetail(null);
    setNewDraft(emptyDraft());
    setIsEditing(true);
  }, []);

  const handleSelectExisting = useCallback((id: number) => {
    setNewDraft(null);
    setSelectedId(id);
    setIsEditing(false);
  }, []);

  const handleEnterEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    if (newDraft !== null) {
      // New meeting — discard entirely and return to empty pane.
      setNewDraft(null);
      setSelectedId(null);
      setIsEditing(false);
    } else if (loadedDetail) {
      // Existing meeting — revert draft and return to read mode.
      setEditDraft(detailToDraft(loadedDetail));
      setIsEditing(false);
    }
  }, [newDraft, loadedDetail]);

  const handleSave = useCallback(async () => {
    if (!activeDraft) return;
    setIsSaving(true);
    const payload = {
      ...(selectedId !== null && newDraft === null ? { id: selectedId } : {}),
      meetingDate: activeDraft.meetingDate,
      type: activeDraft.type,
      title: activeDraft.title,
      resultNotes:
        activeDraft.resultNotes.trim() === '' ? null : activeDraft.resultNotes,
      suggestions:
        activeDraft.suggestions.trim() === '' ? null : activeDraft.suggestions,
      attendeeMemberIds: activeDraft.attendeeMemberIds,
    };
    const r = await window.clapp.meeting.save(payload);
    setIsSaving(false);
    if (!r.ok) {
      showToast({
        variant: 'error',
        message: (
          <>
            Gagal menyimpan: <b>{r.message}</b>
          </>
        ),
      });
      return;
    }
    showToast({
      variant: 'success',
      message: newDraft
        ? 'Musyawarah baru disimpan.'
        : 'Perubahan musyawarah disimpan.',
    });
    // Snap period to meeting's month/year so the saved item stays visible.
    const [yStr, mStr] = r.data.meeting.meetingDate.split('-');
    const savedYear = Number(yStr);
    const savedMonth = Number(mStr);
    if (savedYear !== year || savedMonth !== month) {
      setYear(savedYear);
      setMonth(savedMonth);
    }
    // Switch to viewing the saved meeting in read mode.
    setNewDraft(null);
    setSelectedId(r.data.meeting.id);
    setLoadedDetail(r.data.meeting);
    setEditDraft(detailToDraft(r.data.meeting));
    setIsEditing(false);
    setReloadKey((k) => k + 1);
  }, [activeDraft, newDraft, selectedId, month, year, showToast]);

  const handleDelete = useCallback(async () => {
    if (selectedId === null) return;
    setConfirmDelete(false);
    setIsSaving(true);
    const r = await window.clapp.meeting.delete(selectedId);
    setIsSaving(false);
    if (!r.ok) {
      showToast({
        variant: 'error',
        message: (
          <>
            Gagal menghapus: <b>{r.message}</b>
          </>
        ),
      });
      return;
    }
    showToast({ variant: 'success', message: 'Musyawarah dihapus.' });
    setSelectedId(null);
    setLoadedDetail(null);
    setEditDraft(null);
    setReloadKey((k) => k + 1);
  }, [selectedId, showToast]);

  const yearChoices = useMemo(
    () => availableYears(initialPeriod.year - 5),
    [initialPeriod],
  );

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
        meetingCount={items?.length ?? 0}
        onNewMeeting={handleNewMeeting}
      />

      {listError && (
        <div className="px-6 py-3">
          <Banner variant="danger">
            Gagal memuat daftar: <b>{listError}</b>
          </Banner>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <MeetingList
          items={items ?? []}
          selectedId={selectedId}
          newDraft={newDraft ? { title: newDraft.title } : null}
          onSelect={handleSelectExisting}
          emptyLabel={
            items === null
              ? 'Memuat…'
              : `Belum ada musyawarah di bulan ini.`
          }
        />

        {activeDraft ? (
          <MeetingEditor
            meetingId={newDraft ? null : selectedId}
            draft={activeDraft}
            onChange={setActiveDraft}
            eligibleAttendees={eligible}
            maxDate={todayISO()}
            readOnly={!isEditing}
            isDirty={isDirty}
            isSaving={isSaving}
            onEnterEdit={handleEnterEdit}
            onSave={handleSave}
            onCancelEdit={handleCancelEdit}
            onDelete={() => setConfirmDelete(true)}
          />
        ) : (
          <EmptyEditor error={detailError} />
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        eyebrow="Konfirmasi · Tindakan Destruktif"
        title="Hapus musyawarah?"
        description={
          <>
            Catatan musyawarah <b>{loadedDetail?.title ?? ''}</b> dan daftar
            hadirnya akan dihapus permanen. Catatan kegiatan di Laporan Bulanan
            tetap ada, hanya tautan ke musyawarah ini yang akan dikosongkan.
          </>
        }
        confirmLabel="Hapus"
        confirmVariant="danger"
        onConfirm={handleDelete}
        busy={isSaving}
      />
    </div>
  );
}

function EmptyEditor({ error }: { error: string | null }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center bg-paper px-8 text-center">
      {error ? (
        <Banner variant="danger">
          Gagal memuat musyawarah: <b>{error}</b>
        </Banner>
      ) : (
        <>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-500">
            Tidak ada musyawarah dipilih
          </p>
          <p className="mt-2 max-w-prose text-[13.5px] text-ink-700">
            Pilih sebuah musyawarah dari daftar di kiri, atau klik{' '}
            <b>Musyawarah Baru</b> di kanan atas untuk mencatat yang baru.
          </p>
        </>
      )}
    </div>
  );
}
