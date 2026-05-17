import { Skeleton, SkeletonCard, SkeletonText } from "./SkeletonBase";

export function BodyMapSkeleton() {
  return (
    <div className="px-4 py-6 md:px-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <SkeletonText className="w-32 h-7" />

      {/* Body map + zone list */}
      <SkeletonCard>
        <div className="flex items-start gap-5">
          {/* SVG figure placeholder */}
          <Skeleton className="w-36 h-64 rounded-2xl shrink-0" />

          {/* Zone bars */}
          <div className="flex-1 space-y-3 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <SkeletonText className="w-16 shrink-0" />
                <Skeleton className="flex-1 h-1.5 rounded-full" />
                <SkeletonText className="w-5 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-5 pt-4 mt-4 border-t border-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Skeleton className="w-2 h-2 rounded-full shrink-0" />
              <SkeletonText className="w-16" />
            </div>
          ))}
        </div>
      </SkeletonCard>

      {/* Muscle detail cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
              <div className="space-y-1">
                <SkeletonText className="w-24" />
                <SkeletonText className="w-16" />
              </div>
            </div>
            <Skeleton className="w-full h-1.5 rounded-full" />
            <SkeletonText className="w-full" />
            <SkeletonText className="w-3/4" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
