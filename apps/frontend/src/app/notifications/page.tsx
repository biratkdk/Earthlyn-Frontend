"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import type { ApiNotification } from "@/lib/types/api";
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
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";

const NOTIFICATION_PAGE_SIZE = 10;
const TYPE_FILTERS = [
  "ALL",
  "PROMOTION",
  "REFERRAL_REWARD",
  "DISPUTE",
  "SYSTEM",
] as const;

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatType(type: string) {
  return type.replaceAll("_", " ");
}

function metadataSummary(metadata?: Record<string, unknown> | null) {
  if (!metadata) return "";

  const visiblePairs = Object.entries(metadata)
    .filter(([, value]) =>
      ["string", "number", "boolean"].includes(typeof value),
    )
    .slice(0, 3);

  return visiblePairs
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" | ");
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(NOTIFICATION_PAGE_SIZE),
        type: typeFilter,
        unreadOnly: String(unreadOnly),
      });
      const data = await getNotifications(params);
      setPaginationMeta(getPaginationMeta<ApiNotification>(data));
      setNotifications(getPaginatedItems<ApiNotification>(data));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load notifications."));
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, unreadOnly]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push("/login");
      return;
    }

    void loadNotifications();
  }, [isHydrated, loadNotifications, router, user]);

  const markRead = async (id: string) => {
    setUpdating(id);
    try {
      await markNotificationRead(id);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, readAt: new Date().toISOString() }
            : notification,
        ),
      );
    } catch (readError) {
      notify(
        getErrorMessage(readError, "Failed to mark notification read."),
        "error",
      );
    } finally {
      setUpdating(null);
    }
  };

  const markAllRead = async () => {
    setUpdating("all");
    try {
      await markAllNotificationsRead();
      notify("Notifications marked read.", "success");
      await loadNotifications();
    } catch (readError) {
      notify(
        getErrorMessage(readError, "Failed to mark notifications read."),
        "error",
      );
    } finally {
      setUpdating(null);
    }
  };

  if (!isHydrated) return <LoadingState rows={4} />;

  const totalItems = paginationMeta?.totalItems ?? notifications.length;
  const totalPages = paginationMeta?.totalPages ?? 1;
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="badge inline-block">Inbox</p>
          <h1 className="mt-4 text-4xl">Notifications</h1>
          <p className="mt-2 max-w-2xl text-gray-600">
            Campaigns, referral rewards, disputes, and system updates in one
            account inbox.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={updating === "all" || unreadCount === 0}
          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {updating === "all" ? "Updating..." : "Mark all read"}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-black/10 bg-white px-3 py-2"
        >
          {TYPE_FILTERS.map((type) => (
            <option key={type} value={type}>
              {formatType(type)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(event) => {
              setUnreadOnly(event.target.checked);
              setPage(1);
            }}
          />
          Unread only
        </label>
      </div>

      <div className="mt-6">
        {loading ? (
          <LoadingState rows={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={loadNotifications} />
        ) : notifications.length === 0 ? (
          <div className="card p-6 text-gray-600">No notifications found.</div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const unread = !notification.readAt;
              const meta = metadataSummary(notification.metadata);

              return (
                <div
                  key={notification.id}
                  className={`rounded-lg border px-4 py-3 ${
                    unread
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-black/10 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge">
                          {formatType(notification.type)}
                        </span>
                        {unread && (
                          <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-semibold text-white">
                            New
                          </span>
                        )}
                      </div>
                      <p className="mt-3 font-semibold">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {formatDate(notification.createdAt)}
                      </p>
                      {meta && (
                        <p className="mt-2 text-xs text-gray-500">{meta}</p>
                      )}
                    </div>
                    {unread && (
                      <button
                        type="button"
                        onClick={() => void markRead(notification.id)}
                        disabled={updating === notification.id}
                        className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updating === notification.id
                          ? "Updating..."
                          : "Mark read"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <PaginationControls
              currentPage={page}
              itemLabel="notifications"
              pageSize={NOTIFICATION_PAGE_SIZE}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
