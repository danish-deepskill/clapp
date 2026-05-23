import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { clsx } from 'clsx';

import clappIcon from '@renderer/assets/clapp-icon.jpg';

export type Screen =
  | 'Beranda'
  | "Jama'ah"
  | 'Rekap Absensi'
  | 'Laporan Bulanan'
  | 'Catatan Peristiwa'
  | 'Musyawarah'
  | 'Serkiler'
  | 'Pengaturan';

interface NavBarProps {
  active: Screen;
  onNavigate: (screen: Screen) => void;
  perluTindakanCount?: number;
}

interface TabDef {
  name: Screen | 'Qurban';
  disabled?: boolean;
}

const TABS: TabDef[] = [
  { name: 'Rekap Absensi' },
  { name: "Jama'ah" },
  { name: 'Laporan Bulanan' },
  { name: 'Catatan Peristiwa' },
  { name: 'Musyawarah' },
  { name: 'Serkiler' },
  { name: 'Pengaturan' },
  { name: 'Qurban', disabled: true },
];

export function NavBar({ active, onNavigate, perluTindakanCount = 0 }: NavBarProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(TABS.length);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onDown(e: globalThis.MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const measure = measureRef.current;
    if (!nav || !measure) return;
    const compute = () => {
      const avail = nav.clientWidth;
      const widths = Array.from(
        measure.querySelectorAll<HTMLElement>('[data-mtab]'),
      ).map((el) => el.getBoundingClientRect().width);
      const lainnya = measure.querySelector<HTMLElement>('[data-mlainnya]');
      const lainnyaWidth = lainnya?.getBoundingClientRect().width ?? 110;
      const total = widths.reduce((a, b) => a + b, 0);
      if (total <= avail + 0.5) {
        setVisibleCount(TABS.length);
        return;
      }
      let used = lainnyaWidth;
      let count = 0;
      for (const w of widths) {
        if (used + w > avail) break;
        used += w;
        count++;
      }
      setVisibleCount(Math.max(1, count));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  const visible = TABS.slice(0, visibleCount);
  const overflow = TABS.slice(visibleCount);
  const showLainnya = overflow.length > 0;
  const activeIsHidden =
    showLainnya && overflow.some((t) => t.name === active);
  const isHome = active === 'Beranda';

  const onBrandClick = () => {
    if (!isHome) onNavigate('Beranda');
  };

  return (
    <div className="relative flex items-stretch border-b border-rule-strong bg-surface">
      <button
        type="button"
        onClick={onBrandClick}
        title={isHome ? 'Beranda (di sini)' : 'Kembali ke Beranda'}
        className={clsx(
          'group flex min-w-[160px] items-center gap-2.5 border-r border-rule px-5 py-2.5 text-left',
          'transition-colors hover:bg-surface-2',
          isHome ? 'cursor-default' : 'cursor-pointer',
        )}
      >
        <BrandMark badge={perluTindakanCount} />
        <span className="flex items-center gap-1.5 text-[18px] font-semibold tracking-tight">
          CLApp
          <span
            className={clsx(
              'text-[13px] transition-all',
              isHome ? 'text-ink-900 rotate-90' : 'text-ink-400',
            )}
          >
            ›
          </span>
        </span>
      </button>

      <div ref={navRef} className="relative flex min-w-0 flex-1 items-stretch">
        <div
          ref={measureRef}
          aria-hidden="true"
          className="pointer-events-none invisible fixed left-0 top-0 flex h-full whitespace-nowrap"
        >
          {TABS.map((t) => (
            <MeasureTab key={t.name} name={t.name} disabled={t.disabled} />
          ))}
          <div data-mlainnya className="flex shrink-0 items-center px-4">
            Lainnya
          </div>
        </div>

        {visible.map((t) => (
          <Tab
            key={t.name}
            name={t.name}
            disabled={t.disabled}
            isActive={t.name === active}
            onClick={(e) => handleTabClick(e, t, onNavigate)}
          />
        ))}

        {showLainnya && (
          <div ref={wrapRef} className="relative flex shrink-0 items-stretch">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className={clsx(
                'flex shrink-0 items-center gap-1.5 border-r border-rule px-4',
                'font-mono text-[11px] font-semibold uppercase tracking-wider',
                'transition-colors',
                open
                  ? 'bg-paper text-ink-900'
                  : 'bg-surface-2 text-ink-700 hover:bg-paper-2 hover:text-ink-900',
                activeIsHidden && 'text-ink-900',
                activeIsHidden &&
                  'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-hadir',
              )}
            >
              Lainnya
              <Caret open={open} />
            </button>
            {open && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 min-w-[220px] border border-rule-strong border-t-rule bg-surface py-1.5 shadow-[0_14px_32px_-8px_rgba(0,0,0,0.18),0_2px_6px_rgba(0,0,0,0.06)]"
              >
                <div className="px-4 pb-1.5 pt-2 font-mono text-[9.5px] uppercase tracking-wider text-ink-500">
                  Modul Lain
                </div>
                {overflow.map((t) => (
                  <MenuItem
                    key={t.name}
                    name={t.name}
                    disabled={t.disabled}
                    isActive={t.name === active}
                    onClick={(e) => {
                      handleTabClick(e, t, onNavigate);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function handleTabClick(
  e: MouseEvent,
  tab: TabDef,
  onNavigate: (s: Screen) => void,
) {
  e.preventDefault();
  if (tab.disabled || tab.name === 'Qurban') return;
  onNavigate(tab.name);
}

function MeasureTab({
  name,
  disabled,
}: {
  name: Screen | 'Qurban';
  disabled?: boolean;
}) {
  return (
    <div
      data-mtab
      className="flex shrink-0 items-center justify-center border-r border-rule px-[18px] text-[13.5px] font-medium"
    >
      <TabLabel name={name} disabled={disabled} />
    </div>
  );
}

function Tab({
  name,
  disabled,
  isActive,
  onClick,
}: {
  name: Screen | 'Qurban';
  disabled?: boolean;
  isActive: boolean;
  onClick: (e: MouseEvent) => void;
}) {
  return (
    <a
      href="#"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      aria-disabled={disabled || undefined}
      className={clsx(
        'relative flex min-w-0 flex-auto items-center justify-center whitespace-nowrap border-r border-rule px-[18px] text-[13.5px] font-medium no-underline transition-colors',
        disabled
          ? 'cursor-not-allowed text-ink-400 hover:bg-transparent'
          : 'text-ink-700 hover:bg-surface-2 hover:text-ink-900',
        isActive && 'bg-paper text-ink-900',
        isActive &&
          'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-hadir',
      )}
    >
      <TabLabel name={name} disabled={disabled} />
    </a>
  );
}

function MenuItem({
  name,
  disabled,
  isActive,
  onClick,
}: {
  name: Screen | 'Qurban';
  disabled?: boolean;
  isActive: boolean;
  onClick: (e: MouseEvent) => void;
}) {
  return (
    <a
      href="#"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={clsx(
        'flex items-center gap-2.5 border-l-2 border-transparent px-4 py-2 text-[13.5px] no-underline transition-colors',
        disabled
          ? 'cursor-not-allowed text-ink-400'
          : 'text-ink-700 hover:border-l-hadir hover:bg-surface-2 hover:text-ink-900',
        isActive &&
          'border-l-hadir bg-paper font-semibold text-ink-900',
      )}
    >
      <TabLabel name={name} disabled={disabled} />
    </a>
  );
}

function TabLabel({
  name,
  disabled,
}: {
  name: Screen | 'Qurban';
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="flex items-center gap-1.5">
        <span>{name}</span>
        <span className="inline-flex items-center bg-ink-200 px-[5px] py-px font-mono text-[9px] font-semibold uppercase tracking-wider leading-none text-ink-500">
          Coming Soon
        </span>
      </span>
    );
  }
  return <>{name}</>;
}

function BrandMark({ badge }: { badge: number }) {
  return (
    <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center">
      <img
        src={clappIcon}
        alt="CLApp"
        className="block h-full w-full rounded-sm border border-ink-200 bg-surface object-contain transition-colors group-hover:border-ink-700"
      />
      {badge > 0 && (
        <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full border-[1.5px] border-surface bg-izin px-1 font-mono text-[9.5px] font-bold leading-none text-surface">
          {badge}
        </span>
      )}
    </span>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      className={clsx('transition-transform', open && 'rotate-180')}
    >
      <path
        d="M1 1l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
