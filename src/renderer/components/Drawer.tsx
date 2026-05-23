import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mono eyebrow above the title. */
  eyebrow?: string;
  title: ReactNode;
  /** Right-aligned actions in the header (e.g. an Edit button). */
  headerActions?: ReactNode;
  children: ReactNode;
  /** Drawer width in pixels — defaults to 420. */
  width?: number;
}

/**
 * Right-side overlay panel. Used by Members DetailPanel (CONTEXT §3 — read-only
 * detail view before edit). Slides in from the right; Esc / click-outside
 * dismiss; preserves focus trap via Radix Dialog.
 */
export function Drawer({
  open,
  onOpenChange,
  eyebrow,
  title,
  headerActions,
  children,
  width = 420,
}: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Overlay + Drawer offset by the 32px TitleBar so the native window
            controls (min/max/close) stay clickable and the chrome isn't dimmed. */}
        <Dialog.Overlay className="fixed left-0 right-0 bottom-0 top-8 z-40 bg-ink-900/30 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          style={{ width }}
          className={clsx(
            'fixed right-0 top-8 z-50 flex h-[calc(100vh-2rem)] flex-col border-l border-rule-strong bg-paper shadow-[-16px_0_32px_-12px_rgba(0,0,0,0.18)]',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right',
          )}
        >
          <header className="flex items-start gap-3 border-b border-rule bg-surface px-5 py-3.5">
            <div className="min-w-0 flex-1">
              {eyebrow && (
                <p className="mb-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-500">
                  {eyebrow}
                </p>
              )}
              <Dialog.Title className="truncate text-[18px] font-semibold tracking-tight text-ink-900">
                {title}
              </Dialog.Title>
            </div>
            {headerActions}
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Tutup"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-ink-500 transition-colors hover:bg-ink-200 hover:text-ink-900"
              >
                <X size={16} strokeWidth={1.6} />
              </button>
            </Dialog.Close>
          </header>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
