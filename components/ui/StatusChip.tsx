import { cn } from "@/lib/utils";

type ChipVariant = "success" | "warning" | "danger" | "accent" | "neutral";

interface StatusChipProps {
  label: string;
  variant?: ChipVariant;
  className?: string;
}

const variantStyles: Record<ChipVariant, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger:  "bg-danger/10 text-danger border-danger/20",
  accent:  "bg-primary/10 text-primary border-primary/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

const dotStyles: Record<ChipVariant, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger:  "bg-danger",
  accent:  "bg-primary",
  neutral: "bg-muted-foreground",
};

export function StatusChip({ label, variant = "neutral", className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotStyles[variant])} />
      {label}
    </span>
  );
}
