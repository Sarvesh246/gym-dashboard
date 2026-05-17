import { AlertCircle } from "lucide-react";
import { RetryButton } from "./RetryButton";

interface FullPageErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function FullPageError({
  title = "Something went wrong",
  message = "An unexpected error occurred. Your data is safe.",
  onRetry,
}: FullPageErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
        <AlertCircle size={24} className="text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">{message}</p>
      {onRetry && <RetryButton onRetry={onRetry} />}
    </div>
  );
}
