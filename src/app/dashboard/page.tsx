"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";

interface Order {
  id: string;
  status: string;
  totalAmount: string;
  createdAt: string;
}

export default function BuyerDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "BUYER") {
      router.push("/login");
      return;
    }
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data } = await apiClient.get(`/orders/buyer/${user?.id}`);
      setOrders(data || []);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const pending = orders.filter((o) => o.status !== "DELIVERED").length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Buyer Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        <div className="card p-6">
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-3xl font-semibold text-[var(--accent)]">{orders.length}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600">Total Spent</p>
          <p className="text-3xl font-semibold text-[var(--accent)]">${totalSpent.toFixed(2)}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600">Pending Orders</p>
          <p className="text-3xl font-semibold text-[var(--accent)]">{pending}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Recent Orders</h2>
        </div>
        {loading ? (
          <p className="p-6 text-gray-500">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="p-6 text-gray-500">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Order ID</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Total</th>
                <th className="px-6 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b">
                  <td className="px-6 py-4">{order.id}</td>
                  <td className="px-6 py-4">
                    <span className="badge">{order.status}</span>
                  </td>
                  <td className="px-6 py-4">${Number(order.totalAmount).toFixed(2)}</td>
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
