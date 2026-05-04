import { Fragment } from "react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {
  formatChartValue,
  getSeriesColor,
  type ChartDatum,
  type ChartSeries
} from "./chart-utils";

export interface BarChartProps<TDatum extends ChartDatum> {
  data: TDatum[];
  height?: number;
  series: ChartSeries[];
  xKey: keyof TDatum & string;
}

export function BarChart<TDatum extends ChartDatum>({
  data,
  height = 280,
  series,
  xKey
}: BarChartProps<TDatum>) {
  return (
    <div className="yza-chart">
      <ResponsiveContainer height={height} width="100%">
        <RechartsBarChart barCategoryGap={16} data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--yza-border-subtle)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey={xKey as unknown as string}
            tick={{ fill: "var(--yza-text-muted)", fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "var(--yza-text-muted)", fontSize: 12 }}
            tickLine={false}
            width={36}
          />
          <Tooltip
            content={({ active, label, payload }) => {
              if (!active || !payload?.length) {
                return null;
              }

              return (
                <div className="yza-chart-tooltip">
                  <div className="yza-chart-tooltip__title">{label}</div>
                  <div className="yza-chart-tooltip__list">
                    {payload.map((entry, index) => (
                      <div className="yza-chart-tooltip__item" key={`${entry.dataKey}-${index}`}>
                        <span
                          className="yza-chart-tooltip__dot"
                          style={{ background: entry.color }}
                        />
                        <span>{entry.name}</span>
                        <strong>{formatChartValue(entry.value as number)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
            cursor={{ fill: "color-mix(in srgb, var(--yza-color-brand-500) 8%, transparent)" }}
          />

          {series.map((item, index) => (
            <Bar
              dataKey={item.key}
              fill={getSeriesColor(item.color, index)}
              key={item.key}
              name={item.label}
              radius={[8, 8, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>

      <div className="yza-chart-legend">
        {series.map((item, index) => (
          <Fragment key={item.key}>
            <span
              className="yza-chart-legend__swatch"
              style={{ background: getSeriesColor(item.color, index) }}
            />
            <span className="yza-chart-legend__label">{item.label}</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
