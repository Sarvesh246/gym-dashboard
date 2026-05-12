"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Pause, RotateCcw } from "lucide-react";

interface Props {
  durationSeconds: number;
  onComplete?: () => void;
  onDismiss?: () => void;
}

export function RestTimer({ durationSeconds, onComplete, onDismiss }: Props) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isRunning) { stop(); return; }

    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          stop();
          setIsRunning(false);
          onComplete?.();
          return 0;
        }
        return r - 1;
      });
    }, 1000);

    return stop;
  }, [isRunning, stop, onComplete]);

  const reset = () => {
    stop();
    setRemaining(durationSeconds);
    setIsRunning(true);
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = (remaining / durationSeconds) * 100;

  const timerColor =
    remaining > durationSeconds * 0.5
      ? "text-green-400"
      : remaining > durationSeconds * 0.25
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="fixed bottom-32 md:bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl p-4">
        {/* Progress bar */}
        <div className="h-1 rounded-full bg-muted mb-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Rest Timer</p>
            <p className={`text-3xl font-bold tabular-nums ${timerColor}`}>
              {minutes}:{seconds.toString().padStart(2, "0")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRunning((r) => !r)}
              className="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
              aria-label={isRunning ? "Pause" : "Resume"}
            >
              {isRunning ? (
                <Pause size={16} className="text-primary" />
              ) : (
                <Play size={16} className="text-primary" />
              )}
            </button>
            <button
              onClick={reset}
              className="w-10 h-10 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
              aria-label="Reset timer"
            >
              <RotateCcw size={14} className="text-muted-foreground" />
            </button>
            <button
              onClick={onDismiss}
              className="w-10 h-10 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
