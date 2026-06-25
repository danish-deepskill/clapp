import { useCallback, useEffect, useMemo, useState } from 'react';

import { Banner } from '@renderer/components/Banner';
import { useToast } from '@renderer/components/Toast';
import {
  availableYears,
  currentMonthYear,
  lastDayOfMonth,
} from '@renderer/lib/dates';
import { BULAN_ID } from '@shared/enums';
import type { MemberAsOf } from '@shared/history';
import type { HouseholdRow } from '@shared/household';
import type { MasterDataItem } from '@shared/masterData';
import type { MemberFilter, MemberRow as Member } from '@shared/member';

import { AddMemberModal } from './AddMemberModal';
import { AsOfRoster } from './AsOfRoster';
import { DetailPanel } from './DetailPanel';
import { EditHouseholdModal } from './EditHouseholdModal';
import { EditMemberModal } from './EditMemberModal';
import { FilterBar, type ViewMode } from './FilterBar';
import { HistoryBar } from './HistoryBar';
import { MemberList } from './MemberList';
import { RecordMovementModal } from './RecordMovementModal';

export function Members() {
  const { showToast } = useToast();

  const [members, setMembers] = useState<Member[] | null>(null);
  const [households, setHouseholds] = useState<HouseholdRow[] | null>(null);
  const [roles, setRoles] = useState<MasterDataItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MemberFilter>({ activeOnly: true });
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  // householdIds currently collapsed in grouped view; empty = all expanded.
  const [collapsedHouseholds, setCollapsedHouseholds] = useState<Set<number>>(
    () => new Set(),
  );
  // Mode Pendataan Awal — session-only; member ops skip Catatan Peristiwa writes.
  const [setupMode, setSetupMode] = useState(false);

  // Riwayat (history) mode — null = live directory; else reconstruct as-of month.
  const initialPeriod = useMemo(() => currentMonthYear(), []);
  const [historyPeriod, setHistoryPeriod] = useState<
    { month: number; year: number } | null
  >(null);
  const [asOfRoster, setAsOfRoster] = useState<MemberAsOf[] | null>(null);

  useEffect(() => {
    if (!historyPeriod) {
      setAsOfRoster(null);
      return;
    }
    let cancelled = false;
    setAsOfRoster(null);
    void (async () => {
      const date = lastDayOfMonth(historyPeriod.year, historyPeriod.month);
      const r = await window.clapp.member.rosterAsOf({ date });
      if (cancelled) return;
      if (!r.ok) {
        showToast({ variant: 'error', message: r.message });
        return;
      }
      setAsOfRoster(r.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [historyPeriod, showToast]);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [recordMovementOpen, setRecordMovementOpen] = useState(false);
  const [editHouseholdId, setEditHouseholdId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [m, h, r] = await Promise.all([
        window.clapp.member.list(),
        window.clapp.household.list(),
        window.clapp.masterData.roles.list(),
      ]);
      setMembers(m);
      setHouseholds(h);
      setRoles(r);
      setLoadError(null);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!members) return [];
    let out = members;
    if (filter.activeOnly) out = out.filter((m) => m.isActive);
    if (filter.pengurusOnly) out = out.filter((m) => m.roleId !== null);
    if (filter.lifeStage) {
      out = out.filter((m) => m.lifeStage === filter.lifeStage);
    }
    if (filter.gender) out = out.filter((m) => m.gender === filter.gender);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          (m.nickname?.toLowerCase().includes(q) ?? false),
      );
    }
    return out;
  }, [members, filter, search]);

  const totalActive = members?.filter((m) => m.isActive).length ?? 0;

  const selectedMember = useMemo(
    () =>
      selectedMemberId !== null
        ? (members?.find((m) => m.id === selectedMemberId) ?? null)
        : null,
    [members, selectedMemberId],
  );
  const selectedHousehold = useMemo(
    () =>
      selectedMember
        ? (households?.find((h) => h.id === selectedMember.householdId) ?? null)
        : null,
    [selectedMember, households],
  );
  const selectedHouseholdMembers = useMemo(
    () =>
      selectedMember && members
        ? members.filter((m) => m.householdId === selectedMember.householdId)
        : [],
    [members, selectedMember],
  );

  const editingHousehold = useMemo(
    () =>
      editHouseholdId !== null
        ? (households?.find((h) => h.id === editHouseholdId) ?? null)
        : null,
    [editHouseholdId, households],
  );

  const onReorderHouseholds = useCallback(
    async (orderedIds: number[]) => {
      const result = await window.clapp.household.reorder(orderedIds);
      if (!result.ok) {
        showToast({ variant: 'error', message: result.message });
        return;
      }
      await refresh();
      showToast({ variant: 'success', message: 'Urutan KK diperbarui.' });
    },
    [refresh, showToast],
  );

  const onToggleCollapsed = useCallback((householdId: number) => {
    setCollapsedHouseholds((prev) => {
      const next = new Set(prev);
      if (next.has(householdId)) next.delete(householdId);
      else next.add(householdId);
      return next;
    });
  }, []);

  // Visible households in grouped view = those with ≥1 filtered member.
  const visibleHouseholdIds = useMemo(() => {
    if (!households) return [] as number[];
    const hasMember = new Set(filtered.map((m) => m.householdId));
    return households.filter((h) => hasMember.has(h.id)).map((h) => h.id);
  }, [households, filtered]);

  const allCollapsed =
    visibleHouseholdIds.length > 0 &&
    visibleHouseholdIds.every((id) => collapsedHouseholds.has(id));

  const onToggleCollapseAll = useCallback(() => {
    setCollapsedHouseholds((prev) => {
      const allNowCollapsed = visibleHouseholdIds.every((id) => prev.has(id));
      return allNowCollapsed ? new Set() : new Set(visibleHouseholdIds);
    });
  }, [visibleHouseholdIds]);

  const yearChoices = useMemo(
    () => availableYears(initialPeriod.year - 5),
    [initialPeriod],
  );

  // ─── Riwayat (read-only past-month reconstruction) ────────────────────
  if (historyPeriod) {
    const label = `${BULAN_ID[historyPeriod.month - 1]} ${historyPeriod.year}`;
    return (
      <div className="flex h-full flex-col bg-paper">
        <HistoryBar
          month={historyPeriod.month}
          year={historyPeriod.year}
          onPeriodChange={setHistoryPeriod}
          availableYears={yearChoices}
          count={asOfRoster?.length ?? 0}
          onExit={() => setHistoryPeriod(null)}
        />
        {asOfRoster === null ? (
          <div className="flex flex-1 items-center justify-center font-mono text-[11px] uppercase tracking-wider text-ink-500">
            Memuat…
          </div>
        ) : (
          <AsOfRoster
            rows={asOfRoster}
            emptyLabel={`Tidak ada jama'ah aktif pada akhir ${label}.`}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-paper">
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalActive={totalActive}
        totalFiltered={filtered.length}
        onAddClick={() => setAddOpen(true)}
        allCollapsed={allCollapsed}
        onToggleCollapseAll={onToggleCollapseAll}
        canToggleCollapseAll={
          viewMode === 'grouped' && visibleHouseholdIds.length > 0
        }
        setupMode={setupMode}
        onSetupModeChange={setSetupMode}
        onOpenHistory={() =>
          setHistoryPeriod({
            month: initialPeriod.month,
            year: initialPeriod.year,
          })
        }
      />

      {setupMode && (
        <div className="border-b border-[#E8C97A] bg-[#FFF8E2] px-6 py-2 text-[12.5px] text-[#7A5A14]">
          <b className="text-[#5A3F0F]">Mode Setup aktif</b> — perubahan kelas
          / status / dapukan, penambahan jama'ah, dan catat kepindahan{' '}
          <b className="text-[#5A3F0F]">tidak dicatat di Catatan Peristiwa</b>{' '}
          selama mode ini menyala.{' '}
          <button
            type="button"
            onClick={() => setSetupMode(false)}
            className="ml-1 font-semibold text-[#5A3F0F] underline underline-offset-2 hover:text-ink-900"
          >
            Matikan
          </button>
        </div>
      )}

      {loadError && (
        <div className="px-6 py-3">
          <Banner variant="danger">
            Gagal memuat daftar: <b>{loadError}</b>
          </Banner>
        </div>
      )}

      {members === null && !loadError && (
        <div className="flex flex-1 items-center justify-center font-mono text-[11px] uppercase tracking-wider text-ink-500">
          Memuat…
        </div>
      )}

      {members && households && (
        <MemberList
          members={filtered}
          households={households}
          viewMode={viewMode}
          onMemberSelect={(id) => setSelectedMemberId(id)}
          onEditHousehold={(id) => setEditHouseholdId(id)}
          onReorderHouseholds={onReorderHouseholds}
          collapsedHouseholds={collapsedHouseholds}
          onToggleCollapsed={onToggleCollapsed}
        />
      )}

      <DetailPanel
        open={selectedMemberId !== null}
        onOpenChange={(o) => {
          if (!o) setSelectedMemberId(null);
        }}
        member={selectedMember}
        household={selectedHousehold}
        onEdit={() => setEditOpen(true)}
        onRecordMovement={() => setRecordMovementOpen(true)}
      />

      {households && (
        <AddMemberModal
          open={addOpen}
          onOpenChange={setAddOpen}
          households={households}
          roles={roles}
          onSaved={() => void refresh()}
          silentLog={setupMode}
        />
      )}

      {households && selectedMember && (
        <EditMemberModal
          open={editOpen}
          onOpenChange={setEditOpen}
          member={selectedMember}
          households={households}
          roles={roles}
          onSaved={() => void refresh()}
          silentLog={setupMode}
        />
      )}

      {selectedMember && (
        <RecordMovementModal
          open={recordMovementOpen}
          onOpenChange={setRecordMovementOpen}
          member={selectedMember}
          householdMembers={selectedHouseholdMembers}
          onSaved={() => {
            void refresh();
            // The member becomes inactive after Catat Kepindahan — close the
            // detail panel so the operator returns to the list.
            setSelectedMemberId(null);
          }}
          silentLog={setupMode}
        />
      )}

      {editingHousehold && members && (
        <EditHouseholdModal
          open={editHouseholdId !== null}
          onOpenChange={(o) => {
            if (!o) setEditHouseholdId(null);
          }}
          household={editingHousehold}
          members={members}
          onSaved={() => void refresh()}
        />
      )}
    </div>
  );
}
