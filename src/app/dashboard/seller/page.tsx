"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  sold: number;
}

export default function SellerDashboard() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", price: "", stock: "" });

  useEffect(() => {
    if (!user || user.role !== "seller") {
      router.push("/login");
      return;
    }
    fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setProducts(data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
        }),
      });
      if (response.ok) {
        setFormData({ name: "", price: "", stock: "" });
        setShowForm(false);
        fetchProducts();
      }
    } catch (error) {
      console.error("Failed to add product:", error);
    }
  };

  const totalRevenue = products.reduce((sum, p) => sum + p.price * p.sold, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Seller Dashboard</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
        >
          {showForm ? "Cancel" : "Add Product"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddProduct} className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">Add New Product</h2>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Product name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="number"
              placeholder="Price"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              required
              step="0.01"
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="number"
              placeholder="Stock"
              value={formData.stock}
              onChange={(e) => setFormData({...formData, stock: e.target.value})}
              required
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button type="submit" className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg">
            Create Product
          </button>
        </form>
      )}

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-gray-600 mb-2">Products</h3>
          <p className="text-3xl font-bold text-green-600">{products.length}</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-gray-600 mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-blue-600">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="text-gray-600 mb-2">Total Sold</h3>
          <p className="text-3xl font-bold text-purple-600">
            {products.reduce((sum, p) => sum + p.sold, 0)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Your Products</h2>
        </div>
        {loading ? (
          <p className="p-6 text-gray-500">Loading...</p>
        ) : products.length === 0 ? (
          <p className="p-6 text-gray-500">No products yet.</p>
        ) : (
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Price</th>
                <th className="px-6 py-3 text-left">Stock</th>
                <th className="px-6 py-3 text-left">Sold</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">{product.name}</td>
                  <td className="px-6 py-4">${product.price}</td>
                  <td className="px-6 py-4">{product.stock}</td>
                  <td className="px-6 py-4">{product.sold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
