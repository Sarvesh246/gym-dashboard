import { Skeleton, SkeletonCard, SkeletonText } from "./SkeletonBase";

export function DashboardSkeleton() {
  return (
    <div className="px-4 py-6 md:px-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <SkeletonText className="w-44 h-7" />
          <SkeletonText className="w-32 h-4" />
        </div>
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>

      {/* Metric cards */}
      <div>
        <SkeletonText className="w-32 h-5 mb-3" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="space-y-3">
              <Skeleton className="w-9 h-9 rounded-xl" />
              <Skeleton className="w-16 h-7" />
              <SkeletonText className="w-20" />
            </SkeletonCard>
          ))}
        </div>
      </div>

      {/* Nutrition widget */}
      <div>
        <SkeletonText className="w-20 h-5 mb-3" />
        <SkeletonCard className="space-y-4">
          <div className="flex justify-between">
            <SkeletonText className="w-28" />
            <SkeletonText className="w-16" />
          </div>
          <Skeleton className="w-full h-2 rounded-full" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <SkeletonText className="w-12" />
                <SkeletonText className="w-16 h-5" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>

      {/* Charts grid */}
      <div>
        <SkeletonText className="w-16 h-5 mb-3" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="space-y-3">
              <div className="flex justify-between">
                <SkeletonText className="w-28" />
                <SkeletonText className="w-20" />
              </div>
              <Skeleton className="w-full h-32 rounded-xl" />
            </SkeletonCard>
          ))}
        </div>
      </div>

      {/* Trend sparklines */}
      <div>
        <SkeletonText className="w-40 h-5 mb-3" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="space-y-2">
              <SkeletonText className="w-16" />
              <Skeleton className="w-full h-14 rounded-lg" />
              <SkeletonText className="w-12 h-5" />
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  );
}
