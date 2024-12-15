"use client";
import { useCallback, useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/utils/errors";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import {
  getPaginatedItems,
  getPaginationMeta,
  type PaginationMeta,
} from "@/lib/api/pagination";

interface Product {
  id: string;
  name: string;
  sellerId: string;
  seller?: { user?: { name: string } };
  price: number | string;
  approvalStatus: string;
  createdAt: string;
}

const PENDING_PRODUCT_PAGE_SIZE = 10;

export default function ProductApprovalPage() {
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectingProductId, setRejectingProductId] = useState<string | null>(
    null,
  );
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>(
    {},
  );

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(PENDING_PRODUCT_PAGE_SIZE),
      });
      const { data } = await apiClient.get(
        `/admin/product-approval/pending?${params.toString()}`,
      );
      setProducts(getPaginatedItems<Product>(data));
      setPaginationMeta(getPaginationMeta<Product>(data));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to fetch products"));
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push("/login");
      return;
    }
    void fetchProducts();
  }, [user, isHydrated, router, fetchProducts]);

  const handleApprove = async (productId: string) => {
    try {
      await apiClient.post(`/admin/product-approval/${productId}/approve`);
      notify("Product approved.", "success");
      void fetchProducts();
    } catch (err) {
      notify(getErrorMessage(err, "Failed to approve product."), "error");
    }
  };

  const handleReject = async (productId: string) => {
    const reason = rejectReasons[productId]?.trim();
    if (!reason) {
      notify("Add a rejection reason before rejecting the product.", "error");
      return;
    }

    try {
      await apiClient.post(`/admin/product-approval/${productId}/reject`, {
        reason,
      });
      notify("Product rejected.", "success");
      setRejectingProductId(null);
      setRejectReasons((current) => ({ ...current, [productId]: "" }));
      void fetchProducts();
    } catch (err) {
      notify(getErrorMessage(err, "Failed to reject product."), "error");
    }
  };

  if (!isHydrated) {
    return <LoadingState />;
  }

  if (loading) return <LoadingState rows={4} />;

  const totalItems = paginationMeta?.totalItems ?? products.length;
  const totalPages = paginationMeta?.totalPages ?? 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Product Approval</h1>
      {error && (
        <ErrorState className="mt-6" message={error} onRetry={fetchProducts} />
      )}
      {!error && (
        <div className="card mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left">Product</th>
                <th className="px-6 py-3 text-left">Seller</th>
                <th className="px-6 py-3 text-left">Price</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No pending products
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-b">
                    <td className="px-6 py-4">{product.name}</td>
                    <td className="px-6 py-4">
                      {product.seller?.user?.name || product.sellerId}
                    </td>
                    <td className="px-6 py-4">
                      ${Number(product.price || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge">{product.approvalStatus}</span>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex min-w-56 flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleApprove(product.id)}
                            className="btn-primary"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRejectingProductId((current) =>
                                current === product.id ? null : product.id,
                              )
                            }
                            className="btn-secondary"
                          >
                            Reject
                          </button>
                        </div>
                        {rejectingProductId === product.id && (
                          <div className="space-y-2">
                            <textarea
                              value={rejectReasons[product.id] || ""}
                              onChange={(event) =>
                                setRejectReasons((current) => ({
                                  ...current,
                                  [product.id]: event.target.value,
                                }))
                              }
                              rows={3}
                              maxLength={500}
                              placeholder="Rejection reason"
                              className="w-full rounded-lg border border-black/10 px-3 py-2"
                            />
                            <button
                              type="button"
                              onClick={() => void handleReject(product.id)}
                              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                            >
                              Confirm reject
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="px-6 pb-6">
            <PaginationControls
              currentPage={currentPage}
              itemLabel="pending products"
              pageSize={PENDING_PRODUCT_PAGE_SIZE}
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
