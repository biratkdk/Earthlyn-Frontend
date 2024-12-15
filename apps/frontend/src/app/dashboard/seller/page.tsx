"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { getErrorMessage } from "@/lib/utils/errors";
import { getAssetUrl } from "@/lib/utils/assets";
import { LoadingState, TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  getPaginatedItems,
  getPaginationMeta,
  type PaginationMeta,
} from "@/lib/api/pagination";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number | string;
  stock: number;
  approvalStatus: string;
  ecoScore: number;
  category: string;
  sellerId: string;
  imageUrl?: string | null;
  createdAt?: string;
}

interface SellerSummary {
  sellerId: string;
  totalSales: number;
  totalEarnings: number;
  totalOrders: number;
  averageOrderValue: number;
}

interface SellerProfile {
  id: string;
  tier?: string;
  kycStatus?: "PENDING" | "APPROVED" | "REJECTED";
  isVerified?: boolean;
  productsCount?: number;
}

const PRODUCT_PAGE_SIZE = 8;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const CREATED_AT_DESC_SORT = "created-desc";
const PRODUCT_SORT_OPTIONS = [
  { label: "Newest", value: CREATED_AT_DESC_SORT },
  { label: "Name A-Z", value: "name-asc" },
  { label: "Price low-high", value: "price-asc" },
  { label: "Price high-low", value: "price-desc" },
  { label: "Eco score high-low", value: "eco-desc" },
] as const;
const PRODUCT_STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED"] as const;
const DEFAULT_PROCESSING_FEE_RATE = 0.05;
const PROCESSING_FEE_RATE = (() => {
  const rate = Number(process.env.NEXT_PUBLIC_PROCESSING_FEE_RATE);
  return Number.isFinite(rate) && rate >= 0 ? rate : DEFAULT_PROCESSING_FEE_RATE;
})();

