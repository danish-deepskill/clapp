import { clsx } from 'clsx';

import type { DropPosition } from '@renderer/lib/useReorderable';

/**
 * Renders a 2px hadir-green horizontal line absolutely positioned on the
 * top or bottom edge of its containing block — drop indicator for drag
 * reordering. Containing element must be `position: relative`.
 */
export function DropLine({ position }: { position: DropPosition | null }) {
  if (!position) return null;
  return (
    <div
      className={clsx(
        'pointer-events-none absolute inset-x-0 z-[3] h-0.5 bg-hadir',
        position === 'above' ? 'top-0' : 'bottom-0',
      )}
    />
  );
}
