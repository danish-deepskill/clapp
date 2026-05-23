import { useRef } from 'react';
import { Calendar, Search } from 'lucide-react';

import { Select } from '@renderer/components/Select';
import { fmtDateID, fmtDay } from '@renderer/lib/format';
import type { MasterDataItem } from '@shared/masterData';

export interface DrawerControlsProps {
  sessionTypes: MasterDataItem[];
  sessionTypeId: number | null;
  onSessionTypeChange: (id: number) => void;
  sessionDate: string;
  onSessionDateChange: (iso: string) => void;
  /** Earliest selectable date (first day of Rekap's period). */
  minDate: string;
  /** Furthest date (min(today, last day of period) — no future or out-of-period). */
  maxDate: string;
  search: string;
  onSearchChange: (q: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
}

/**
 * Compact controls strip at the top of the AttendanceDrawer body. The tally
 * lives in the footer (next to Simpan) — kept out of here to avoid duplicate
 * display.
 */
export function DrawerControls({
  sessionTypes,
  sessionTypeId,
  onSessionTypeChange,
  sessionDate,
  onSessionDateChange,
  minDate,
  maxDate,
  search,
  onSearchChange,
  notes,
  onNotesChange,
}: DrawerControlsProps) {
  const activeTypes = sessionTypes.filter((t) => t.isActive);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        // some browsers throw if not user-initiated; fall through
      }
    }
    el.focus();
    el.click();
  };

  return (
    <div className="shrink-0 border-b border-rule bg-surface-2">
      {/* Row 1: Jenis | Tanggal | Materi */}
      <div className="flex items-stretch">
        <div className="flex min-w-[180px] flex-col justify-center gap-0.5 border-r border-rule px-4 py-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            Jenis Pengajian
          </span>
          {activeTypes.length === 0 ? (
            <span className="text-[13px] italic text-ink-500">
              Belum ada — seed di Pengaturan
            </span>
          ) : (
            <Select
              aria-label="Pilih jenis pengajian"
              value={sessionTypeId !== null ? String(sessionTypeId) : undefined}
              onValueChange={(v) => onSessionTypeChange(Number(v))}
              placeholder="Pilih…"
              items={activeTypes.map((t) => ({
                value: String(t.id),
                label: t.name,
              }))}
              triggerClassName="border-0 bg-transparent px-0 h-7 hover:bg-transparent data-[state=open]:bg-transparent text-[14px] font-semibold text-ink-900"
            />
          )}
        </div>

        <div className="flex min-w-[210px] flex-col justify-center gap-0.5 border-r border-rule px-4 py-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            Tanggal
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={openDatePicker}
              className="flex h-7 cursor-pointer items-center gap-2 text-[14px] font-semibold text-ink-900 hover:text-ink-700"
              aria-label="Ubah tanggal sesi"
            >
              <Calendar size={14} strokeWidth={1.6} className="text-ink-500" />
              <span>
                {fmtDay(sessionDate)}, {fmtDateID(sessionDate)}
              </span>
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={sessionDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => {
                if (e.target.value) onSessionDateChange(e.target.value);
              }}
              aria-label="Tanggal sesi"
              className="absolute left-0 top-0 h-7 w-px opacity-0"
              tabIndex={-1}
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-0.5 px-4 py-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            Materi
          </span>
          <input
            type="text"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Bab / ayat / hadist yang dibahas…"
            aria-label="Materi sesi"
            className="h-7 w-full appearance-none border-0 bg-transparent font-sans text-[14px] font-medium text-ink-900 outline-none placeholder:font-normal placeholder:italic placeholder:text-ink-400 focus-visible:!ring-0 focus-visible:!ring-offset-0"
          />
        </div>
      </div>

      {/* Row 2: Search + keyboard hint */}
      <div className="flex items-center gap-2 border-t border-rule px-4">
        <Search size={14} strokeWidth={1.6} className="shrink-0 text-ink-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari nama jama'ah…"
          aria-label="Cari jama'ah"
          className="h-9 flex-1 appearance-none border-0 bg-transparent font-sans text-[13.5px] text-ink-900 outline-none placeholder:text-ink-400 focus-visible:!ring-0 focus-visible:!ring-offset-0"
        />
        <span className="shrink-0 font-mono text-[10.5px] text-ink-500">
          <kbd className="font-mono text-ink-700">↑↓</kbd> baris
          <span className="mx-2 text-ink-300">·</span>
          <kbd className="font-mono text-ink-700">←→</kbd> status
        </span>
      </div>
    </div>
  );
}
