"use client";

import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

type ChartType = "area" | "bar" | "line";

interface ChartPlaceholderProps {
  type?: ChartType;
  data: Array<Record<string, string | number>>;
  dataKey: string;
  color?: string;
  height?: number;
  className?: string;
  showXAxis?: boolean;
  showYAxis?: boolean;
}

// Map CSS var names to fallback hex for recharts (which can't read CSS vars directly)
const COLOR_MAP: Record<string, string> = {
  primary: "#3B82F6",
  success: "#22C55E",
  warning: "#F59E0B",
  danger:  "#EF4444",
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number | string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-semibold text-foreground">{payload[0].value}</p>
    </div>
  );
}

export function ChartPlaceholder({
  type = "area",
  data,
  dataKey,
  color = "primary",
  height = 140,
  className,
  showXAxis = false,
  showYAxis = false,
}: ChartPlaceholderProps) {
  const strokeColor = COLOR_MAP[color] ?? color;
  const fillColor = strokeColor;

  const commonProps = {
    data,
    margin: { top: 4, right: 0, left: 0, bottom: 0 },
  };

  const axisProps = {
    tick: { fill: "var(--muted-foreground)", fontSize: 10 },
    axisLine: false as const,
    tickLine: false as const,
  };

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        {type === "bar" ? (
          <BarChart {...commonProps}>
            {showXAxis && <XAxis dataKey="date" {...axisProps} />}
            {showYAxis && <YAxis {...axisProps} width={28} />}
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
            <Bar dataKey={dataKey} fill={fillColor} radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        ) : type === "line" ? (
          <LineChart {...commonProps}>
            {showXAxis && <XAxis dataKey="date" {...axisProps} />}
            {showYAxis && <YAxis {...axisProps} width={28} />}
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={strokeColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: strokeColor }}
            />
          </LineChart>
        ) : (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={fillColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            {showXAxis && <XAxis dataKey="date" {...axisProps} />}
            {showYAxis && <YAxis {...axisProps} width={28} />}
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#grad-${color})`}
              dot={false}
              activeDot={{ r: 4, fill: strokeColor }}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
