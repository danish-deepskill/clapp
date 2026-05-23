import * as RadixToast from '@radix-ui/react-toast';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { clsx } from 'clsx';
import {
  AlertTriangle,
  ArrowUpFromLine,
  Check,
  Info,
  X,
} from 'lucide-react';

export type ToastVariant = 'success' | 'info' | 'warn' | 'error';

export interface ShowToastOptions {
  variant?: ToastVariant;
  message: ReactNode;
  /** Optional action button (e.g. "Urungkan", "Coba Lagi"). */
  action?: { label: string; onClick: () => void };
  /**
   * Override the variant's default duration. Pass `null` to make the toast
   * sticky (must be dismissed manually). Defaults per HANDOFF §12.9:
   * success 2500ms, info 4000ms, warn 5000ms, error sticky.
   */
  duration?: number | null;
}

interface ToastItem extends ShowToastOptions {
  id: number;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (opts: ShowToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION: Record<ToastVariant, number | null> = {
  success: 2500,
  info: 4000,
  warn: 5000,
  error: null, // sticky
};

const STICKY_SENTINEL = 1_000_000_000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((opts: ShowToastOptions) => {
    counter.current += 1;
    const item: ToastItem = {
      id: counter.current,
      variant: opts.variant ?? 'success',
      ...opts,
    };
    setToasts((prev) => [...prev, item]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <ToastItemView key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
        <RadixToast.Viewport
          className={clsx(
            'fixed bottom-6 left-1/2 z-[100] flex max-w-[520px] -translate-x-1/2',
            'm-0 list-none flex-col gap-2 p-0 outline-none',
          )}
        />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'border-l-[#9FCBAE] bg-ink-900 text-surface',
  info: 'border-l-[#9FBADC] bg-ink-900 text-surface',
  warn: 'border-l-[#E0BC74] bg-ink-900 text-surface',
  error: 'border-l-[#E89A9A] bg-[#2A1614] text-surface',
};

const VARIANT_ICON_COLOR: Record<ToastVariant, string> = {
  success: 'text-[#9FCBAE]',
  info: 'text-[#9FBADC]',
  warn: 'text-[#E0BC74]',
  error: 'text-[#E89A9A]',
};

function VariantIcon({ variant }: { variant: ToastVariant }) {
  switch (variant) {
    case 'success':
      return <Check size={14} strokeWidth={1.8} />;
    case 'info':
      return <ArrowUpFromLine size={14} strokeWidth={1.7} />;
    case 'warn':
      return <AlertTriangle size={14} strokeWidth={1.6} />;
    case 'error':
      return <X size={14} strokeWidth={1.8} />;
  }
}

function ToastItemView({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: () => void;
}) {
  const explicitDuration = item.duration;
  const resolvedDuration =
    explicitDuration === undefined ? DEFAULT_DURATION[item.variant] : explicitDuration;
  const isSticky = resolvedDuration === null;

  return (
    <RadixToast.Root
      duration={isSticky ? STICKY_SENTINEL : (resolvedDuration ?? STICKY_SENTINEL)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      role={item.variant === 'error' ? 'alert' : 'status'}
      className={clsx(
        'flex items-center gap-2.5 rounded border-l-[3px] px-3.5 py-2.5 text-[13px] font-medium shadow-[0_12px_32px_rgba(0,0,0,0.18)]',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:slide-in-from-bottom-2',
        VARIANT_CLASSES[item.variant],
      )}
    >
      <span className={clsx('flex shrink-0 items-center justify-center', VARIANT_ICON_COLOR[item.variant])}>
        <VariantIcon variant={item.variant} />
      </span>
      <RadixToast.Description className="min-w-0 flex-1 leading-[1.4] [&_b]:font-semibold [&_b]:text-white">
        {item.message}
      </RadixToast.Description>
      {item.action && (
        <RadixToast.Action
          asChild
          altText={item.action.label}
          onClick={item.action.onClick}
        >
          <button
            type="button"
            className="h-6 shrink-0 rounded-sm border border-white/25 bg-transparent px-2.5 font-sans text-xs font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10"
          >
            {item.action.label}
          </button>
        </RadixToast.Action>
      )}
      <RadixToast.Close asChild aria-label="Tutup">
        <button
          type="button"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-transparent text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={11} strokeWidth={1.6} />
        </button>
      </RadixToast.Close>
    </RadixToast.Root>
  );
}
