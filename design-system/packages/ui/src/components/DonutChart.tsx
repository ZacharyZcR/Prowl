import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatChartValue, getSeriesColor, type DonutSlice } from "./chart-utils";

export interface DonutChartProps {
  centerLabel?: string;
  centerValue?: string;
  data: DonutSlice[];
  height?: number;
}

export function DonutChart({
  centerLabel,
  centerValue,
  data,
  height = 280
}: DonutChartProps) {
  return (
    <div className="yza-chart yza-chart--donut">
      <ResponsiveContainer height={height} width="100%">
        <RechartsPieChart>
          <Tooltip
            content={({ active, payload }) => {
              const item = payload?.[0]?.payload as DonutSlice | undefined;

              if (!active || !item) {
                return null;
              }

              return (
                <div className="yza-chart-tooltip">
                  <div className="yza-chart-tooltip__title">{item.label}</div>
                  <div className="yza-chart-tooltip__item">
                    <span
                      className="yza-chart-tooltip__dot"
                      style={{ background: item.color }}
                    />
                    <span>占比</span>
                    <strong>{formatChartValue(item.value)}</strong>
                  </div>
                </div>
              );
            }}
          />
          <Pie
            cx="50%"
            cy="50%"
            data={data}
            dataKey="value"
            innerRadius={64}
            outerRadius={88}
            paddingAngle={3}
            stroke="var(--yza-surface-canvas)"
            strokeWidth={4}
          >
            {data.map((item, index) => (
              <Cell
                fill={getSeriesColor(item.color, index)}
                key={item.id}
              />
            ))}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>

      {(centerValue || centerLabel) ? (
        <div className="yza-chart-center">
          {centerValue ? <div className="yza-chart-center__value">{centerValue}</div> : null}
          {centerLabel ? <div className="yza-chart-center__label">{centerLabel}</div> : null}
        </div>
      ) : null}

      <div className="yza-chart-legend yza-chart-legend--stack">
        {data.map((item, index) => (
          <div className="yza-chart-legend__row" key={item.id}>
            <span
              className="yza-chart-legend__swatch"
              style={{ background: getSeriesColor(item.color, index) }}
            />
            <span className="yza-chart-legend__label">{item.label}</span>
            <strong className="yza-chart-legend__value">{formatChartValue(item.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
