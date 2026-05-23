import { useCallback, useEffect, useMemo, useState } from 'react';

import { Banner } from '@renderer/components/Banner';
import { useToast } from '@renderer/components/Toast';
import type { HouseholdRow } from '@shared/household';
import type { MasterDataItem } from '@shared/masterData';
import type { MemberFilter, MemberRow as Member } from '@shared/member';

import { CatatKepindahanModal } from './CatatKepindahanModal';
import { DetailPanel } from './DetailPanel';
import { EditJamaahModal } from './EditJamaahModal';
import { EditKKModal } from './EditKKModal';
import { FilterBar, type ViewMode } from './FilterBar';
import { MemberList } from './MemberList';
import { TambahJamaahModal } from './TambahJamaahModal';

export function Jamaah() {
  const { showToast } = useToast();

  const [members, setMembers] = useState<Member[] | null>(null);
  const [households, setHouseholds] = useState<HouseholdRow[] | null>(null);
  const [roles, setRoles] = useState<MasterDataItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MemberFilter>({ activeOnly: true });
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  const [tambahOpen, setTambahOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [catatOpen, setCatatOpen] = useState(false);
  const [editKKId, setEditKKId] = useState<number | null>(null);

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

  const editKKHousehold = useMemo(
    () =>
      editKKId !== null
        ? (households?.find((h) => h.id === editKKId) ?? null)
        : null,
    [editKKId, households],
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
        onAddClick={() => setTambahOpen(true)}
      />

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
          onEditKK={(id) => setEditKKId(id)}
          onReorderHouseholds={onReorderHouseholds}
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
        onCatatKepindahan={() => setCatatOpen(true)}
      />

      {households && (
        <TambahJamaahModal
          open={tambahOpen}
          onOpenChange={setTambahOpen}
          households={households}
          roles={roles}
          onSaved={() => void refresh()}
        />
      )}

      {households && selectedMember && (
        <EditJamaahModal
          open={editOpen}
          onOpenChange={setEditOpen}
          member={selectedMember}
          households={households}
          roles={roles}
          onSaved={() => void refresh()}
        />
      )}

      {selectedMember && (
        <CatatKepindahanModal
          open={catatOpen}
          onOpenChange={setCatatOpen}
          member={selectedMember}
          householdMembers={selectedHouseholdMembers}
          onSaved={() => {
            void refresh();
            // The member becomes inactive after Catat Kepindahan — close the
            // detail panel so the operator returns to the list.
            setSelectedMemberId(null);
          }}
        />
      )}

      {editKKHousehold && members && (
        <EditKKModal
          open={editKKId !== null}
          onOpenChange={(o) => {
            if (!o) setEditKKId(null);
          }}
          household={editKKHousehold}
          members={members}
          onSaved={() => void refresh()}
        />
      )}
    </div>
  );
}
