import { useEffect, useRef } from "react";
import { animate, createTimeline } from "animejs";
import { useTransitionStore } from "@/stores/transition";
import { useReducedMotion } from "@/hooks/useMotionPreferences";

/**
 * Full-screen transition overlay for login → dashboard.
 * Shows during login-exit, fades out during dashboard-enter.
 */
export function TransitionOverlay() {
  const phase = useTransitionStore((s) => s.phase);
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const circlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !reducedMotion) return;
    ref.current.style.display = "none";
    ref.current.style.opacity = "0";
  }, [phase, reducedMotion]);

  // Show + animate in when login-exit starts
  useEffect(() => {
    if (reducedMotion) return;
    if (phase !== "login-exit" || !ref.current) return;

    const el = ref.current;
    el.style.display = "flex";
    el.style.opacity = "1";

    const tl = createTimeline({ defaults: { ease: "easeOutCubic" } });

    tl.add(circlesRef.current!.querySelectorAll(".stc-transition__circle"), {
      scale: [0, 1],
      delay: (_, i) => (i ?? 0) * 100,
      duration: 800,
    }, 0);

    // Logo pulses in
    const logo = el.querySelector(".stc-transition__logo");
    if (logo) {
      tl.add(logo, {
        scale: [0.5, 1],
        opacity: [0, 1],
        duration: 500,
      }, 200);
    }

    return () => { tl.pause(); };
  }, [phase, reducedMotion]);

  // Fade out when dashboard-enter starts
  useEffect(() => {
    if (reducedMotion) return;
    if (phase !== "dashboard-enter" || !ref.current) return;

    const el = ref.current;

    animate(el, {
      opacity: [1, 0],
      duration: 600,
      ease: "easeInCubic",
      onComplete: () => {
        el.style.display = "none";
      },
    });
  }, [phase, reducedMotion]);

  // Ensure hidden when idle
  useEffect(() => {
    if (phase === "idle" && ref.current) {
      ref.current.style.display = "none";
    }
  }, [phase]);

  return (
    <div ref={ref} className="stc-transition-overlay stc-transition-overlay--hidden">
      <div ref={circlesRef} className="stc-transition__circles">
        <div className="stc-transition__circle stc-transition__circle--1" />
        <div className="stc-transition__circle stc-transition__circle--2" />
        <div className="stc-transition__circle stc-transition__circle--3" />
      </div>
      <div className="stc-transition__text">
        <span className="stc-transition__logo stc-pre-animate">S</span>
      </div>
    </div>
  );
}
