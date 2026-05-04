import { useEffect, useRef, useCallback } from "react";

/**
 * Attaches a cursor-following glow to a container element.
 * The glow is a CSS radial-gradient on a pseudo-layer,
 * positioned via CSS custom properties --glow-x / --glow-y.
 */
export function useCursorGlow<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const onMove = useCallback((e: MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--glow-x", `${e.clientX - rect.left}px`);
    ref.current.style.setProperty("--glow-y", `${e.clientY - rect.top}px`);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [onMove]);

  return ref;
}
