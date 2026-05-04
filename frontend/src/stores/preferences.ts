import { create } from "zustand";
import { toast } from "sonner";
import { api } from "@/lib/api";
import i18n from "@/i18n";

interface PreferenceState {
  prefs: Record<string, string>;
  loaded: boolean;
  get: (key: string, defaultValue?: string) => string;
  set: (key: string, value: string) => void;
  load: () => Promise<void>;
}

export const usePreferenceStore = create<PreferenceState>()((set, get) => ({
  prefs: {},
  loaded: false,

  get: (key: string, defaultValue = "") => {
    return get().prefs[key] ?? defaultValue;
  },

  set: (key: string, value: string) => {
    const previousValue = get().prefs[key];
    set((s) => ({ prefs: { ...s.prefs, [key]: value } }));
    // 异步持久化到后端
    api.put("/api/v1/preferences", { [key]: value }).catch(() => {
      set((s) => {
        const prefs = { ...s.prefs };
        if (previousValue === undefined) {
          delete prefs[key];
        } else {
          prefs[key] = previousValue;
        }
        return { prefs };
      });
      toast.error(i18n.t("common.operationFailed"));
    });
  },

  load: async () => {
    try {
      const res = await api.get<Record<string, string>>("/api/v1/preferences");
      set({ prefs: res.data ?? {}, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));
