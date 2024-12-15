import apiClient from "@/lib/api/client";
import type { ApiNotification } from "@/lib/types/api";

export async function getNotifications(params: URLSearchParams) {
  const { data } = await apiClient.get(`/notifications?${params.toString()}`);
  return data;
}

export async function getUnreadNotificationCount() {
  const { data } = await apiClient.get<{ count: number }>(
    "/notifications/unread-count",
  );
  return data?.count || 0;
}

export async function markNotificationRead(id: string) {
  const { data } = await apiClient.post<ApiNotification>(
    `/notifications/${id}/read`,
  );
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await apiClient.post<{ count: number }>(
    "/notifications/read-all",
  );
  return data;
}
