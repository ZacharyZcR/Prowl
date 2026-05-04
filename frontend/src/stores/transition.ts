import { create } from "zustand";

type TransitionPhase = "idle" | "login-exit" | "dashboard-enter";

interface TransitionState {
  phase: TransitionPhase;
  setPhase: (phase: TransitionPhase) => void;
}

export const useTransitionStore = create<TransitionState>()((set) => ({
  phase: "idle",
  setPhase: (phase) => set({ phase }),
}));
