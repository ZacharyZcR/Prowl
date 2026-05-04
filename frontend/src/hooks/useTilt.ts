import { useEffect, useRef, useCallback } from "react";

/**
 * Adds 3D perspective tilt to an element on mouse hover.
 * Smooth enter/leave transition via CSS transition on transform.
 */
export function useTilt<T extends HTMLElement>(intensity = 8) {
  const ref = useRef<T>(null);

  const onMove = useCallback((e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform =
      `perspective(800px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) scale(1.01)`;
  }, [intensity]);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)";
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)";
    el.style.willChange = "transform";
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [onMove, onLeave]);

  return ref;
}
