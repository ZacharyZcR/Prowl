import { useRef, useEffect } from "react";
import { animate, stagger } from "animejs";

interface AnimeOptions {
  opacity?: [number, number];
  translateX?: [number, number];
  translateY?: [number, number];
  translateZ?: [number, number];
  scale?: [number, number];
  rotate?: [number, number];
  duration?: number;
  delay?: number | ReturnType<typeof stagger>;
  easing?: string;
  targets?: string;
}

/**
 * Hook wrapping animejs v4 for declarative mount animations.
 *
 * @example Fade-in + slide up
 * ```tsx
 * function Hero() {
 *   const ref = useAnime<HTMLDivElement>({
 *     opacity: [0, 1],
 *     translateY: [30, 0],
 *     duration: 800,
 *     easing: "easeOutCubic",
 *   });
 *   return <div ref={ref}>Hello</div>;
 * }
 * ```
 *
 * @example Stagger children (pass CSS selector via `targets`)
 * ```tsx
 * function List() {
 *   const ref = useAnime<HTMLUListElement>({
 *     targets: "li",
 *     opacity: [0, 1],
 *     translateY: [20, 0],
 *     delay: stagger(100),
 *     duration: 600,
 *   });
 *   return <ul ref={ref}><li>A</li><li>B</li></ul>;
 * }
 * ```
 */
export function useAnime<T extends HTMLElement>(
  params: AnimeOptions,
  deps: unknown[] = [],
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current) return;

    const { targets: selector, ...animProps } = params;

    const els = selector
      ? ref.current.querySelectorAll(selector)
      : ref.current;

    const anim = animate(els, animProps);

    return () => {
      anim.pause();
    };
  }, deps);

  return ref;
}

export { animate, stagger } from "animejs";
