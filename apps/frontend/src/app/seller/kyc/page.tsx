"use client";
import { useCallback, useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/utils/errors";
import { useToast } from "@/components/ui/ToastProvider";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/Skeleton";

const MAX_KYC_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_KYC_DOCUMENT_MB = MAX_KYC_DOCUMENT_BYTES / (1024 * 1024);

interface KycStatusResponse {
  kycStatus?: "PENDING" | "APPROVED" | "REJECTED";
  isVerified?: boolean;
  documentsSubmitted?: boolean;
  kycRejectionReason?: string | null;
}

export default function KYCPage() {
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [kycState, setKycState] = useState<KycStatusResponse | null>(null);
  const [documents, setDocuments] = useState([
    { docType: "GOVT_ID", file: null as File | null },
    { docType: "BUSINESS_LICENSE", file: null as File | null },
    { docType: "BANK_STATEMENT", file: null as File | null },
  ]);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError("");
    try {
      const res = await apiClient.get("/seller/kyc/status");
      setKycState(res.data || null);
    } catch (error) {
      setStatusError(getErrorMessage(error, "Failed to load KYC status."));
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "SELLER") {
      router.push("/dashboard");
      return;
    }

    void loadStatus();
  }, [isHydrated, user, router, loadStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (kycState?.documentsSubmitted && kycState.kycStatus === "PENDING") {
      notify("Your KYC documents are already pending review.", "error");
      return;
    }

    if (kycState?.kycStatus === "APPROVED") {
      notify("Your KYC is already approved.", "error");
      return;
    }

    const missingDocument = documents.find((doc) => !doc.file);
    if (missingDocument) {
      notify("Upload all required KYC documents.", "error");
      return;
    }

    const oversizedDocument = documents.find(
      (doc) => doc.file && doc.file.size > MAX_KYC_DOCUMENT_BYTES,
    );
    if (oversizedDocument) {
      notify(
        `Each KYC document must be ${MAX_KYC_DOCUMENT_MB}MB or smaller.`,
        "error",
      );
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      documents.forEach((doc) => {
        if (doc.file) {
          formData.append("docTypes", doc.docType);
          formData.append("documents", doc.file);
        }
      });

      await apiClient.post("/seller/kyc/submit-files", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      notify("KYC submitted successfully.", "success");
      await loadStatus();
    } catch (e) {
      notify(getErrorMessage(e, "KYC submission failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isHydrated) {
    return <LoadingState />;
  }

  const documentsPendingReview =
    kycState?.documentsSubmitted && kycState.kycStatus === "PENDING";
  const isApproved = kycState?.kycStatus === "APPROVED";
  const isSubmissionDisabled =
    loading || statusLoading || isApproved || documentsPendingReview;
  const displayStatus = statusLoading
    ? "Loading"
    : kycState?.documentsSubmitted
      ? kycState.kycStatus || "Pending"
      : "Not submitted";

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-4xl">KYC Verification</h1>
      <p className="mt-2 text-gray-600">
        Status: <span className="badge">{displayStatus}</span>
      </p>
      {statusError && (
        <ErrorState
          className="mt-4"
          message={statusError}
          onRetry={loadStatus}
        />
      )}
      {documentsPendingReview && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your documents are pending admin review. You can upload new documents
          only after rejection.
        </p>
      )}
      {kycState?.kycStatus === "REJECTED" && kycState.kycRejectionReason && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Rejection reason: {kycState.kycRejectionReason}
        </p>
      )}

      <form onSubmit={handleSubmit} className="card p-6 mt-6 space-y-4">
        {documents.map((doc, idx) => (
          <div key={doc.docType} className="grid md:grid-cols-3 gap-3">
            <input
              type="text"
              value={doc.docType}
              readOnly
              className="rounded-xl border border-black/10 px-3 py-2 bg-gray-100"
            />
            <input
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && file.size > MAX_KYC_DOCUMENT_BYTES) {
                  notify(
                    `Each KYC document must be ${MAX_KYC_DOCUMENT_MB}MB or smaller.`,
                    "error",
                  );
                  e.target.value = "";
                  const next = [...documents];
                  next[idx] = { ...doc, file: null };
                  setDocuments(next);
                  return;
                }

                const next = [...documents];
                next[idx] = { ...doc, file };
                setDocuments(next);
              }}
              required
              disabled={isSubmissionDisabled}
              className="rounded-xl border border-black/10 px-3 py-2 md:col-span-2"
            />
          </div>
        ))}
        <button
          type="submit"
          disabled={isSubmissionDisabled}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Submitting..."
            : documentsPendingReview
              ? "Pending Review"
              : isApproved
                ? "KYC Approved"
                : "Submit KYC"}
        </button>
      </form>
    </div>
  );
}
