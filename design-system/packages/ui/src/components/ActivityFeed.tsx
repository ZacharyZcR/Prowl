import type { ReactNode } from "react";

export interface ActivityFeedItem {
  description?: ReactNode;
  meta?: ReactNode;
  time?: ReactNode;
  title: ReactNode;
  tone?: "default" | "info" | "success" | "warning" | "danger";
}

export interface ActivityFeedProps {
  items: ActivityFeedItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <ol className="yza-activity-feed">
      {items.map((item, index) => (
        <li className="yza-activity-feed__item" key={index}>
          <div className={`yza-activity-feed__marker yza-activity-feed__marker--${item.tone ?? "default"}`} />
          <div className="yza-activity-feed__body">
            <div className="yza-activity-feed__head">
              <strong className="yza-activity-feed__title">{item.title}</strong>
              {item.time ? <span className="yza-activity-feed__time">{item.time}</span> : null}
            </div>
            {item.meta ? <div className="yza-activity-feed__meta">{item.meta}</div> : null}
            {item.description ? <div className="yza-activity-feed__description">{item.description}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
