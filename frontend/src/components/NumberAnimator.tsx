import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { useReducedMotion } from "@/hooks/useMotionPreferences";

/**
 * Global number animation observer.
 * Watches for elements matching known numeric selectors,
 * and animates them from 0 to their target value on first appearance.
 *
 * Mount once in Layout — it handles all pages automatically.
 */

const SELECTORS = [
  ".yza-kpi-card__value",
  ".yza-metric-strip__value",
  ".yza-chart-center__value",
  "[data-animate-number]",
];

const OBSERVED = new WeakSet<Element>();

function animateNumber(el: HTMLElement) {
  if (OBSERVED.has(el)) return;
  OBSERVED.add(el);

  const text = el.textContent?.trim() ?? "";
  const num = parseFloat(text.replace(/,/g, ""));
  if (isNaN(num) || num === 0) return;

  // Preserve suffix (%, +, etc.)
  const match = text.match(/^[\d,.]+(.*)$/);
  const suffix = match?.[1] ?? "";
  const isInt = Number.isInteger(num) && !text.includes(".");

  const obj = { val: 0 };
  animate(obj, {
    val: [0, num],
    duration: Math.min(800 + num * 2, 1500),
    ease: "easeOutExpo",
    onUpdate: () => {
      const v = isInt ? Math.round(obj.val) : obj.val.toFixed(1);
      el.textContent = `${v}${suffix}`;
    },
  });
}

export function NumberAnimator() {
  const observerRef = useRef<MutationObserver | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    function scan() {
      const selector = SELECTORS.join(", ");
      document.querySelectorAll<HTMLElement>(selector).forEach(animateNumber);
    }

    // Initial scan
    scan();

    // Watch for DOM changes (route switches, data loads)
    observerRef.current = new MutationObserver(() => {
      requestAnimationFrame(scan);
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [reducedMotion]);

  return null;
}
