import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ErrorStateProps {
  message?: string;
  retry?: ReactNode;
  className?: string;
}

export function ErrorState({
  message = "Something went wrong",
  retry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-6 text-center", className)}>
      <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mb-4">
        <AlertCircle size={24} className="text-danger" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">Something went wrong</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      {retry && <div className="mt-4">{retry}</div>}
    </div>
  );
}
