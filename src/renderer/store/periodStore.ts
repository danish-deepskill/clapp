import { create } from 'zustand';

interface Period {
  month: number;
  year: number;
}

interface PeriodState {
  /**
   * One-shot period handoff between screens. Beranda sets it right before
   * navigating (e.g. "Laporan April belum dikunci → Buka"); the target screen
   * reads it once at mount and clears it, so a later direct tab click opens
   * the current period as usual. Every month-view still owns its own
   * Bulan/Tahun state — CONTEXT §3's shared global period is a later step.
   */
  pendingPeriod: Period | null;
  setPendingPeriod: (period: Period | null) => void;
}

export const usePeriodStore = create<PeriodState>((set) => ({
  pendingPeriod: null,
  setPendingPeriod: (pendingPeriod) => set({ pendingPeriod }),
}));
