"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart2, Calendar, TrendingUp, ChevronRight } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface ReportCardProps {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
  accent: string;
}

function ReportCard({ title, subtitle, href, icon, accent }: ReportCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/40 hover:bg-primary/5 transition-all"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </Link>
  );
}

export default function ReportsPage() {
  const router = useRouter();

  const monthlyLinks = Array.from({ length: Math.min(currentMonth, 6) }, (_, i) => {
    const m = currentMonth - i;
    const y = m <= 0 ? currentYear - 1 : currentYear;
    const adjustedM = m <= 0 ? m + 12 : m;
    return { label: `${MONTHS[adjustedM - 1]} ${y}`, year: y, month: adjustedM };
  });

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Long-term analytics and performance insights
        </p>
      </div>

      {/* Primary report types */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Reports
        </h2>
        <div className="space-y-2">
          <ReportCard
            title="Weekly Report"
            subtitle="This week's performance, recovery & coaching"
            href="/reports/weekly"
            icon={<TrendingUp size={18} className="text-primary" />}
            accent="bg-primary/10"
          />
          <ReportCard
            title="Monthly Report"
            subtitle={`${MONTHS[currentMonth - 1]} ${currentYear} — adaptation trends & consistency`}
            href={`/reports/monthly?year=${currentYear}&month=${currentMonth}`}
            icon={<Calendar size={18} className="text-[color:var(--color-success)]" />}
            accent="bg-[color:var(--color-success)]/10"
          />
          <ReportCard
            title="Yearly Report"
            subtitle={`${currentYear} — long-term transformation & milestones`}
            href={`/reports/yearly?year=${currentYear}`}
            icon={<BarChart2 size={18} className="text-[color:var(--color-warning)]" />}
            accent="bg-[color:var(--color-warning)]/10"
          />
        </div>
      </section>

      {/* Recent months */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Recent Months
        </h2>
        <div className="space-y-2">
          {monthlyLinks.map(({ label, year, month }) => (
            <Link
              key={`${year}-${month}`}
              href={`/reports/monthly?year=${year}&month=${month}`}
              className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3.5 hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <span className="text-sm font-medium text-foreground">{label}</span>
              <ChevronRight size={15} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      {/* Prior years */}
      {currentYear > 2024 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Prior Years
          </h2>
          <div className="space-y-2">
            {Array.from({ length: Math.min(3, currentYear - 2023) }, (_, i) => {
              const y = currentYear - 1 - i;
              return (
                <Link
                  key={y}
                  href={`/reports/yearly?year=${y}`}
                  className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3.5 hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <span className="text-sm font-medium text-foreground">{y} Year in Review</span>
                  <ChevronRight size={15} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </PageContainer>
  );
}
