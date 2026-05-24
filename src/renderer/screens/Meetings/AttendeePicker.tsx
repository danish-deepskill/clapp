import * as RadixPopover from '@radix-ui/react-popover';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { clsx } from 'clsx';

import type { EligibleAttendee } from '@shared/meeting';

export interface AttendeePickerProps {
  /** Full list of Pengurus (active members with a role). */
  eligible: EligibleAttendee[];
  /** Currently selected attendees (memberId set). */
  selectedIds: number[];
  onChange: (nextIds: number[]) => void;
  disabled?: boolean;
  /** True hides the picker trigger and disables chip removal — pure display. */
  readOnly?: boolean;
}

export function AttendeePicker({
  eligible,
  selectedIds,
  onChange,
  disabled,
  readOnly,
}: AttendeePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Render selected chips in the same order as `eligible` — i.e. role order
  // (Imam first, then Wakil Imam, etc), so the chips visually mirror the
  // picker list and the operator's mental model from Pengaturan.
  const selectedAttendees = useMemo(
    () => eligible.filter((a) => selectedSet.has(a.memberId)),
    [eligible, selectedSet],
  );

  // Popover hides retired-role members; chips above use the full list.
  const pickable = useMemo(
    () => eligible.filter((a) => a.roleIsActive),
    [eligible],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pickable;
    return pickable.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        a.roleName.toLowerCase().includes(q),
    );
  }, [pickable, query]);

  const toggle = (id: number) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const remove = (id: number) => {
    onChange(selectedIds.filter((x) => x !== id));
  };

  if (readOnly) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {selectedAttendees.length === 0 ? (
          <span className="text-[12.5px] italic text-ink-500">
            Tidak ada pengurus tercatat.
          </span>
        ) : (
          selectedAttendees.map((a) => (
            <Chip
              key={a.memberId}
              fullName={a.fullName}
              roleName={a.roleName}
            />
          ))
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selectedAttendees.map((a) => (
        <Chip
          key={a.memberId}
          fullName={a.fullName}
          roleName={a.roleName}
          onRemove={disabled ? undefined : () => remove(a.memberId)}
        />
      ))}

      <RadixPopover.Root open={open} onOpenChange={setOpen}>
        <RadixPopover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={clsx(
              'inline-flex h-[26px] items-center gap-1.5 rounded-sm border border-dashed border-rule-strong bg-transparent px-2.5',
              'font-sans text-[12px] font-medium text-ink-700 transition-colors',
              'hover:enabled:border-ink-900 hover:enabled:bg-surface-2 hover:enabled:text-ink-900',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <Plus size={12} strokeWidth={1.8} />
            Pilih Jama'ah
          </button>
        </RadixPopover.Trigger>
        <RadixPopover.Portal>
          <RadixPopover.Content
            align="start"
            sideOffset={6}
            className="z-50 w-[320px] rounded border border-rule-strong bg-surface shadow-[0_14px_32px_-8px_rgba(0,0,0,0.18),0_2px_6px_rgba(0,0,0,0.06)]"
          >
            <div className="border-b border-rule p-2">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama atau dapukan…"
                aria-label="Cari pengurus"
                className="h-8 w-full appearance-none border-0 bg-transparent px-2 font-sans text-sm text-ink-900 outline-none placeholder:text-ink-400 focus-visible:!ring-0 focus-visible:!ring-offset-0"
              />
            </div>
            <div className="max-h-[280px] overflow-y-auto py-1">
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-center text-[12.5px] text-ink-500">
                  {pickable.length === 0
                    ? eligible.length === 0
                      ? 'Belum ada pengurus terdaftar. Tetapkan dapukan dulu di Jama’ah.'
                      : 'Semua dapukan sedang non-aktif. Aktifkan di Pengaturan.'
                    : 'Tidak ada hasil.'}
                </div>
              )}
              {filtered.map((a) => {
                const checked = selectedSet.has(a.memberId);
                return (
                  <button
                    type="button"
                    key={a.memberId}
                    onClick={() => toggle(a.memberId)}
                    className={clsx(
                      'flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
                      'hover:bg-surface-2',
                      checked && 'bg-surface-2',
                    )}
                  >
                    <span
                      className={clsx(
                        'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border',
                        checked
                          ? 'border-ink-900 bg-ink-900 text-surface'
                          : 'border-rule-strong bg-transparent',
                      )}
                    >
                      {checked && (
                        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none">
                          <path
                            d="M2 5l2 2 4-4"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] font-medium text-ink-900">
                        {a.fullName}
                      </span>
                      <span className="truncate font-mono text-[10.5px] uppercase tracking-wider text-ink-500">
                        {a.roleName}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-rule px-3 py-1.5 font-mono text-[10.5px] text-ink-500">
              <span>{selectedIds.length} terpilih</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-sans text-[12px] font-medium text-ink-700 hover:text-ink-900"
              >
                Tutup
              </button>
            </div>
          </RadixPopover.Content>
        </RadixPopover.Portal>
      </RadixPopover.Root>
    </div>
  );
}

function Chip({
  fullName,
  roleName,
  onRemove,
}: {
  fullName: string;
  roleName: string;
  onRemove?: () => void;
}) {
  const Tag = onRemove ? 'button' : 'span';
  return (
    <Tag
      type={onRemove ? 'button' : undefined}
      onClick={onRemove}
      aria-label={onRemove ? `Hapus ${fullName} dari daftar hadir` : undefined}
      title={onRemove ? `Klik untuk hapus ${fullName}` : fullName}
      className={clsx(
        'inline-flex h-[26px] items-center gap-1.5 rounded-sm border border-rule bg-surface-2 px-2.5',
        'text-[12px] text-ink-900 transition-colors',
        onRemove &&
          'cursor-pointer hover:border-alpa hover:bg-alpa-bg hover:text-alpa-ink hover:line-through',
      )}
    >
      <span className="truncate font-medium">{fullName}</span>
      <span className="rounded-sm border border-izin bg-izin-bg px-1 font-mono text-[9.5px] uppercase tracking-wider text-izin-ink">
        {roleName}
      </span>
    </Tag>
  );
}
