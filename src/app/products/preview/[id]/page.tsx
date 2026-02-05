"use client";
import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api/client";

interface Product { id: string; name: string; price: number; image: string; description: string; eco_score: number; seller: { name: string }; }

export default function ARVRPreview({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchProduct(); }, [params.id]);

  const fetchProduct = async () => {
    try {
      const { data } = await apiClient.get(`/products/${params.id}`);
      setProduct(data.product);
    } catch (e: any) { console.error(e); } 
    finally { setLoading(false); }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setRotation({ x: ((e.clientY - rect.top) / rect.height) * 360, y: ((e.clientX - rect.left) / rect.width) * 360 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => Math.max(0.5, Math.min(3, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!product) return <div className="p-8 text-red-600">Product not found</div>;

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">{product.name}</h1>
          <p className="text-xl text-green-600">₹{product.price}</p>
          <div className="flex gap-4">
            <div className="bg-green-100 px-4 py-2 rounded"><span className="text-2xl font-bold text-green-700">{product.eco_score}%</span></div>
            <div><p className="text-sm text-gray-600">Seller: {product.seller.name}</p></div>
          </div>
          <p className="text-gray-700">{product.description}</p>
          <h3 className="font-semibold">360° AR/VR Preview</h3>
          <p className="text-sm">Move mouse to rotate, scroll to zoom</p>
          <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded">Add to Cart</button>
        </div>
        <div ref={containerRef} onMouseMove={handleMouseMove} onWheel={handleWheel} className="relative bg-gradient-to-br from-green-50 to-blue-50 rounded h-96 flex items-center justify-center cursor-move group border-2">
          <div style={{ transform: `perspective(1000px) rotateX(${rotation.x * 0.5}deg) rotateY(${rotation.y * 0.5}deg) scale(${scale})` }} className="w-64 h-64">
            <img src={product.image || "/placeholder.jpg"} alt={product.name} className="w-full h-full object-cover rounded shadow-2xl" />
          </div>
          <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-3 py-2 rounded">↕ Rotate | 🔎 Zoom</div>
          <div className="absolute top-4 right-4 space-y-1">
            <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="w-8 h-8 bg-green-600 text-white rounded">+</button>
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="w-8 h-8 bg-green-600 text-white rounded">−</button>
          </div>
        </div>
      </div>
      <div className="mt-12 grid grid-cols-3 gap-6">
        <div className="bg-green-50 p-6 rounded"><h3 className="font-semibold mb-2">360° View</h3><p className="text-sm">Interactive rotation</p></div>
        <div className="bg-blue-50 p-6 rounded"><h3 className="font-semibold mb-2">Zoom</h3><p className="text-sm">Zoom 3x detail</p></div>
        <div className="bg-purple-50 p-6 rounded"><h3 className="font-semibold mb-2">Eco Info</h3><p className="text-sm">Material info</p></div>
      </div>
    </div>
  );
}