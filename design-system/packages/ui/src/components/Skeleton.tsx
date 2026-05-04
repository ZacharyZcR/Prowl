import type { CSSProperties } from "react";

export type SkeletonVariant = "text" | "rect" | "circle";

export interface SkeletonProps {
  count?: number;
  height?: number | string;
  variant?: SkeletonVariant;
  width?: number | string;
}

export function Skeleton({
  count = 1,
  height,
  variant = "text",
  width
}: SkeletonProps) {
  return (
    <div className="yza-skeleton-stack" data-variant={variant}>
      {Array.from({ length: count }, (_, index) => {
        const style: CSSProperties = {};

        if (width) {
          style.width = width;
        }

        if (height) {
          style.height = height;
        }

        return (
          <span
            aria-hidden="true"
            className={`yza-skeleton yza-skeleton--${variant}`}
            key={index}
            style={style}
          />
        );
      })}
    </div>
  );
}
