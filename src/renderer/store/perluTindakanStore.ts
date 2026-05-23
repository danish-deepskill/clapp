import { create } from 'zustand';

interface PerluTindakanState {
  count: number;
  setCount: (n: number) => void;
}

export const usePerluTindakanStore = create<PerluTindakanState>((set) => ({
  count: 0,
  setCount: (n) => set({ count: n }),
}));
