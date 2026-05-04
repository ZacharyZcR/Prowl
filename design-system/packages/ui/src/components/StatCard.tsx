import type { ReactNode } from "react";

const toneClassMap = {
  brand: "yza-stat-card--brand",
  success: "yza-stat-card--success",
  warning: "yza-stat-card--warning",
  danger: "yza-stat-card--danger",
  info: "yza-stat-card--info"
} as const;

export type StatCardTone = keyof typeof toneClassMap;

export interface StatCardProps {
  footer?: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
  tone?: StatCardTone;
  trend?: ReactNode;
  value: ReactNode;
}

export function StatCard({
  footer,
  meta,
  title,
  tone = "brand",
  trend,
  value
}: StatCardProps) {
  return (
    <section className={["yza-stat-card", toneClassMap[tone]].join(" ")}>
      <div className="yza-stat-card__title">{title}</div>
      <div className="yza-stat-card__value">{value}</div>
      {trend ? <div className="yza-stat-card__trend">{trend}</div> : null}
      {meta ? <div className="yza-stat-card__meta">{meta}</div> : null}
      {footer ? <div className="yza-stat-card__footer">{footer}</div> : null}
    </section>
  );
}
