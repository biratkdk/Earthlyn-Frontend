"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { getErrorMessage } from "@/lib/utils/errors";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import {
  getPaginatedItems,
  getPaginationMeta,
  type PaginationMeta,
} from "@/lib/api/pagination";
import type { ApiAdminAuditLog } from "@/lib/types/api";

const AUDIT_PAGE_SIZE = 20;

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatMetadata(metadata?: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "-";
  }

  return JSON.stringify(metadata);
}

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [logs, setLogs] = useState<ApiAdminAuditLog[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    action: "",
    entityType: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(AUDIT_PAGE_SIZE),
      });

      if (appliedFilters.action.trim()) {
        params.set("action", appliedFilters.action.trim());
      }

      if (appliedFilters.entityType.trim()) {
        params.set("entityType", appliedFilters.entityType.trim());
      }

      const { data } = await apiClient.get(
        `/admin/audit-logs?${params.toString()}`,
      );
      setLogs(getPaginatedItems<ApiAdminAuditLog>(data));
      setPaginationMeta(getPaginationMeta<ApiAdminAuditLog>(data));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load audit logs."));
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, currentPage]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    void loadLogs();
  }, [isHydrated, loadLogs, router, user]);

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCurrentPage(1);
    setAppliedFilters({
      action: actionFilter,
      entityType: entityTypeFilter,
    });
  };

  const clearFilters = () => {
    setActionFilter("");
    setEntityTypeFilter("");
    setCurrentPage(1);
    setAppliedFilters({ action: "", entityType: "" });
  };

  if (!isHydrated || loading) {
    return <LoadingState />;
  }

  const totalItems = paginationMeta?.totalItems ?? logs.length;
  const totalPages = paginationMeta?.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-4xl">Admin Audit Logs</h1>

      <form
        onSubmit={applyFilters}
        className="mt-6 grid gap-3 rounded-lg border border-black/10 bg-white p-4 md:grid-cols-[1fr_1fr_auto_auto]"
      >
        <input
          type="text"
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          placeholder="Action, e.g. APPROVE_SELLER_KYC"
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <input
          type="text"
          value={entityTypeFilter}
          onChange={(event) => setEntityTypeFilter(event.target.value)}
          placeholder="Entity type, e.g. SELLER_KYC"
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <button type="submit" className="btn-primary">
          Filter
        </button>
        <button type="button" onClick={clearFilters} className="btn-secondary">
          Clear
        </button>
      </form>

      {error && (
        <ErrorState className="mt-6" message={error} onRetry={loadLogs} />
      )}

      {!error && (
        <div className="card mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Time</th>
                <th className="px-6 py-3 text-left">Admin</th>
                <th className="px-6 py-3 text-left">Action</th>
                <th className="px-6 py-3 text-left">Entity</th>
                <th className="px-6 py-3 text-left">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b align-top">
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold">
                        {log.admin?.name || log.adminId}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {log.admin?.email || "-"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge">{log.action}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <p>{log.entityType}</p>
                      <p className="mt-1 max-w-40 truncate text-xs">
                        {log.entityId || "-"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <code className="block max-w-md whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-2 text-xs text-gray-700">
                        {formatMetadata(log.metadata)}
                      </code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="px-6 pb-6">
            <PaginationControls
              currentPage={currentPage}
              itemLabel="audit logs"
              pageSize={AUDIT_PAGE_SIZE}
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
