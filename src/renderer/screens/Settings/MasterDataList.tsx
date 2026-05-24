import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { clsx } from 'clsx';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';

import type { IpcResult } from '@shared/ipc';
import type { MasterDataItem, MasterDataKind } from '@shared/masterData';
import { Banner } from '@renderer/components/Banner';
import { Button } from '@renderer/components/Button';
import { ConfirmDialog } from '@renderer/components/ConfirmDialog';
import { DropLine } from '@renderer/components/DropLine';
import { IconButton } from '@renderer/components/IconButton';
import { Input } from '@renderer/components/Input';
import { SectionCard } from '@renderer/components/SectionCard';
import { Toggle } from '@renderer/components/Toggle';
import { useToast } from '@renderer/components/Toast';
import {
  useReorderable,
  type DropPosition,
  type ReorderableHandle,
} from '@renderer/lib/useReorderable';

export interface MasterDataListProps {
  kind: MasterDataKind;
  /** Mono eyebrow label, e.g. "Jenis Kegiatan". */
  label: string;
  /** Italic sans note next to label, e.g. "(opsi dropdown di layar Absensi)". */
  titleNote: string;
  /** Placeholder text for the "+ Tambah" input. */
  addPlaceholder: string;
  /**
   * Enable drag-to-reorder. List displays in current order (no alpha sort
   * after the initial fetch). Required to pass `onReorder` if set.
   */
  reorderable?: boolean;
  /** Called with the next id ordering; runs the IPC reorder + persists. */
  onReorder?: (orderedIds: number[]) => Promise<IpcResult<null>>;
}

interface BlockedRemoval {
  name: string;
  count: number;
  references: string;
}

