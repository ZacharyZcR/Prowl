import { useEffect, useState } from "react";

type NetworkInfo = {
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
  saveData?: boolean;
};

function getReducedMotionPreference() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getHeavyEffectsPreference(minWidth: number) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  const connection = (navigator as Navigator & { connection?: NetworkInfo }).connection;
  return (
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    window.matchMedia(`(min-width: ${minWidth}px)`).matches &&
    !connection?.saveData
  );
}

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(getReducedMotionPreference);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

export function useHeavyEffectsEnabled(minWidth = 1024) {
  const [enabled, setEnabled] = useState(() => getHeavyEffectsPreference(minWidth));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const widthMedia = window.matchMedia(`(min-width: ${minWidth}px)`);
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: NetworkInfo }).connection;
    const update = () => setEnabled(getHeavyEffectsPreference(minWidth));

    update();
    widthMedia.addEventListener("change", update);
    motionMedia.addEventListener("change", update);
    connection?.addEventListener?.("change", update);

    return () => {
      widthMedia.removeEventListener("change", update);
      motionMedia.removeEventListener("change", update);
      connection?.removeEventListener?.("change", update);
    };
  }, [minWidth]);

  return enabled;
}

export function useDeferredMount(enabled: boolean, timeout = 200) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setMounted(false);
      return;
    }

    let cancelled = false;
    let idleId: number | null = null;
    const fallbackId = window.setTimeout(() => {
      if (!cancelled) {
        setMounted(true);
      }
    }, timeout);

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(() => {
        if (!cancelled) {
          window.clearTimeout(fallbackId);
          setMounted(true);
        }
      }, { timeout });
    }

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackId);
      if (idleId != null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [enabled, timeout]);

  return mounted;
}
