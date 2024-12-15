"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminOperationsApi } from "@/lib/api/admin-operations";
import {
  getPaginatedItems,
  getPaginationMeta,
  type PaginationMeta,
} from "@/lib/api/pagination";
import { useAuthStore } from "@/lib/store/auth";
import type { ApiOrder } from "@/lib/types/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { LoadingState } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { getErrorMessage } from "@/lib/utils/errors";

const ORDER_PAGE_SIZE = 8;
const ORDER_STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
] as const;

function formatStatus(status?: string) {
  return (status || "-").replaceAll("_", " ");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatCurrency(value?: number | string) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function shortId(id?: string) {
  return id ? id.slice(0, 8) : "-";
}

export default function AdminRefundsPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [status, setStatus] = useState<(typeof ORDER_STATUS_OPTIONS)[number]>(
    "ALL",
  );
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [searchOrderId, setSearchOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [refundTarget, setRefundTarget] = useState<ApiOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const [refunding, setRefunding] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await adminOperationsApi.orders({
        page: currentPage,
        pageSize: ORDER_PAGE_SIZE,
        status,
      });
      setOrders(getPaginatedItems<ApiOrder>(data));
      setPaginationMeta(getPaginationMeta<ApiOrder>(data));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load orders."));
    } finally {
      setLoading(false);
    }
  }, [currentPage, status]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }
    void loadOrders();
  }, [isHydrated, loadOrders, router, user]);

  const activeOrder = selectedOrder || refundTarget;
  const refundableAmount = useMemo(
    () => Number(activeOrder?.totalAmount || activeOrder?.total || 0),
    [activeOrder],
  );

  const selectOrder = (order: ApiOrder) => {
    setSelectedOrder(order);
    setAmount("");
    setReason("");
  };

  const searchOrder = async () => {
    const orderId = searchOrderId.trim();
    if (!orderId) {
      notify("Enter an order id first.", "error");
      return;
    }

    setSearching(true);
    try {
      const { data } = await adminOperationsApi.order(orderId);
      selectOrder(data);
      notify("Order loaded.", "success");
    } catch (searchError) {
      notify(getErrorMessage(searchError, "Failed to load order."), "error");
    } finally {
      setSearching(false);
    }
  };

  const requestRefund = () => {
    if (!selectedOrder?.paymentIntentId) {
      notify("Selected order has no payment intent.", "error");
      return;
    }
    if (selectedOrder.paymentStatus === "REFUNDED") {
      notify("Selected order is already marked refunded.", "error");
      return;
    }
    const parsedAmount = amount ? Number(amount) : undefined;
    if (
      parsedAmount !== undefined &&
      (!Number.isFinite(parsedAmount) ||
        parsedAmount <= 0 ||
        parsedAmount > refundableAmount)
    ) {
      notify("Refund amount must be within the order total.", "error");
      return;
    }
    if (reason.trim().length < 5) {
      notify("Add a short refund reason.", "error");
      return;
    }

    setRefundTarget(selectedOrder);
  };

  const submitRefund = async () => {
    if (!refundTarget?.paymentIntentId) return;
    const parsedAmount = amount ? Number(amount) : undefined;

    setRefunding(true);
    try {
      const { data } = await adminOperationsApi.refundPayment(
        refundTarget.paymentIntentId,
        {
          amount: parsedAmount,
          reason: reason.trim(),
          idempotencyKey: `manual-refund:${refundTarget.paymentIntentId}:${Date.now()}`,
        },
      );
      notify(`Refund ${data.refundId} processed.`, "success");
      setRefundTarget(null);
      setSelectedOrder(null);
      setAmount("");
      setReason("");
      await loadOrders();
    } catch (refundError) {
      notify(getErrorMessage(refundError, "Failed to process refund."), "error");
    } finally {
      setRefunding(false);
    }
  };

  if (!isHydrated || loading) return <LoadingState rows={5} />;

  const totalItems = paginationMeta?.totalItems ?? orders.length;
  const totalPages = paginationMeta?.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/admin" className="btn-secondary inline-block">
            Back to Admin
          </Link>
          <h1 className="mt-6 text-4xl">Refund Operations</h1>
          <p className="mt-2 max-w-2xl text-gray-600">
            Search orders, inspect payment status, and trigger audited Stripe
            refunds for eligible payment intents.
          </p>
        </div>
        <select
          value={status}
          onChange={(event) => {
            setCurrentPage(1);
            setStatus(event.target.value as (typeof ORDER_STATUS_OPTIONS)[number]);
          }}
          className="rounded-xl border border-black/10 bg-white px-3 py-2"
        >
          {ORDER_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {formatStatus(option)}
            </option>
          ))}
        </select>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="card p-6">
          <h2 className="text-xl font-semibold">Order Lookup</h2>
          <div className="mt-4 flex gap-2">
            <input
              value={searchOrderId}
              onChange={(event) => setSearchOrderId(event.target.value)}
              placeholder="Order id"
              className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-2"
            />
            <button
              type="button"
              onClick={() => void searchOrder()}
              disabled={searching}
              className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          {selectedOrder ? (
            <div className="mt-5 rounded-lg border border-black/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Order {shortId(selectedOrder.id)}</h3>
                <span className="badge">{formatStatus(selectedOrder.status)}</span>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-gray-600">
                <span>Total: {formatCurrency(selectedOrder.totalAmount)}</span>
                <span>
                  Payment: {formatStatus(selectedOrder.paymentStatus)}
                </span>
                <span>Intent: {selectedOrder.paymentIntentId || "-"}</span>
                <span>Created: {formatDate(selectedOrder.createdAt)}</span>
              </div>
              <div className="mt-4 grid gap-3">
                <input
                  type="number"
                  min={0}
                  max={refundableAmount}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={`Amount, blank for full ${formatCurrency(refundableAmount)}`}
                  className="rounded-xl border border-black/10 px-3 py-2"
                />
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  placeholder="Refund reason"
                  className="rounded-xl border border-black/10 px-3 py-2"
                />
                <button
                  type="button"
                  onClick={requestRefund}
                  className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Review Refund
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-black/10 p-4 text-sm text-gray-500">
              Select an order from the queue or search by exact order id.
            </p>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold">Recent Orders</h2>
          {error ? (
            <ErrorState className="mt-4" message={error} onRetry={loadOrders} />
          ) : orders.length === 0 ? (
            <p className="mt-4 text-gray-500">No orders match the filter.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-gray-600">
                    <th className="py-3 pr-4">Order</th>
                    <th className="py-3 pr-4">Buyer</th>
                    <th className="py-3 pr-4">Total</th>
                    <th className="py-3 pr-4">Payment</th>
                    <th className="py-3 pr-4">Created</th>
                    <th className="py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-black/5">
                      <td className="py-4 pr-4 font-semibold">
                        {shortId(order.id)}
                      </td>
                      <td className="py-4 pr-4">
                        {order.buyer?.email || order.buyerId || "-"}
                      </td>
                      <td className="py-4 pr-4">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="py-4 pr-4">
                        {formatStatus(order.paymentStatus)}
                      </td>
                      <td className="py-4 pr-4">{formatDate(order.createdAt)}</td>
                      <td className="py-4">
                        <button
                          type="button"
                          onClick={() => selectOrder(order)}
                          className="btn-secondary"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginationControls
                currentPage={currentPage}
                itemLabel="orders"
                pageSize={ORDER_PAGE_SIZE}
                totalItems={totalItems}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </section>

      {refundTarget && (
        <ConfirmDialog
          title="Process refund?"
          description={`This will refund ${amount ? formatCurrency(amount) : "the full payment"} for order ${shortId(refundTarget.id)} and write an admin audit record.`}
          confirmLabel="Process Refund"
          isDestructive
          isLoading={refunding}
          onCancel={() => setRefundTarget(null)}
          onConfirm={() => void submitRefund()}
        />
      )}
    </div>
  );
}
