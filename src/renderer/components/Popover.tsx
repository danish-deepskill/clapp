import * as RadixPopover from '@radix-ui/react-popover';
import { type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
}

export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  align = 'start',
  sideOffset = 4,
  className,
}: PopoverProps) {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align={align}
          sideOffset={sideOffset}
          className={clsx(
            'z-50 rounded border border-rule-strong bg-surface shadow-[0_14px_32px_-8px_rgba(0,0,0,0.18),0_2px_6px_rgba(0,0,0,0.06)]',
            'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95',
            className,
          )}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