export default function SellerDashboard() {
  const router = useRouter();
  const { notify } = useToast();
  const { user, isHydrated } = useAuthStore();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const editImageInputRef = useRef<HTMLInputElement | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productPaginationMeta, setProductPaginationMeta] =
    useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(
    null,
  );
  const [sellerSummary, setSellerSummary] = useState<SellerSummary | null>(
    null,
  );
  const [summaryError, setSummaryError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null,
  );
  const [productSearch, setProductSearch] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState("all");
  const [productSort, setProductSort] =
    useState<(typeof PRODUCT_SORT_OPTIONS)[number]["value"]>(
      CREATED_AT_DESC_SORT,
    );
  const [editFormData, setEditFormData] = useState({
    name: "",
    price: "",
    stock: "",
    category: "",
    description: "",
    ecoScore: "",
  });
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "",
    category: "Eco",
    description: "",
    ecoScore: "50",
  });
  const resetProductForm = () => {
    setFormData({
      name: "",
      price: "",
      stock: "",
      category: "Eco",
      description: "",
      ecoScore: "50",
    });
    setImageFile(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const fetchProducts = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(currentPage),
      pageSize: String(PRODUCT_PAGE_SIZE),
      sortBy: productSort,
    });
    if (productSearch.trim()) params.set("search", productSearch.trim());
    if (productStatusFilter !== "all")
      params.set("status", productStatusFilter);

    const { data } = await apiClient.get(`/products/mine?${params.toString()}`);
    setProducts(getPaginatedItems<Product>(data));
    setProductPaginationMeta(getPaginationMeta<Product>(data));
  }, [currentPage, productSearch, productSort, productStatusFilter]);

  const fetchSellerSummary = useCallback(async () => {
    if (!user) return;

    setSummaryError("");

    try {
      const { data: seller } = await apiClient.get(
        `/sellers/by-user/${user.id}`,
      );
      if (!seller?.id) {
        setSellerProfile(null);
        setSellerSummary(null);
        setSummaryError("Seller profile was not found.");
        return;
      }

      setSellerProfile(seller);

      const [earningsResult, profitSummaryResult] = await Promise.allSettled([
        apiClient.get(`/sellers/${seller.id}/earnings`),
        apiClient.get(`/sellers/${seller.id}/profit-summary`),
      ]);

      const earnings =
        earningsResult.status === "fulfilled"
          ? earningsResult.value.data
          : null;
      const profitSummary =
        profitSummaryResult.status === "fulfilled"
          ? profitSummaryResult.value.data
          : null;

      if (
        earningsResult.status === "rejected" ||
        profitSummaryResult.status === "rejected"
      ) {
        setSummaryError(
          "Some seller summary metrics could not be loaded. Showing available data.",
        );
      }

      setSellerSummary({
        sellerId: seller.id,
        totalSales: Number(seller.totalSales || profitSummary?.totalSales || 0),
        totalEarnings: Number(
          earnings?.totalEarnings || profitSummary?.totalEarnings || 0,
        ),
        totalOrders: Number(
          earnings?.totalOrders || profitSummary?.orderCount || 0,
        ),
        averageOrderValue: Number(earnings?.averageOrderValue || 0),
      });
    } catch (error) {
      setSellerSummary(null);
      setSummaryError(getErrorMessage(error, "Failed to load seller summary."));
    }
  }, [user]);

  const loadSellerDashboard = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      await Promise.all([fetchProducts(), fetchSellerSummary()]);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load seller dashboard"));
    } finally {
      setLoading(false);
    }
  }, [fetchProducts, fetchSellerSummary, user]);

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

    void loadSellerDashboard();
  }, [user, isHydrated, router, loadSellerDashboard]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const { data: product } = await apiClient.post<Product>("/products", {
        name: formData.name,
        price: Number(formData.price),
        stock: Number(formData.stock),
        category: formData.category,
        description: formData.description,
        ecoScore: Number(formData.ecoScore),
      });

      let uploadWarning = "";
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append("file", imageFile);
        try {
          await apiClient.post(
            `/products/${product.id}/upload-image`,
            uploadData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );
        } catch (uploadError) {
          uploadWarning = getErrorMessage(
            uploadError,
            "Product was created, but the image upload failed.",
          );
        }
      }

      resetProductForm();
      setShowForm(false);
      await fetchProducts();
      if (uploadWarning) {
        setError(uploadWarning);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create product"));
    }
  };

  const handleProductFormToggle = () => {
    if (showForm) {
      resetProductForm();
      setShowForm(false);
      return;
    }

    setError("");
    setShowForm(true);
  };

  const startEditingProduct = (product: Product) => {
    setEditingProductId(product.id);
    setEditImageFile(null);
    setEditFormData({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      category: product.category,
      description: product.description || "",
      ecoScore: String(product.ecoScore),
    });
    if (editImageInputRef.current) {
      editImageInputRef.current.value = "";
    }
    setError("");
  };

  const cancelEditingProduct = () => {
    setEditingProductId(null);
    setEditImageFile(null);
    setEditFormData({
      name: "",
      price: "",
      stock: "",
      category: "",
      description: "",
      ecoScore: "",
    });
    if (editImageInputRef.current) {
      editImageInputRef.current.value = "";
    }
  };

  const handleUpdateProduct = async (productId: string) => {
    setError("");

    const price = Number(editFormData.price);
    const stock = Number(editFormData.stock);
    const ecoScore = Number(editFormData.ecoScore);
    const name = editFormData.name.trim();
    const category = editFormData.category.trim();

    if (!name) {
      setError("Product name is required.");
      return;
    }

    if (!category) {
      setError("Category is required.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError("Price must be greater than 0.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setError("Stock must be a whole number of 0 or more.");
      return;
    }

    if (!Number.isFinite(ecoScore) || ecoScore < 0 || ecoScore > 100) {
      setError("Eco score must be between 0 and 100.");
      return;
    }

    try {
      const payload: Record<string, string | number> = {
        name,
        price,
        stock,
        category,
        ecoScore,
      };

      if (editFormData.description.trim()) {
        payload.description = editFormData.description.trim();
      }

      await apiClient.patch(`/products/${productId}`, payload);
      let uploadWarning = "";
      if (editImageFile) {
        const uploadData = new FormData();
        uploadData.append("file", editImageFile);
        try {
          await apiClient.post(
            `/products/${productId}/upload-image`,
            uploadData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );
        } catch (uploadError) {
          uploadWarning = getErrorMessage(
            uploadError,
            "Product was updated, but the image upload failed.",
          );
        }
      }

      cancelEditingProduct();
      await fetchProducts();
      if (uploadWarning) {
        setError(uploadWarning);
      }
      notify("Product updated.", "success");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update product"));
    }
  };

  const confirmDeleteProduct = async () => {
    if (!deleteCandidate) return;
    setError("");
    setDeletingProductId(deleteCandidate.id);

    try {
      await apiClient.delete(`/products/${deleteCandidate.id}`);
      setDeleteCandidate(null);
      await fetchProducts();
      notify("Product deleted.", "success");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete product"));
    } finally {
      setDeletingProductId(null);
    }
  };

  if (!isHydrated) {
    return <LoadingState />;
  }

  const productCount =
    productPaginationMeta?.totalItems ??
    sellerProfile?.productsCount ??
    products.length;
  const hasApprovedProduct = products.some(
    (product) => product.approvalStatus === "APPROVED",
  );
  const onboardingSteps = [
    {
      label: "Verify email",
      complete: Boolean(user?.emailVerifiedAt),
      href: "/account/privacy",
    },
    {
      label: "Complete seller KYC",
      complete: sellerProfile?.kycStatus === "APPROVED",
      href: "/seller/kyc",
    },
    {
      label: "Create first product",
      complete: productCount > 0,
      action: () => setShowForm(true),
    },
    {
      label: "Get a product approved",
      complete: hasApprovedProduct,
      href: "/dashboard/seller",
    },
    {
      label: "Monitor platform fulfillment",
      complete: Boolean(sellerSummary?.totalOrders),
      href: "/dashboard/seller/delivery",
    },
  ];
  const completedOnboardingSteps = onboardingSteps.filter(
    (step) => step.complete,
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl">Seller Dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/seller/earnings" className="btn-secondary">
            View Earnings
          </Link>
          <button onClick={handleProductFormToggle} className="btn-primary">
            {showForm ? "Cancel" : "Add Product"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {summaryError && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span>{summaryError}</span>
          <button
            type="button"
            onClick={() => void fetchSellerSummary()}
            className="font-semibold underline"
          >
            Retry summary
          </button>
        </div>
      )}

      <section className="card mb-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Seller Onboarding</h2>
            <p className="mt-1 text-sm text-gray-600">
              {completedOnboardingSteps}/{onboardingSteps.length} steps complete
            </p>
          </div>
          <span className="badge">
            {(sellerProfile?.tier || "SEED").replaceAll("_", " ")}
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {onboardingSteps.map((step) => (
            <div
              key={step.label}
              className={`rounded-lg border p-4 text-sm ${
                step.complete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-black/10 bg-white text-gray-700"
              }`}
            >
              <p className="font-semibold">{step.complete ? "Done" : "Next"}</p>
              <p className="mt-1">{step.label}</p>
              {!step.complete && step.href && (
                <Link
                  href={step.href}
                  className="mt-3 inline-block font-semibold text-[var(--accent)] underline"
                >
                  Open
                </Link>
              )}
              {!step.complete && step.action && (
                <button
                  type="button"
                  onClick={step.action}
                  className="mt-3 font-semibold text-[var(--accent)] underline"
                >
                  Start
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm text-gray-600">Total Sales</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">
            ${Number(sellerSummary?.totalSales || 0).toFixed(2)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-600">Total Earnings</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">
            ${Number(sellerSummary?.totalEarnings || 0).toFixed(2)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-600">Orders Received</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">
            {sellerSummary?.totalOrders || 0}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-600">Average Order</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">
            ${Number(sellerSummary?.averageOrderValue || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAddProduct} className="card p-6 mb-8 space-y-4">
          <h2 className="text-xl font-semibold">Add New Product</h2>
          {formData.price && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Estimated processing fee ({(PROCESSING_FEE_RATE * 100).toFixed(1)}
              %): ${(Number(formData.price || 0) * PROCESSING_FEE_RATE).toFixed(2)}
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Product name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="rounded-xl border border-black/10 px-4 py-2"
            />
            <input
              type="number"
              placeholder="Price"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              required
              min="0.01"
              step="0.01"
              className="rounded-xl border border-black/10 px-4 py-2"
            />
            <input
              type="number"
              placeholder="Stock"
              value={formData.stock}
              onChange={(e) =>
                setFormData({ ...formData, stock: e.target.value })
              }
              required
              min="0"
              className="rounded-xl border border-black/10 px-4 py-2"
            />
            <input
              type="number"
              placeholder="Eco score"
              value={formData.ecoScore}
              onChange={(e) =>
                setFormData({ ...formData, ecoScore: e.target.value })
              }
              required
              min="0"
              max="100"
              className="rounded-xl border border-black/10 px-4 py-2"
            />
          </div>
          <input
            type="text"
            placeholder="Category"
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className="rounded-xl border border-black/10 px-4 py-2 w-full"
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file && file.size > 5 * 1024 * 1024) {
                setError("Product image must be 5MB or smaller.");
                e.target.value = "";
                setImageFile(null);
                return;
              }

              setError("");
              setImageFile(file);
            }}
            className="rounded-xl border border-black/10 px-4 py-2 w-full"
          />
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            required
            className="rounded-xl border border-black/10 px-4 py-2 w-full"
          />
          <button type="submit" className="btn-primary">
            Create Product
          </button>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="border-b p-6">
          <h2 className="text-xl font-semibold">Your Products</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input
              type="text"
              placeholder="Search products..."
              value={productSearch}
              onChange={(event) => {
                setProductSearch(event.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-black/10 px-4 py-2"
            />
            <select
              value={productStatusFilter}
              onChange={(event) => {
                setProductStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-black/10 px-4 py-2"
            >
              <option value="all">All statuses</option>
              {PRODUCT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <select
              value={productSort}
              onChange={(event) => {
                setProductSort(event.target.value as typeof productSort);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-black/10 px-4 py-2"
            >
              {PRODUCT_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {loading ? (
          <TableSkeleton rows={4} columns={6} />
        ) : products.length === 0 ? (
          <p className="p-6 text-gray-500">No products match this view.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Image</th>
                <th className="px-6 py-3 text-left">Price</th>
                <th className="px-6 py-3 text-left">Stock</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const isEditing = editingProductId === product.id;

                return (
                  <tr key={product.id} className="border-b align-top">
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <div className="min-w-64 space-y-2">
                          <input
                            type="text"
                            value={editFormData.name}
                            required
                            minLength={2}
                            onChange={(event) =>
                              setEditFormData({
                                ...editFormData,
                                name: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-black/10 px-3 py-2"
                          />
                          <input
                            type="text"
                            value={editFormData.category}
                            required
                            minLength={2}
                            onChange={(event) =>
                              setEditFormData({
                                ...editFormData,
                                category: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-black/10 px-3 py-2"
                            placeholder="Category"
                          />
                          <input
                            type="number"
                            value={editFormData.ecoScore}
                            required
                            min="0"
                            max="100"
                            onChange={(event) =>
                              setEditFormData({
                                ...editFormData,
                                ecoScore: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-black/10 px-3 py-2"
                            placeholder="Eco score"
                          />
                          <textarea
                            value={editFormData.description}
                            minLength={10}
                            onChange={(event) =>
                              setEditFormData({
                                ...editFormData,
                                description: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-black/10 px-3 py-2"
                            placeholder="Description"
                          />
                        </div>
                      ) : (
                        product.name
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <div className="w-48 space-y-2">
                          {getAssetUrl(product.imageUrl) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getAssetUrl(product.imageUrl) || ""}
                              alt={product.name}
                              className="h-12 w-16 rounded object-cover"
                            />
                          ) : (
                            <span className="text-xs text-gray-500">
                              No current image
                            </span>
                          )}
                          <input
                            ref={editImageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0] || null;
                              if (file && file.size > MAX_IMAGE_SIZE) {
                                setError(
                                  "Product image must be 5MB or smaller.",
                                );
                                event.target.value = "";
                                setEditImageFile(null);
                                return;
                              }

                              setError("");
                              setEditImageFile(file);
                            }}
                            className="w-full rounded-lg border border-black/10 px-3 py-2 text-xs"
                          />
                        </div>
                      ) : getAssetUrl(product.imageUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getAssetUrl(product.imageUrl) || ""}
                          alt={product.name}
                          className="h-12 w-16 rounded object-cover"
                        />
                      ) : (
                        <span className="text-xs text-gray-500">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFormData.price}
                          required
                          min="0.01"
                          step="0.01"
                          onChange={(event) =>
                            setEditFormData({
                              ...editFormData,
                              price: event.target.value,
                            })
                          }
                          className="w-28 rounded-lg border border-black/10 px-3 py-2"
                        />
                      ) : (
                        `$${Number(product.price).toFixed(2)}`
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFormData.stock}
                          required
                          min="0"
                          onChange={(event) =>
                            setEditFormData({
                              ...editFormData,
                              stock: event.target.value,
                            })
                          }
                          className="w-24 rounded-lg border border-black/10 px-3 py-2"
                        />
                      ) : (
                        product.stock
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge">{product.approvalStatus}</span>
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateProduct(product.id)}
                            className="btn-primary"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditingProduct}
                            className="btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditingProduct(product)}
                            className="btn-secondary"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(product)}
                            className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {!loading && products.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          itemLabel="products"
          pageSize={PRODUCT_PAGE_SIZE}
          totalItems={productPaginationMeta?.totalItems ?? products.length}
          totalPages={productPaginationMeta?.totalPages ?? 1}
          onPageChange={setCurrentPage}
        />
      )}

      {deleteCandidate && (
        <ConfirmDialog
          title="Delete product?"
          description={`This will permanently remove ${deleteCandidate.name}. Existing orders remain protected and the backend may block deletion when order history exists.`}
          confirmLabel="Delete"
          isDestructive
          isLoading={deletingProductId === deleteCandidate.id}
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={() => void confirmDeleteProduct()}
        />
      )}
    </div>
  );
}
