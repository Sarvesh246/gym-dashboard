"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { MobileNav } from "./MobileNav";
import { DesktopNav } from "./DesktopNav";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { InstallPromptBanner } from "@/components/offline/InstallPromptBanner";
import { ReactNode } from "react";

const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.14, ease: "easeIn" },
  },
};

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  // These routes render full-screen without the app shell navigation
  const FULL_SCREEN_ROUTES = ["/onboarding", "/login", "/signup", "/privacy", "/terms"];
  if (FULL_SCREEN_ROUTES.some((r) => pathname.startsWith(r))) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <OfflineBanner />
      <DesktopNav />

      {/* Main content — offset for desktop sidebar, padded for mobile nav */}
      <main className="md:pl-60 pb-28 md:pb-8 min-h-screen">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <MobileNav />
      <InstallPromptBanner />
    </div>
  );
}
