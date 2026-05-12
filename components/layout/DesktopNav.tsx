"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, SETTINGS_NAV, APP_NAME } from "@/lib/constants";
import { ThemeToggle } from "@/components/utility/ThemeToggle";
import { Settings, Activity } from "lucide-react";

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 hidden md:flex w-60 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
          <Activity size={16} className="text-primary-foreground" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold text-foreground tracking-tight">{APP_NAME}</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors group",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="desktop-nav-indicator"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: "spring", stiffness: 380, damping: 35 }}
                />
              )}
              <Icon
                size={18}
                strokeWidth={isActive ? 2.5 : 1.8}
                className="relative z-10 shrink-0"
              />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3 space-y-0.5">
        <Link
          href={SETTINGS_NAV.href}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === SETTINGS_NAV.href
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Settings size={18} strokeWidth={1.8} />
          <span>Settings</span>
        </Link>

        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          {/* Avatar placeholder */}
          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-primary">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">Alex Morgan</p>
            <p className="text-[10px] text-muted-foreground truncate">Premium</p>
          </div>
          <ThemeToggle size="sm" />
        </div>
      </div>
    </aside>
  );
}
