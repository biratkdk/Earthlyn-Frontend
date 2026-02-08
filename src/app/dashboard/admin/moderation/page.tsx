"use client";
import { useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";

export default function ModerationPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !["ADMIN", "CUSTOMER_SERVICE"].includes(user?.role)) {
      router.push("/login");
      return;
    }
    fetchFlags();
  }, [user]);

  const fetchFlags = async () => {
    try {
      const { data } = await apiClient.get("/messages/moderation/flagged");
      setFlags(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (messageId: string) => {
    await apiClient.post(`/messages/moderation/${messageId}/resolve`);
    fetchFlags();
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Message Moderation</h1>
      <div className="card mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left">From</th>
              <th className="px-6 py-3 text-left">To</th>
              <th className="px-6 py-3 text-left">Message</th>
              <th className="px-6 py-3 text-left">Reason</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {flags.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No flagged messages</td></tr>
            ) : (
              flags.map((f) => (
                <tr key={f.id} className="border-b">
                  <td className="px-6 py-4">{f.message?.sender?.name}</td>
                  <td className="px-6 py-4">{f.message?.receiver?.name}</td>
                  <td className="px-6 py-4 max-w-xs truncate">{f.message?.content}</td>
                  <td className="px-6 py-4">{f.reason}</td>
                  <td className="px-6 py-4"><span className="badge">{f.status}</span></td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleResolve(f.messageId)} className="btn-primary">Resolve</button>
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

