import { create } from 'zustand';

import { currentMonthYear } from '@renderer/lib/dates';

interface PeriodState {
  month: number;
  year: number;
  setPeriod: (month: number, year: number) => void;
}

const initial = currentMonthYear();

export const usePeriodStore = create<PeriodState>((set) => ({
  month: initial.month,
  year: initial.year,
  setPeriod: (month, year) => set({ month, year }),
}));
