"use client";
import { useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";

export default function CustomerServicePage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.role !== "CUSTOMER_SERVICE" && user.role !== "ADMIN")) {
      router.push("/login");
      return;
    }
    fetchDisputes();
  }, [user]);

  const fetchDisputes = async () => {
    try {
      const { data } = await apiClient.get("/admin/disputes");
      setDisputes(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resolveDispute = async (id: string) => {
    await apiClient.patch(`/admin/disputes/${id}`, { status: "RESOLVED", resolution: "Resolved by support" });
    fetchDisputes();
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Customer Service</h1>
      <div className="card mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left">Dispute</th>
              <th className="px-6 py-3 text-left">Order</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Priority</th>
              <th className="px-6 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {disputes.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No disputes</td></tr>
            ) : (
              disputes.map((d) => (
                <tr key={d.id} className="border-b">
                  <td className="px-6 py-4">{d.id}</td>
                  <td className="px-6 py-4">{d.orderId}</td>
                  <td className="px-6 py-4"><span className="badge">{d.status}</span></td>
                  <td className="px-6 py-4">{d.priority}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => resolveDispute(d.id)} className="btn-primary">Resolve</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
