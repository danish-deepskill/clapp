import { clsx } from 'clsx';

export interface TitleBarProps {
  /** Current screen name, rendered between "CLApp" and "Desktop · Offline". */
  subtitle?: string;
  className?: string;
}

// Replaces the prototype's frame-chrome (HANDOFF §9). Drag region between native OS window controls.
export function TitleBar({ subtitle, className }: TitleBarProps) {
  return (
    <div
      className={clsx(
        'app-drag flex h-8 shrink-0 select-none items-center justify-center border-b border-rule-strong bg-chrome px-2 font-mono text-[11px] tracking-[0.04em] text-ink-700',
        className,
      )}
    >
      <span>
        <b className="font-semibold text-ink-900">CLApp</b>
        {subtitle && (
          <>
            <Separator />
            <span>{subtitle}</span>
          </>
        )}
        <Separator />
        <span>Desktop</span>
        <Separator />
        <span>Offline</span>
      </span>
    </div>
  );
}

function Separator() {
  return <span className="mx-1.5 text-ink-500">·</span>;
}
