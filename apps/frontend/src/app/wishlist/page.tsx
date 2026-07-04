"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { useToast } from "@/components/ui/ToastProvider";
import apiClient from "@/lib/api/client";
import type { ApiProduct } from "@/lib/types/api";
import { getAssetUrl } from "@/lib/utils/assets";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { getErrorMessage } from "@/lib/utils/errors";

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

type WishlistProduct = ApiProduct & { wishlistId?: string };

export default function WishlistPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const { addItem } = useCartStore();
  const { notify } = useToast();
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const loadWishlist = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get<WishlistProduct[]>("/wishlist");
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load wishlist."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) { router.push("/login"); return; }
    void loadWishlist();
  }, [isHydrated, user, router, loadWishlist]);

  const handleRemove = async (productId: string) => {
    if (toggling.has(productId)) return;
    setToggling((prev) => new Set(prev).add(productId));
    try {
      await apiClient.post(`/wishlist/${productId}`);
      setItems((prev) => prev.filter((p) => p.id !== productId));
      notify("Removed from wishlist", "success");
    } catch {
      notify("Failed to remove", "error");
    } finally {
      setToggling((prev) => { const next = new Set(prev); next.delete(productId); return next; });
    }
  };

  const handleAddToCart = (product: WishlistProduct) => {
    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      sellerId: product.sellerId || product.seller?.id || "unknown",
      imageUrl: product.imageUrl,
    });
    notify(`${product.name} added to cart`, "success");
  };

  if (!isHydrated) return <LoadingState />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl">My Wishlist</h1>
          <p className="text-gray-500 mt-1">{items.length} saved item{items.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/products" className="btn-secondary">Browse Products</Link>
      </div>

      {loading ? (
        <LoadingState rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadWishlist} />
      ) : items.length === 0 ? (
        <div className="text-center py-20 card">
          <div className="text-6xl mb-4">🤍</div>
          <h2 className="text-2xl mb-2">No saved items yet</h2>
          <p className="text-gray-500 mb-6">Save products you love by clicking the heart icon.</p>
          <Link href="/products" className="btn-primary">Explore Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((product) => {
            const imageUrl = getAssetUrl(product.imageUrl);
            return (
              <div key={product.id} className="card p-4 flex flex-col gap-3">
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[var(--muted)]">
                  {imageUrl ? (
                    <Image src={imageUrl} alt={product.name} fill sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">No image</div>
                  )}
                  <button
                    onClick={() => handleRemove(product.id)}
                    disabled={toggling.has(product.id)}
                    className="absolute top-2 right-2 p-2 rounded-full bg-white/90 text-red-500 hover:bg-white shadow-sm transition-all"
                    aria-label="Remove from wishlist"
                  >
                    <HeartIcon filled />
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-[var(--accent)]">{product.category}</p>
                  <h3 className="font-semibold mt-0.5 line-clamp-2">{product.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xl font-bold text-[var(--accent)]">${Number(product.price).toFixed(2)}</span>
                    <span className="badge">Eco {product.ecoScore}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-auto">
                  <Link href={`/products/preview/${product.id}`} className="btn-secondary flex-1 text-center text-sm py-2">View</Link>
                  {product.stock > 0 ? (
                    <button onClick={() => handleAddToCart(product)} className="btn-primary flex-1 text-sm py-2">Add to Cart</button>
                  ) : (
                    <button disabled className="flex-1 rounded-full bg-gray-200 text-gray-500 text-sm py-2">Out of Stock</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
