import { Plus } from 'lucide-react';

import { Button } from '@renderer/components/Button';
import {
  FilterCell,
  FilterStrip,
} from '@renderer/components/FilterStrip';
import { Select } from '@renderer/components/Select';
import { BULAN_ID } from '@shared/enums';

export interface MeetingsFilterBarProps {
  month: number;
  year: number;
  onPeriodChange: (next: { month: number; year: number }) => void;
  availableYears: number[];

  meetingCount: number;

  onNewMeeting: () => void;
  newMeetingDisabled?: boolean;
}

export function FilterBar({
  month,
  year,
  onPeriodChange,
  availableYears,
  meetingCount,
  onNewMeeting,
  newMeetingDisabled,
}: MeetingsFilterBarProps) {
  return (
    <FilterStrip>
      <FilterCell label="Bulan" minWidth={170}>
        <Select
          aria-label="Pilih bulan"
          value={String(month)}
          onValueChange={(v) => onPeriodChange({ month: Number(v), year })}
          items={BULAN_ID.map((name, i) => ({
            value: String(i + 1),
            label: name,
          }))}
          triggerClassName="border-0 bg-transparent px-0 h-7 hover:bg-transparent data-[state=open]:bg-transparent text-[14px] font-semibold text-ink-900"
        />
      </FilterCell>

      <FilterCell label="Tahun" minWidth={130}>
        <Select
          aria-label="Pilih tahun"
          value={String(year)}
          onValueChange={(v) => onPeriodChange({ month, year: Number(v) })}
          items={availableYears.map((y) => ({
            value: String(y),
            label: String(y),
          }))}
          triggerClassName="border-0 bg-transparent px-0 h-7 hover:bg-transparent data-[state=open]:bg-transparent text-[14px] font-semibold text-ink-900"
        />
      </FilterCell>

      <FilterCell label="Jumlah Musyawarah" minWidth={160}>
        <span className="text-[14px] font-semibold text-ink-900">
          <span className="font-mono">{meetingCount}</span> musyawarah
        </span>
      </FilterCell>

      <FilterCell flex>
        <span className="text-[12px] italic text-ink-500">
          Catatan hasil musyawarah · pilih sebuah baris atau buat yang baru
        </span>
      </FilterCell>

      <FilterCell>
        <Button
          size="sm"
          icon={<Plus size={13} strokeWidth={1.8} />}
          onClick={onNewMeeting}
          disabled={newMeetingDisabled}
        >
          Musyawarah Baru
        </Button>
      </FilterCell>
    </FilterStrip>
  );
}
