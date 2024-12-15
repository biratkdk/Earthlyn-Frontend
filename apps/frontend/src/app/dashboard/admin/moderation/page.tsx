"use client";
import { useCallback, useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import type { ApiModerationFlag } from "@/lib/types/api";
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

const FLAG_PAGE_SIZE = 10;

export default function ModerationPage() {
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const router = useRouter();
  const [flags, setFlags] = useState<ApiModerationFlag[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(FLAG_PAGE_SIZE),
      });
      const { data } = await apiClient.get(
        `/messages/moderation/flagged?${params.toString()}`,
      );
      setFlags(getPaginatedItems<ApiModerationFlag>(data));
      setPaginationMeta(getPaginationMeta<ApiModerationFlag>(data));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load moderation flags."));
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user || !["ADMIN", "CUSTOMER_SERVICE"].includes(user.role)) {
      router.push("/login");
      return;
    }
    void fetchFlags();
  }, [user, isHydrated, router, fetchFlags]);

  const handleResolve = async (messageId: string) => {
    try {
      await apiClient.post(`/messages/moderation/${messageId}/resolve`);
      notify("Message flag resolved.", "success");
      void fetchFlags();
    } catch (error) {
      notify(getErrorMessage(error, "Failed to resolve message flag."), "error");
    }
  };

  if (!isHydrated) {
    return <LoadingState />;
  }

  if (loading) return <LoadingState rows={4} />;

  const totalItems = paginationMeta?.totalItems ?? flags.length;
  const totalPages = paginationMeta?.totalPages ?? 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Message Moderation</h1>
      {error ? (
        <ErrorState className="mt-8" message={error} onRetry={fetchFlags} />
      ) : (
      <div className="card mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left">From</th>
              <th className="px-6 py-3 text-left">To</th>
              <th className="px-6 py-3 text-left">Message</th>
              <th className="px-6 py-3 text-left">Reason</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {flags.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No flagged messages</td></tr>
            ) : (
              flags.map((f) => (
                <tr key={f.id} className="border-b">
                  <td className="px-6 py-4">{f.message?.sender?.name}</td>
                  <td className="px-6 py-4">{f.message?.receiver?.name}</td>
                  <td className="px-6 py-4 max-w-xs truncate">{f.message?.content}</td>
                  <td className="px-6 py-4">{f.reason}</td>
                  <td className="px-6 py-4"><span className="badge">{f.status}</span></td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => void handleResolve(f.messageId)}
                      className="btn-primary"
                    >
                      Resolve
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-6 pb-6">
          <PaginationControls
            currentPage={currentPage}
            itemLabel="flags"
            pageSize={FLAG_PAGE_SIZE}
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
