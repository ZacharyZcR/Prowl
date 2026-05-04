import type { ReactNode } from "react";

export interface DecisionPanelProps {
  actions?: ReactNode;
  description?: ReactNode;
  evidence?: ReactNode;
  risk?: ReactNode;
  title: ReactNode;
}

export function DecisionPanel({
  actions,
  description,
  evidence,
  risk,
  title
}: DecisionPanelProps) {
  return (
    <section className="yza-decision-panel">
      <div className="yza-decision-panel__copy">
        <h3 className="yza-decision-panel__title">{title}</h3>
        {description ? <div className="yza-decision-panel__description">{description}</div> : null}
      </div>
      <div className="yza-decision-panel__facts">
        {risk ? (
          <div className="yza-decision-panel__fact">
            <div className="yza-decision-panel__label">风险判断</div>
            <div className="yza-decision-panel__value">{risk}</div>
          </div>
        ) : null}
        {evidence ? (
          <div className="yza-decision-panel__fact">
            <div className="yza-decision-panel__label">决策依据</div>
            <div className="yza-decision-panel__value">{evidence}</div>
          </div>
        ) : null}
      </div>
      {actions ? <div className="yza-decision-panel__actions">{actions}</div> : null}
    </section>
  );
}
