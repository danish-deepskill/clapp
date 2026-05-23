import * as Dialog from '@radix-ui/react-dialog';
import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { AlertTriangle } from 'lucide-react';

import { Button, type ButtonVariant } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Eyebrow shown above the title (e.g. "Konfirmasi · Tindakan Destruktif"). */
  eyebrow?: string;
  title: string;
  /** Body content — usually a `<>` fragment. */
  description: ReactNode;
  /** Optional inline warning block (red-tinted) inside the body. */
  warning?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  /** Called when the operator confirms. Should be sync — dialog closes on return. */
  onConfirm: () => void;
  /** When true, blocks the confirm button (e.g. while a request is in flight). */
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  warning,
  confirmLabel,
  cancelLabel = 'Batal',
  confirmVariant = 'danger',
  onConfirm,
  busy = false,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink-900/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className={clsx(
            'fixed left-1/2 top-1/2 z-50 max-w-[480px] -translate-x-1/2 -translate-y-1/2',
            'overflow-hidden rounded border border-rule-strong bg-paper',
            'shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.1)]',
            'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95',
          )}
          aria-describedby={undefined}
        >
          <div className="border-b border-rule bg-surface px-[22px] pb-3.5 pt-[18px]">
            {eyebrow && (
              <div className="mb-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-alpa-ink">
                {eyebrow}
              </div>
            )}
            <Dialog.Title className="text-[18px] font-semibold tracking-tight text-ink-900">
              {title}
            </Dialog.Title>
          </div>
          <div className="bg-paper px-[22px] py-[18px] text-[13.5px] leading-[1.55] text-ink-700 [&_b]:font-semibold [&_b]:text-ink-900">
            {description}
            {warning && (
              <div className="mt-2.5 flex items-start gap-2.5 rounded border border-[#E9CFCB] bg-[#FCF6F4] px-3.5 py-3 text-[12.5px] leading-[1.45] text-alpa-ink [&_b]:text-alpa-ink">
                <AlertTriangle
                  size={14}
                  strokeWidth={1.5}
                  className="mt-px shrink-0 text-alpa"
                />
                <div className="min-w-0 flex-1">{warning}</div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2.5 border-t border-rule bg-surface px-[22px] py-3.5">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={busy}>
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button
              variant={confirmVariant}
              onClick={onConfirm}
              disabled={busy}
              autoFocus
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
