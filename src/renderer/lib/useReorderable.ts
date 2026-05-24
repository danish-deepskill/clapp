import { useState, type DragEvent } from 'react';

export type DropPosition = 'above' | 'below';

interface DropTarget {
  id: number;
  position: DropPosition;
}

interface ReorderableItem {
  id: number;
}

export interface UseReorderableOptions<T extends ReorderableItem> {
  /** Current list (null while loading is allowed). */
  items: T[] | null;
  /**
   * Called when the operator finishes a valid drop with the new id order.
   * Caller decides whether to optimistic-update + revert on failure or just
   * await + reload — the hook only computes the new ordering.
   */
  onReorder: (orderedIds: number[]) => void | Promise<void>;
}

export interface ReorderableHandle {
  draggable: boolean;
  onDragStart: (e: DragEvent) => void;
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDrop: (e: DragEvent) => void;
  onDragEnd: () => void;
}

export interface UseReorderableReturn {
  /** The id currently being dragged (for `opacity-35` dim, etc). */
  draggingId: number | null;
  /** True when the given id is currently the drag source. */
  isDragging: (id: number) => boolean;
  /**
   * Returns `'above' | 'below' | null` for the given id, suitable to render
   * a `<DropLine position={…} />` indicator on that row.
   */
  dropIndicator: (id: number) => DropPosition | null;
  /** Spread onto the draggable element: `<div {...rowHandle(id)}>`. */
  rowHandle: (id: number, opts?: { draggable?: boolean }) => ReorderableHandle;
}

/**
 * HTML5 drag-to-reorder for a flat list keyed by numeric id. Drop targets
 * are split above/below the row's vertical midpoint. Used by Pengaturan's
 * Dapukan section and Jama'ah's household reorder.
 */
export function useReorderable<T extends ReorderableItem>({
  items,
  onReorder,
}: UseReorderableOptions<T>): UseReorderableReturn {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<DropTarget | null>(null);

  const handleDragStart = (id: number, e: DragEvent) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  };

  const handleDragOver = (overId: number, e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    if (draggingId === null || draggingId === overId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const position: DropPosition =
      e.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
    setDropAt((curr) =>
      curr?.id === overId && curr.position === position
        ? curr
        : { id: overId, position },
    );
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const dragId = draggingId;
    const drop = dropAt;
    setDraggingId(null);
    setDropAt(null);
    if (!items || dragId === null || !drop || drop.id === dragId) return;

    const orderedIds = items.map((i) => i.id).filter((id) => id !== dragId);
    const targetIdx = orderedIds.indexOf(drop.id);
    if (targetIdx < 0) return;
    const insertAt = drop.position === 'above' ? targetIdx : targetIdx + 1;
    orderedIds.splice(insertAt, 0, dragId);
    void onReorder(orderedIds);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropAt(null);
  };

  return {
    draggingId,
    isDragging: (id) => draggingId === id,
    dropIndicator: (id) =>
      dropAt?.id === id ? dropAt.position : null,
    rowHandle: (id, opts) => ({
      draggable: opts?.draggable ?? true,
      onDragStart: (e) => handleDragStart(id, e),
      onDragOver: (e) => handleDragOver(id, e),
      onDrop: handleDrop,
      onDragEnd: handleDragEnd,
    }),
  };
}
