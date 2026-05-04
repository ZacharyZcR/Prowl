import { create } from "zustand";
import { persist } from "zustand/middleware";
import i18n from "@/i18n";

type Theme = "light" | "dark" | "system";

interface AppState {
  sidebarCollapsed: boolean;
  theme: Theme;
  lang: string;
  dashboardLayout: string[];
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  setLang: (lang: string) => void;
  setDashboardLayout: (layout: string[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: "system",
      lang: localStorage.getItem("lang") || "zh",
      dashboardLayout: ["kpi", "chart", "notifications", "context"],

      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      setTheme: (theme) => set({ theme }),

      setLang: (lang) => {
        localStorage.setItem("lang", lang);
        i18n.changeLanguage(lang);
        set({ lang });
      },

      setDashboardLayout: (layout) => set({ dashboardLayout: layout }),
    }),
    {
      name: "app-storage",
    },
  ),
);
