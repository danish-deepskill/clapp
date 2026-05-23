import { useMemo } from 'react';
import { clsx } from 'clsx';

import { fmtDateID } from '@renderer/lib/format';
import type {
  RecapData,
  RecapMember,
  RecapSession,
} from '@shared/attendance';
import type { AttendanceStatus } from '@shared/enums';
import { HARI_ID } from '@shared/enums';

import { MIN_SESSION_COLS, RIGHT_OFFSET, STICKY } from './columns';

export interface RecapTableProps {
  data: RecapData;
  search: string;
  /** Opens the AttendanceDrawer pre-loaded for that session's date. */
  onSessionClick: (sessionDate: string) => void;
}

interface MemberStats {
  H: number;
  A: number;
  S: number;
  I: number;
  /** Total sessions in the period (denominator). */
  total: number;
  /** Pct = (H+S+I)/total · 100, rounded. 0 if total=0. */
  pct: number;
}

const STATUS_CELL: Record<AttendanceStatus, string> = {
  H: 'bg-hadir-bg text-hadir-ink',
  A: 'bg-alpa-bg text-alpa-ink',
  S: 'bg-sakit-bg text-sakit-ink',
  I: 'bg-izin-bg text-izin-ink',
};

function pctClass(pct: number, total: number): string {
  if (total === 0) return 'text-ink-400';
  if (pct === 0) return 'text-ink-400';
  if (pct < 20) return 'text-alpa font-semibold';
  if (pct <= 60) return 'text-izin font-semibold';
  return 'text-hadir font-semibold';
}

