import type { ReactNode } from "react";

export interface ReportMetric {
  label: ReactNode;
  value: ReactNode;
}

export interface ReportSummaryProps {
  heading: ReactNode;
  highlights?: ReactNode[];
  metrics: ReportMetric[];
  score: ReactNode;
  summary: ReactNode;
}

export function ReportSummary({
  heading,
  highlights = [],
  metrics,
  score,
  summary
}: ReportSummaryProps) {
  return (
    <section className="yza-report-summary">
      <div className="yza-report-summary__hero">
        <div className="yza-report-summary__score">
          <span className="yza-report-summary__score-value">{score}</span>
          <span className="yza-report-summary__score-label">综合评分</span>
        </div>
        <div className="yza-report-summary__copy">
          <h2 className="yza-report-summary__heading">{heading}</h2>
          <div className="yza-report-summary__summary">{summary}</div>
        </div>
      </div>

      <div className="yza-report-summary__metrics">
        {metrics.map((metric, index) => (
          <div className="yza-report-summary__metric" key={index}>
            <div className="yza-report-summary__metric-label">{metric.label}</div>
            <div className="yza-report-summary__metric-value">{metric.value}</div>
          </div>
        ))}
      </div>

      {highlights.length > 0 ? (
        <ul className="yza-report-summary__highlights">
          {highlights.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
