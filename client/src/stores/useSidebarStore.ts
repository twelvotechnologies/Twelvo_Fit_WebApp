import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const STORAGE_KEY = 'gymerp_sidebar_collapsed';

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: (() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  })(),
  toggleCollapse: () =>
    set((state) => {
      const next = !state.isCollapsed;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return { isCollapsed: next };
    }),
  setCollapsed: (collapsed: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {}
    set({ isCollapsed: collapsed });
  },
}));
