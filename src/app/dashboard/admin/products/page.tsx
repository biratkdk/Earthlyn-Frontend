"use client";
import { useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  sellerId: string;
  seller?: { user?: { name: string } };
  price: number;
  approvalStatus: string;
  createdAt: string;
}

export default function ProductApprovalPage() {
  const { user, isHydrated } = useAuthStore();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchProducts();
  }, [user, isHydrated]);

  const fetchProducts = async () => {
    try {
      const { data } = await apiClient.get("/admin/product-approval/pending");
      setProducts(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (productId: string) => {
    await apiClient.post(`/admin/product-approval/${productId}/approve`);
    setProducts(products.filter((p) => p.id !== productId));
  };

  const handleReject = async (productId: string) => {
    await apiClient.post(`/admin/product-approval/${productId}/reject`);
    setProducts(products.filter((p) => p.id !== productId));
  };

  if (loading) return <div className="p-8">Loading products...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  
  if (!isHydrated) {
    return <div className="max-w-7xl mx-auto px-4 py-10">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Product Approval</h1>
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
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No pending products</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b">
                  <td className="px-6 py-4">{product.name}</td>
                  <td className="px-6 py-4">{product.seller?.user?.name || product.sellerId}</td>
                  <td className="px-6 py-4">${product.price.toFixed(2)}</td>
                  <td className="px-6 py-4"><span className="badge">{product.approvalStatus}</span></td>
                  <td className="px-6 py-4">{new Date(product.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => handleApprove(product.id)} className="btn-primary">Approve</button>
                    <button onClick={() => handleReject(product.id)} className="btn-secondary">Reject</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}