export function MasterDataList({
  kind,
  label,
  titleNote,
  addPlaceholder,
  reorderable,
  onReorder,
}: MasterDataListProps) {
  const api = window.clapp.masterData[kind];
  const { showToast } = useToast();

  const [items, setItems] = useState<MasterDataItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingError, setEditingError] = useState<string | null>(null);
  const [adding, setAdding] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<MasterDataItem | null>(
    null,
  );
  const [removeBusy, setRemoveBusy] = useState(false);
  const [blocked, setBlocked] = useState<BlockedRemoval | null>(null);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load list on mount.
  useEffect(() => {
    api
      .list()
      .then((rows) => {
        if (isMounted.current) setItems(rows);
      })
      .catch((err: unknown) => {
        if (isMounted.current) {
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      });
  }, [api]);

  const totalActive = items?.filter((i) => i.isActive).length ?? 0;
  const totalAll = items?.length ?? 0;

  const beginEdit = useCallback((item: MasterDataItem) => {
    setEditingId(item.id);
    setEditingText(item.name);
    setEditingError(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingText('');
    setEditingError(null);
  }, []);

  const commitEdit = useCallback(async () => {
    if (editingId == null) return;
    const name = editingText.trim();
    if (!name) {
      cancelEdit();
      return;
    }
    const original = items?.find((i) => i.id === editingId);
    if (original && original.name === name) {
      cancelEdit();
      return;
    }
    const result = await api.rename(editingId, name);
    if (!result.ok) {
      setEditingError(result.message);
      return;
    }
    setItems((prev) => {
      if (!prev) return prev;
      const next = prev.map((i) => (i.id === result.data.id ? result.data : i));
      // Reorderable lists preserve their operator-set position on rename.
      return reorderable ? next : next.sort((a, b) => a.name.localeCompare(b.name));
    });
    cancelEdit();
    showToast({ variant: 'success', message: `"${name}" disimpan` });
  }, [api, editingId, editingText, items, cancelEdit, reorderable, showToast]);

  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const toggleActive = useCallback(
    async (item: MasterDataItem) => {
      const next = !item.isActive;
      const result = await api.setActive(item.id, next);
      if (!result.ok) {
        showToast({ variant: 'error', message: result.message });
        return;
      }
      setItems((prev) =>
        prev ? prev.map((i) => (i.id === result.data.id ? result.data : i)) : prev,
      );
      showToast({
        variant: 'success',
        message: next
          ? `"${item.name}" diaktifkan kembali`
          : `"${item.name}" dinonaktifkan`,
      });
    },
    [api, showToast],
  );

  const onAdd = useCallback(async () => {
    const name = adding.trim();
    if (!name) return;
    const result = await api.create(name);
    if (!result.ok) {
      setAddError(result.message);
      return;
    }
    setItems((prev) => {
      if (!prev) return [result.data];
      const next = [...prev, result.data];
      // Reorderable lists append (service assigns position=max+1 — new row
      // lands at the visual end). Non-reorderable lists stay alpha-sorted.
      return reorderable ? next : next.sort((a, b) => a.name.localeCompare(b.name));
    });
    setAdding('');
    setAddError(null);
    showToast({ variant: 'success', message: `"${name}" ditambahkan` });
  }, [adding, api, reorderable, showToast]);

  const onAddKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void onAdd();
    }
  };

  const requestDelete = (item: MasterDataItem) => {
    setBlocked(null);
    setConfirmTarget(item);
  };

  const confirmDelete = useCallback(async () => {
    if (!confirmTarget) return;
    setRemoveBusy(true);
    const result = await api.remove(confirmTarget.id);
    setRemoveBusy(false);
    if (!result.ok) {
      // EMPTY / NOT_FOUND / DUPLICATE shouldn't happen for remove, but surface
      // anything unexpected.
      showToast({ variant: 'error', message: result.message });
      setConfirmTarget(null);
      return;
    }
    if (result.data.removed) {
      setItems((prev) =>
        prev ? prev.filter((i) => i.id !== confirmTarget.id) : prev,
      );
      showToast({ variant: 'success', message: `"${confirmTarget.name}" dihapus` });
    } else {
      setBlocked({
        name: confirmTarget.name,
        count: result.data.count,
        references: result.data.references,
      });
    }
    setConfirmTarget(null);
  }, [api, confirmTarget, showToast]);

  // ─── Drag-to-reorder (only when reorderable=true) ───────────────────
  // Optimistic local reorder for instant feedback; revert on IPC failure.
  const handleReorder = useCallback(
    async (orderedIds: number[]) => {
      if (!items || !onReorder) return;
      const before = items;
      const idToItem = new Map(items.map((i) => [i.id, i]));
      setItems(orderedIds.map((id) => idToItem.get(id)!).filter(Boolean));

      const result = await onReorder(orderedIds);
      if (!result.ok) {
        setItems(before);
        showToast({
          variant: 'error',
          message: (
            <>
              Gagal mengubah urutan: <b>{result.message}</b>
            </>
          ),
        });
      }
    },
    [items, onReorder, showToast],
  );

  const reorder = useReorderable({ items, onReorder: handleReorder });

  return (
    <>
      <SectionCard
        label={label}
        title={
          <span className="font-normal italic text-ink-500">{titleNote}</span>
        }
        meta={
          items === null ? null : (
            <>
              <b>{totalActive}</b> aktif · <b>{totalAll}</b> total
            </>
          )
        }
      >
        {loadError && (
          <div className="p-4">
            <Banner variant="danger">
              Gagal memuat daftar: <b>{loadError}</b>
            </Banner>
          </div>
        )}

        {items === null && !loadError && (
          <div className="px-4 py-6 font-mono text-[11px] uppercase tracking-wider text-ink-500">
            Memuat…
          </div>
        )}

        {items && items.length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] text-ink-500">
            Belum ada {label.toLowerCase()}. Tambahkan di bawah.
          </div>
        )}

        {items?.map((item) => (
          <Row
            key={item.id}
            item={item}
            isEditing={editingId === item.id}
            editingText={editingText}
            editingError={editingError}
            onEditingTextChange={(text) => {
              setEditingText(text);
              setEditingError(null);
            }}
            onEditKeyDown={onEditKeyDown}
            onCommitEdit={commitEdit}
            onBeginEdit={() => beginEdit(item)}
            onToggleActive={() => toggleActive(item)}
            onRequestDelete={() => requestDelete(item)}
            reorderable={reorderable}
            isDragging={reorder.isDragging(item.id)}
            dropIndicator={reorder.dropIndicator(item.id)}
            dragHandle={
              reorderable
                ? reorder.rowHandle(item.id, { draggable: editingId !== item.id })
                : null
            }
          />
        ))}

        <div className="flex items-center gap-2.5 border-t border-rule bg-surface-2 px-4 py-2.5">
          <Input
            value={adding}
            onChange={(e) => {
              setAdding(e.target.value);
              setAddError(null);
            }}
            onKeyDown={onAddKeyDown}
            placeholder={addPlaceholder}
            invalid={Boolean(addError)}
            className="h-[34px] text-[13.5px]"
            aria-label={`Tambah ${label}`}
          />
          <Button
            size="sm"
            icon={<Plus size={12} strokeWidth={1.8} />}
            onClick={() => void onAdd()}
            disabled={!adding.trim()}
          >
            Tambah
          </Button>
        </div>

        {addError && (
          <div className="border-t border-rule bg-surface px-4 py-2.5 text-[12px] font-medium text-alpa-ink">
            {addError}
          </div>
        )}

        {blocked && (
          <div className="border-t border-rule bg-surface px-4 py-3">
            <Banner variant="warn">
              <b>"{blocked.name}"</b> tidak bisa dihapus — masih dipakai oleh{' '}
              <b>
                {blocked.count} {blocked.references}
              </b>
              . Nonaktifkan saja agar data lama tetap aman.
            </Banner>
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        eyebrow="Konfirmasi · Tindakan Destruktif"
        title={`Hapus "${confirmTarget?.name ?? ''}" permanen?`}
        description={
          <>
            Tindakan ini <b>tidak dapat dibatalkan</b>. Untuk menyembunyikan
            sementara tanpa menghapus, gunakan toggle <b>Aktif</b>/<b>Non-aktif</b>{' '}
            di baris.
          </>
        }
        warning={
          <>
            Jika ada data lain yang masih merujuk ke {label.toLowerCase()} ini,
            penghapusan akan ditolak — gunakan nonaktifkan sebagai gantinya.
          </>
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        confirmVariant="danger"
        onConfirm={() => void confirmDelete()}
        busy={removeBusy}
      />
    </>
  );
}

interface RowProps {
  item: MasterDataItem;
  isEditing: boolean;
  editingText: string;
  editingError: string | null;
  onEditingTextChange: (text: string) => void;
  onEditKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onCommitEdit: () => Promise<void>;
  onBeginEdit: () => void;
  onToggleActive: () => void;
  onRequestDelete: () => void;
  reorderable?: boolean;
  isDragging?: boolean;
  dropIndicator?: DropPosition | null;
  /** Spread onto the row's root; null when not reorderable. */
  dragHandle?: ReorderableHandle | null;
}

function Row({
  item,
  isEditing,
  editingText,
  editingError,
  onEditingTextChange,
  onEditKeyDown,
  onCommitEdit,
  onBeginEdit,
  onToggleActive,
  onRequestDelete,
  reorderable,
  isDragging,
  dropIndicator,
  dragHandle,
}: RowProps) {
  return (
    <div
      {...(dragHandle ?? {})}
      className={clsx(
        'relative grid h-11 items-center border-b border-rule transition-colors hover:bg-surface-2',
        reorderable
          ? 'grid-cols-[28px_1fr_150px_80px]'
          : 'grid-cols-[1fr_150px_80px]',
        !item.isActive && 'opacity-55',
        isDragging && 'opacity-35',
      )}
    >
      <DropLine position={dropIndicator ?? null} />

      {reorderable && (
        <span
          className="flex h-full cursor-grab items-center justify-center border-r border-rule text-ink-500 transition-colors hover:text-ink-900 active:cursor-grabbing"
          title="Geser untuk mengubah urutan"
        >
          <GripVertical size={14} strokeWidth={1.6} />
        </span>
      )}

      <div className="flex h-full items-center border-r border-rule px-4">
        {isEditing ? (
          <div className="flex w-full flex-col gap-1">
            <input
              autoFocus
              value={editingText}
              onChange={(e) => onEditingTextChange(e.target.value)}
              onBlur={() => void onCommitEdit()}
              onKeyDown={onEditKeyDown}
              aria-invalid={Boolean(editingError)}
              className={clsx(
                'h-8 w-full appearance-none rounded border bg-white px-2.5 font-sans text-sm font-medium text-ink-900 outline-none shadow-[0_0_0_3px_rgba(27,24,20,0.08)]',
                editingError ? 'border-alpa' : 'border-ink-900',
              )}
            />
            {editingError && (
              <span className="text-[11.5px] font-medium text-alpa-ink">
                {editingError}
              </span>
            )}
          </div>
        ) : (
          <span
            className={clsx(
              'text-sm font-medium tracking-tight text-ink-900',
              !item.isActive && 'text-ink-500 line-through decoration-ink-300',
            )}
          >
            {item.name}
          </span>
        )}
      </div>

      <div className="flex h-full items-center gap-2.5 border-r border-rule px-4">
        <Toggle
          pressed={item.isActive}
          onPressedChange={onToggleActive}
          aria-label={
            item.isActive
              ? `Nonaktifkan ${item.name}`
              : `Aktifkan kembali ${item.name}`
          }
          title={
            item.isActive ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'
          }
        />
        <span
          className={clsx(
            'font-sans text-[12.5px] font-semibold tracking-[0.01em]',
            item.isActive ? 'text-hadir-ink' : 'text-ink-500',
          )}
        >
          {item.isActive ? 'Aktif' : 'Non-aktif'}
        </span>
      </div>

      <div className="flex h-full items-center justify-end gap-1 pr-2">
        {!isEditing && (
          <IconButton aria-label={`Edit ${item.name}`} onClick={onBeginEdit}>
            <Pencil size={13} strokeWidth={1.4} />
          </IconButton>
        )}
        <IconButton
          variant="danger"
          aria-label={`Hapus ${item.name} permanen`}
          onClick={onRequestDelete}
        >
          <Trash2 size={13} strokeWidth={1.4} />
        </IconButton>
      </div>
    </div>
  );
}