export function RecapTable({ data, search, onSessionClick }: RecapTableProps) {
  const { sessions, members, attendance } = data;

  /** memberId → sessionId → status */
  const matrix = useMemo(() => {
    const m = new Map<number, Map<number, AttendanceStatus>>();
    for (const a of attendance) {
      let inner = m.get(a.memberId);
      if (!inner) {
        inner = new Map();
        m.set(a.memberId, inner);
      }
      inner.set(a.sessionId, a.status);
    }
    return m;
  }, [attendance]);

  const stats = useMemo(() => {
    const out = new Map<number, MemberStats>();
    for (const member of members) {
      const inner = matrix.get(member.id);
      const counts: MemberStats = { H: 0, A: 0, S: 0, I: 0, total: sessions.length, pct: 0 };
      if (inner) {
        for (const s of inner.values()) counts[s] += 1;
      }
      counts.pct =
        sessions.length === 0
          ? 0
          : Math.round(((counts.H + counts.S + counts.I) / sessions.length) * 100);
      out.set(member.id, counts);
    }
    return out;
  }, [matrix, members, sessions]);

  const visibleMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.trim().toLowerCase();
    return members.filter((m) => m.fullName.toLowerCase().includes(q));
  }, [members, search]);

  /** Pad to MIN_SESSION_COLS so the matrix never looks sparse. */
  const placeholderCount = Math.max(0, MIN_SESSION_COLS - sessions.length);

  /** Per-session column totals + period-wide grand totals. */
  const footer = useMemo(() => {
    const perSession = sessions.map((s) => {
      let H = 0,
        A = 0,
        S = 0,
        I = 0;
      for (const member of members) {
        const v = matrix.get(member.id)?.get(s.id);
        if (v === 'H') H += 1;
        else if (v === 'A') A += 1;
        else if (v === 'S') S += 1;
        else if (v === 'I') I += 1;
      }
      const denom = members.length;
      const pct = denom === 0 ? 0 : Math.round(((H + S + I) / denom) * 100);
      return { sessionId: s.id, H, A, S, I, pct };
    });
    const grand = { H: 0, A: 0, S: 0, I: 0 };
    for (const st of stats.values()) {
      grand.H += st.H;
      grand.A += st.A;
      grand.S += st.S;
      grand.I += st.I;
    }
    const denom = sessions.length * members.length;
    const grandPct =
      denom === 0
        ? 0
        : Math.round(((grand.H + grand.S + grand.I) / denom) * 100);
    return { perSession, grand, grandPct };
  }, [sessions, members, matrix, stats]);

  return (
    <div className="flex-1 overflow-auto">
      <table
        className="w-max border-separate text-[13px]"
        style={{ borderSpacing: 0, minWidth: '100%', tableLayout: 'fixed' }}
      >
        <thead>
          <tr>
            <ColHead
              sticky="left"
              left={0}
              width={STICKY.numCol}
              align="right"
              mono
            >
              No.
            </ColHead>
            <ColHead
              sticky="left"
              left={STICKY.numCol}
              width={STICKY.nameCol}
              align="left"
              shadowRight
            >
              Nama Jama'ah
            </ColHead>
            {sessions.map((s) => (
              <ColHead
                key={s.id}
                width={STICKY.sessionCol}
                align="center"
                mono
                title={`Klik untuk edit · ${fmtDateID(s.sessionDate)}`}
                onClick={() => onSessionClick(s.sessionDate)}
              >
                <span className="block truncate text-[10.5px] font-semibold uppercase leading-tight tracking-[0.1em] text-ink-900">
                  {s.sessionTypeName}
                </span>
                <span className="mt-0.5 block text-[9.5px] font-normal uppercase tracking-[0.08em] text-ink-500">
                  {fmtSessionDate(s.sessionDate)}
                </span>
              </ColHead>
            ))}
            {Array.from({ length: placeholderCount }).map((_, i) => (
              <ColHead
                key={`ph-head-${i}`}
                width={STICKY.sessionCol}
                align="center"
                mono
              >
                <span className="block text-[10.5px] font-medium text-ink-300">
                  —
                </span>
              </ColHead>
            ))}
            <ColHead
              sticky="right"
              right={RIGHT_OFFSET.h}
              width={STICKY.totalCol}
              align="center"
              mono
              shadowLeft
            >
              H
            </ColHead>
            <ColHead
              sticky="right"
              right={RIGHT_OFFSET.a}
              width={STICKY.totalCol}
              align="center"
              mono
            >
              A
            </ColHead>
            <ColHead
              sticky="right"
              right={RIGHT_OFFSET.s}
              width={STICKY.totalCol}
              align="center"
              mono
            >
              S
            </ColHead>
            <ColHead
              sticky="right"
              right={RIGHT_OFFSET.i}
              width={STICKY.totalCol}
              align="center"
              mono
            >
              I
            </ColHead>
            <ColHead
              sticky="right"
              right={RIGHT_OFFSET.pct}
              width={STICKY.pctCol}
              align="right"
              mono
            >
              % Hadir
            </ColHead>
          </tr>
        </thead>

        <tbody className="bg-surface">
          {visibleMembers.length === 0 ? (
            <tr>
              <td
                colSpan={sessions.length + placeholderCount + 6}
                className="px-6 py-10 text-center text-[13px] text-ink-500"
              >
                {members.length === 0
                  ? "Tidak ada jama'ah aktif (Muda-mudi / Dewasa)."
                  : "Tidak ada jama'ah yang cocok dengan pencarian."}
              </td>
            </tr>
          ) : (
            visibleMembers.map((member, i) => {
              const st = stats.get(member.id)!;
              return (
                <RecapRow
                  key={member.id}
                  member={member}
                  index={i + 1}
                  sessions={sessions}
                  placeholderCount={placeholderCount}
                  matrix={matrix}
                  stats={st}
                />
              );
            })
          )}
        </tbody>

        <tfoot>
          <FooterRow
            sessions={sessions}
            placeholderCount={placeholderCount}
            perSession={footer.perSession}
            grand={footer.grand}
            grandPct={footer.grandPct}
          />
        </tfoot>
      </table>
    </div>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────

function RecapRow({
  member,
  index,
  sessions,
  placeholderCount,
  matrix,
  stats,
}: {
  member: RecapMember;
  index: number;
  sessions: RecapSession[];
  placeholderCount: number;
  matrix: Map<number, Map<number, AttendanceStatus>>;
  stats: MemberStats;
}) {
  return (
    <tr className="group">
      <BodyCell
        sticky="left"
        left={0}
        align="right"
        mono
        className="text-ink-500"
      >
        {index}
      </BodyCell>
      <BodyCell
        sticky="left"
        left={STICKY.numCol}
        align="left"
        shadowRight
        className="font-medium text-ink-900"
      >
        <span className="truncate" title={member.fullName}>
          {member.fullName}
          <span className="ml-2 font-mono text-[11px] font-normal text-ink-500">
            {member.gender === 'Laki-Laki' ? 'L' : 'P'}
          </span>
        </span>
      </BodyCell>
      {sessions.map((s) => {
        const v = matrix.get(member.id)?.get(s.id);
        return (
          <BodyCell key={s.id} align="center" mono className={v ? STATUS_CELL[v] : ''}>
            {v ?? ''}
          </BodyCell>
        );
      })}
      {Array.from({ length: placeholderCount }).map((_, i) => (
        <BodyCell
          key={`ph-cell-${i}`}
          align="center"
          mono
          className="text-ink-300"
        >
          —
        </BodyCell>
      ))}
      <BodyCell
        sticky="right"
        right={RIGHT_OFFSET.h}
        align="center"
        mono
        shadowLeft
        className="bg-surface-2"
      >
        {stats.H}
      </BodyCell>
      <BodyCell
        sticky="right"
        right={RIGHT_OFFSET.a}
        align="center"
        mono
        className="bg-surface-2"
      >
        {stats.A}
      </BodyCell>
      <BodyCell
        sticky="right"
        right={RIGHT_OFFSET.s}
        align="center"
        mono
        className="bg-surface-2"
      >
        {stats.S}
      </BodyCell>
      <BodyCell
        sticky="right"
        right={RIGHT_OFFSET.i}
        align="center"
        mono
        className="bg-surface-2"
      >
        {stats.I}
      </BodyCell>
      <BodyCell
        sticky="right"
        right={RIGHT_OFFSET.pct}
        align="right"
        mono
        className={clsx('bg-surface-2', pctClass(stats.pct, stats.total))}
      >
        {stats.total === 0 ? '—' : `${stats.pct}%`}
      </BodyCell>
    </tr>
  );
}

// ─── Footer row ────────────────────────────────────────────────────────────

function FooterRow({
  sessions,
  placeholderCount,
  perSession,
  grand,
  grandPct,
}: {
  sessions: RecapSession[];
  placeholderCount: number;
  perSession: { sessionId: number; H: number; A: number; S: number; I: number; pct: number }[];
  grand: { H: number; A: number; S: number; I: number };
  grandPct: number;
}) {
  const cellClass =
    'sticky bottom-0 h-9 border-t border-rule-strong bg-ink-900 px-2 font-mono text-[12px] font-semibold text-surface';
  return (
    <tr>
      <td
        className={clsx(cellClass, 'text-right')}
        style={{
          left: 0,
          position: 'sticky',
          width: STICKY.numCol,
          minWidth: STICKY.numCol,
          zIndex: 3,
        }}
      >
        —
      </td>
      <td
        className={clsx(cellClass, 'text-left')}
        style={{
          left: STICKY.numCol,
          position: 'sticky',
          width: STICKY.nameCol,
          minWidth: STICKY.nameCol,
          zIndex: 3,
          boxShadow: 'inset -1px 0 0 var(--rule)',
        }}
      >
        Total per Sesi
      </td>
      {sessions.map((s, i) => {
        const p = perSession[i];
        return (
          <td
            key={s.id}
            className={clsx(cellClass, 'text-center')}
            style={{ width: STICKY.sessionCol, minWidth: STICKY.sessionCol }}
            title={`Hadir ${p?.H ?? 0} · Alpa ${p?.A ?? 0} · Sakit ${p?.S ?? 0} · Izin ${p?.I ?? 0}`}
          >
            {p?.pct ?? 0}%
          </td>
        );
      })}
      {Array.from({ length: placeholderCount }).map((_, i) => (
        <td
          key={`ph-foot-${i}`}
          className={clsx(cellClass, 'text-center text-ink-300')}
          style={{ width: STICKY.sessionCol, minWidth: STICKY.sessionCol }}
        >
          —
        </td>
      ))}
      <td
        className={clsx(cellClass, 'text-center text-hadir-bg')}
        style={{
          right: RIGHT_OFFSET.h,
          position: 'sticky',
          width: STICKY.totalCol,
          minWidth: STICKY.totalCol,
          zIndex: 3,
          boxShadow: 'inset 1px 0 0 var(--rule)',
        }}
      >
        {grand.H}
      </td>
      <td
        className={clsx(cellClass, 'text-center text-alpa-bg')}
        style={{
          right: RIGHT_OFFSET.a,
          position: 'sticky',
          width: STICKY.totalCol,
          minWidth: STICKY.totalCol,
          zIndex: 3,
        }}
      >
        {grand.A}
      </td>
      <td
        className={clsx(cellClass, 'text-center text-sakit-bg')}
        style={{
          right: RIGHT_OFFSET.s,
          position: 'sticky',
          width: STICKY.totalCol,
          minWidth: STICKY.totalCol,
          zIndex: 3,
        }}
      >
        {grand.S}
      </td>
      <td
        className={clsx(cellClass, 'text-center text-izin-bg')}
        style={{
          right: RIGHT_OFFSET.i,
          position: 'sticky',
          width: STICKY.totalCol,
          minWidth: STICKY.totalCol,
          zIndex: 3,
        }}
      >
        {grand.I}
      </td>
      <td
        className={clsx(cellClass, 'text-right')}
        style={{
          right: RIGHT_OFFSET.pct,
          position: 'sticky',
          width: STICKY.pctCol,
          minWidth: STICKY.pctCol,
          zIndex: 3,
        }}
      >
        {grandPct}%
      </td>
    </tr>
  );
}

// ─── Header cell ───────────────────────────────────────────────────────────

interface ColHeadProps {
  children: React.ReactNode;
  width: number;
  align?: 'left' | 'center' | 'right';
  mono?: boolean;
  sticky?: 'left' | 'right';
  left?: number;
  right?: number;
  shadowRight?: boolean;
  shadowLeft?: boolean;
  title?: string;
  onClick?: () => void;
}

function ColHead({
  children,
  width,
  align = 'left',
  mono,
  sticky,
  left,
  right,
  shadowRight,
  shadowLeft,
  title,
  onClick,
}: ColHeadProps) {
  const style: React.CSSProperties = {
    width,
    minWidth: width,
    maxWidth: width,
    top: 0,
    position: 'sticky',
    zIndex: sticky ? 3 : 2,
  };
  if (sticky === 'left') style.left = left;
  if (sticky === 'right') style.right = right;
  if (shadowRight) style.boxShadow = 'inset -1px 0 0 var(--rule)';
  if (shadowLeft) style.boxShadow = 'inset 1px 0 0 var(--rule)';

  return (
    <th
      title={title}
      style={style}
      onClick={onClick}
      className={clsx(
        'h-9 border-b border-rule-strong border-r border-rule bg-paper-2 px-2',
        'font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-500',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        !mono && 'font-sans',
        onClick && 'cursor-pointer transition-colors hover:bg-[#F1ECDD] hover:text-ink-900',
      )}
    >
      {children}
    </th>
  );
}

// ─── Body cell ─────────────────────────────────────────────────────────────

interface BodyCellProps {
  children?: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  mono?: boolean;
  sticky?: 'left' | 'right';
  left?: number;
  right?: number;
  shadowRight?: boolean;
  shadowLeft?: boolean;
  className?: string;
}

function BodyCell({
  children,
  align = 'left',
  mono,
  sticky,
  left,
  right,
  shadowRight,
  shadowLeft,
  className,
}: BodyCellProps) {
  const style: React.CSSProperties = {};
  if (sticky === 'left') {
    style.left = left;
    style.position = 'sticky';
    style.zIndex = 1;
  }
  if (sticky === 'right') {
    style.right = right;
    style.position = 'sticky';
    style.zIndex = 1;
  }
  if (shadowRight) style.boxShadow = 'inset -1px 0 0 var(--rule)';
  if (shadowLeft) style.boxShadow = 'inset 1px 0 0 var(--rule)';

  // Status cells own their bg (bg-hadir-bg / bg-alpa-bg / …) and must keep
  // it on hover. Only cells without their own bg pick up the row-hover tint.
  const hasOwnBg = className?.includes('bg-') ?? false;

  return (
    <td
      style={style}
      className={clsx(
        'h-[34px] border-b border-rule border-r border-rule px-2',
        mono && 'font-mono text-[12px]',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        // Sticky cells need their own bg so body content scrolling underneath
        // doesn't bleed through.
        sticky && !hasOwnBg && 'bg-surface',
        !hasOwnBg && 'group-hover:bg-surface-2',
        className,
      )}
    >
      {children}
    </td>
  );
}

/** "JUM 1/5" — short Indonesian day-of-week + day/month, matching prototype. */
function fmtSessionDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, , monthStr, dayStr] = m;
  const d = new Date(iso);
  const dayName = Number.isNaN(d.getTime())
    ? ''
    : (HARI_ID[d.getDay()] ?? '');
  // Take first 3 letters uppercase, e.g. "Jumat" → "JUM".
  const dayShort = dayName.slice(0, 3).toUpperCase();
  return `${dayShort} ${Number(dayStr)}/${Number(monthStr)}`;
}
