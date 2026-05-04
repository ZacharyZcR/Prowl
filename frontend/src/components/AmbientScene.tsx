import { useEffect, useRef } from "react";
import { useDeferredMount, useHeavyEffectsEnabled, useReducedMotion } from "@/hooks/useMotionPreferences";

interface Dot {
  alpha: number;
  size: number;
  speedX: number;
  speedY: number;
  x: number;
  y: number;
}

const DOT_COUNT = 36;

function createDots(width: number, height: number): Dot[] {
  return Array.from({ length: DOT_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    speedX: (Math.random() - 0.5) * 0.14,
    speedY: (Math.random() - 0.5) * 0.14,
    size: 1 + Math.random() * 2.2,
    alpha: 0.15 + Math.random() * 0.3,
  }));
}

export function AmbientScene() {
  const reducedMotion = useReducedMotion();
  const heavyEffectsEnabled = useHeavyEffectsEnabled(1200);
  const shouldMount = useDeferredMount(heavyEffectsEnabled, 220);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!shouldMount || reducedMotion) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let width = 0;
    let height = 0;
    let frameId = 0;
    let gradient: CanvasGradient | null = null;
    let dots: Dot[] = [];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      gradient = context.createRadialGradient(width * 0.52, height * 0.18, 0, width * 0.52, height * 0.18, Math.max(width, height) * 0.7);
      gradient.addColorStop(0, "rgba(96, 165, 250, 0.12)");
      gradient.addColorStop(0.45, "rgba(59, 130, 246, 0.04)");
      gradient.addColorStop(1, "rgba(2, 6, 23, 0)");
      dots = createDots(width, height);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      if (gradient) {
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      }

      for (let index = 0; index < dots.length; index += 1) {
        const dot = dots[index];
        dot.x += dot.speedX;
        dot.y += dot.speedY;

        if (dot.x < -20) dot.x = width + 20;
        if (dot.x > width + 20) dot.x = -20;
        if (dot.y < -20) dot.y = height + 20;
        if (dot.y > height + 20) dot.y = -20;

        for (let compare = index + 1; compare < dots.length; compare += 1) {
          const peer = dots[compare];
          const dx = dot.x - peer.x;
          const dy = dot.y - peer.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 140) continue;

          context.strokeStyle = `rgba(96, 165, 250, ${0.08 * (1 - distance / 140)})`;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(dot.x, dot.y);
          context.lineTo(peer.x, peer.y);
          context.stroke();
        }

        context.fillStyle = `rgba(191, 219, 254, ${dot.alpha})`;
        context.beginPath();
        context.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        context.fill();
      }

      frameId = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, [reducedMotion, shouldMount]);

  if (!shouldMount) {
    return null;
  }

  return (
    <div className="stc-ambient-scene" aria-hidden="true">
      <canvas ref={canvasRef} className="stc-canvas-transparent" />
    </div>
  );
}
