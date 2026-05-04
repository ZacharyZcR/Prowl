import { create } from "zustand";
import { persist } from "zustand/middleware";
import i18n from "@/i18n";

type Lang = "zh" | "en";
type Theme = "light" | "dark";

interface SettingsState {
  lang: Lang;
  theme: Theme;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      lang: "zh",
      theme: "light",
      setLang: (lang) => {
        i18n.changeLanguage(lang);
        localStorage.setItem("portal-lang", lang);
        set({ lang });
      },
      toggleLang: () => {
        const next = get().lang === "zh" ? "en" : "zh";
        i18n.changeLanguage(next);
        localStorage.setItem("portal-lang", next);
        set({ lang: next });
      },
      setTheme: (theme) => {
        document.documentElement.setAttribute("data-theme", theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", next);
        set({ theme: next });
      },
    }),
    {
      name: "portal-settings",
      onRehydrateStorage: () => (state) => {
        if (state?.theme === "dark") {
          document.documentElement.setAttribute("data-theme", "dark");
        }
        if (state?.lang) {
          i18n.changeLanguage(state.lang);
          localStorage.setItem("portal-lang", state.lang);
        }
      },
    },
  ),
);
