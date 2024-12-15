"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { getErrorMessage } from "@/lib/utils/errors";
import {
  getPaginatedItems,
  getPaginationMeta,
  type PaginationMeta,
} from "@/lib/api/pagination";
import type {
  ApiFulfillmentEvent,
  ApiFulfillmentSummary,
  ApiOrder,
} from "@/lib/types/api";

const QUEUE_PAGE_SIZE = 10;
const EVENT_PAGE_SIZE = 8;
const QUEUE_FILTERS = ["ALL", "CONFIRMED", "PROCESSING", "SHIPPED"] as const;
const NEXT_STATUS_OPTIONS = [
  { value: "PROCESSING", label: "Start production" },
  { value: "IN_TRANSIT", label: "Mark shipped" },
  { value: "DELIVERED", label: "Confirm delivered" },
  { value: "FAILED", label: "Mark failed" },
] as const;

type QueueFilter = (typeof QUEUE_FILTERS)[number];

interface FulfillmentOrder extends ApiOrder {
  quantity: number;
  paymentStatus?: string;
  fulfillmentEvents?: ApiFulfillmentEvent[];
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatStatus(status?: string) {
  return (status || "-").replaceAll("_", " ");
}

export default function AdminOperationsPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const [summary, setSummary] = useState<ApiFulfillmentSummary | null>(null);
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [events, setEvents] = useState<ApiFulfillmentEvent[]>([]);
  const [queueMeta, setQueueMeta] = useState<PaginationMeta | null>(null);
  const [eventMeta, setEventMeta] = useState<PaginationMeta | null>(null);
  const [queuePage, setQueuePage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("ALL");
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const loadOperations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const queueParams = new URLSearchParams({
        page: String(queuePage),
        pageSize: String(QUEUE_PAGE_SIZE),
        status: queueFilter,
      });
      const eventParams = new URLSearchParams({
        page: String(eventPage),
        pageSize: String(EVENT_PAGE_SIZE),
      });
      const [summaryResult, queueResult, eventResult] = await Promise.all([
        apiClient.get<ApiFulfillmentSummary>(
          "/admin/operations/fulfillment/summary",
        ),
        apiClient.get(`/admin/operations/fulfillment/queue?${queueParams}`),
        apiClient.get(`/admin/operations/fulfillment/events?${eventParams}`),
      ]);

      setSummary(summaryResult.data);
      setOrders(getPaginatedItems<FulfillmentOrder>(queueResult.data));
      setQueueMeta(getPaginationMeta<FulfillmentOrder>(queueResult.data));
      setEvents(getPaginatedItems<ApiFulfillmentEvent>(eventResult.data));
      setEventMeta(getPaginationMeta<ApiFulfillmentEvent>(eventResult.data));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load operations data."));
    } finally {
      setLoading(false);
    }
  }, [eventPage, queueFilter, queuePage]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    void loadOperations();
  }, [isHydrated, loadOperations, router, user]);

  const runAutomation = async () => {
    setRunningAutomation(true);
    try {
      const { data } = await apiClient.post(
        "/admin/operations/fulfillment/run",
      );
      notify(`Automation processed ${data.processed || 0} orders.`, "success");
      await loadOperations();
    } catch (automationError) {
      notify(
        getErrorMessage(automationError, "Failed to run automation."),
        "error",
      );
    } finally {
      setRunningAutomation(false);
    }
  };

  const updateOrderStatus = async (orderId: string) => {
    const status = statusDrafts[orderId];
    if (!status) {
      notify("Select the next fulfillment status first.", "error");
      return;
    }

    setUpdatingOrderId(orderId);
    try {
      await apiClient.post(
        `/admin/operations/fulfillment/orders/${orderId}/status`,
        {
          status,
          trackingId: trackingDrafts[orderId]?.trim() || undefined,
        },
      );
      notify("Fulfillment status updated.", "success");
      setStatusDrafts((current) => ({ ...current, [orderId]: "" }));
      await loadOperations();
    } catch (updateError) {
      notify(getErrorMessage(updateError, "Failed to update order."), "error");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (!isHydrated || loading) {
    return <LoadingState />;
  }

  const queueTotal = queueMeta?.totalItems ?? orders.length;
  const queuePages = queueMeta?.totalPages ?? 1;
  const eventTotal = eventMeta?.totalItems ?? events.length;
  const eventPages = eventMeta?.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="badge">Operations</p>
          <h1 className="mt-4 text-4xl">Fulfillment Control</h1>
          <p className="mt-2 text-gray-600">
            Monitor platform-handled production, storage, shipment, and
            delivery.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runAutomation()}
          disabled={runningAutomation}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {runningAutomation ? "Running..." : "Run Automation"}
        </button>
      </div>

      {error && (
        <ErrorState className="mt-6" message={error} onRetry={loadOperations} />
      )}

      {!error && summary && (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              { label: "Active", value: summary.active },
              { label: "Confirmed", value: summary.confirmed },
              { label: "Processing", value: summary.processing },
              { label: "Shipped", value: summary.shipped },
            ].map((item) => (
              <div key={item.label} className="card p-5">
                <p className="text-sm text-gray-600">{item.label}</p>
                <p className="mt-1 text-3xl font-semibold text-[var(--accent)]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-black/10 bg-white p-4 text-sm text-gray-600">
            Automation:{" "}
            <span className="font-semibold text-[var(--ink)]">
              {summary.automationEnabled ? "Enabled" : "Manual only"}
            </span>
            <span className="mx-3 text-gray-300">|</span>
            Step interval: {summary.stepHours}h
            <span className="mx-3 text-gray-300">|</span>
            Delivered total: {summary.delivered}
          </div>

          <section className="card mt-8 overflow-x-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6">
              <h2 className="text-2xl font-semibold">Active Queue</h2>
              <div className="flex flex-wrap gap-2">
                {QUEUE_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => {
                      setQueueFilter(filter);
                      setQueuePage(1);
                    }}
                    className={
                      queueFilter === filter
                        ? "btn-primary"
                        : "rounded-full border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-black/5"
                    }
                  >
                    {formatStatus(filter)}
                  </button>
                ))}
              </div>
            </div>
            <table className="mt-4 w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">Order</th>
                  <th className="px-6 py-3 text-left">Product</th>
                  <th className="px-6 py-3 text-left">Buyer</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Next Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No active fulfillment orders.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="border-b align-top">
                      <td className="px-6 py-4">
                        <p className="font-semibold">#{order.id.slice(0, 8)}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatDate(order.createdAt)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold">
                          {order.product?.name || "Product"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Seller: {order.product?.seller?.user?.email || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-4">{order.buyer?.email || "-"}</td>
                      <td className="px-6 py-4">
                        <span className="badge">
                          {formatStatus(order.status)}
                        </span>
                        <p className="mt-2 text-xs text-gray-500">
                          Tracking: {order.deliveryTrackingId || "Not assigned"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex min-w-64 flex-col gap-2">
                          <select
                            value={statusDrafts[order.id] || ""}
                            onChange={(event) =>
                              setStatusDrafts((current) => ({
                                ...current,
                                [order.id]: event.target.value,
                              }))
                            }
                            className="rounded-lg border border-black/10 px-3 py-2"
                          >
                            <option value="">Select action</option>
                            {NEXT_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={trackingDrafts[order.id] || ""}
                            onChange={(event) =>
                              setTrackingDrafts((current) => ({
                                ...current,
                                [order.id]: event.target.value,
                              }))
                            }
                            placeholder="Tracking ID optional"
                            className="rounded-lg border border-black/10 px-3 py-2"
                          />
                          <button
                            type="button"
                            onClick={() => void updateOrderStatus(order.id)}
                            disabled={updatingOrderId === order.id}
                            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updatingOrderId === order.id
                              ? "Updating..."
                              : "Apply"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="px-6 pb-6">
              <PaginationControls
                currentPage={queuePage}
                itemLabel="orders"
                pageSize={QUEUE_PAGE_SIZE}
                totalItems={queueTotal}
                totalPages={queuePages}
                onPageChange={setQueuePage}
              />
            </div>
          </section>

          <section className="card mt-8 overflow-x-auto">
            <div className="px-6 pt-6">
              <h2 className="text-2xl font-semibold">Event Trail</h2>
            </div>
            <table className="mt-4 w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">Time</th>
                  <th className="px-6 py-3 text-left">Event</th>
                  <th className="px-6 py-3 text-left">Order</th>
                  <th className="px-6 py-3 text-left">Actor</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No fulfillment events yet.
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} className="border-b">
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(event.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold">
                          {formatStatus(event.type)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatStatus(event.status)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        #{event.orderId.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4">
                        {event.actor?.email || "Automation"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="px-6 pb-6">
              <PaginationControls
                currentPage={eventPage}
                itemLabel="events"
                pageSize={EVENT_PAGE_SIZE}
                totalItems={eventTotal}
                totalPages={eventPages}
                onPageChange={setEventPage}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
