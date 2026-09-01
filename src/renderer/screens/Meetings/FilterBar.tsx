import { Plus } from 'lucide-react';

import { Button } from '@renderer/components/Button';
import {
  FilterCell,
  FilterStrip,
} from '@renderer/components/FilterStrip';
import { PeriodSelect } from '@renderer/components/PeriodSelect';

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
      <PeriodSelect
        month={month}
        year={year}
        onChange={onPeriodChange}
        availableYears={availableYears}
      />

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
