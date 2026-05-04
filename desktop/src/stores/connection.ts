import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getDefaultServerUrl, normalizeServerUrl } from "@/lib/server-url";

interface ConnectionState {
  serverUrl: string;
  setServerUrl: (url: string) => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      serverUrl: getDefaultServerUrl(),
      setServerUrl: (serverUrl) => set({ serverUrl: normalizeServerUrl(serverUrl) }),
    }),
    { name: "connection-storage" },
  ),
);
