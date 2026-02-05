"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  seller?: { name: string };
}

const MOCK_PRODUCTS: Product[] = [
  { id: "1", name: "Eco Tote Bag", price: 25, stock: 50, seller: { name: "EcoMerch Co" } },
  { id: "2", name: "Bamboo Utensils", price: 15, stock: 30, seller: { name: "Sustainable Living" } },
  { id: "3", name: "Reusable Straws", price: 12, stock: 100, seller: { name: "Eco Materials Ltd" } },
  { id: "4", name: "Organic Cotton Shirt", price: 45, stock: 20, seller: { name: "Fair Trade Fashion" } },
];

export default function Products() {
  const { token } = useAuthStore();
  const { addItem } = useCartStore();
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/products`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setProducts(data);
        }
      } else {
        setProducts(MOCK_PRODUCTS);
      }
    } catch (error) {
      console.warn("Backend unavailable, using mock data:", error);
      setProducts(MOCK_PRODUCTS);
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
    alert(`${product.name} added to cart`);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link href="/cart" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
          View Cart
        </Link>
      </div>

      <div className="mb-8">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : filteredProducts.length === 0 ? (
        <p className="text-gray-500">No products found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Seller: {product.seller?.name || "Unknown"}
                </p>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xl font-bold text-blue-600">${product.price}</span>
                  <span className="text-sm text-gray-500">{product.stock} in stock</span>
                </div>
                {product.stock > 0 ? (
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition"
                  >
                    Add to Cart
                  </button>
                ) : (
                  <button disabled className="w-full bg-gray-300 text-gray-500 py-2 rounded-lg cursor-not-allowed">
                    Out of Stock
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
