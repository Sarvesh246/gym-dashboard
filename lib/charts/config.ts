// Reusable Recharts configuration utilities.
// All configs are theme-aware via CSS custom properties.

export const CHART_COLORS = {
  primary: "hsl(var(--color-primary))",
  success: "hsl(var(--color-success))",
  warning: "hsl(var(--color-warning))",
  destructive: "hsl(var(--color-destructive))",
  muted: "hsl(var(--color-muted-foreground))",
  border: "hsl(var(--color-border))",
} as const;

export type ChartColorKey = keyof typeof CHART_COLORS;

export const CHART_MARGINS = {
  compact: { top: 4, right: 4, left: -28, bottom: 4 },
  default: { top: 8, right: 8, left: -20, bottom: 4 },
  labeled: { top: 8, right: 16, left: 0, bottom: 4 },
} as const;

export const TOOLTIP_STYLE = {
  contentStyle: {
    fontSize: 11,
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid hsl(var(--color-border))",
    background: "hsl(var(--color-card))",
    color: "hsl(var(--color-foreground))",
  },
  itemStyle: { color: "hsl(var(--color-foreground))" },
  cursor: { stroke: "hsl(var(--color-border))", strokeWidth: 1 },
} as const;

export const AXIS_TICK_STYLE = {
  fontSize: 10,
  fill: "hsl(var(--color-muted-foreground))",
} as const;

export const GRID_STYLE = {
  stroke: "hsl(var(--color-border))",
  strokeDasharray: "3 3",
  strokeOpacity: 0.5,
} as const;

/** Standard line props for a clean, smooth line chart series. */
export function lineProps(color: string, dashed = false) {
  return {
    type: "monotone" as const,
    stroke: color,
    strokeWidth: 2,
    dot: false as const,
    activeDot: { r: 3, strokeWidth: 0, fill: color },
    strokeDasharray: dashed ? "4 4" : undefined,
  };
}

/** Area gradient fill props. */
export function areaProps(color: string, gradientId: string) {
  return {
    type: "monotone" as const,
    stroke: color,
    strokeWidth: 2,
    fill: `url(#${gradientId})`,
    dot: false as const,
    activeDot: { r: 3, strokeWidth: 0, fill: color },
  };
}

/** Generate a linear gradient definition for an area chart. */
export function gradientDef(id: string, color: string) {
  return { id, color, startOpacity: 0.25, stopOpacity: 0.02 };
}
