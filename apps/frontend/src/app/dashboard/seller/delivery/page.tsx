"use client";
import { useCallback, useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import type { ApiOrder } from "@/lib/types/api";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/ToastProvider";
import { getErrorMessage } from "@/lib/utils/errors";
import { PaginationControls } from "@/components/ui/PaginationControls";
import {
  getPaginatedItems,
  getPaginationMeta,
  type PaginationMeta,
} from "@/lib/api/pagination";

const DELIVERY_FILTERS = ["all", "PENDING", "IN_TRANSIT", "DELIVERED", "FAILED"];
const DELIVERY_PAGE_SIZE = 8;

function formatDeliveryLabel(value?: string | null) {
  if (!value) return "-";
  return value === "all" ? "All" : value.replaceAll("_", " ");
}

function getDeliveryStatus(order: ApiOrder) {
  return order.product?.deliveryStatus || order.status;
}

export default function DeliveryPage() {
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(DELIVERY_PAGE_SIZE),
      });
      if (filter !== "all") params.set("status", filter);

      const { data } = await apiClient.get(
        `/seller/delivery/orders?${params.toString()}`,
      );
      setOrders(getPaginatedItems<ApiOrder>(data));
      setPaginationMeta(getPaginationMeta<ApiOrder>(data));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load delivery orders."));
    } finally {
      setLoading(false);
    }
  }, [currentPage, filter]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user || user.role !== "SELLER") {
      router.push("/login");
      return;
    }

    void fetchOrders();
  }, [user, isHydrated, router, fetchOrders]);

  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingOrderId(orderId);
    try {
      await apiClient.post(`/seller/delivery/${orderId}/update-status`, { status });
      await fetchOrders();
      notify(`Order marked ${formatDeliveryLabel(status)}.`, "success");
    } catch (error) {
      notify(getErrorMessage(error, "Failed to update delivery status."), "error");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (!isHydrated || loading) return <LoadingState rows={4} />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Delivery Management</h1>

      <div className="mt-6 flex gap-2 flex-wrap">
        {DELIVERY_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setFilter(s);
              setCurrentPage(1);
            }}
            className={filter === s ? "btn-primary" : "btn-secondary"}
          >
            {formatDeliveryLabel(s)}
          </button>
        ))}
      </div>

      <div className="space-y-4 mt-6">
        {error ? (
          <ErrorState message={error} onRetry={fetchOrders} />
        ) : orders.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">No shipments</div>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="card p-6">
              {(() => {
                const status = getDeliveryStatus(o);
                const canMarkInTransit = status !== "IN_TRANSIT" && status !== "DELIVERED";
                const canMarkDelivered = status !== "DELIVERED";
                const canUpdate = canMarkInTransit || canMarkDelivered;
                const buyerLabel = o.buyer?.name || o.buyer?.email || "Buyer";

                return (
                  <>
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-600">Order</p>
                  <p className="font-semibold">Order #{o.id.slice(0, 8)}</p>
                  <p className="text-sm text-gray-600">Product: {o.product?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Buyer</p>
                  <p className="font-semibold">{buyerLabel}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="badge">{formatDeliveryLabel(status)}</p>
                </div>
              </div>
              {canUpdate && (
                <div className="mt-4 flex gap-2">
                  {canMarkInTransit && (
                    <button
                      type="button"
                      onClick={() => void updateStatus(o.id, "IN_TRANSIT")}
                      disabled={updatingOrderId === o.id}
                      className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark In Transit
                    </button>
                  )}
                  {canMarkDelivered && (
                    <button
                      type="button"
                      onClick={() => void updateStatus(o.id, "DELIVERED")}
                      disabled={updatingOrderId === o.id}
                      className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark Delivered
                    </button>
                  )}
                </div>
              )}
                  </>
                );
              })()}
            </div>
          ))
        )}
      </div>
      {!error && orders.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          itemLabel="shipments"
          pageSize={DELIVERY_PAGE_SIZE}
          totalItems={paginationMeta?.totalItems ?? orders.length}
          totalPages={paginationMeta?.totalPages ?? 1}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
