"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
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

const SELLER_TIERS = [
  "SEED",
  "SPROUT",
  "GROWTH",
  "BLOOM",
  "EVERGREEN",
  "EARTH_GUARDIAN",
] as const;
const SELLER_PAGE_SIZE = 10;

interface SellerRow {
  id: string;
  tier: string;
  totalSales: number | string;
  user?: {
    name?: string;
    email?: string;
  };
}

const formatTier = (tier: string) => tier.replaceAll("_", " ");

export default function AdminTierManagementPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSellers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(SELLER_PAGE_SIZE),
      });
      const { data } = await apiClient.get(`/sellers?${params.toString()}`);
      setSellers(getPaginatedItems<SellerRow>(data));
      setPaginationMeta(getPaginationMeta<SellerRow>(data));
    } catch (error) {
      setError(getErrorMessage(error, "Failed to load sellers."));
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    void loadSellers();
  }, [isHydrated, loadSellers, router, user]);

  const updateTier = async (sellerId: string, tier: string) => {
    try {
      await apiClient.patch(`/sellers/${sellerId}`, { tier });
      setSellers((current) =>
        current.map((seller) =>
          seller.id === sellerId ? { ...seller, tier } : seller,
        ),
      );
      notify("Seller tier updated.", "success");
    } catch (error) {
      notify(getErrorMessage(error, "Failed to update seller tier."), "error");
    }
  };

  if (!isHydrated || loading) {
    return <LoadingState />;
  }

  const totalItems = paginationMeta?.totalItems ?? sellers.length;
  const totalPages = paginationMeta?.totalPages ?? 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Seller Tier Management</h1>
      {error && (
        <ErrorState className="mt-6" message={error} onRetry={loadSellers} />
      )}

      {!error && <div className="card mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Seller</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Total Sales</th>
              <th className="px-6 py-3 text-left">Tier</th>
            </tr>
          </thead>
          <tbody>
            {sellers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No sellers found.
                </td>
              </tr>
            ) : (
              sellers.map((seller) => (
                <tr key={seller.id} className="border-b">
                  <td className="px-6 py-4">{seller.user?.name || "Seller"}</td>
                  <td className="px-6 py-4">{seller.user?.email || "-"}</td>
                  <td className="px-6 py-4">
                    ${Number(seller.totalSales || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={seller.tier}
                      onChange={(event) =>
                        void updateTier(seller.id, event.target.value)
                      }
                      className="rounded-xl border border-black/10 px-3 py-2"
                    >
                      {SELLER_TIERS.map((tier) => (
                        <option key={tier} value={tier}>
                          {formatTier(tier)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-6 pb-6">
          <PaginationControls
            currentPage={currentPage}
            itemLabel="sellers"
            pageSize={SELLER_PAGE_SIZE}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>}
    </div>
  );
}
