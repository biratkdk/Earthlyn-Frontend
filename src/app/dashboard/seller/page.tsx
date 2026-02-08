"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  approvalStatus: string;
  ecoScore: number;
  category: string;
  sellerId: string;
}

export default function SellerDashboard() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "",
    category: "Eco",
    description: "",
    ecoScore: "50",
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    resolveSeller();
  }, [user, isHydrated]);

  const resolveSeller = async () => {
    try {
      const { data } = await apiClient.get("/sellers");
      const match = (data || []).find((s: any) => s.userId === user?.id);
      setSellerId(match?.id || null);
      fetchProducts(match?.id);
    } catch (error) {
      console.error("Failed to resolve seller:", error);
    }
  };

  const fetchProducts = async (id?: string) => {
    try {
      const { data } = await apiClient.get("/products");
      const filtered = id ? (data || []).filter((p: any) => p.sellerId === id) : data || [];
      setProducts(filtered);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiClient.post("/products", {
      name: formData.name,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      category: formData.category,
      description: formData.description,
      ecoScore: parseInt(formData.ecoScore),
    });
    setFormData({ name: "", price: "", stock: "", category: "Eco", description: "", ecoScore: "50" });
    setShowForm(false);
    fetchProducts(sellerId || undefined);
  };

  
  if (!isHydrated) {
    return <div className="max-w-7xl mx-auto px-4 py-10">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-4xl">Seller Dashboard</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? "Cancel" : "Add Product"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddProduct} className="card p-6 mb-8 space-y-4">
          <h2 className="text-xl font-semibold">Add New Product</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Product name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="rounded-xl border border-black/10 px-4 py-2"
            />
            <input
              type="number"
              placeholder="Price"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              step="0.01"
              className="rounded-xl border border-black/10 px-4 py-2"
            />
            <input
              type="number"
              placeholder="Stock"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              required
              className="rounded-xl border border-black/10 px-4 py-2"
            />
            <input
              type="number"
              placeholder="Eco score"
              value={formData.ecoScore}
              onChange={(e) => setFormData({ ...formData, ecoScore: e.target.value })}
              required
              className="rounded-xl border border-black/10 px-4 py-2"
            />
          </div>
          <input
            type="text"
            placeholder="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="rounded-xl border border-black/10 px-4 py-2 w-full"
          />
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="rounded-xl border border-black/10 px-4 py-2 w-full"
          />
          <button type="submit" className="btn-primary">Create Product</button>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Your Products</h2>
        </div>
        {loading ? (
          <p className="p-6 text-gray-500">Loading...</p>
        ) : products.length === 0 ? (
          <p className="p-6 text-gray-500">No products yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Price</th>
                <th className="px-6 py-3 text-left">Stock</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b">
                  <td className="px-6 py-4">{product.name}</td>
                  <td className="px-6 py-4">${product.price}</td>
                  <td className="px-6 py-4">{product.stock}</td>
                  <td className="px-6 py-4"><span className="badge">{product.approvalStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}





