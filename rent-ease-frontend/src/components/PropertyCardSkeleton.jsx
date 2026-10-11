export default function PropertyCardSkeleton() {
  return (
    <div className="card overflow-hidden flex flex-col justify-between border border-black/5 dark:border-white/5 bg-white dark:bg-slate-900 shadow-sm animate-pulse">
      <div>
        {/* Image Placeholder */}
        <div className="relative h-48 w-full bg-slate-200 dark:bg-slate-800/80">
          {/* Badge Skeleton */}
          <div className="absolute left-3 top-3 h-5 w-16 rounded-full bg-slate-300 dark:bg-slate-700/80" />
        </div>

        {/* Content Placeholder */}
        <div className="p-5 space-y-3">
          {/* Title line */}
          <div className="h-5 w-4/5 rounded-lg bg-slate-200 dark:bg-slate-800" />
          
          {/* Location line */}
          <div className="h-4 w-1/2 rounded-md bg-slate-200 dark:bg-slate-800" />
          
          {/* Price line */}
          <div className="h-6 w-2/5 rounded-lg bg-slate-200 dark:bg-slate-800" />

          {/* Stats pills */}
          <div className="flex items-center gap-3 pt-1">
            <div className="h-4 w-14 rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-14 rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-16 rounded-md bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>

      {/* Button Placeholder */}
      <div className="px-5 pb-5 pt-0">
        <div className="h-10 w-full rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}
