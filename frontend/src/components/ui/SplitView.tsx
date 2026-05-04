import { type ReactNode } from "react";

export interface SplitViewProps {
  main: ReactNode;
  aside: ReactNode;
}

export function SplitView({ main, aside }: SplitViewProps) {
  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">{main}</div>
      <aside className="w-80 shrink-0">{aside}</aside>
    </div>
  );
}
