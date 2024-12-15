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
  summary: {
    averageRating: number;
    totalReviews: number;
  };
}

function isUnoptimizedImage(src: string) {
  return /^(data:|blob:)/i.test(src);
}

export default function ProductPreview() {
  const params = useParams();
  const id = params?.id as string;
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const { notify } = useToast();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [reviews, setReviews] = useState<ApiProductReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
  });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiClient.get<ApiProduct>(`/products/${id}`),
      apiClient.get<ReviewResponse>(`/products/${id}/reviews`),
    ])
      .then(([productResponse, reviewResponse]) => {
        setProduct(productResponse.data);
        setReviews(reviewResponse.data.items || []);
        setReviewSummary(reviewResponse.data.summary || {
          averageRating: 0,
          totalReviews: 0,
        });
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    setReviewSubmitting(true);
    try {
      await apiClient.post(`/products/${id}/reviews`, { rating, comment });
      const { data } = await apiClient.get<ReviewResponse>(
        `/products/${id}/reviews`,
      );
      setReviews(data.items || []);
      setReviewSummary(data.summary || { averageRating: 0, totalReviews: 0 });
      setComment("");
      notify("Review saved.", "success");
    } catch (error) {
      notify(getErrorMessage(error, "Could not save review."), "error");
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState className="max-w-4xl mx-auto px-4 py-16" rows={4} />;
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">Product not found.</div>
    );
  }

  const stock = Number(product.stock || 0);
  const isOutOfStock = stock <= 0;
  const imageUrl = getAssetUrl(product.imageUrl);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/products" className="btn-secondary mb-6 inline-block">
        Back to Products
      </Link>
      <div className="card p-8">
        <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-lg bg-[var(--muted)]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              sizes="(min-width: 768px) 56rem, 100vw"
              unoptimized={isUnoptimizedImage(imageUrl)}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              No product image
            </div>
          )}
        </div>
        <p className="text-xs uppercase tracking-wide text-[var(--accent)]">
          {product.category}
        </p>
        <h1 className="text-3xl mt-2">{product.name}</h1>
        <p className="text-gray-700 mt-3">{product.description}</p>
        <div className="mt-6 flex items-center justify-between">
          <span className="text-3xl font-semibold text-[var(--accent)]">
            ${Number(product.price).toFixed(2)}
          </span>
          <div className="flex flex-wrap justify-end gap-2">
            <span className="badge">Eco score {product.ecoScore}</span>
            <span className="badge">
              {reviewSummary.totalReviews
                ? `${reviewSummary.averageRating.toFixed(1)} / 5`
                : "No reviews"}
            </span>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              if (isOutOfStock) return;

              addItem({
                id: product.id,
                name: product.name,
                price: Number(product.price),
                quantity: 1,
                sellerId: product.sellerId || product.seller?.id || "unknown",
                imageUrl: product.imageUrl,
              });
              notify(`${product.name} added to cart.`, "success");
            }}
            disabled={isOutOfStock}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isOutOfStock ? "Out of Stock" : "Add to Cart"}
          </button>
          <span className="text-sm text-gray-600">Stock: {stock}</span>
        </div>

        <div className="mt-8 border-t pt-6">
          <h2 className="text-xl font-semibold">Reviews</h2>
          {reviews.length === 0 ? (
            <p className="mt-3 text-gray-500">No reviews yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-lg border border-black/10 p-4"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-semibold">
                      {review.user?.name || "Buyer"}
                    </p>
                    <span className="badge">{review.rating} / 5</span>
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm text-gray-700">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {user?.role === "BUYER" && (
            <form onSubmit={submitReview} className="mt-6 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="review-rating" className="text-sm font-medium">
                  Rating
                </label>
                <select
                  id="review-rating"
                  value={rating}
                  onChange={(event) => setRating(Number(event.target.value))}
                  className="rounded-xl border border-black/10 px-3 py-2"
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={1000}
                placeholder="Share your product experience..."
                className="min-h-24 w-full rounded-xl border border-black/10 px-4 py-2"
              />
              <button
                type="submit"
                disabled={reviewSubmitting}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reviewSubmitting ? "Saving..." : "Save review"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
