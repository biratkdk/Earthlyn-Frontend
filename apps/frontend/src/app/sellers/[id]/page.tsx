"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import apiClient from "@/lib/api/client";
import { getAssetUrl } from "@/lib/utils/assets";
import { useCartStore } from "@/lib/store/cart";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { getErrorMessage } from "@/lib/utils/errors";

const TIER_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  SEEDLING:      { label: "Seedling",      color: "text-green-600 bg-green-50 border-green-200",   emoji: "🌱" },
  SPROUT:        { label: "Sprout",        color: "text-emerald-600 bg-emerald-50 border-emerald-200", emoji: "🌿" },
  BLOOM:         { label: "Bloom",         color: "text-teal-600 bg-teal-50 border-teal-200",       emoji: "🌸" },
  EVERGREEN:     { label: "Evergreen",     color: "text-blue-600 bg-blue-50 border-blue-200",       emoji: "🌲" },
  EARTH_GUARDIAN:{ label: "Earth Guardian",color: "text-purple-600 bg-purple-50 border-purple-200", emoji: "🌍" },
};

interface SellerStorefront {
  id: string;
  name: string;
  tier: string;
  isVerified: boolean;
  memberSince: string;
  totalSales: number;
  totalOrders: number;
  avgRating: number | null;
  reviewCount: number;
  products: Array<{
    id: string;
    name: string;
    description?: string;
    price: number | string;
    imageUrl?: string | null;
    ecoScore: number;
    category: string;
    stock: number;
  }>;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map((s) => (
        <svg key={s} viewBox="0 0 20 20" fill={s <= Math.round(rating) ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth={1.5} className="w-4 h-4">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-sm text-gray-600 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function SellerStorefrontPage() {
  const params = useParams();
  const id = params?.id as string;
  const { addItem } = useCartStore();
  const { notify } = useToast();
  const [seller, setSeller] = useState<SellerStorefront | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    apiClient.get<SellerStorefront>(`/sellers/public/${id}`)
      .then(({ data }) => setSeller(data))
      .catch((err) => setError(getErrorMessage(err, "Failed to load seller.")))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAddToCart = (product: SellerStorefront["products"][number]) => {
    addItem({ id: product.id, name: product.name, price: Number(product.price), quantity: 1, sellerId: id, imageUrl: product.imageUrl });
    notify(`${product.name} added to cart`, "success");
  };

  if (loading) return <LoadingState />;
  if (error || !seller) return <div className="max-w-4xl mx-auto px-4 py-10"><ErrorState message={error || "Seller not found"} /></div>;

  const tierCfg = TIER_CONFIG[seller.tier] ?? { label: seller.tier, color: "text-gray-600 bg-gray-50 border-gray-200", emoji: "🌿" };
  const memberYear = new Date(seller.memberSince).getFullYear();

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="card p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-4xl flex-shrink-0">
            {tierCfg.emoji}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{seller.name}</h1>
              {seller.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  ✓ Verified
                </span>
              )}
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tierCfg.color}`}>
                {tierCfg.emoji} {tierCfg.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-gray-600 mb-4">
              <span>Member since {memberYear}</span>
              <span>{seller.totalOrders} orders completed</span>
              <span>${seller.totalSales.toLocaleString()} in sales</span>
            </div>

            {seller.avgRating !== null && (
              <div className="flex items-center gap-2">
                <StarRating rating={seller.avgRating} />
                <span className="text-sm text-gray-500">({seller.reviewCount} reviews)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{seller.products.length} Products</h2>
        <Link href="/products" className="btn-secondary text-sm">Browse All</Link>
      </div>

      {seller.products.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">No products listed yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {seller.products.map((product) => {
            const imageUrl = getAssetUrl(product.imageUrl);
            return (
              <div key={product.id} className="card p-4 flex flex-col gap-3">
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[var(--muted)]">
                  {imageUrl ? (
                    <Image src={imageUrl} alt={product.name} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">No image</div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-[var(--accent)]">{product.category}</p>
                  <h3 className="font-semibold mt-0.5 line-clamp-2">{product.name}</h3>
                  {product.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xl font-bold text-[var(--accent)]">${Number(product.price).toFixed(2)}</span>
                    <span className="badge">Eco {product.ecoScore}</span>
                  </div>
                </div>
                <div className="flex gap-2">
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
