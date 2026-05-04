import { create } from "zustand";
import type { OnlineUser } from "@/types/realtime";

interface OnlineState {
  users: OnlineUser[];
  setUsers: (users: OnlineUser[]) => void;
  addUser: (user: OnlineUser) => void;
  removeUser: (userId: number) => void;
}

export const useOnlineStore = create<OnlineState>()((set) => ({
  users: [],

  setUsers: (users) => set({ users }),

  addUser: (user) =>
    set((state) => {
      if (state.users.some((u) => u.user_id === user.user_id)) return state;
      return { users: [...state.users, user] };
    }),

  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((u) => u.user_id !== userId),
    })),
}));
