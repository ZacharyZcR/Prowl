import { useEffect, useRef } from "react";
import { useDeferredMount, useHeavyEffectsEnabled, useReducedMotion } from "@/hooks/useMotionPreferences";

interface ParticleFieldProps {
  className?: string;
}

interface Point {
  speed: number;
  x: number;
  y: number;
}

const POINT_COUNT = 18;

function createPoints(size: number): Point[] {
  return Array.from({ length: POINT_COUNT }, (_, index) => {
    const angle = (Math.PI * 2 * index) / POINT_COUNT;
    const radius = size * (0.18 + Math.random() * 0.18);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      speed: 0.2 + Math.random() * 0.25,
    };
  });
}

export function ParticleField({ className }: ParticleFieldProps) {
  const reducedMotion = useReducedMotion();
  const heavyEffectsEnabled = useHeavyEffectsEnabled(1024);
  const shouldMount = useDeferredMount(heavyEffectsEnabled, 140);
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
    let points: Point[] = [];
    let pointerX = 0;
    let pointerY = 0;
    let pointerActive = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      points = createPoints(Math.min(width, height));
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      pointerActive = pointerX >= 0 && pointerY >= 0 && pointerX <= rect.width && pointerY <= rect.height;
    };

    const onPointerLeave = () => {
      pointerActive = false;
    };

    const draw = (time: number) => {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.18;
      const wobble = Math.sin(time * 0.00045) * 0.04;

      context.clearRect(0, 0, width, height);

      const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(width, height) * 0.45);
      glow.addColorStop(0, "rgba(30, 64, 175, 0.18)");
      glow.addColorStop(0.45, "rgba(14, 165, 233, 0.08)");
      glow.addColorStop(1, "rgba(2, 6, 23, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "rgba(148, 163, 184, 0.18)";
      context.lineWidth = 1;
      for (let ring = 1; ring <= 3; ring += 1) {
        context.beginPath();
        context.arc(centerX, centerY, radius * (0.9 + ring * 0.45), 0, Math.PI * 2);
        context.stroke();
      }

      context.save();
      context.translate(centerX, centerY);
      context.rotate(time * 0.00018);
      context.strokeStyle = "rgba(96, 165, 250, 0.4)";
      context.lineWidth = 1.2;
      context.beginPath();
      for (let index = 0; index < 6; index += 1) {
        const angle = (Math.PI * 2 * index) / 6;
        const x = Math.cos(angle) * radius * (1 + wobble);
        const y = Math.sin(angle) * radius * (1 - wobble);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      context.stroke();
      context.restore();

      points.forEach((point, index) => {
        const angle = time * 0.00035 * point.speed + (Math.PI * 2 * index) / points.length;
        const distance = radius * (1.1 + (index % 3) * 0.28);
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;

        context.fillStyle = "rgba(191, 219, 254, 0.85)";
        context.beginPath();
        context.arc(x, y, 2.2, 0, Math.PI * 2);
        context.fill();

        context.strokeStyle = "rgba(96, 165, 250, 0.16)";
        context.beginPath();
        context.moveTo(centerX, centerY);
        context.lineTo(x, y);
        context.stroke();

        if (pointerActive) {
          const dx = pointerX - x;
          const dy = pointerY - y;
          const distanceToPointer = Math.sqrt(dx * dx + dy * dy);
          if (distanceToPointer < 120) {
            context.strokeStyle = `rgba(191, 219, 254, ${0.22 * (1 - distanceToPointer / 120)})`;
            context.beginPath();
            context.moveTo(pointerX, pointerY);
            context.lineTo(x, y);
            context.stroke();
          }
        }
      });

      frameId = window.requestAnimationFrame(draw);
    };

    resize();
    frameId = window.requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [reducedMotion, shouldMount]);

  if (!shouldMount || reducedMotion) {
    return (
      <div className={`stc-scene-host${className ? ` ${className}` : ""}`}>
        <div className="stc-particle-fallback" />
      </div>
    );
  }

  return (
    <div className={`stc-scene-host${className ? ` ${className}` : ""}`}>
      <canvas ref={canvasRef} className="stc-canvas-transparent" />
    </div>
  );
}
