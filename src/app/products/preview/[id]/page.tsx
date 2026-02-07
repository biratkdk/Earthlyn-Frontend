"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import apiClient from "@/lib/api/client";
import { useCartStore } from "@/lib/store/cart";

export default function ProductPreview() {
  const params = useParams();
  const id = params?.id as string;
  const { addItem } = useCartStore();
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    apiClient.get(`/products/${id}`).then((res) => setProduct(res.data.product));
  }, [id]);

  if (!product) {
    return <div className="max-w-4xl mx-auto px-4 py-16">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="card p-8">
        <p className="text-xs uppercase tracking-wide text-[var(--accent)]">{product.category}</p>
        <h1 className="text-3xl mt-2">{product.name}</h1>
        <p className="text-gray-700 mt-3">{product.description}</p>
        <div className="mt-6 flex items-center justify-between">
          <span className="text-3xl font-semibold text-[var(--accent)]">${product.price}</span>
          <span className="badge">Eco score {product.ecoScore}</span>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => addItem({ id: product.id, name: product.name, price: product.price, quantity: 1, sellerId: "" })}
            className="btn-primary"
          >
            Add to Cart
          </button>
          <span className="text-sm text-gray-600">Stock: {product.stock}</span>
        </div>
      </div>
    </div>
  );
}
