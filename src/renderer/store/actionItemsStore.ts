import { create } from 'zustand';

interface ActionItemsState {
  /** Perlu Tindakan count shown on the NavBar brand badge. */
  count: number;
  setCount: (n: number) => void;
  /**
   * Recount via the count-only IPC. Cheap enough to call on every screen
   * change; screens also call it after a successful mutation so the badge
   * never lags a fix. A failed recount clears the badge rather than leaving
   * a number nothing on screen supports.
   */
  refresh: () => Promise<void>;
}

export const useActionItemsStore = create<ActionItemsState>((set) => ({
  count: 0,
  setCount: (n) => set({ count: n }),
  refresh: async () => {
    try {
      const r = await window.clapp.dashboard.actionItemCount();
      set({ count: r.ok ? r.data : 0 });
    } catch {
      set({ count: 0 });
    }
  },
}));

/** Convenience for screens: call after a save that may change the count. */
export function refreshActionItems(): Promise<void> {
  return useActionItemsStore.getState().refresh();
}
