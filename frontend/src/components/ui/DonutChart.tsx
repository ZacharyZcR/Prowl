export interface DonutChartProps {
  data: { label: string; value: number; color: string; id?: string }[];
  size?: number;
  centerValue?: string;
  centerLabel?: string;
}

export function DonutChart({ data, size = 160, centerValue, centerLabel }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const r = size / 2;
  const strokeWidth = r * 0.3;
  const cr = r - strokeWidth / 2;
  const circumference = 2 * Math.PI * cr;

  let offset = 0;
  const segments = data.map((d) => {
    const pct = d.value / total;
    const dashArray = `${circumference * pct} ${circumference * (1 - pct)}`;
    const dashOffset = -offset;
    offset += circumference * pct;
    return { ...d, dashArray, dashOffset };
  });

  return (
    <div className="inline-flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {segments.map((seg, i) => (
          <circle
            key={seg.id ?? seg.label ?? i}
            cx={r}
            cy={r}
            r={cr}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={seg.dashArray}
            strokeDashoffset={seg.dashOffset}
          />
        ))}
        {(centerValue || centerLabel) && (
          <g transform={`rotate(90, ${r}, ${r})`}>
            {centerValue && (
              <text x={r} y={centerLabel ? r - 4 : r} textAnchor="middle" dominantBaseline="central" className="fill-[var(--stc-text-primary)]" fontSize="20" fontWeight="bold">
                {centerValue}
              </text>
            )}
            {centerLabel && (
              <text x={r} y={r + 14} textAnchor="middle" dominantBaseline="central" className="fill-[var(--stc-text-tertiary)]" fontSize="10">
                {centerLabel}
              </text>
            )}
          </g>
        )}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.map((d, i) => (
          <span key={d.id ?? d.label ?? i} className="flex items-center gap-1.5 text-xs text-[var(--stc-text-secondary)]">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
