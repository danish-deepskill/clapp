import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { clsx } from 'clsx';

import { IconButton } from '@renderer/components/IconButton';

export interface ReportSectionProps {
  title: string;
  /** Read-only (computed) sections get a hatched header + "Otomatis" badge. */
  readOnly?: boolean;
  /** Short note shown under the title. */
  hint?: ReactNode;
  children: ReactNode;
}

export function ReportSection({
  title,
  readOnly,
  hint,
  children,
}: ReportSectionProps) {
  return (
    <section className="overflow-hidden rounded border border-rule-strong bg-surface">
      <div
        className={clsx(
          'flex items-center justify-between gap-3 border-b border-rule px-4 py-3',
          readOnly ? 'bg-paper-2' : 'bg-surface-2',
        )}
      >
        <div className="flex min-w-0 flex-col">
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-700">
            {title}
          </h2>
          {hint && (
            <span className="mt-0.5 text-[11.5px] italic text-ink-500">
              {hint}
            </span>
          )}
        </div>
        {readOnly && (
          <span className="shrink-0 rounded-sm bg-ink-700 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-surface">
            Otomatis
          </span>
        )}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

// ─── Mini-table: add/remove editable rows ──────────────────────────────────

export interface MiniTableProps {
  /** Column header labels (last empty col for the remove button). */
  headers: string[];
  /** Grid template for header + rows (excluding the trailing 36px remove col). */
  gridCols: string;
  rows: ReactNode[];
  onAdd: () => void;
  addLabel: string;
  disabled?: boolean;
  emptyLabel: string;
}

export function MiniTable({
  headers,
  gridCols,
  rows,
  onAdd,
  addLabel,
  disabled,
  emptyLabel,
}: MiniTableProps) {
  const template = `${gridCols} 36px`;
  return (
    <div className="flex flex-col gap-2">
      {rows.length > 0 && (
        <div
          className="grid items-center gap-2 px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500"
          style={{ gridTemplateColumns: template }}
        >
          {headers.map((h, i) => (
            <span key={i}>{h}</span>
          ))}
          <span />
        </div>
      )}
      {rows.length === 0 ? (
        <p className="py-2 text-[12.5px] italic text-ink-500">{emptyLabel}</p>
      ) : (
        rows
      )}
      {!disabled && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-1 inline-flex h-8 w-fit items-center gap-1.5 rounded border border-dashed border-rule-strong px-3 font-sans text-[12.5px] font-medium text-ink-700 transition-colors hover:border-ink-900 hover:bg-surface-2 hover:text-ink-900"
        >
          <Plus size={13} strokeWidth={1.8} />
          {addLabel}
        </button>
      )}
    </div>
  );
}

/** One editable row inside a MiniTable. */
export function MiniRow({
  gridCols,
  onRemove,
  disabled,
  children,
}: {
  gridCols: string;
  onRemove: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="grid items-center gap-2"
      style={{ gridTemplateColumns: `${gridCols} 36px` }}
    >
      {children}
      {disabled ? (
        <span />
      ) : (
        <IconButton variant="danger" aria-label="Hapus baris" onClick={onRemove}>
          <Trash2 size={13} strokeWidth={1.5} />
        </IconButton>
      )}
    </div>
  );
}
