import { Skeleton, SkeletonCard, SkeletonText } from "./SkeletonBase";

export function WorkoutSkeleton() {
  return (
    <div className="px-4 py-6 md:px-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonText className="w-36 h-7" />
        <Skeleton className="w-28 h-9 rounded-xl" />
      </div>

      {/* Today's session card */}
      <SkeletonCard className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <SkeletonText className="w-32 h-5" />
            <SkeletonText className="w-48" />
          </div>
          <Skeleton className="w-20 h-7 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <SkeletonText className="w-16" />
              <SkeletonText className="w-12 h-6" />
            </div>
          ))}
        </div>
        <Skeleton className="w-full h-9 rounded-xl" />
      </SkeletonCard>

      {/* Exercise list */}
      <div className="space-y-3">
        <SkeletonText className="w-32 h-5" />
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="flex items-center gap-4">
            <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <SkeletonText className="w-32" />
              <SkeletonText className="w-48" />
            </div>
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
          </SkeletonCard>
        ))}
      </div>

      {/* History */}
      <div className="space-y-3">
        <SkeletonText className="w-24 h-5" />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="space-y-2">
            <div className="flex justify-between">
              <SkeletonText className="w-28" />
              <SkeletonText className="w-16" />
            </div>
            <SkeletonText className="w-40" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
