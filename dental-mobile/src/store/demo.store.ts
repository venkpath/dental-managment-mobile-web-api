import { create } from 'zustand';

interface DemoStore {
  showModal: boolean;
  openDemoModal: () => void;
  closeDemoModal: () => void;
}

export const useDemoStore = create<DemoStore>((set) => ({
  showModal: false,
  openDemoModal: () => set({ showModal: true }),
  closeDemoModal: () => set({ showModal: false }),
}));
