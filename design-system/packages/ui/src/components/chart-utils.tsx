export interface ChartDatum {
  [key: string]: string | number | null | undefined;
}

export interface ChartSeries {
  color?: string;
  key: string;
  label: string;
}

export interface DonutSlice {
  color?: string;
  id: string;
  label: string;
  value: number;
}

const fallbackPalette = [
  "var(--yza-color-brand-500)",
  "var(--yza-color-info-500)",
  "var(--yza-color-success-500)",
  "var(--yza-color-warning-500)",
  "var(--yza-color-danger-500)",
  "var(--yza-color-accent-400)"
];

export function getSeriesColor(color: string | undefined, index: number) {
  return color ?? fallbackPalette[index % fallbackPalette.length];
}

export function formatChartValue(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? `${value}` : value.toFixed(1);
  }

  return value ?? "--";
}
