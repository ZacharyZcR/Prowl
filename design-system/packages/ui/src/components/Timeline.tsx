import type { ReactNode } from "react";

export interface TimelineItem {
  description?: ReactNode;
  meta?: ReactNode;
  time?: ReactNode;
  title: ReactNode;
  tone?: "default" | "info" | "success" | "warning" | "danger";
}

export interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  return (
    <ol className="yza-timeline">
      {items.map((item, index) => (
        <li className="yza-timeline__item" key={index}>
          <div className={["yza-timeline__dot", `yza-timeline__dot--${item.tone ?? "default"}`].join(" ")} />
          <div className="yza-timeline__content">
            <div className="yza-timeline__head">
              <strong className="yza-timeline__title">{item.title}</strong>
              {item.time ? <span className="yza-timeline__time">{item.time}</span> : null}
            </div>
            {item.meta ? <div className="yza-timeline__meta">{item.meta}</div> : null}
            {item.description ? (
              <div className="yza-timeline__description">{item.description}</div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
