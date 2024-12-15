"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getErrorMessage } from "@/lib/utils/errors";
import {
  getPaginatedItems,
  getPaginationMeta,
  type PaginationMeta,
} from "@/lib/api/pagination";
import type { ApiDataExportLog, ApiPrivacySettings } from "@/lib/types/api";

const EXPORT_PAGE_SIZE = 5;

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function downloadJsonFile(fileName: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function AccountPrivacyPage() {
  const router = useRouter();
  const { notify } = useToast();
  const { user, isHydrated, logout } = useAuthStore();
  const [settings, setSettings] = useState<ApiPrivacySettings | null>(null);
  const [exportLogs, setExportLogs] = useState<ApiDataExportLog[]>([]);
  const [exportsMeta, setExportsMeta] = useState<PaginationMeta | null>(null);
  const [exportsPage, setExportsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestingExport, setRequestingExport] = useState(false);
  const [downloadingExportId, setDownloadingExportId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  const [confirmCancelDeletion, setConfirmCancelDeletion] = useState(false);

  const loadPrivacyData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(exportsPage),
        pageSize: String(EXPORT_PAGE_SIZE),
      });
      const [settingsResult, exportsResult] = await Promise.all([
        apiClient.get<ApiPrivacySettings>("/privacy/settings"),
        apiClient.get(`/privacy/exports?${params.toString()}`),
      ]);
      setSettings(settingsResult.data);
      setExportLogs(getPaginatedItems<ApiDataExportLog>(exportsResult.data));
      setExportsMeta(getPaginationMeta<ApiDataExportLog>(exportsResult.data));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load privacy settings."));
    } finally {
      setLoading(false);
    }
  }, [exportsPage]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push("/login?next=/account/privacy");
      return;
    }

    void loadPrivacyData();
  }, [isHydrated, loadPrivacyData, router, user]);

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { data } = await apiClient.post<ApiPrivacySettings>(
        "/privacy/settings",
        {
          dataCollection: settings.dataCollection,
          analytics: settings.analytics,
          marketing: settings.marketing,
        },
      );
      setSettings(data);
      notify("Privacy preferences saved.", "success");
    } catch (saveError) {
      notify(
        getErrorMessage(saveError, "Failed to save preferences."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const requestExport = async () => {
    setRequestingExport(true);
    try {
      await apiClient.post<ApiDataExportLog>("/privacy/export");
      notify("Data export prepared.", "success");
      await loadPrivacyData();
    } catch (exportError) {
      notify(
        getErrorMessage(exportError, "Failed to prepare export."),
        "error",
      );
    } finally {
      setRequestingExport(false);
    }
  };

  const downloadExport = async (exportId: string) => {
    setDownloadingExportId(exportId);
    try {
      const { data } = await apiClient.get(
        `/privacy/exports/${exportId}/download`,
      );
      downloadJsonFile(`earthlyn-data-export-${exportId}.json`, data);
      notify("Data export downloaded.", "success");
      await loadPrivacyData();
    } catch (downloadError) {
      notify(
        getErrorMessage(downloadError, "Failed to download export."),
        "error",
      );
    } finally {
      setDownloadingExportId(null);
    }
  };

  const requestDeletion = async () => {
    try {
      const { data } = await apiClient.post<ApiPrivacySettings>(
        "/privacy/delete-account",
      );
      setSettings(data);
      notify("Account deletion requested.", "success");
    } catch (deleteError) {
      notify(
        getErrorMessage(deleteError, "Failed to request deletion."),
        "error",
      );
    } finally {
      setConfirmDeletion(false);
    }
  };

  const cancelDeletion = async () => {
    try {
      const { data } = await apiClient.post<ApiPrivacySettings>(
        "/privacy/cancel-deletion",
      );
      setSettings(data);
      notify("Deletion request cancelled.", "success");
    } catch (cancelError) {
      notify(
        getErrorMessage(cancelError, "Failed to cancel deletion."),
        "error",
      );
    } finally {
      setConfirmCancelDeletion(false);
    }
  };

  if (!isHydrated || loading) {
    return <LoadingState />;
  }

  const totalExportItems = exportsMeta?.totalItems ?? exportLogs.length;
  const totalExportPages = exportsMeta?.totalPages ?? 1;
  const deletionPending = Boolean(settings?.deletionRequested);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="badge">Account</p>
          <h1 className="mt-4 text-4xl">Privacy Center</h1>
          <p className="mt-3 text-gray-600">
            Manage consent, export your marketplace data, and control account
            deletion.
          </p>
        </div>
        <button type="button" onClick={logout} className="btn-secondary">
          Logout
        </button>
      </div>

      {error && (
        <ErrorState
          className="mt-6"
          message={error}
          onRetry={loadPrivacyData}
        />
      )}

      {!error && settings && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="card p-6">
            <h2 className="text-2xl font-semibold">Consent Preferences</h2>
            <div className="mt-5 space-y-4">
              {[
                {
                  key: "dataCollection" as const,
                  label: "Optional data collection",
                  description:
                    "Allows non-essential preference and product interaction collection.",
                },
                {
                  key: "analytics" as const,
                  label: "Analytics",
                  description:
                    "Helps measure catalog quality, checkout health, and site performance.",
                },
                {
                  key: "marketing" as const,
                  label: "Marketing",
                  description:
                    "Allows sustainability campaigns, referral updates, and promotion targeting.",
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-start justify-between gap-4 rounded-lg border border-black/10 p-4"
                >
                  <span>
                    <span className="block font-semibold">{item.label}</span>
                    <span className="mt-1 block text-sm text-gray-600">
                      {item.description}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings[item.key]}
                    onChange={(event) =>
                      setSettings((current) =>
                        current
                          ? { ...current, [item.key]: event.target.checked }
                          : current,
                      )
                    }
                    className="mt-1"
                  />
                </label>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Last updated: {formatDate(settings.lastUpdatedAt)}
            </p>
            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={saving}
              className="btn-primary mt-5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </section>

          <section className="card p-6">
            <h2 className="text-2xl font-semibold">Account Deletion</h2>
            {deletionPending ? (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold">Deletion requested</p>
                <p className="mt-2">
                  Requested: {formatDate(settings.deletionRequested)}
                </p>
                <p className="mt-1">
                  Scheduled: {formatDate(settings.deletionScheduledAt)}
                </p>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-gray-600">
                Requesting deletion starts a 7-day grace period. After that,
                personal identifiers are anonymized while required marketplace
                records remain available for compliance.
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              {deletionPending ? (
                <button
                  type="button"
                  onClick={() => setConfirmCancelDeletion(true)}
                  className="btn-primary"
                >
                  Cancel Deletion
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeletion(true)}
                  className="rounded-full bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
                >
                  Request Deletion
                </button>
              )}
            </div>
          </section>

          <section className="card p-6 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Data Export</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Export links expire after 30 days.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void requestExport()}
                disabled={requestingExport}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {requestingExport ? "Preparing..." : "Prepare Export"}
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Created</th>
                    <th className="px-4 py-3 text-left">Expires</th>
                    <th className="px-4 py-3 text-left">Downloaded</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {exportLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-4 text-center text-gray-500"
                      >
                        No exports prepared yet.
                      </td>
                    </tr>
                  ) : (
                    exportLogs.map((exportLog) => (
                      <tr key={exportLog.id} className="border-b">
                        <td className="px-4 py-4">
                          {formatDate(exportLog.exportedAt)}
                        </td>
                        <td className="px-4 py-4">
                          {formatDate(exportLog.expiresAt)}
                        </td>
                        <td className="px-4 py-4">
                          {formatDate(exportLog.downloadedAt)}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => void downloadExport(exportLog.id)}
                            disabled={downloadingExportId === exportLog.id}
                            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {downloadingExportId === exportLog.id
                              ? "Downloading..."
                              : "Download JSON"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls
              currentPage={exportsPage}
              itemLabel="exports"
              pageSize={EXPORT_PAGE_SIZE}
              totalItems={totalExportItems}
              totalPages={totalExportPages}
              onPageChange={setExportsPage}
            />
          </section>
        </div>
      )}

      {confirmDeletion && (
        <ConfirmDialog
          title="Request account deletion?"
          description="This starts the deletion grace period. Your account will be anonymized after the grace period unless you cancel."
          confirmLabel="Request deletion"
          isDestructive
          onCancel={() => setConfirmDeletion(false)}
          onConfirm={() => void requestDeletion()}
        />
      )}

      {confirmCancelDeletion && (
        <ConfirmDialog
          title="Cancel deletion request?"
          description="Your account will remain active and the scheduled deletion will be removed."
          confirmLabel="Cancel deletion"
          onCancel={() => setConfirmCancelDeletion(false)}
          onConfirm={() => void cancelDeletion()}
        />
      )}
    </div>
  );
}
