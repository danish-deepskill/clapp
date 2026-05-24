import { useMemo } from 'react';
import { clsx } from 'clsx';

import { useReorderable } from '@renderer/lib/useReorderable';
import type { HouseholdRow } from '@shared/household';
import type { MemberRow as Member } from '@shared/member';

import { HouseholdGroup } from './HouseholdGroup';
import { MemberRow } from './MemberRow';
import { columnsFor, gridTemplate, minTableWidth } from './columns';

export interface MemberListProps {
  members: Member[];
  households: HouseholdRow[];
  viewMode: 'grouped' | 'flat';
  onMemberSelect: (memberId: number) => void;
  onEditHousehold: (householdId: number) => void;
  onReorderHouseholds: (orderedIds: number[]) => Promise<void>;
  /** Set of householdIds that are currently collapsed (grouped view only). */
  collapsedHouseholds: Set<number>;
  onToggleCollapsed: (householdId: number) => void;
}

export function MemberList({
  members,
  households,
  viewMode,
  onMemberSelect,
  onEditHousehold,
  onReorderHouseholds,
  collapsedHouseholds,
  onToggleCollapsed,
}: MemberListProps) {
  const columns = useMemo(() => columnsFor(viewMode), [viewMode]);
  const tableWidth = minTableWidth(columns);

  if (members.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12 text-center text-[13px] text-ink-500">
        Tidak ada jama'ah yang cocok dengan filter.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div style={{ minWidth: tableWidth }}>
        <Header columns={columns} />
        {viewMode === 'grouped' ? (
          <GroupedBody
            members={members}
            households={households}
            columns={columns}
            onMemberSelect={onMemberSelect}
            onEditHousehold={onEditHousehold}
            onReorderHouseholds={onReorderHouseholds}
            collapsedHouseholds={collapsedHouseholds}
            onToggleCollapsed={onToggleCollapsed}
          />
        ) : (
          <FlatBody
            members={members}
            households={households}
            columns={columns}
            onMemberSelect={onMemberSelect}
          />
        )}
      </div>
    </div>
  );
}

function Header({
  columns,
}: {
  columns: ReturnType<typeof columnsFor>;
}) {
  const last = columns.length - 1;
  return (
    <div
      className="sticky top-0 z-[3] grid h-9 items-stretch border-b border-rule-strong bg-paper-2"
      style={{ gridTemplateColumns: gridTemplate(columns) }}
    >
      {columns.slice(0, -1).map((col, idx) => {
        const sticky =
          col.key === 'no'
            ? 'sticky left-0 z-[1] bg-paper-2'
            : col.key === 'nama'
              ? 'sticky left-[56px] z-[1] bg-paper-2'
              : '';
        return (
          <div
            key={col.key}
            className={clsx(
              'flex h-full items-center px-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-700',
              col.align === 'right' && 'justify-end',
              col.align === 'center' && 'justify-center',
              idx < last && 'border-r border-rule',
              sticky,
            )}
          >
            {col.label}
          </div>
        );
      })}
      <div aria-hidden="true" className="bg-paper-2" />
      <div className="sticky right-0 z-[1] flex h-full items-center justify-center bg-paper-2 px-3" />
    </div>
  );
}

function GroupedBody({
  members,
  households,
  columns,
  onMemberSelect,
  onEditHousehold,
  onReorderHouseholds,
  collapsedHouseholds,
  onToggleCollapsed,
}: {
  members: Member[];
  households: HouseholdRow[];
  columns: ReturnType<typeof columnsFor>;
  onMemberSelect: (id: number) => void;
  onEditHousehold: (id: number) => void;
  onReorderHouseholds: (orderedIds: number[]) => Promise<void>;
  collapsedHouseholds: Set<number>;
  onToggleCollapsed: (householdId: number) => void;
}) {
  const byHh = useMemo(() => {
    const map = new Map<number, Member[]>();
    for (const m of members) {
      const list = map.get(m.householdId) ?? [];
      list.push(m);
      map.set(m.householdId, list);
    }
    return map;
  }, [members]);

  const visibleHouseholds = useMemo(
    () => households.filter((h) => (byHh.get(h.id)?.length ?? 0) > 0),
    [households, byHh],
  );

  const reorder = useReorderable({
    items: visibleHouseholds,
    onReorder: (orderedIds) => onReorderHouseholds(orderedIds),
  });

  let rowCounter = 0;
  return (
    <>
      {visibleHouseholds.map((hh) => {
        const hhMembers = byHh.get(hh.id) ?? [];
        const startNumber = rowCounter + 1;
        rowCounter += hhMembers.length;
        return (
          <HouseholdGroup
            key={hh.id}
            household={hh}
            members={hhMembers}
            startNumber={startNumber}
            columns={columns}
            onMemberSelect={onMemberSelect}
            onEditHousehold={onEditHousehold}
            collapsed={collapsedHouseholds.has(hh.id)}
            onToggleCollapsed={() => onToggleCollapsed(hh.id)}
            isDragging={reorder.isDragging(hh.id)}
            dropIndicator={reorder.dropIndicator(hh.id)}
            dragHandle={reorder.rowHandle(hh.id)}
          />
        );
      })}
    </>
  );
}

function FlatBody({
  members,
  households,
  columns,
  onMemberSelect,
}: {
  members: Member[];
  households: HouseholdRow[];
  columns: ReturnType<typeof columnsFor>;
  onMemberSelect: (id: number) => void;
}) {
  const hhById = useMemo(
    () => new Map(households.map((h) => [h.id, h])),
    [households],
  );
  return (
    <>
      {members.map((m, i) => (
        <MemberRow
          key={m.id}
          member={m}
          rowNumber={i + 1}
          columns={columns}
          householdNo={hhById.get(m.householdId)?.householdNo ?? '—'}
          onSelect={() => onMemberSelect(m.id)}
        />
      ))}
    </>
  );
}
