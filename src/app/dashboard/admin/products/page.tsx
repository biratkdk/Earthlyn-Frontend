"use client";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";

interface Product {
  id: string; name: string; seller: { name: string }; price: number; status: string; createdAt: string;
}

export default function ProductApprovalPage() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.role !== "admin") return;
    fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    try {
      const { data } = await apiClient.get("/product-approval/pending");
      setProducts(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (productId: string) => {
    try {
      await apiClient.post(`/product-approval/${productId}/approve`);
      setProducts(products.filter(p => p.id !== productId));
    } catch (err: any) {
      alert("Error approving product: " + (err.response?.data?.message || err.message));
    }
  };

  const handleReject = async (productId: string) => {
    try {
      await apiClient.post(`/product-approval/${productId}/reject`);
      setProducts(products.filter(p => p.id !== productId));
    } catch (err: any) {
      alert("Error rejecting product: " + (err.response?.data?.message || err.message));
    }
  };

  if (!user || user.role !== "admin") {
    return <div className="p-8 text-red-600">Access denied. Admin only.</div>;
  }

  if (loading) return <div className="p-8">Loading products...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-green-600">Product Approval Workflow</h1>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Product Name</th>
              <th className="px-6 py-3 text-left font-semibold">Seller</th>
              <th className="px-6 py-3 text-left font-semibold">Price</th>
              <th className="px-6 py-3 text-left font-semibold">Status</th>
              <th className="px-6 py-3 text-left font-semibold">Date</th>
              <th className="px-6 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No pending products</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">{product.name}</td>
                  <td className="px-6 py-4">{product.seller.name}</td>
                  <td className="px-6 py-4">?{product.price.toFixed(2)}</td>
                  <td className="px-6 py-4"><span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">{product.status}</span></td>
                  <td className="px-6 py-4">{new Date(product.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => handleApprove(product.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Approve</button>
                    <button onClick={() => handleReject(product.id)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">Reject</button>
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
