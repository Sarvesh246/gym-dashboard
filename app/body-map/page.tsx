import { Metadata } from "next";
import { Suspense } from "react";
import { BodyMapPageClient } from "./BodyMapPageClient";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageContainer } from "@/components/layout/PageContainer";

export const metadata: Metadata = {
  title: "Body Map | Myostat",
  description: "Visualize your muscle recovery status and training load distribution",
};

/**
 * Body Map Page
 * Server component that renders the client-side body map visualization
 * Wrapped in Suspense to support useSearchParams in the client component
 */
export default function BodyMapPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense
        fallback={
          <PageContainer>
            <div className="py-12">
              <LoadingState />
            </div>
          </PageContainer>
        }
      >
        <BodyMapPageClient />
      </Suspense>
    </div>
  );
}
