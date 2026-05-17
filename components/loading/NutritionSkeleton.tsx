import { Skeleton, SkeletonCard, SkeletonText } from "./SkeletonBase";

export function NutritionSkeleton() {
  return (
    <div className="px-4 py-6 md:px-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonText className="w-28 h-7" />
        <Skeleton className="w-24 h-9 rounded-xl" />
      </div>

      {/* Macro summary */}
      <SkeletonCard className="space-y-4">
        <div className="flex justify-between items-center">
          <SkeletonText className="w-32 h-5" />
          <SkeletonText className="w-20" />
        </div>
        <Skeleton className="w-full h-3 rounded-full" />
        <div className="grid grid-cols-3 gap-4">
          {["Protein", "Carbs", "Fat"].map((label) => (
            <div key={label} className="space-y-2">
              <SkeletonText className="w-12" />
              <Skeleton className="w-full h-2 rounded-full" />
              <SkeletonText className="w-16 h-5" />
            </div>
          ))}
        </div>
      </SkeletonCard>

      {/* Meal log */}
      <div className="space-y-3">
        <SkeletonText className="w-20 h-5" />
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonText className="w-24 h-5" />
              <SkeletonText className="w-16" />
            </div>
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1">
                  <SkeletonText className="w-36" />
                  <SkeletonText className="w-24" />
                </div>
                <SkeletonText className="w-12" />
              </div>
            ))}
          </SkeletonCard>
        ))}
      </div>

      {/* Hydration */}
      <SkeletonCard className="space-y-3">
        <SkeletonText className="w-20 h-5" />
        <div className="flex items-center gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="w-8 h-8 rounded-lg" />
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}
