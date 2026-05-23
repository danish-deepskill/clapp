import { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { clsx } from 'clsx';

import {
  FilterCell,
  FilterSearch,
  FilterStrip,
} from '@renderer/components/FilterStrip';
import { SegmentedControl } from '@renderer/components/SegmentedControl';
import { Select } from '@renderer/components/Select';
import { fmtDateID, fmtDay } from '@renderer/lib/format';
import type { AttendanceStatus, Gender } from '@shared/enums';
import type { MasterDataItem } from '@shared/masterData';

export type GenderFilter = 'all' | Gender;

export interface AttendanceTally {
  H: number;
  A: number;
  S: number;
  I: number;
  /** Members with no status set (belum diisi). */
  T: number;
  /** All members in the roster (H + A + S + I + T). */
  total: number;
  /** Members with any non-null status — denominator for % calculations. */
  marked: number;
}

export interface FilterBarProps {
  sessionTypes: MasterDataItem[];
  sessionTypeId: number | null;
  onSessionTypeChange: (id: number) => void;

  sessionDate: string;
  onSessionDateChange: (iso: string) => void;
  maxDate: string;

  search: string;
  onSearchChange: (q: string) => void;

  genderFilter: GenderFilter;
  onGenderFilterChange: (g: GenderFilter) => void;

  tally: AttendanceTally;
  sessionStatus: 'new' | 'editing';
}

const PILL_TOKENS: Record<
  AttendanceStatus,
  { label: string; dot: string; text: string }
> = {
  H: { label: 'Hadir', dot: 'bg-hadir', text: 'text-hadir-ink' },
  A: { label: 'Alpa', dot: 'bg-alpa', text: 'text-alpa-ink' },
  S: { label: 'Sakit', dot: 'bg-sakit', text: 'text-sakit-ink' },
  I: { label: 'Izin', dot: 'bg-izin', text: 'text-izin-ink' },
};

export function FilterBar({
  sessionTypes,
  sessionTypeId,
  onSessionTypeChange,
  sessionDate,
  onSessionDateChange,
  maxDate,
  search,
  onSearchChange,
  genderFilter,
  onGenderFilterChange,
  tally,
  sessionStatus,
}: FilterBarProps) {
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
    <FilterStrip>
      <FilterCell label="Jenis Pengajian" minWidth={240}>
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
      </FilterCell>

      <FilterCell label="Tanggal" minWidth={210}>
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
            max={maxDate}
            onChange={(e) => {
              if (e.target.value) onSessionDateChange(e.target.value);
            }}
            aria-label="Tanggal sesi"
            className="absolute left-0 top-0 h-7 w-px opacity-0"
            tabIndex={-1}
          />
        </div>
      </FilterCell>

      <FilterSearch
        value={search}
        onChange={onSearchChange}
        placeholder="Cari nama jama'ah…"
        ariaLabel="Cari jama'ah"
      />

      <FilterCell label="Gender">
        <SegmentedControl<GenderFilter>
          aria-label="Filter gender"
          value={genderFilter}
          onChange={onGenderFilterChange}
          items={[
            { value: 'all', label: 'Semua' },
            { value: 'Laki-Laki', label: 'L' },
            { value: 'Perempuan', label: 'P' },
          ]}
        />
      </FilterCell>

      <FilterCell>
        <div className="flex items-center gap-3">
          {(['H', 'A', 'S', 'I'] as AttendanceStatus[]).map((k) => {
            const tok = PILL_TOKENS[k];
            return (
              <div
                key={k}
                className="flex items-center gap-1.5"
                title={tok.label}
              >
                <span className={clsx('h-2 w-2 rounded-full', tok.dot)} />
                <span
                  className={clsx(
                    'font-mono text-[12px] font-semibold',
                    tok.text,
                  )}
                >
                  {tally[k]}
                </span>
              </div>
            );
          })}
          {tally.T > 0 && (
            <div className="flex items-center gap-1.5" title="Belum diisi">
              <span className="h-2 w-2 rounded-full border border-ink-300 bg-surface" />
              <span className="font-mono text-[12px] font-semibold text-ink-500">
                {tally.T}
              </span>
            </div>
          )}
        </div>
      </FilterCell>

      <FilterCell>
        <span
          className={clsx(
            'font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em]',
            sessionStatus === 'editing' ? 'text-izin-ink' : 'text-ink-500',
          )}
          title={
            sessionStatus === 'editing'
              ? 'Sesi sudah pernah disimpan — editing'
              : 'Sesi baru'
          }
        >
          {sessionStatus === 'editing' ? 'Sesi tersimpan' : 'Sesi baru'}
        </span>
      </FilterCell>
    </FilterStrip>
  );
}
