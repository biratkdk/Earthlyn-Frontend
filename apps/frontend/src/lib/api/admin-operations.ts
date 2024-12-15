import apiClient from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/pagination";
import type { ApiDispute, ApiOrder } from "@/lib/types/api";

export type AdminDisputeStatus = "ALL" | "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";

export interface AdminListQuery {
  page: number;
  pageSize: number;
  status?: string;
}

export interface UpdateAdminDisputePayload {
  status?: Exclude<AdminDisputeStatus, "ALL">;
  resolution?: string;
  assignedToId?: string;
}

export interface RefundPaymentPayload {
  amount?: number;
  reason?: string;
  idempotencyKey: string;
}

export interface RefundPaymentResponse {
  refundId: string;
  status: string;
  amount: number;
  syncedOrders: number;
}

export const adminOperationsApi = {
  disputes: (query: AdminListQuery) => {
    const params = new URLSearchParams({
      page: String(query.page),
      pageSize: String(query.pageSize),
    });
    if (query.status && query.status !== "ALL") {
      params.set("status", query.status);
    }

    return apiClient.get<PaginatedResponse<ApiDispute>>(
      `/admin/disputes?${params.toString()}`,
    );
  },
  updateDispute: (id: string, payload: UpdateAdminDisputePayload) =>
    apiClient.patch<ApiDispute>(`/admin/disputes/${id}`, payload),
  orders: (query: AdminListQuery) => {
    const params = new URLSearchParams({
      page: String(query.page),
      pageSize: String(query.pageSize),
    });
    if (query.status && query.status !== "ALL") {
      params.set("status", query.status);
    }

    return apiClient.get<PaginatedResponse<ApiOrder>>(
      `/orders?${params.toString()}`,
    );
  },
  order: (id: string) => apiClient.get<ApiOrder>(`/orders/${id}`),
  refundPayment: (paymentIntentId: string, payload: RefundPaymentPayload) =>
    apiClient.post<RefundPaymentResponse>(
      `/payments/${paymentIntentId}/refund`,
      payload,
    ),
};
