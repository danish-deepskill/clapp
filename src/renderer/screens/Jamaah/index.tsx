import { useEffect, useMemo, useState } from 'react';

import { Banner } from '@renderer/components/Banner';
import type { HouseholdRow } from '@shared/household';
import type { MemberFilter, MemberRow as Member } from '@shared/member';

import { DetailPanel } from './DetailPanel';
import { FilterBar, type ViewMode } from './FilterBar';
import { MemberList } from './MemberList';

export function Jamaah() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [households, setHouseholds] = useState<HouseholdRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MemberFilter>({ activeOnly: true });
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      window.clapp.member.list(),
      window.clapp.household.list(),
    ])
      .then(([m, h]) => {
        if (cancelled) return;
        setMembers(m);
        setHouseholds(h);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="border-b border-rule bg-surface px-6 pb-3.5 pt-4">
        <p className="mb-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-500">
          Direktori
        </p>
        <h1 className="text-[20px] font-semibold tracking-tight text-ink-900">
          Jama'ah
        </h1>
      </header>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalActive={totalActive}
        totalFiltered={filtered.length}
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
        />
      )}

      <DetailPanel
        open={selectedMemberId !== null}
        onOpenChange={(o) => {
          if (!o) setSelectedMemberId(null);
        }}
        member={selectedMember}
        household={selectedHousehold}
      />
    </div>
  );
}
