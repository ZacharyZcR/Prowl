import type { CSSProperties } from "react";

type SceneTheme = "notification" | "activity" | "search" | "default";

interface EmptySceneProps {
  theme?: SceneTheme;
  size?: number;
}

export function EmptyScene({ theme = "default", size = 120 }: EmptySceneProps) {
  return (
    <div
      className={`stc-empty-scene-fallback stc-empty-scene-fallback--${theme}`}
      style={{ "--stc-empty-scene-size": `${size}px` } as CSSProperties}
      aria-hidden="true"
    >
      <span className="stc-empty-scene-fallback__orb" />
      <span className="stc-empty-scene-fallback__ring" />
    </div>
  );
}
