interface ErrorStateProps {
  title?: string;
  message: string;
  className?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  className = "",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      className={`rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 ${className}`}
      role="alert"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-red-700">{message}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full border border-red-300 px-3 py-1 font-semibold text-red-800 hover:bg-red-100"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
