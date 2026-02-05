"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  items?: Array<{ productId: string; quantity: number }>;
}

const statusStages = ["pending", "confirmed", "shipped", "delivered"];

export default function OrderTracking() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "buyer") {
      router.push("/login");
      return;
    }
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setOrders(data || []);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStageIndex = (status: string) => {
    const index = statusStages.indexOf(status.toLowerCase());
    return index >= 0 ? index : 0;
  };

  if (loading) return <div className="text-center py-20">Loading orders...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Order Tracking</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No orders yet</p>
          <a href="/products" className="text-blue-600 hover:underline">
            Start shopping
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const currentStage = getStageIndex(order.status);
            return (
              <div key={order.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold">Order #{order.id.slice(0, 8)}</h2>
                    <p className="text-gray-600">
                      Placed on {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-bold">
                    ${order.total.toFixed(2)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex justify-between mb-2">
                    {statusStages.map((stage, idx) => (
                      <div key={stage} className="flex flex-col items-center flex-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white mb-2 ${
                            idx <= currentStage ? "bg-green-600" : "bg-gray-300"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <span className="text-xs text-gray-600 text-center capitalize">
                          {stage}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${((currentStage + 1) / statusStages.length) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="border-l-4 border-gray-300 pl-4 space-y-4">
                  {statusStages.map((stage, idx) => (
                    <div key={stage} className={idx <= currentStage ? "opacity-100" : "opacity-50"}>
                      <div className={`font-bold capitalize ${idx <= currentStage ? "text-green-600" : "text-gray-600"}`}>
                        {stage}
                      </div>
                      <p className="text-sm text-gray-600">
                        {idx <= currentStage ? "? Completed" : "Pending"}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Eco Impact */}
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm">
                    <span className="font-bold">?? Eco Impact:</span> This order saves approximately 2.5 kg CO2!
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
