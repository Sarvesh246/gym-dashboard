import { Skeleton, SkeletonCard, SkeletonText } from "./SkeletonBase";

export function RecoverySkeleton() {
  return (
    <div className="px-4 py-6 md:px-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <SkeletonText className="w-32 h-7" />

      {/* Readiness card */}
      <SkeletonCard className="space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonText className="w-28 h-5" />
          <Skeleton className="w-20 h-7 rounded-full" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonText className="w-full" />
            <SkeletonText className="w-3/4" />
            <SkeletonText className="w-1/2" />
          </div>
        </div>
      </SkeletonCard>

      {/* Recovery markers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="space-y-2">
            <SkeletonText className="w-16" />
            <Skeleton className="w-12 h-7" />
            <Skeleton className="w-full h-1.5 rounded-full" />
          </SkeletonCard>
        ))}
      </div>

      {/* Trend chart */}
      <SkeletonCard className="space-y-3">
        <SkeletonText className="w-36 h-5" />
        <Skeleton className="w-full h-40 rounded-xl" />
      </SkeletonCard>

      {/* Recommendations */}
      <div className="space-y-3">
        <SkeletonText className="w-36 h-5" />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="flex items-start gap-3">
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <SkeletonText className="w-40" />
              <SkeletonText className="w-full" />
              <SkeletonText className="w-2/3" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
