import { cn } from "@/lib/utils";

export interface SkeletonProps {
  count?: number;
  height?: number | string;
  variant?: "text" | "rect" | "circle";
  width?: number | string;
}

const variantClasses: Record<string, string> = {
  text: "rounded",
  rect: "rounded-lg",
  circle: "rounded-full",
};

export function Skeleton({ count = 1, height, variant = "text", width }: SkeletonProps) {
  const items = Array.from({ length: count });
  const style = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : (height ?? (variant === "text" ? "1em" : undefined)),
  };

  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className={cn(
            "animate-pulse bg-[var(--stc-neutral-200)]",
            variantClasses[variant],
            variant === "circle" && "aspect-square",
            !width && variant === "text" && "w-full",
          )}
          style={style}
        />
      ))}
    </>
  );
}
