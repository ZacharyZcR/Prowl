import { create } from "zustand";

export interface ProgressItem {
  taskId: string;
  label: string;
  current: number;
  total: number;
  percent: number;
  status: "running" | "completed" | "failed";
  error?: string;
  downloadUrl?: string;
}

interface ProgressState {
  items: Map<string, ProgressItem>;
  panelOpen: boolean;

  upsert: (event: ProgressItem) => void;
  dismiss: (taskId: string) => void;
  clearCompleted: () => void;
  togglePanel: () => void;
}

export const useProgressStore = create<ProgressState>()((set) => ({
  items: new Map(),
  panelOpen: false,

  upsert: (event) =>
    set((state) => {
      const next = new Map(state.items);
      next.set(event.taskId, event);
      // Auto-open panel when a new task starts
      return { items: next, panelOpen: true };
    }),

  dismiss: (taskId) =>
    set((state) => {
      const next = new Map(state.items);
      next.delete(taskId);
      return { items: next, panelOpen: next.size > 0 ? state.panelOpen : false };
    }),

  clearCompleted: () =>
    set((state) => {
      const next = new Map(state.items);
      for (const [id, item] of next) {
        if (item.status !== "running") next.delete(id);
      }
      return { items: next, panelOpen: next.size > 0 ? state.panelOpen : false };
    }),

  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
}));
