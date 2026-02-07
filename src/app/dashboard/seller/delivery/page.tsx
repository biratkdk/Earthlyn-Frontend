"use client";
import { useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";

export default function DeliveryPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user || user.role !== "SELLER") {
      router.push("/login");
      return;
    }
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      const statusParam = filter === "all" ? "" : `?status=${filter}`;
      const { data } = await apiClient.get(`/seller/delivery/orders${statusParam}`);
      setOrders(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    await apiClient.post(`/seller/delivery/${orderId}/update-status`, { status });
    fetchOrders();
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.product?.deliveryStatus === filter);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Delivery Management</h1>

      <div className="mt-6 flex gap-2 flex-wrap">
        {"all PENDING IN_TRANSIT DELIVERED FAILED".split(" ").map((s) => (
          <button key={s} onClick={() => { setFilter(s); fetchOrders(); }} className={filter === s ? "btn-primary" : "btn-secondary"}>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-4 mt-6">
        {filtered.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">No shipments</div>
        ) : (
          filtered.map((o) => (
            <div key={o.id} className="card p-6">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-600">Order</p>
                  <p className="font-semibold">{o.id}</p>
                  <p className="text-sm text-gray-600">Product: {o.product?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Buyer</p>
                  <p className="font-semibold">{o.buyer?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="badge">{o.product?.deliveryStatus}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => updateStatus(o.id, "IN_TRANSIT")} className="btn-secondary">Mark In Transit</button>
                <button onClick={() => updateStatus(o.id, "DELIVERED")} className="btn-primary">Mark Delivered</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
