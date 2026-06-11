export function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-48 bg-muted rounded" />
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="h-3 w-16 bg-muted rounded" />
            <div className="h-6 w-10 bg-muted rounded" />
          </div>
        ))}
      </div>
      {/* Orders card */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="h-4 w-32 bg-muted rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3">
            <div className="space-y-1.5">
              <div className="h-3 w-28 bg-muted rounded" />
              <div className="h-3 w-20 bg-muted rounded" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-16 bg-muted rounded-full" />
              <div className="h-4 w-12 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
