"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <p className="text-sm uppercase tracking-[0.25em] text-red-700">
        Error
      </p>
      <h1 className="mt-3 text-4xl">Something went wrong</h1>
      <p className="mt-3 text-gray-600">{error.message}</p>
      <button onClick={reset} className="btn-primary mt-8">
        Try Again
      </button>
    </div>
  );
}
