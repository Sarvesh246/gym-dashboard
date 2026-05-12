import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/utility/SectionHeader";
import { ReactNode } from "react";

interface SectionContainerProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionContainer({ title, subtitle, action, children, className }: SectionContainerProps) {
  return (
    <section className={cn("mb-8", className)}>
      {title && <SectionHeader title={title} subtitle={subtitle} action={action} />}
      {children}
    </section>
  );
}
