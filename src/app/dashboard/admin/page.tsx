"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Order {
  id: string;
  total: number;
}

interface Stats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalOrders: 0, totalRevenue: 0 });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.push("/login");
      return;
    }
    fetchAdminData();
  }, [user]);

  const fetchAdminData = async () => {
    try {
      const [usersRes, ordersRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const usersData = (await usersRes.json()) || [];
      const ordersData = (await ordersRes.json()) || [];

      setUsers(usersData);
      setStats({
        totalUsers: usersData.length,
        totalOrders: ordersData.length,
        totalRevenue: ordersData.reduce((sum: number, o: Order) => sum + o.total, 0),
      });
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-gray-600 mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="text-gray-600 mb-2">Total Orders</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.totalOrders}</p>
        </div>
        <div className="bg-orange-50 p-6 rounded-lg">
          <h3 className="text-gray-600 mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-orange-600">${stats.totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Users</h2>
        </div>
        {loading ? (
          <p className="p-6 text-gray-500">Loading...</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-gray-500">No users found.</p>
        ) : (
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">{u.name}</td>
                  <td className="px-6 py-4">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100">
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
