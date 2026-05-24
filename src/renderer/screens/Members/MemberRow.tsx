import { ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

import { fmtDateID } from '@renderer/lib/format';
import type { MemberRow as Member } from '@shared/member';

import {
  InactiveTag,
  KepalaBadge,
  RoleBadge,
} from '@renderer/components/badges';
import { gridTemplate, type MemberColumn } from './columns';

export interface MemberRowProps {
  member: Member;
  rowNumber: number;
  columns: MemberColumn[];
  /** Only present in flat mode — the household number to display. */
  householdNo?: string;
  onSelect: () => void;
}

export function MemberRow({
  member,
  rowNumber,
  columns,
  householdNo,
  onSelect,
}: MemberRowProps) {
  const dim = !member.isActive;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={clsx(
        'group grid h-[38px] cursor-default items-stretch border-b border-rule bg-surface text-[13px] transition-colors hover:bg-surface-2 focus-visible:bg-surface-2',
        dim && 'opacity-65',
      )}
      style={{ gridTemplateColumns: gridTemplate(columns) }}
    >
      {columns.slice(0, -1).map((col, idx) => (
        <Cell key={col.key} column={col} index={idx} totalCols={columns.length}>
          {renderCellContent(col.key, member, rowNumber, householdNo)}
        </Cell>
      ))}
      {/* Flex spacer — fills the gap so the sticky-right aksi cell pins to the viewport edge. */}
      <div aria-hidden="true" className="bg-surface group-hover:bg-surface-2 group-focus-visible:bg-surface-2" />
      <Cell
        column={columns[columns.length - 1]!}
        index={columns.length - 1}
        totalCols={columns.length}
      >
        {renderCellContent(
          columns[columns.length - 1]!.key,
          member,
          rowNumber,
          householdNo,
        )}
      </Cell>
    </div>
  );
}

function Cell({
  column,
  index,
  totalCols,
  children,
}: {
  column: MemberColumn;
  index: number;
  totalCols: number;
  children: React.ReactNode;
}) {
  const sticky =
    column.key === 'no'
      ? 'sticky left-0 z-[1] bg-surface group-hover:bg-surface-2 group-focus-visible:bg-surface-2'
      : column.key === 'nama'
        ? 'sticky left-[56px] z-[1] bg-surface group-hover:bg-surface-2 group-focus-visible:bg-surface-2'
        : column.key === 'aksi'
          ? 'sticky right-0 z-[1] bg-surface group-hover:bg-surface-2 group-focus-visible:bg-surface-2'
          : '';
  return (
    <div
      className={clsx(
        'flex h-full items-center overflow-hidden whitespace-nowrap px-3 text-ink-900',
        column.mono && 'font-mono tabular-nums',
        column.align === 'right' && 'justify-end',
        column.align === 'center' && 'justify-center',
        index < totalCols - 1 && 'border-r border-rule',
        sticky,
      )}
    >
      {children}
    </div>
  );
}

function dash() {
  return <span className="text-ink-400">—</span>;
}

function renderCellContent(
  key: string,
  m: Member,
  rowNumber: number,
  householdNo?: string,
) {
  switch (key) {
    case 'no':
      return <span className="text-ink-500">{rowNumber}</span>;
    case 'noKk':
      return householdNo ?? dash();
    case 'nama':
      return (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-ink-900">
            {m.fullName}
          </span>
          {m.isHead && <KepalaBadge />}
          {!m.isActive && <InactiveTag />}
        </span>
      );
    case 'dapukan':
      return m.roleName ? <RoleBadge name={m.roleName} /> : dash();
    case 'gender':
      return m.gender === 'Laki-Laki' ? 'L' : 'P';
    case 'kelas':
      return m.lifeStage;
    case 'pernikahan':
      return m.maritalStatus;
    case 'darah':
      return m.bloodType === 'Tidak Tahu' ? (
        <span className="text-ink-400">—</span>
      ) : (
        m.bloodType
      );
    case 'rhesus':
      return m.rhesus === 'Tidak Tahu' ? (
        <span className="text-ink-400">—</span>
      ) : m.rhesus === 'Positif' ? (
        '+'
      ) : (
        '−'
      );
    case 'tempat':
      return m.birthPlace ?? dash();
    case 'tanggal':
      return m.birthDate ? fmtDateID(m.birthDate) : dash();
    case 'panggilan':
      return m.nickname ? (
        <span className="italic text-ink-500">{m.nickname}</span>
      ) : (
        dash()
      );
    case 'aksi':
      return (
        <ChevronRight
          size={14}
          strokeWidth={1.6}
          className="text-ink-500 group-hover:text-ink-900"
        />
      );
    default:
      return null;
  }
}
