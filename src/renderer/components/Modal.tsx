import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow?: string;
  title: ReactNode;
  /** Right-side actions in the footer (e.g. Batal + Simpan). */
  footer: ReactNode;
  /** Optional hint above the footer (e.g. "Akan dibuat KK-S baru…"). */
  footerHint?: ReactNode;
  children: ReactNode;
  /** Modal width in pixels — defaults to 560. */
  width?: number;
}

// Bigger sibling of ConfirmDialog — scrollable body, footer with hint slot.
export function Modal({
  open,
  onOpenChange,
  eyebrow,
  title,
  footer,
  footerHint,
  children,
  width = 560,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed left-0 right-0 bottom-0 top-8 z-40 bg-ink-900/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          style={{ width }}
          className={clsx(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-6rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded border border-rule-strong bg-paper',
            'shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.1)]',
            'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95',
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
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          <footer className="flex items-center gap-3 border-t border-rule bg-surface px-5 py-3">
            <div className="min-w-0 flex-1 truncate text-[12.5px] italic text-ink-500">
              {footerHint}
            </div>
            <div className="flex shrink-0 items-center gap-2.5">{footer}</div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
