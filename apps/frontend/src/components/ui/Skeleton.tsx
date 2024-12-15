interface SkeletonProps {
  className?: string;
}

function makeSkeletonKeys(prefix: string, count: number) {
  return Array.from({ length: count }, (_unused, position) => `${prefix}-${position + 1}`);
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-black/10 ${className}`}
      aria-hidden="true"
    />
  );
}

interface LoadingStateProps {
  className?: string;
  rows?: number;
}

export function LoadingState({
  className = "mx-auto max-w-7xl px-4 py-10",
  rows = 3,
}: LoadingStateProps) {
  return (
    <div className={className} role="status" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <div className="mt-6 space-y-3">
        {makeSkeletonKeys("loading-row", rows).map((key) => (
          <Skeleton key={key} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="space-y-3 p-6" role="status" aria-label="Loading table">
      {makeSkeletonKeys("table-skeleton-row", rows).map((rowKey) => (
        <div
          key={rowKey}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {makeSkeletonKeys(`${rowKey}-cell`, columns).map((cellKey) => (
            <Skeleton key={cellKey} className="h-8" />
          ))}
        </div>
      ))}
    </div>
  );
}
