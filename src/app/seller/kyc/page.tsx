"use client";
import { useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";

export default function KYCPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [documents, setDocuments] = useState([
    { docType: "GOVT_ID", url: "" },
    { docType: "BUSINESS_LICENSE", url: "" },
    { docType: "BANK_STATEMENT", url: "" },
  ]);

  useEffect(() => {
    if (!user || user.role !== "SELLER") {
      router.push("/login");
      return;
    }
    apiClient.get("/seller/kyc/status").then((res) => setStatus(res.data.kycStatus));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post("/seller/kyc/submit", { documents });
      alert("KYC submitted successfully!");
      const res = await apiClient.get("/seller/kyc/status");
      setStatus(res.data.kycStatus);
    } catch (e: any) {
      alert("Error: " + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-4xl">KYC Verification</h1>
      <p className="mt-2 text-gray-600">Status: <span className="badge">{status || "Unknown"}</span></p>

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
              type="url"
              placeholder="Document URL"
              value={doc.url}
              onChange={(e) => {
                const next = [...documents];
                next[idx] = { ...doc, url: e.target.value };
                setDocuments(next);
              }}
              required
              className="rounded-xl border border-black/10 px-3 py-2 md:col-span-2"
            />
          </div>
        ))}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Submitting..." : "Submit KYC"}
        </button>
      </form>
    </div>
  );
}
