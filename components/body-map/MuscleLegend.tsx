"use client";

import React from "react";

interface LegendItem {
  color: string;
  label: string;
  description: string;
}

const LEGEND_ITEMS: LegendItem[] = [
  { color: "#22C55E", label: "Recovered",     description: "Ready for full training" },
  { color: "#F59E0B", label: "Moderate",      description: "Light–moderate fatigue" },
  { color: "#F97316", label: "High Fatigue",  description: "Reduce volume or intensity" },
  { color: "#EF4444", label: "Overloaded",    description: "Rest or active recovery" },
  { color: "#9CA3AF", label: "No Data",       description: "No recent training logged" },
];

interface MuscleLegendProps {
  className?: string;
  compact?: boolean;
}

/**
 * Color legend for the body map heatmap.
 * Shows recovery tier → color mapping in a compact row.
 */
export const MuscleLegend: React.FC<MuscleLegendProps> = ({
  className = "",
  compact = false,
}) => {
  if (compact) {
    return (
      <div className={`flex items-center gap-3 flex-wrap justify-center ${className}`}>
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Recovery Status
      </p>
      <div className="grid grid-cols-1 gap-2">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">{item.label}</span>
              <span className="text-xs text-muted-foreground ml-2">{item.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MuscleLegend;
