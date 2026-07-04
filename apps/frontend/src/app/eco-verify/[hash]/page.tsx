"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api/client";
import { getErrorMessage } from "@/lib/utils/errors";

interface VerificationResult {
  verified: boolean;
  hash: string;
  issuedAt: string;
  buyer: string;
  product: string;
  category: string;
  ecoScore: number;
  co2SavedKg: number;
  plasticBottlesAvoided: number;
  ecoPointsEarned: number;
  orderTotal: number;
  orderDate: string;
}

export default function EcoVerifyPage() {
  const params = useParams();
  const hash = params?.hash as string;
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hash) return;
    apiClient.get<VerificationResult>(`/eco-verify/${hash}`)
      .then(({ data }) => setResult(data))
      .catch((err) => setError(getErrorMessage(err, "Verification hash not found.")))
      .finally(() => setLoading(false));
  }, [hash]);

  const shortHash = hash ? `${hash.slice(0, 8)}...${hash.slice(-8)}` : "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--parchment)]">
        <div className="text-center">
          <div className="text-4xl animate-spin mb-4">⟳</div>
          <p className="text-gray-500 text-sm">Verifying on-chain record…</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--parchment)] px-4">
        <div className="card p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-semibold mb-2">Not Verified</h1>
          <p className="text-gray-500 text-sm mb-6">{error || "This hash does not correspond to any recorded eco impact."}</p>
          <code className="block text-xs bg-gray-100 rounded p-2 break-all text-gray-600 mb-6">{hash}</code>
          <Link href="/products" className="btn-primary">Back to Shop</Link>
        </div>
      </div>
    );
  }

  const date = new Date(result.orderDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Certificate card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-emerald-200">
          {/* Header band */}
          <div className="bg-gradient-to-r from-emerald-700 to-teal-600 px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">🌍</div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">Earthlyn Eco Certificate</p>
                <h1 className="text-xl font-bold">Verified Impact Record</h1>
              </div>
              <div className="ml-auto bg-emerald-500/40 rounded-full p-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-6 h-6 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-emerald-100 text-sm">This certificate confirms a verified eco-friendly purchase was recorded on {date}.</p>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-5">
            {/* Impact metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center bg-emerald-50 rounded-xl py-3 border border-emerald-100">
                <p className="text-2xl font-bold text-emerald-700">{result.co2SavedKg}</p>
                <p className="text-xs text-emerald-600 mt-0.5">kg CO₂ Saved</p>
              </div>
              <div className="text-center bg-teal-50 rounded-xl py-3 border border-teal-100">
                <p className="text-2xl font-bold text-teal-700">{result.plasticBottlesAvoided}</p>
                <p className="text-xs text-teal-600 mt-0.5">Bottles Avoided</p>
              </div>
              <div className="text-center bg-amber-50 rounded-xl py-3 border border-amber-100">
                <p className="text-2xl font-bold text-amber-700">{result.ecoPointsEarned}</p>
                <p className="text-xs text-amber-600 mt-0.5">Eco Points</p>
              </div>
            </div>

            {/* Purchase details */}
            <div className="space-y-2.5">
              <Row label="Product" value={result.product} />
              <Row label="Category" value={result.category} />
              <Row label="Eco Score" value={`${result.ecoScore} / 100`} />
              <Row label="Buyer" value={result.buyer} />
              <Row label="Purchase Date" value={date} />
            </div>

            {/* Hash */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Verification Hash</p>
              <code className="block text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 break-all text-gray-600 font-mono">{result.hash}</code>
              <p className="text-xs text-gray-400 mt-1.5">
                SHA-256 of buyer ID · order ID · CO₂ · plastic · timestamp. Tamper-evident — any change invalidates the hash.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-100 px-8 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600">EARTHLYN</p>
              <p className="text-xs text-gray-400">Sustainability-verified purchase</p>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
              </svg>
              <span className="text-xs font-semibold">Eco Verified</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Certificate ID: <code className="font-mono">{shortHash}</code>
        </p>

        <div className="text-center mt-6">
          <Link href="/products" className="btn-secondary text-sm">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right">{value}</span>
    </div>
  );
}
