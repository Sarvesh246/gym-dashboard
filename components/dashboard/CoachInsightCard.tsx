"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StoredInsight } from "@/services/reports/weekly";

interface DashboardInsight {
  text: string;
  type: StoredInsight["type"];
  priority: StoredInsight["priority"];
}

interface CoachInsightCardProps {
  maxCards?: number;
}

const typeStyles: Record<StoredInsight["type"], { border: string; label: string; dot: string }> = {
  warning: {
    border: "border-l-[color:var(--color-warning)]",
    label: "Warning",
    dot: "bg-[color:var(--color-warning)]",
  },
  recommendation: {
    border: "border-l-[color:var(--color-primary)]",
    label: "Recommendation",
    dot: "bg-[color:var(--color-primary)]",
  },
  observation: {
    border: "border-l-[color:var(--color-muted-foreground)]",
    label: "Coach Note",
    dot: "bg-[color:var(--color-muted-foreground)]",
  },
};

function SingleInsight({ insight }: { insight: DashboardInsight }) {
  const style = typeStyles[insight.type];
  return (
    <div
      className={`border-l-2 pl-3 py-2 ${style.border}`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {style.label}
        </span>
      </div>
      <p className="text-xs text-foreground leading-snug">{insight.text}</p>
    </div>
  );
}

export default function CoachInsightCard({ maxCards = 2 }: CoachInsightCardProps) {
  const router = useRouter();
  const [insights, setInsights] = useState<DashboardInsight[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/reports/weekly");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const report = data?.report;
        if (!report || cancelled) return;

        setSummary(report.summary ?? null);

        // Prioritize: high-priority warnings first, then recs
        const combined: DashboardInsight[] = [
          ...(report.insights ?? []),
          ...(report.recommendations ?? []),
        ]
          .sort((a: DashboardInsight, b: DashboardInsight) => {
            const p: Record<string, number> = { high: 3, medium: 2, low: 1 };
            return (p[b.priority] ?? 0) - (p[a.priority] ?? 0);
          })
          .slice(0, maxCards);

        setInsights(combined);
      } catch {
        // Silently fail — AI insights are non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [maxCards]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
        <div className="h-3 w-24 bg-muted rounded mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-muted rounded" />
          <div className="h-3 w-4/5 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!summary && insights.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">Coach</span>
          <span className="text-[10px] text-muted-foreground opacity-60 uppercase tracking-wide">
            Weekly
          </span>
        </div>
        <button
          onClick={() => router.push("/reports/weekly")}
          className="text-xs text-primary font-medium"
        >
          Full report →
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* One-line summary */}
        {summary && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{summary}</p>
        )}

        {/* Top insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <SingleInsight key={i} insight={insight} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
