import type { ReactNode } from "react";

export interface ValidationIssue {
  id: string;
  field?: ReactNode;
  message: ReactNode;
  tone?: "warning" | "danger";
}

export interface ValidationSummaryProps {
  description?: ReactNode;
  issues: ValidationIssue[];
  title?: ReactNode;
}

export function ValidationSummary({
  description,
  issues,
  title = "提交前还需要处理这些问题"
}: ValidationSummaryProps) {
  return (
    <section className="yza-validation-summary" role="alert">
      <div className="yza-validation-summary__header">
        <strong className="yza-validation-summary__title">{title}</strong>
        {description ? (
          <div className="yza-validation-summary__description">{description}</div>
        ) : null}
      </div>
      <ul className="yza-validation-summary__list">
        {issues.map((issue) => (
          <li className="yza-validation-summary__item" key={issue.id}>
            {issue.field ? (
              <span className="yza-validation-summary__field">{issue.field}</span>
            ) : null}
            <span
              className={[
                "yza-validation-summary__message",
                `yza-validation-summary__message--${issue.tone ?? "danger"}`
              ].join(" ")}
            >
              {issue.message}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
