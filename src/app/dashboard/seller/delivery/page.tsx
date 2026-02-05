"use client";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";

interface Shipment { id: string; order_id: string; buyer: { name: string }; product: { name: string }; status: "processing" | "shipped" | "in_transit" | "delivered"; origin: string; destination: string; eta: string; tracking_id: string; last_update: string; }

export default function DeliveryPage() {
  const { user } = useAuthStore();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (user?.role !== "seller") return;
    fetchShipments();
  }, [user]);

  const fetchShipments = async () => {
    try {
      const { data } = await apiClient.get("/delivery-management/my-shipments");
      setShipments(data.shipments || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    processing: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    in_transit: "bg-yellow-100 text-yellow-800",
    delivered: "bg-green-100 text-green-800",
  };

  const filtered = filter === "all" ? shipments : shipments.filter(s => s.status === filter);

  if (!user || user.role !== "seller") return <div className="p-8 text-red-600">Seller only</div>;
  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-green-600">Delivery Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">Processing</p>
          <p className="text-2xl font-bold">{shipments.filter(s => s.status === "processing").length}</p>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-purple-500">
          <p className="text-sm text-gray-600">Shipped</p>
          <p className="text-2xl font-bold">{shipments.filter(s => s.status === "shipped").length}</p>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600">In Transit</p>
          <p className="text-2xl font-bold">{shipments.filter(s => s.status === "in_transit").length}</p>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-green-500">
          <p className="text-sm text-gray-600">Delivered</p>
          <p className="text-2xl font-bold">{shipments.filter(s => s.status === "delivered").length}</p>
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        {["all", "processing", "shipped", "in_transit", "delivered"].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded text-sm ${filter === s ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"}`}>
            {s.replace("_", " ").toUpperCase()}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-lg text-center text-gray-500">No shipments</div>
        ) : (
          filtered.map(s => (
            <div key={s.id} className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: { processing: "#3b82f6", shipped: "#a855f7", in_transit: "#eab308", delivered: "#22c55e" }[s.status] }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Product</p>
                  <p className="font-semibold">{s.product.name}</p>
                  <p className="text-sm text-gray-600">Buyer: {s.buyer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Route</p>
                  <p className="text-sm"><span className="font-semibold">{s.origin}</span> ? <span className="font-semibold">{s.destination}</span></p>
                  <p className="text-xs text-gray-600 mt-2">Track: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{s.tracking_id}</span></p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ETA</p>
                  <p className="font-semibold">{new Date(s.eta).toLocaleDateString()}</p>
                  <span className={`inline-block px-3 py-1 rounded text-xs font-semibold mt-2 ${statusColors[s.status as keyof typeof statusColors]}`}>
                    {s.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>Last update: {new Date(s.last_update).toLocaleString()}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: s.status === "processing" ? "25%" : s.status === "shipped" ? "50%" : s.status === "in_transit" ? "75%" : "100%" }}></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
