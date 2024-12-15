import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent)]">
        404
      </p>
      <h1 className="mt-3 text-4xl">Page not found</h1>
      <p className="mt-3 text-gray-600">
        The page may have moved, or the link may be outdated.
      </p>
      <Link href="/products" className="btn-primary mt-8 inline-block">
        Browse Products
      </Link>
    </div>
  );
}
