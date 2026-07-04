"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { useToast } from "@/components/ui/ToastProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import apiClient from "@/lib/api/client";
import type { ApiOrder } from "@/lib/types/api";
import { getAssetUrl } from "@/lib/utils/assets";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { getErrorMessage } from "@/lib/utils/errors";
import { PaginationControls } from "@/components/ui/PaginationControls";
import {
  getPaginatedItems,
  getPaginationMeta,
  type PaginationMeta,
} from "@/lib/api/pagination";

const ORDER_PAGE_SIZE = 10;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: "Pending",    color: "text-yellow-700", bg: "bg-yellow-100" },
  CONFIRMED:  { label: "Confirmed",  color: "text-blue-700",   bg: "bg-blue-100"   },
  PROCESSING: { label: "Processing", color: "text-indigo-700", bg: "bg-indigo-100" },
  SHIPPED:    { label: "Shipped",    color: "text-purple-700", bg: "bg-purple-100" },
  DELIVERED:  { label: "Delivered",  color: "text-green-700",  bg: "bg-green-100"  },
  CANCELLED:  { label: "Cancelled",  color: "text-red-700",    bg: "bg-red-100"    },
  REFUNDED:   { label: "Refunded",   color: "text-gray-700",   bg: "bg-gray-100"   },
};

function StatusBadge({ status }: { status?: string }) {
  const cfg = STATUS_CONFIG[status || ""] ?? { label: status || "Unknown", color: "text-gray-600", bg: "bg-gray-100" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color} ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const { addItem } = useCartStore();
  const { notify } = useToast();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("created-desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const endpoint = user.role === "ADMIN" || user.role === "CUSTOMER_SERVICE"
        ? "/orders"
        : `/orders/buyer/${user.id}`;
      const params = new URLSearchParams({ page: String(currentPage), pageSize: String(ORDER_PAGE_SIZE), sortBy });
      const { data } = await apiClient.get(`${endpoint}?${params.toString()}`);
      setOrders(getPaginatedItems<ApiOrder>(data));
      setPaginationMeta(getPaginationMeta<ApiOrder>(data));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load orders."));
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, user]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) { router.push("/login"); return; }
    void loadOrders();
  }, [user, isHydrated, router, loadOrders]);

  const handleReorder = (order: ApiOrder) => {
    const product = order.product;
    if (!product) { notify("Product info not available", "error"); return; }
    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price ?? order.totalAmount),
      quantity: order.quantity ?? 1,
      sellerId: product.sellerId ?? product.seller?.id ?? "unknown",
      imageUrl: product.imageUrl,
    });
    notify(`${product.name} added to cart`, "success");
    router.push("/cart");
  };

  if (!isHydrated) return <LoadingState />;

  const totalItems = paginationMeta?.totalItems ?? orders.length;
  const totalPages = paginationMeta?.totalPages ?? 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-4xl">Order History</h1>
          <p className="text-gray-500 mt-1">{totalItems} order{totalItems !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          >
            <option value="created-desc">Newest first</option>
            <option value="created-asc">Oldest first</option>
            <option value="total-desc">Highest total</option>
            <option value="total-asc">Lowest total</option>
          </select>
          <Link href="/products" className="btn-secondary text-sm">Shop More</Link>
        </div>
      </div>

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadOrders} />
      ) : orders.length === 0 ? (
        <div className="text-center py-20 card">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl mb-2">No orders yet</h2>
          <p className="text-gray-500 mb-6">Start shopping to see your orders here.</p>
          <Link href="/products" className="btn-primary">Browse Products</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const product = order.product;
            const imageUrl = getAssetUrl(product?.imageUrl);
            const amount = Number(order.totalAmount ?? order.total ?? 0);
            const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

            return (
              <div key={order.id} className="card p-5">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Product image */}
                  <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--muted)]">
                    {imageUrl ? (
                      <Image src={imageUrl} alt={product?.name ?? "Product"} fill className="object-cover" sizes="80px" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">📦</div>
                    )}
                  </div>

                  {/* Order details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-base truncate">{product?.name ?? "Product"}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Order #{order.id.slice(0, 8).toUpperCase()} · {date}
                        </p>
                        {order.quantity && <p className="text-xs text-gray-500">Qty: {order.quantity}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-lg font-bold text-[var(--accent)]">${amount.toFixed(2)}</span>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>

                    {/* Eco points awarded */}
                    {order.ecoPointsAwarded ? (
                      <p className="text-xs text-emerald-600 mt-1.5 font-medium">
                        🌱 +{order.ecoPointsAwarded} eco points earned
                      </p>
                    ) : null}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Link href={`/orders/${order.id}`} className="btn-secondary text-xs py-1.5 px-3">View Details</Link>
                      {(order.status === "DELIVERED" || order.status === "CONFIRMED") && product && (
                        <button onClick={() => handleReorder(order)} className="btn-primary text-xs py-1.5 px-3">
                          Reorder
                        </button>
                      )}
                      {product && (
                        <Link href={`/products/preview/${product.id}`} className="text-xs py-1.5 px-3 rounded-full border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors">
                          View Product
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="mt-4">
            <PaginationControls
              currentPage={currentPage}
              itemLabel="orders"
              pageSize={ORDER_PAGE_SIZE}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
