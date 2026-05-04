import type { ReactNode } from "react";

export interface SplitViewProps {
  aside?: ReactNode;
  leading?: ReactNode;
  main: ReactNode;
  variant?: "master-detail" | "main-aside" | "tri-pane";
}

export function SplitView({
  aside,
  leading,
  main,
  variant = "master-detail"
}: SplitViewProps) {
  return (
    <section className={`yza-split-view yza-split-view--${variant}`}>
      {leading ? <div className="yza-split-view__pane yza-split-view__pane--leading">{leading}</div> : null}
      <div className="yza-split-view__pane yza-split-view__pane--main">{main}</div>
      {aside ? <aside className="yza-split-view__pane yza-split-view__pane--aside">{aside}</aside> : null}
    </section>
  );
}
