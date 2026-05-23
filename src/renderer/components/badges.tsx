import { clsx } from 'clsx';

export function KepalaBadge({ className }: { className?: string }) {
  return (
    <span
      title="Kepala Keluarga"
      className={clsx(
        'inline-flex h-5 w-5 items-center justify-center rounded-sm border border-hadir bg-hadir-bg font-mono text-[11px] font-bold leading-none text-hadir-ink',
        className,
      )}
    >
      K
    </span>
  );
}

export function RoleBadge({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex h-[22px] items-center rounded-sm border border-izin bg-izin-bg px-2 font-sans text-[11px] font-semibold tracking-[0.03em] leading-none text-izin-ink',
        className,
      )}
    >
      {name}
    </span>
  );
}

export function InactiveTag({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex h-[22px] items-center gap-1.5 rounded-sm border border-ink-300 bg-ink-200 px-2 font-sans text-[10.5px] font-semibold uppercase tracking-[0.04em] leading-none text-ink-700',
        className,
      )}
    >
      Mutasi
    </span>
  );
}

export function ActiveBadge({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex h-[22px] items-center gap-1.5 rounded-sm border px-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.02em] leading-none',
        active
          ? 'border-hadir bg-hadir-bg text-hadir-ink'
          : 'border-ink-300 bg-ink-200 text-ink-700',
        className,
      )}
    >
      <span
        className={clsx(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-hadir' : 'bg-ink-500',
        )}
      />
      {active ? 'Aktif' : 'Tidak Aktif'}
    </span>
  );
}
