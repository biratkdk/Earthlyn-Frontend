"use client";

import { useCallback, useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/cart";
import { useToast } from "@/components/ui/ToastProvider";
import Image from "next/image";
import Link from "next/link";
import apiClient from "@/lib/api/client";
import type { ApiProduct } from "@/lib/types/api";
import { getAssetUrl } from "@/lib/utils/assets";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { getErrorMessage } from "@/lib/utils/errors";
import { PaginationControls } from "@/components/ui/PaginationControls";
import {
  getPaginatedItems,
  getPaginationMeta,
  type PaginationMeta,
} from "@/lib/api/pagination";

const PRODUCT_PAGE_SIZE = 9;
const PRODUCT_SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price low-high", value: "price-asc" },
  { label: "Price high-low", value: "price-desc" },
  { label: "Eco score high-low", value: "eco-desc" },
  { label: "Name A-Z", value: "name-asc" },
] as const;

function isUnoptimizedImage(src: string) {
  return /^(data:|blob:)/i.test(src);
}

export default function Products() {
  const { addItem } = useCartStore();
  const { notify } = useToast();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [paginationMeta, setPaginationMeta] =
    useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [minEcoScore, setMinEcoScore] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] =
    useState<(typeof PRODUCT_SORT_OPTIONS)[number]["value"]>("newest");
  const [error, setError] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(PRODUCT_PAGE_SIZE),
        sortBy,
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (category !== "all") params.set("category", category);
      if (minEcoScore) params.set("minEcoScore", minEcoScore);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);

      const { data } = await apiClient.get(`/products?${params.toString()}`);
      setProducts(getPaginatedItems<ApiProduct>(data));
      setPaginationMeta(getPaginationMeta<ApiProduct>(data));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load products."));
    } finally {
      setLoading(false);
    }
  }, [
    category,
    currentPage,
    debouncedSearch,
    maxPrice,
    minEcoScore,
    minPrice,
    sortBy,
  ]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    apiClient
      .get<string[]>("/products/categories")
      .then(({ data }) => setCategories(data || []))
      .catch(() => setCategories([]));
  }, []);

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

  const totalItems = paginationMeta?.totalItems ?? products.length;
  const totalPages = paginationMeta?.totalPages ?? 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-4xl">Eco Products</h1>
        <Link href="/cart" className="btn-secondary">
          View Cart
        </Link>
      </div>

      <div className="mb-8 grid gap-3 rounded-lg border border-black/10 bg-white p-4 md:grid-cols-6">
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <input
          id="product-search"
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-xl border border-black/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] md:col-span-2"
        />
        <label htmlFor="product-category" className="sr-only">
          Product category
        </label>
        <select
          id="product-category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-xl border border-black/10 px-4 py-2"
        >
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <label htmlFor="product-min-eco-score" className="sr-only">
          Minimum eco score
        </label>
        <input
          id="product-min-eco-score"
          type="number"
          placeholder="Min eco"
          value={minEcoScore}
          min="0"
          max="100"
          onChange={(e) => {
            setMinEcoScore(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-xl border border-black/10 px-4 py-2"
        />
        <div className="grid grid-cols-2 gap-2">
          <label htmlFor="product-min-price" className="sr-only">
            Minimum price
          </label>
          <input
            id="product-min-price"
            type="number"
            placeholder="Min $"
            value={minPrice}
            min="0"
            step="0.01"
            onChange={(e) => {
              setMinPrice(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-black/10 px-4 py-2"
          />
          <label htmlFor="product-max-price" className="sr-only">
            Maximum price
          </label>
          <input
            id="product-max-price"
            type="number"
            placeholder="Max $"
            value={maxPrice}
            min="0"
            step="0.01"
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-black/10 px-4 py-2"
          />
        </div>
        <label htmlFor="product-sort" className="sr-only">
          Sort products
        </label>
        <select
          id="product-sort"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as typeof sortBy);
            setCurrentPage(1);
          }}
          className="rounded-xl border border-black/10 px-4 py-2"
        >
          {PRODUCT_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState className="py-2" rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchProducts} />
      ) : products.length === 0 ? (
        <p className="text-gray-500">No products found.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const imageUrl = getAssetUrl(product.imageUrl);

              return (
                <div key={product.id} className="card p-5 flex flex-col gap-4">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[var(--muted)]">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        unoptimized={isUnoptimizedImage(imageUrl)}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-500">
                        No image
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--accent)]">
                      {product.category}
                    </p>
                    <h3 className="text-xl mt-1">{product.name}</h3>
                    <p className="text-sm text-gray-600">
                      Seller: {product.seller?.user?.name || "Verified Seller"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-semibold text-[var(--accent)]">
                      ${Number(product.price).toFixed(2)}
                    </span>
                    <span className="badge">Eco {product.ecoScore}</span>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      href={`/products/preview/${product.id}`}
                      className="btn-secondary w-full text-center"
                    >
                      View
                    </Link>
                    {product.stock > 0 ? (
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="btn-primary w-full"
                      >
                        Add
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full rounded-full bg-gray-200 text-gray-500 py-2"
                      >
                        Out
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <PaginationControls
            currentPage={currentPage}
            itemLabel="products"
            pageSize={PRODUCT_PAGE_SIZE}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}
