import { useMemo } from 'react';
import { clsx } from 'clsx';

import type { HouseholdRow } from '@shared/household';
import type { MemberRow as Member } from '@shared/member';

import { HouseholdGroup } from './HouseholdGroup';
import { MemberRow } from './MemberRow';
import { columnsFor, totalWidth } from './columns';

export interface MemberListProps {
  members: Member[];
  households: HouseholdRow[];
  viewMode: 'grouped' | 'flat';
  onMemberSelect: (memberId: number) => void;
}

export function MemberList({
  members,
  households,
  viewMode,
  onMemberSelect,
}: MemberListProps) {
  const columns = useMemo(() => columnsFor(viewMode), [viewMode]);
  const tableWidth = totalWidth(columns);

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
  return (
    <div
      className="sticky top-0 z-[3] grid h-9 items-stretch border-b border-rule-strong bg-paper-2"
      style={{ gridTemplateColumns: columns.map((c) => `${c.width}px`).join(' ') }}
    >
      {columns.map((col, idx) => {
        const sticky =
          col.key === 'no'
            ? 'sticky left-0 z-[1] bg-paper-2'
            : col.key === 'nama'
              ? 'sticky left-[56px] z-[1] bg-paper-2'
              : col.key === 'aksi'
                ? 'sticky right-0 z-[1] bg-paper-2'
                : '';
        return (
          <div
            key={col.key}
            className={clsx(
              'flex h-full items-center px-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-700',
              col.align === 'right' && 'justify-end',
              col.align === 'center' && 'justify-center',
              idx < columns.length - 1 && 'border-r border-rule',
              sticky,
            )}
          >
            {col.label}
          </div>
        );
      })}
    </div>
  );
}

function GroupedBody({
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
  const byHh = useMemo(() => {
    const map = new Map<number, Member[]>();
    for (const m of members) {
      const list = map.get(m.householdId) ?? [];
      list.push(m);
      map.set(m.householdId, list);
    }
    return map;
  }, [members]);

  let rowCounter = 0;
  return (
    <>
      {households.map((hh) => {
        const hhMembers = byHh.get(hh.id) ?? [];
        if (hhMembers.length === 0) return null;
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

