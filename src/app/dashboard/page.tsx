"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
}

export default function BuyerDashboard() {
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Buyer Dashboard</h1>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-gray-600 mb-2">Total Orders</h3>
          <p className="text-3xl font-bold text-blue-600">{orders.length}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-gray-600 mb-2">Spent</h3>
          <p className="text-3xl font-bold text-green-600">
            ${orders.reduce((sum: number, order: Order) => sum + order.total, 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="text-gray-600 mb-2">Pending Orders</h3>
          <p className="text-3xl font-bold text-purple-600">
            {orders.filter((o: Order) => o.status === "pending").length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Recent Orders</h2>
        </div>
        {loading ? (
          <p className="p-6 text-gray-500">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="p-6 text-gray-500">No orders yet. <a href="/products" className="text-green-600 hover:underline">Start shopping</a></p>
        ) : (
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Order ID</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Total</th>
                <th className="px-6 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: Order) => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">{order.id}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">${order.total}</td>
                  <td className="px-6 py-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
