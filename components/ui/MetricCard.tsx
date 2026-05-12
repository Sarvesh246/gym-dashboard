"use client";

import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/utility/AnimatedNumber";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus,
  Zap, Moon, Heart, Brain, Activity,
  Flame, Apple, Droplets, Dumbbell,
  Beef, Calendar, Clock, Plus, UtensilsCrossed,
} from "lucide-react";

const ICON_MAP = {
  Zap, Moon, Heart, Brain, Activity,
  Flame, Apple, Droplets, Dumbbell,
  Beef, Calendar, Clock, Plus, UtensilsCrossed,
  TrendingUp,
} as const;

export type MetricIconName = keyof typeof ICON_MAP;

type MetricColor = "accent" | "success" | "warning" | "danger" | "neutral";

interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  secondaryValue?: string;
  icon: MetricIconName;
  color?: MetricColor;
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
  animateValue?: boolean;
  className?: string;
}

const colorMap: Record<MetricColor, { icon: string; badge: string }> = {
  accent:  { icon: "text-primary",  badge: "bg-primary/10" },
  success: { icon: "text-success",  badge: "bg-success/10" },
  warning: { icon: "text-warning",  badge: "bg-warning/10" },
  danger:  { icon: "text-danger",   badge: "bg-danger/10" },
  neutral: { icon: "text-muted-foreground", badge: "bg-muted" },
};

const TrendIcon = ({ trend }: { trend: "up" | "down" | "flat" }) => {
  if (trend === "up") return <TrendingUp size={12} className="text-success" />;
  if (trend === "down") return <TrendingDown size={12} className="text-danger" />;
  return <Minus size={12} className="text-muted-foreground" />;
};

export function MetricCard({
  label,
  value,
  unit,
  secondaryValue,
  icon,
  color = "accent",
  trend,
  trendLabel,
  animateValue = true,
  className,
}: MetricCardProps) {
  const colors = colorMap[color];
  const isNumeric = typeof value === "number";
  const Icon = ICON_MAP[icon];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "rounded-2xl border border-border bg-card p-4 flex flex-col gap-3",
        className
      )}
    >
      {/* Icon */}
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", colors.badge)}>
        <Icon size={18} className={colors.icon} />
      </div>

      {/* Value */}
      <div>
        <div className="flex items-baseline gap-1 leading-none">
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {isNumeric && animateValue ? (
              <AnimatedNumber value={value as number} decimals={value % 1 !== 0 ? 1 : 0} />
            ) : (
              <span>{value}</span>
            )}
          </span>
          {unit && <span className="text-sm text-muted-foreground font-medium">{unit}</span>}
        </div>
        {secondaryValue && (
          <p className="text-xs text-muted-foreground mt-0.5">{secondaryValue}</p>
        )}
      </div>

      {/* Label + trend */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        {trend && (
          <div className="flex items-center gap-1">
            <TrendIcon trend={trend} />
            {trendLabel && <span className="text-xs text-muted-foreground">{trendLabel}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
