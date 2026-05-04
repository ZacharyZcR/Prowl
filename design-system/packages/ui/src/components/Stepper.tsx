import type { ReactNode } from "react";

const statusClassMap = {
  complete: "yza-step--complete",
  current: "yza-step--current",
  upcoming: "yza-step--upcoming"
} as const;

export type StepStatus = keyof typeof statusClassMap;

export interface StepItem {
  description?: ReactNode;
  id: string;
  label: ReactNode;
  status: StepStatus;
}

export interface StepperProps {
  steps: StepItem[];
}

export function Stepper({ steps }: StepperProps) {
  return (
    <ol className="yza-stepper">
      {steps.map((step, index) => (
        <li className={["yza-step", statusClassMap[step.status]].join(" ")} key={step.id}>
          <div className="yza-step__marker">
            {step.status === "complete" ? "✓" : index + 1}
          </div>
          <div className="yza-step__body">
            <div className="yza-step__label">{step.label}</div>
            {step.description ? (
              <div className="yza-step__description">{step.description}</div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
