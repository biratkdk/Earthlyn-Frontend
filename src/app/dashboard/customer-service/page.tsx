"use client";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";

interface Query { id: string; customer: { name: string }; subject: string; status: string; }

export default function CustomerServicePage() {
  const { user } = useAuthStore();
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "admin") return;
    fetchQueries();
  }, [user]);

  const fetchQueries = async () => {
    try {
      const { data } = await apiClient.get("/customer-service/queries");
      setQueries(data.data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (queryId: string) => {
    try {
      await apiClient.post(`/customer-service/resolve`, { queryId });
      setQueries(queries.filter(q => q.id !== queryId));
    } catch (e: any) {
      alert("Error: " + (e.response?.data?.message || e.message));
    }
  };

  if (!user || user.role !== "admin") return <div className="p-8 text-red-600">Admin only</div>;
  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-green-600">Customer Service Queue</h1>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Query ID</th>
              <th className="px-6 py-3 text-left font-semibold">Customer</th>
              <th className="px-6 py-3 text-left font-semibold">Subject</th>
              <th className="px-6 py-3 text-left font-semibold">Status</th>
              <th className="px-6 py-3 text-left font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {queries.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No queries</td></tr>
            ) : (
              queries.map((q) => (
                <tr key={q.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">{q.id}</td>
                  <td className="px-6 py-4">{q.customer.name}</td>
                  <td className="px-6 py-4">{q.subject}</td>
                  <td className="px-6 py-4"><span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">{q.status}</span></td>
                  <td className="px-6 py-4"><button onClick={() => handleResolve(q.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Resolve</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
