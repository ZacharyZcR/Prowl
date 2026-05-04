import { Fragment } from "react";
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
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

export interface TrendChartProps<TDatum extends ChartDatum> {
  data: TDatum[];
  height?: number;
  series: ChartSeries[];
  xKey: keyof TDatum & string;
}

export function TrendChart<TDatum extends ChartDatum>({
  data,
  height = 280,
  series,
  xKey
}: TrendChartProps<TDatum>) {
  return (
    <div className="yza-chart">
      <ResponsiveContainer height={height} width="100%">
        <RechartsLineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            cursor={{ stroke: "var(--yza-border-default)", strokeDasharray: "4 4" }}
          />

          {series.map((item, index) => (
            <Line
              activeDot={{ r: 4 }}
              dataKey={item.key}
              dot={false}
              key={item.key}
              name={item.label}
              stroke={getSeriesColor(item.color, index)}
              strokeWidth={2.5}
              type="monotone"
            />
          ))}
        </RechartsLineChart>
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
