import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

import type { HouseholdRow } from '@shared/household';
import type { MemberRow as Member } from '@shared/member';

import { MemberRow } from './MemberRow';
import type { JamaahColumn } from './columns';

export interface HouseholdGroupProps {
  household: HouseholdRow;
  members: Member[];
  startNumber: number;
  columns: JamaahColumn[];
  onMemberSelect: (memberId: number) => void;
}

export function HouseholdGroup({
  household,
  members,
  startNumber,
  columns,
  onMemberSelect,
}: HouseholdGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const totalWidth = columns.reduce((a, c) => a + c.width, 0);

  return (
    <div className="border-b border-rule-strong">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        className="sticky left-0 z-[2] flex items-center gap-3 border-b border-rule bg-paper-2 px-4 py-2 text-left transition-colors hover:bg-[#EAE3D2]"
        style={{ width: totalWidth, minWidth: '100%' }}
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
        <span className="flex-1 truncate text-[13.5px] font-semibold text-ink-900">
          {household.headMemberName ?? (
            <span className="font-normal italic text-ink-500">
              (belum ada kepala)
            </span>
          )}
        </span>
        <span className="font-mono text-[11px] text-ink-500">
          <span className="font-semibold text-ink-900">
            {household.activeMemberCount}
          </span>
          {household.activeMemberCount !== household.memberCount && (
            <> / {household.memberCount}</>
          )}{' '}
          jama'ah
        </span>
        {household.address && (
          <span className="hidden truncate text-[12px] italic text-ink-500 md:inline">
            · {household.address}
          </span>
        )}
      </button>
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
