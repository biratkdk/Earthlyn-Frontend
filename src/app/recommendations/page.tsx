"use client";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import Link from "next/link";

interface Product { id: string; name: string; price: number; image: string; ecoScore: number; seller: { name: string }; }

export default function RecommendationsPage() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchRecommendations();
  }, [user]);

  const fetchRecommendations = async () => {
    try {
      const { data } = await apiClient.get("/recommendations/ai-products");
      setProducts(data.products || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-8 text-red-600">Login required</div>;
  if (loading) return <div className="p-8">Loading recommendations...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4 text-green-600">AI Product Recommendations</h1>
      <p className="text-gray-600 mb-8">Based on your browsing history and eco-score preferences</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">No recommendations available</div>
        ) : (
          products.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition">
              <img src={p.image || "/placeholder.jpg"} alt={p.name} className="w-full h-40 object-cover rounded mb-3" />
              <h3 className="font-semibold truncate">{p.name}</h3>
              <p className="text-sm text-gray-600">{p.seller.name}</p>
              <div className="flex justify-between items-center my-3">
                <span className="text-lg font-bold text-green-600">?{p.price}</span>
                <div className="flex items-center bg-green-100 px-2 py-1 rounded">
                  <span className="text-xs font-semibold text-green-700">{p.ecoScore}%</span>
                </div>
              </div>
              <Link href={`/products/${p.id}`} className="block w-full bg-green-600 hover:bg-green-700 text-white text-center py-2 rounded">View</Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
