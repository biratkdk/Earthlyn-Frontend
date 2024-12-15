"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api/client";
import type { ApiDispute, ApiOrder } from "@/lib/types/api";
import { useToast } from "@/components/ui/ToastProvider";
import { getErrorMessage } from "@/lib/utils/errors";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import {
  getPaginatedItems,
  getPaginationMeta,
  type PaginationMeta,
} from "@/lib/api/pagination";

const DISPUTE_PAGE_SIZE = 8;

function formatOrderReference(orderId: string) {
  return `Order #${orderId.slice(0, 8)}`;
}

export default function DisputesPage() {
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const router = useRouter();
  const [disputes, setDisputes] = useState<ApiDispute[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const loadDisputes = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setLoadError("");

    try {
      const [disputeResponse, orderResponse] = await Promise.all([
        apiClient.get(
          `/disputes/my?page=${currentPage}&pageSize=${DISPUTE_PAGE_SIZE}`,
        ),
        user.role === "BUYER"
          ? apiClient.get(`/orders/buyer/${user.id}?pageSize=100`)
          : Promise.resolve({ data: [] as ApiOrder[] }),
      ]);

      setDisputes(getPaginatedItems<ApiDispute>(disputeResponse.data));
      setPaginationMeta(getPaginationMeta<ApiDispute>(disputeResponse.data));
      setOrders(getPaginatedItems<ApiOrder>(orderResponse.data));
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to load disputes."));
    } finally {
      setLoading(false);
    }
  }, [currentPage, user]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push("/login");
      return;
    }

    void loadDisputes();
  }, [user, isHydrated, router, retryKey, loadDisputes]);

  const create = async () => {
    if (!orderId || !reason) {
      notify("Select an order and enter a reason.", "error");
      return;
    }

    try {
      await apiClient.post("/disputes", { orderId, reason });
      setOrderId("");
      setReason("");
      setCurrentPage(1);
      notify("Dispute submitted.", "success");
      void loadDisputes();
    } catch (error) {
      notify(getErrorMessage(error, "Failed to submit dispute"), "error");
    }
  };

  if (!isHydrated) return <LoadingState />;

  const totalItems = paginationMeta?.totalItems ?? disputes.length;
  const totalPages = paginationMeta?.totalPages ?? 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Disputes</h1>

      <div className="card p-6 mt-6">
        <h2 className="text-xl font-semibold">Open a dispute</h2>
        <div className="mt-4 grid md:grid-cols-3 gap-3">
          <select
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="rounded-xl border border-black/10 px-4 py-2"
          >
            <option value="">Select order</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.id.slice(0, 8)} - ${Number(order.totalAmount || 0).toFixed(2)}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="rounded-xl border border-black/10 px-4 py-2 md:col-span-2"
          />
        </div>
        <button onClick={create} className="btn-primary mt-4">Submit</button>
      </div>

      <div className="card p-6 mt-6">
        <h2 className="text-xl font-semibold">Your disputes</h2>
        <div className="mt-4 space-y-3">
          {loading ? (
            <LoadingState className="py-2" rows={2} />
          ) : loadError ? (
            <ErrorState
              message={loadError}
              onRetry={() => setRetryKey((current) => current + 1)}
            />
          ) : disputes.length === 0 ? (
            <p className="text-gray-500">No disputes yet.</p>
          ) : (
            <>
              {disputes.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-4">
                  <Link
                    href={`/disputes/${d.id}`}
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    {formatOrderReference(d.orderId)}
                  </Link>
                  <span className="badge">{d.status}</span>
                </div>
              ))}
              <PaginationControls
                currentPage={currentPage}
                itemLabel="disputes"
                pageSize={DISPUTE_PAGE_SIZE}
                totalItems={totalItems}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
