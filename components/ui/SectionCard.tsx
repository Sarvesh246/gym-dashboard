import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  padding = true,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card",
        padding ? "p-5" : "overflow-hidden",
        className
      )}
    >
      {(title || action) && (
        <div className={cn("flex items-start justify-between gap-4", padding ? "mb-4" : "px-5 pt-5 mb-4")}>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
