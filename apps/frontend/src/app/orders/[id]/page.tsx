"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { io } from "socket.io-client";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import type { ApiOrder } from "@/lib/types/api";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { getErrorMessage } from "@/lib/utils/errors";
import { useToast } from "@/components/ui/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getPublicBackendUrl } from "@/lib/config/public-env";

const ORDER_STEPS = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

function getStepState(orderStatus: string, step: string) {
  const normalizedStatus = orderStatus === "PENDING" ? "CONFIRMED" : orderStatus;
  const currentIndex = ORDER_STEPS.indexOf(normalizedStatus);
  const stepIndex = ORDER_STEPS.indexOf(step);

  if (normalizedStatus === "CANCELLED") return "cancelled";
  if (currentIndex >= stepIndex) return "complete";
  return "pending";
}

function getDeliveryDateLabel(order: ApiOrder) {
  const deliveryStatus = order.product?.deliveryStatus || order.status;

  if (order.deliveredAt) {
    return new Date(order.deliveredAt).toLocaleDateString();
  }

  if (["CANCELLED", "FAILED"].includes(deliveryStatus)) {
    return "Not applicable";
  }

  if (["SHIPPED", "IN_TRANSIT"].includes(deliveryStatus)) {
    return order.deliveryTrackingId
      ? "Carrier ETA pending"
      : "In transit, tracking pending";
  }

  if (["PROCESSING", "CONFIRMED"].includes(order.status)) {
    return "Preparing for dispatch";
  }

  return "ETA will appear after shipment is scheduled";
}

function getTerminalOrderState(order: ApiOrder) {
  const deliveryStatus = order.product?.deliveryStatus;
  if (order.status === "CANCELLED") return "CANCELLED";
  if (deliveryStatus === "FAILED") return "FAILED";
  return null;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { notify } = useToast();
  const { user, isHydrated } = useAuthStore();
  const orderId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [lastLiveUpdateAt, setLastLiveUpdateAt] = useState<string | null>(null);
  const [refreshingLiveUpdate, setRefreshingLiveUpdate] = useState(false);

  const loadOrder = useCallback(async (options?: { showLoading?: boolean }) => {
    if (!orderId) return;

    const showLoading = options?.showLoading ?? true;
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshingLiveUpdate(true);
    }
    setError("");

    try {
      const { data } = await apiClient.get<ApiOrder>(`/orders/${orderId}`);
      setOrder(data);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load order."));
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshingLiveUpdate(false);
      }
    }
  }, [orderId]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user || !orderId) {
      router.push("/login");
      return;
    }

    void loadOrder();
  }, [isHydrated, loadOrder, orderId, router, retryKey, user]);

  useEffect(() => {
    if (!isHydrated || !user || !orderId) return;

    let disconnected = false;
    const socket = io(getPublicBackendUrl(), {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    const handleOrderEvent = (payload: { orderId?: string }) => {
      if (disconnected || payload.orderId !== orderId) return;
      setLastLiveUpdateAt(new Date().toISOString());
      void loadOrder({ showLoading: false });
    };

    socket.on("order-update", handleOrderEvent);
    socket.on("delivery-update", handleOrderEvent);

    return () => {
      disconnected = true;
      socket.off("order-update", handleOrderEvent);
      socket.off("delivery-update", handleOrderEvent);
      socket.disconnect();
    };
  }, [isHydrated, loadOrder, orderId, user]);

  const handleCancelOrder = async () => {
    if (!order) return;

    setCancelling(true);
    try {
      await apiClient.post(`/orders/${order.id}/cancel`);
      notify("Order cancelled.", "success");
      setShowCancelConfirm(false);
      await loadOrder();
    } catch (cancelError) {
      notify(getErrorMessage(cancelError, "Failed to cancel order."), "error");
    } finally {
      setCancelling(false);
    }
  };

  if (!isHydrated || loading) {
    return <LoadingState className="mx-auto max-w-5xl px-4 py-10" rows={5} />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <ErrorState
          message={error}
          onRetry={() => setRetryKey((current) => current + 1)}
        />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-4xl">Order not found</h1>
        <Link href="/orders" className="btn-secondary mt-6 inline-block">
          Back to Orders
        </Link>
      </div>
    );
  }

  const terminalState = getTerminalOrderState(order);
  const canCancelOrder =
    user?.role === "BUYER" &&
    order.buyer?.id === user.id &&
    ["PENDING", "CONFIRMED"].includes(order.status);
  const sellerUserId = order.product?.seller?.userId;
  const canMessageSeller =
    user?.role === "BUYER" && sellerUserId && sellerUserId !== user.id;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/orders" className="btn-secondary">
        Back to Orders
      </Link>

      <div className="card mt-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600">Order</p>
            <h1 className="mt-1 text-3xl">Order #{order.id.slice(0, 8)}</h1>
            {lastLiveUpdateAt && (
              <p className="mt-2 text-xs text-gray-500">
                Live update received{" "}
                {new Date(lastLiveUpdateAt).toLocaleTimeString()}
                {refreshingLiveUpdate ? " - refreshing" : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canMessageSeller && (
              <Link
                href={`/messages?userId=${encodeURIComponent(sellerUserId)}`}
                className="btn-secondary"
              >
                Message Seller
              </Link>
            )}
            {canCancelOrder && (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                disabled={cancelling}
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelling ? "Cancelling..." : "Cancel Order"}
              </button>
            )}
            <span className="badge">{order.status}</span>
          </div>
        </div>

        {terminalState && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {terminalState === "CANCELLED"
              ? "This order was cancelled. Delivery tracking and eco impact are no longer active."
              : "Delivery failed for this order. Contact customer service for next steps."}
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-semibold text-[var(--accent)]">
              ${Number(order.totalAmount || order.total || 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Product</p>
            <p className="font-semibold">{order.product?.name || "Product"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Placed</p>
            <p>{new Date(order.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-8 border-t pt-6">
          <h2 className="text-xl font-semibold">Delivery Tracking</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-gray-600">Tracking Number</p>
              <p className="font-semibold">
                {order.deliveryTrackingId || "Not assigned yet"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Delivery Status</p>
              <p className="font-semibold">
                {order.product?.deliveryStatus?.replaceAll("_", " ") ||
                  order.status}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estimated Delivery</p>
              <p className="font-semibold">{getDeliveryDateLabel(order)}</p>
            </div>
          </div>

          {terminalState ? (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {terminalState}
            </div>
          ) : (
            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {ORDER_STEPS.map((step) => {
                const state = getStepState(order.status, step);
                return (
                  <div
                    key={step}
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      state === "complete"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-black/10 bg-white text-gray-500"
                    }`}
                  >
                    {step.replaceAll("_", " ")}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8 border-t pt-6">
          <h2 className="text-xl font-semibold">Eco Impact</h2>
          {order.ecoImpacts?.length ? (
            <div className="mt-4 space-y-3">
              {order.ecoImpacts.map((impact) => (
                <div key={impact.id} className="flex justify-between">
                  <span>{impact.impact}</span>
                  <span className="badge">+{impact.pointsEarned}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-gray-500">
              Eco impact will appear after delivery confirmation.
            </p>
          )}
        </div>
      </div>
      {showCancelConfirm && (
        <ConfirmDialog
          title="Cancel order?"
          description="This will cancel the order and start the refund flow when payment has already succeeded."
          confirmLabel="Cancel order"
          isDestructive
          isLoading={cancelling}
          onCancel={() => setShowCancelConfirm(false)}
          onConfirm={() => void handleCancelOrder()}
        />
      )}
    </div>
  );
}
