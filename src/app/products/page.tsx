"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import Link from "next/link";
import apiClient from "@/lib/api/client";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  ecoScore: number;
  approvalStatus: string;
  seller?: { user?: { name: string } };
}

export default function Products() {
  const { token } = useAuthStore();
  const { addItem } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await apiClient.get("/products");
      if (Array.isArray(data)) {
        setProducts(data.filter((p: Product) => p.approvalStatus === "APPROVED"));
      }
    } catch (error) {
      console.warn("Failed to load products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      sellerId: "",
    });
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-4xl">Eco Products</h1>
        <Link href="/cart" className="btn-secondary">View Cart</Link>
      </div>

      <div className="mb-8">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-black/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : filteredProducts.length === 0 ? (
        <p className="text-gray-500">No products found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="card p-5 flex flex-col gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--accent)]">{product.category}</p>
                <h3 className="text-xl mt-1">{product.name}</h3>
                <p className="text-sm text-gray-600">Seller: {product.seller?.user?.name || "Verified Seller"}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-semibold text-[var(--accent)]">${product.price}</span>
                <span className="badge">Eco {product.ecoScore}</span>
              </div>
              <div className="flex gap-3">
                <Link href={`/products/preview/${product.id}`} className="btn-secondary w-full text-center">View</Link>
                {product.stock > 0 ? (
                  <button onClick={() => handleAddToCart(product)} className="btn-primary w-full">Add</button>
                ) : (
                  <button disabled className="w-full rounded-full bg-gray-200 text-gray-500 py-2">Out</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
