import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { hasPrimaryModifier } from "@/lib/platform";
import { useAppStore } from "@/stores/app";

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable;

      if (e.key === "Escape") return;
      if (isInput) return;

      if (hasPrimaryModifier(e) && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (hasPrimaryModifier(e) && e.key === "h") {
        e.preventDefault();
        navigate("/dashboard");
        return;
      }

      if (hasPrimaryModifier(e) && e.key === "p") {
        e.preventDefault();
        navigate("/projects");
        return;
      }

      if (hasPrimaryModifier(e) && e.key === ",") {
        e.preventDefault();
        navigate("/settings");
        return;
      }

      if (hasPrimaryModifier(e) && e.key === "/") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("stc:show-shortcuts"));
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, toggleSidebar]);
}
