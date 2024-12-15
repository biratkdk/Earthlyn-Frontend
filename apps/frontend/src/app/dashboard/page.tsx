"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api/client";
import { getPaginatedItems } from "@/lib/api/pagination";
import { getDashboardPath } from "@/lib/utils/routes";
import { getApiErrorStatus, getErrorMessage } from "@/lib/utils/errors";
import { LoadingState } from "@/components/ui/Skeleton";

interface Order {
  id: string;
  status: string;
  totalAmount: string;
  createdAt: string;
}

export default function BuyerDashboard() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string>("");

  const fetchOrders = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data } = await apiClient.get(`/orders/buyer/${user.id}`);
      setOrders(getPaginatedItems<Order>(data));
      setApiError("");
    } catch (error) {
      const status = getApiErrorStatus(error);
      const msg = getErrorMessage(error, "Failed to load orders");
      setApiError(`API Error (${status || "unknown"}): ${msg}`);
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

    if (user.role !== "BUYER") {
      router.push(getDashboardPath(user.role));
      return;
    }

    void fetchOrders();
  }, [user, isHydrated, router, fetchOrders]);

  if (!isHydrated) {
    return <LoadingState />;
  }

  const totalSpent = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const pending = orders.filter((o) => o.status !== "DELIVERED").length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Buyer Dashboard</h1>
      <p className="text-gray-600 mt-2">Welcome, {user?.name}!</p>

      {apiError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-700 text-sm"><strong>Warning:</strong> {apiError}</p>
          <button
            onClick={fetchOrders}
            className="mt-2 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        <div className="card p-6">
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-3xl font-semibold text-[var(--accent)]">{loading ? "..." : orders.length}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600">Total Spent</p>
          <p className="text-3xl font-semibold text-[var(--accent)]">{loading ? "..." : "$" + totalSpent.toFixed(2)}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600">Pending Delivery</p>
          <p className="text-3xl font-semibold text-[var(--accent)]">{loading ? "..." : pending}</p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Orders {loading && "..."}</h2>
        {orders.length === 0 ? (
          <p className="text-gray-500">No orders yet. Start shopping!</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex justify-between items-center py-3 border-b hover:text-[var(--accent)]"
              >
                <div>
                  <p className="font-medium">Order #{order.id.substring(0, 8)}</p>
                  <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    ${Number(order.totalAmount || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">{order.status}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
