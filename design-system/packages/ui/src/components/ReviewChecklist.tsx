import type { ReactNode } from "react";

export interface ReviewChecklistItem {
  description?: ReactNode;
  label: ReactNode;
  status?: "todo" | "done" | "warning" | "danger";
}

export interface ReviewChecklistProps {
  heading?: ReactNode;
  items: ReviewChecklistItem[];
  summary?: ReactNode;
}

export function ReviewChecklist({
  heading,
  items,
  summary
}: ReviewChecklistProps) {
  return (
    <section className="yza-review-checklist">
      {heading ? <h3 className="yza-review-checklist__heading">{heading}</h3> : null}
      {summary ? <div className="yza-review-checklist__summary">{summary}</div> : null}
      <ol className="yza-review-checklist__list">
        {items.map((item, index) => (
          <li className="yza-review-checklist__item" key={index}>
            <div
              className={[
                "yza-review-checklist__marker",
                `yza-review-checklist__marker--${item.status ?? "todo"}`
              ].join(" ")}
              aria-hidden="true"
            />
            <div className="yza-review-checklist__body">
              <div className="yza-review-checklist__label">{item.label}</div>
              {item.description ? (
                <div className="yza-review-checklist__description">{item.description}</div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
