"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api/client";
import type { ApiOrder } from "@/lib/types/api";
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
const ORDER_SORT_OPTIONS = [
  { label: "Newest first", value: "created-desc" },
  { label: "Oldest first", value: "created-asc" },
  { label: "Highest total", value: "total-desc" },
  { label: "Lowest total", value: "total-asc" },
  { label: "Status A-Z", value: "status-asc" },
] as const;

export default function OrdersPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] =
    useState<(typeof ORDER_SORT_OPTIONS)[number]["value"]>("created-desc");
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
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(ORDER_PAGE_SIZE),
        sortBy,
      });
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

    if (!user) {
      router.push("/login");
      return;
    }
    void loadOrders();
  }, [user, isHydrated, router, loadOrders]);

  if (!isHydrated) {
    return <LoadingState />;
  }

  const totalItems = paginationMeta?.totalItems ?? orders.length;
  const totalPages = paginationMeta?.totalPages ?? 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl">Orders</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Sort
          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as typeof sortBy);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-black/10 px-3 py-2"
          >
            {ORDER_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <LoadingState className="mt-6" rows={4} />
      ) : error ? (
        <ErrorState className="mt-6" message={error} onRetry={loadOrders} />
      ) : (
        <div className="mt-6 card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Order</th>
                <th className="px-6 py-3 text-left">Product</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Total</th>
                <th className="px-6 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b">
                    <td className="px-6 py-4">
                      <Link href={`/orders/${order.id}`} className="text-[var(--accent)] hover:underline">
                        Order #{order.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-6 py-4">{order.product?.name || "Product"}</td>
                    <td className="px-6 py-4"><span className="badge">{order.status}</span></td>
                    <td className="px-6 py-4">${Number(order.totalAmount || order.total || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="px-6 pb-6">
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
