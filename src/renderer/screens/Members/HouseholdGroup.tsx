import { ChevronDown, GripVertical, MapPin, Pencil } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

import { DropLine } from '@renderer/components/DropLine';
import { IconButton } from '@renderer/components/IconButton';
import type {
  DropPosition,
  ReorderableHandle,
} from '@renderer/lib/useReorderable';
import type { HouseholdRow } from '@shared/household';
import type { MemberRow as Member } from '@shared/member';

import { MemberRow } from './MemberRow';
import type { MemberColumn } from './columns';

export interface HouseholdGroupProps {
  household: HouseholdRow;
  members: Member[];
  startNumber: number;
  columns: MemberColumn[];
  onMemberSelect: (memberId: number) => void;
  onEditHousehold: (householdId: number) => void;
  // Drag-to-reorder (state from useReorderable)
  isDragging: boolean;
  dropIndicator: DropPosition | null;
  dragHandle: ReorderableHandle;
}

export function HouseholdGroup({
  household,
  members,
  startNumber,
  columns,
  onMemberSelect,
  onEditHousehold,
  isDragging,
  dropIndicator,
  dragHandle,
}: HouseholdGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const totalWidth = columns.reduce((a, c) => a + c.width, 0);

  // The drag handlers live on the header strip (the only "grabbable" zone),
  // but onDragOver / onDrop apply to the whole group so any member row can
  // act as a drop target — without that the gaps between groups would be
  // dead zones for dropping.
  const { draggable, onDragStart, onDragEnd, onDragOver, onDrop } = dragHandle;

  return (
    <div
      className={clsx(
        'relative border-b border-rule-strong transition-opacity',
        isDragging && 'opacity-35',
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <DropLine position={dropIndicator} />

      <div
        className="group flex h-9 items-stretch border-b border-rule bg-surface-2"
        style={{ width: totalWidth, minWidth: '100%' }}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {/* Sticky-left portion — pinned at left:0 as the table scrolls right. */}
        <div className="sticky left-0 z-[2] flex items-center gap-2 bg-surface-2 pl-2 pr-3">
          <span
            className="flex h-7 w-5 cursor-grab items-center justify-center text-ink-500 transition-colors hover:text-ink-900 active:cursor-grabbing"
            title="Geser untuk mengubah urutan KK"
          >
            <GripVertical size={14} strokeWidth={1.6} />
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            className="flex items-center gap-2.5 text-left transition-colors hover:bg-[#F1ECDD]"
          >
            <ChevronDown
              size={12}
              className={clsx(
                'shrink-0 text-ink-700 transition-transform',
                collapsed && '-rotate-90',
              )}
            />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-700">
              KK-{household.householdNo}
            </span>
            <TypeChip type={household.type} />
            <span className="max-w-[200px] truncate text-[13.5px] font-semibold text-ink-900">
              {household.headMemberName ?? (
                <span className="font-normal italic text-ink-500">
                  (belum ada kepala)
                </span>
              )}
            </span>
          </button>
          <IconButton
            aria-label={`Edit KK-${household.householdNo}`}
            onClick={(e) => {
              e.stopPropagation();
              onEditHousehold(household.id);
            }}
          >
            <Pencil size={13} strokeWidth={1.4} />
          </IconButton>
        </div>

        {/* Non-sticky right portion — count + address, scrolls with the table. */}
        <div className="ml-auto flex items-center gap-3 pr-4">
          <span className="font-mono text-[11px] text-ink-500 whitespace-nowrap">
            <span className="font-semibold text-ink-900">
              {household.activeMemberCount}
            </span>
            {household.activeMemberCount !== household.memberCount && (
              <> / {household.memberCount}</>
            )}{' '}
            jama'ah
          </span>
          {household.address && (
            <span className="hidden max-w-[320px] items-center gap-1.5 truncate text-[12px] italic text-ink-500 md:inline-flex">
              <MapPin size={11} strokeWidth={1.6} className="shrink-0" />
              {household.address}
            </span>
          )}
        </div>
      </div>

      {!collapsed &&
        members.map((m, i) => (
          <MemberRow
            key={m.id}
            member={m}
            rowNumber={startNumber + i}
            columns={columns}
            onSelect={() => onMemberSelect(m.id)}
          />
        ))}
    </div>
  );
}

function TypeChip({ type }: { type: 'KK' | 'KK-S' }) {
  const isFull = type === 'KK';
  return (
    <span
      className={clsx(
        'inline-flex h-[18px] items-center rounded-sm border px-1.5 font-mono text-[10px] font-bold uppercase tracking-wider',
        isFull
          ? 'border-ink-900 bg-ink-900 text-surface'
          : 'border-ink-700 bg-transparent text-ink-700',
      )}
    >
      {type}
    </span>
  );
}
