import { create } from 'zustand';

interface ActionItemsState {
  count: number;
  setCount: (n: number) => void;
}

export const useActionItemsStore = create<ActionItemsState>((set) => ({
  count: 0,
  setCount: (n) => set({ count: n }),
}));
