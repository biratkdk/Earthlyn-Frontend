"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import apiClient from "@/lib/api/client";
import { useCartStore } from "@/lib/store/cart";
import { useAuthStore } from "@/lib/store/auth";
import type { ApiProduct, ApiProductReview } from "@/lib/types/api";
import { useToast } from "@/components/ui/ToastProvider";
import { getAssetUrl } from "@/lib/utils/assets";
import { LoadingState } from "@/components/ui/Skeleton";
import { getErrorMessage } from "@/lib/utils/errors";

interface ReviewResponse {
  items: ApiProductReview[];
  summary: { averageRating: number; totalReviews: number };
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24"
          fill={i < Math.round(value) ? "currentColor" : "none"}
          stroke="currentColor" strokeWidth="1.5"
          className={i < Math.round(value) ? "text-amber-400" : "text-gray-300"}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </span>
  );
}

function EcoBadge({ score }: { score: number | null | undefined }) {
  const s = Number(score ?? 0);
  const color = s >= 90 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : s >= 75 ? "bg-green-100 text-green-700 border-green-200"
    : "bg-yellow-100 text-yellow-700 border-yellow-200";
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${color}`}>
      🌿 Eco score {s}
    </span>
  );
}

export default function ProductPreview() {
  const params = useParams();
  const id = params?.id as string;
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const { notify } = useToast();

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [related, setRelated] = useState<ApiProduct[]>([]);
  const [reviews, setReviews] = useState<ApiProductReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 0, totalReviews: 0 });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setImgError(false);

    Promise.all([
      apiClient.get<ApiProduct>(`/products/${id}`),
      apiClient.get<ReviewResponse>(`/products/${id}/reviews`),
    ])
      .then(([productRes, reviewRes]) => {
        const p = productRes.data;
        setProduct(p);
        setReviews(reviewRes.data.items || []);
        setReviewSummary(reviewRes.data.summary || { averageRating: 0, totalReviews: 0 });

        // Load related products from same category
        if (p?.category) {
          apiClient
            .get<{ items?: ApiProduct[] }>(`/products?category=${encodeURIComponent(p.category)}&pageSize=4`)
            .then(({ data }) => {
              const items = (data as { items?: ApiProduct[] }).items ?? (Array.isArray(data) ? (data as ApiProduct[]) : []);
              setRelated(items.filter((r: ApiProduct) => r.id !== p.id).slice(0, 3));
            })
            .catch(() => setRelated([]));
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewSubmitting(true);
    try {
      await apiClient.post(`/products/${id}/reviews`, { rating, comment });
      const { data } = await apiClient.get<ReviewResponse>(`/products/${id}/reviews`);
      setReviews(data.items || []);
      setReviewSummary(data.summary || { averageRating: 0, totalReviews: 0 });
      setComment("");
      notify("Review submitted!", "success");
    } catch (err) {
      notify(getErrorMessage(err, "Could not save review."), "error");
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) return <LoadingState className="max-w-5xl mx-auto px-4 py-16" rows={5} />;

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">🌿</p>
        <h1 className="text-2xl font-bold text-[var(--ink)]">Product not found</h1>
        <p className="text-gray-500 mt-2 mb-6">This item may have been removed or is pending approval.</p>
        <Link href="/products" className="btn-primary">Browse all products</Link>
      </div>
    );
  }

  const stock = Number(product.stock ?? 0);
  const isOutOfStock = stock <= 0;
  const imageUrl = imgError ? null : getAssetUrl(product.imageUrl);
  const sellerName = product.seller?.user?.name ?? "Verified Seller";
  const price = Number(product.price);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/products" className="hover:text-[var(--accent)] transition-colors">Products</Link>
        <span>/</span>
        <Link href={`/products?category=${encodeURIComponent(product.category ?? "")}`}
          className="hover:text-[var(--accent)] transition-colors">{product.category}</Link>
        <span>/</span>
        <span className="text-[var(--ink)] font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main grid */}
      <div className="grid lg:grid-cols-2 gap-10">

        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-[var(--muted)] shadow-lg">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
              <span className="text-5xl">🌿</span>
              <span className="text-sm">No image available</span>
            </div>
          )}
          {/* Eco badge overlay */}
          <div className="absolute top-4 left-4">
            <EcoBadge score={product.ecoScore} />
          </div>
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-3xl">
              <span className="bg-white text-gray-800 font-bold px-4 py-2 rounded-full text-sm">Out of stock</span>
            </div>
          )}
        </div>

        {/* Details panel */}
        <div className="flex flex-col">
          <p className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">{product.category}</p>
          <h1 className="text-3xl font-bold text-[var(--ink)] leading-tight">{product.name}</h1>

          {/* Rating row */}
          {reviewSummary.totalReviews > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <StarRating value={reviewSummary.averageRating} />
              <span className="text-sm text-gray-600">
                {reviewSummary.averageRating.toFixed(1)} ({reviewSummary.totalReviews} review{reviewSummary.totalReviews !== 1 ? "s" : ""})
              </span>
            </div>
          )}

          {/* Price */}
          <div className="mt-6 flex items-end gap-3">
            <span className="text-4xl font-bold text-[var(--accent)]">${price.toFixed(2)}</span>
            {product.processingFee && Number(product.processingFee) > 0 && (
              <span className="text-sm text-gray-500 mb-1">+${Number(product.processingFee).toFixed(2)} processing fee</span>
            )}
          </div>

          {/* Seller */}
          <div className="mt-4 flex items-center gap-2.5 p-3 rounded-xl bg-[var(--muted)] border border-black/[0.06]">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-sm font-bold text-[var(--accent)]">
              {sellerName[0]}
            </div>
            <div>
              <p className="text-xs text-gray-500">Sold by</p>
              <p className="text-sm font-semibold text-[var(--ink)]">{sellerName}</p>
            </div>
            {product.seller?.isVerified && (
              <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">✓ Verified</span>
            )}
          </div>

          {/* Description */}
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-[var(--ink)] mb-2 uppercase tracking-wide">About this product</h2>
            <p className="text-gray-700 leading-relaxed">{product.description || "No description provided."}</p>
          </div>

          {/* Stock */}
          <div className="mt-5 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOutOfStock ? "bg-red-400" : stock < 10 ? "bg-amber-400" : "bg-emerald-500"}`} />
            <span className="text-sm text-gray-600">
              {isOutOfStock ? "Out of stock" : stock < 10 ? `Only ${stock} left` : `${stock} in stock`}
            </span>
          </div>

          {/* Qty + Add to cart */}
          {!isOutOfStock && (
            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center gap-2 border border-black/10 rounded-xl px-3 py-2">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-6 h-6 rounded-full hover:bg-[var(--accent)]/10 flex items-center justify-center text-gray-600 transition-colors">−</button>
                <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                <button onClick={() => setQty(q => Math.min(stock, q + 1))}
                  className="w-6 h-6 rounded-full hover:bg-[var(--accent)]/10 flex items-center justify-center text-gray-600 transition-colors">+</button>
              </div>
              <button
                onClick={() => {
                  addItem({
                    id: product.id,
                    name: product.name,
                    price,
                    quantity: qty,
                    sellerId: product.sellerId ?? product.seller?.id ?? "unknown",
                    imageUrl: product.imageUrl,
                  });
                  notify(`${product.name} added to cart.`, "success");
                }}
                className="flex-1 btn-primary py-3 text-base"
              >
                Add to cart
              </button>
            </div>
          )}

          <Link href="/cart" className="mt-3 btn-secondary text-center py-2.5">
            View cart
          </Link>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold text-[var(--ink)] mb-6">
          Customer reviews
          {reviewSummary.totalReviews > 0 && (
            <span className="ml-3 text-base font-normal text-gray-500">
              {reviewSummary.averageRating.toFixed(1)} / 5 · {reviewSummary.totalReviews} review{reviewSummary.totalReviews !== 1 ? "s" : ""}
            </span>
          )}
        </h2>

        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-black/[0.07] bg-[var(--muted)] p-8 text-center">
            <p className="text-gray-500">No reviews yet — be the first to share your experience.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-black/[0.07] bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--ink)]">{review.user?.name ?? "Buyer"}</p>
                    <StarRating value={review.rating} />
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(review.createdAt ?? "").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                {review.comment && (
                  <p className="mt-3 text-gray-700 leading-relaxed">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Write a review */}
        {user?.role === "BUYER" && (
          <form onSubmit={submitReview} className="mt-8 rounded-2xl border border-black/[0.07] bg-white p-6 space-y-4">
            <h3 className="font-bold text-[var(--ink)]">Write a review</h3>
            <div className="flex items-center gap-3">
              <label htmlFor="review-rating" className="text-sm font-medium text-gray-700">Rating</label>
              <select id="review-rating" value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="rounded-xl border border-black/10 px-3 py-1.5 text-sm">
                {[5, 4, 3, 2, 1].map((v) => (
                  <option key={v} value={v}>{v} star{v !== 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)}
              maxLength={1000} placeholder="Share what you loved (or didn't) about this product…"
              className="min-h-28 w-full rounded-xl border border-black/10 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" />
            <button type="submit" disabled={reviewSubmitting}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
              {reviewSubmitting ? "Submitting…" : "Submit review"}
            </button>
          </form>
        )}
      </section>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-6">More in {product.category}</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {related.map((r) => {
              const rImg = getAssetUrl(r.imageUrl);
              return (
                <Link key={r.id} href={`/products/preview/${r.id}`}
                  className="group bg-white rounded-2xl border border-black/[0.07] overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--muted)]">
                    {rImg && (
                      <Image src={rImg} alt={r.name} fill sizes="33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-[var(--accent)] font-semibold uppercase tracking-wide">{r.category}</p>
                    <h3 className="font-semibold text-[var(--ink)] mt-1 text-sm leading-snug">{r.name}</h3>
                    <p className="text-[var(--accent)] font-bold mt-2">${Number(r.price).toFixed(2)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
