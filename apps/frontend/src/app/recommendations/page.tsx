"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApiProduct } from "@/lib/types/api";
import { getAssetUrl } from "@/lib/utils/assets";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { getErrorMessage } from "@/lib/utils/errors";
import { getRecommendations } from "@/lib/api/growth";

export default function RecommendationsPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const { addItem } = useCartStore();
  const { notify } = useToast();
  const [recommendations, setRecommendations] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const loadRecommendations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      setRecommendations(await getRecommendations(6));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load recommendations."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push("/login");
      return;
    }

    void loadRecommendations();
  }, [isHydrated, router, user, retryKey, loadRecommendations]);

  const handleAddToCart = (product: ApiProduct) => {
    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      sellerId: product.sellerId || product.seller?.id || "unknown",
      imageUrl: product.imageUrl,
    });
    notify(`${product.name} added to cart.`, "success");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="badge inline-block">For You</p>
          <h1 className="mt-4 text-4xl">Personalized Recommendations</h1>
          <p className="mt-2 max-w-2xl text-gray-600">
            Ranked by eco score, availability, and categories from your order
            history.
          </p>
        </div>
        <Link href="/products" className="btn-secondary">
          Browse all products
        </Link>
      </div>

      {!isHydrated || loading ? (
        <LoadingState className="mt-6" rows={3} />
      ) : error ? (
        <ErrorState
          className="mt-6"
          message={error}
          onRetry={() => setRetryKey((current) => current + 1)}
        />
      ) : recommendations.length === 0 ? (
        <div className="card mt-6 p-6">
          <h2 className="text-xl font-semibold">No matches yet</h2>
          <p className="mt-2 text-gray-600">
            More order history improves recommendations. Browse the catalog to
            seed your For You feed.
          </p>
          <Link href="/products" className="btn-primary mt-4 inline-block">
            Explore products
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recommendations.map((product, index) => {
            const outOfStock = Number(product.stock || 0) <= 0;

            return (
              <div key={product.id} className="card overflow-hidden">
                <Link href={`/products/preview/${product.id}`} className="block">
                  <div className="aspect-[4/3] bg-[var(--muted)]">
                    {getAssetUrl(product.imageUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getAssetUrl(product.imageUrl) || ""}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-500">
                        No image
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--accent)]">
                      {product.category}
                    </p>
                    <span className="badge">Match #{index + 1}</span>
                  </div>
                  <Link href={`/products/preview/${product.id}`}>
                    <h2 className="mt-2 text-xl hover:text-[var(--accent)]">
                      {product.name}
                    </h2>
                  </Link>
                  <p className="mt-2 text-sm text-gray-600">
                    Recommended for category fit, eco score, and available
                    stock.
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-semibold">
                      ${Number(product.price).toFixed(2)}
                    </span>
                    <span className="badge">Eco {product.ecoScore}</span>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <Link
                      href={`/products/preview/${product.id}`}
                      className="btn-secondary w-full text-center"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      disabled={outOfStock}
                      className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {outOfStock ? "Out" : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
