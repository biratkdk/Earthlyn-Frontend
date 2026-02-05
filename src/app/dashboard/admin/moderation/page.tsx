"use client";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";

interface FlaggedMessage { id: string; sender: { name: string }; receiver: { name: string }; content: string; reason: string; flagged_at: string; status: "pending" | "approved" | "rejected"; }

export default function ModerationPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<FlaggedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "admin") return;
    fetchFlaggedMessages();
  }, [user]);

  const fetchFlaggedMessages = async () => {
    try {
      const { data } = await apiClient.get("/message-moderation/flagged");
      setMessages(data.messages || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (msgId: string) => {
    try {
      await apiClient.post(`/message-moderation/${msgId}/approve`);
      setMessages(messages.map(m => m.id === msgId ? { ...m, status: "approved" } : m));
    } catch (e: any) {
      alert("Error: " + (e.response?.data?.message || e.message));
    }
  };

  const handleReject = async (msgId: string) => {
    try {
      await apiClient.post(`/message-moderation/${msgId}/reject`);
      setMessages(messages.map(m => m.id === msgId ? { ...m, status: "rejected" } : m));
    } catch (e: any) {
      alert("Error: " + (e.response?.data?.message || e.message));
    }
  };

  if (!user || user.role !== "admin") return <div className="p-8 text-red-600">Admin only</div>;
  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-green-600">Message Moderation</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600">Pending Review</p>
          <p className="text-2xl font-bold">{messages.filter(m => m.status === "pending").length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded border-l-4 border-green-500">
          <p className="text-sm text-gray-600">Approved</p>
          <p className="text-2xl font-bold">{messages.filter(m => m.status === "approved").length}</p>
        </div>
        <div className="bg-red-50 p-4 rounded border-l-4 border-red-500">
          <p className="text-sm text-gray-600">Rejected</p>
          <p className="text-2xl font-bold">{messages.filter(m => m.status === "rejected").length}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">Total Flagged</p>
          <p className="text-2xl font-bold">{messages.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">From</th>
              <th className="px-6 py-3 text-left font-semibold">To</th>
              <th className="px-6 py-3 text-left font-semibold">Message Preview</th>
              <th className="px-6 py-3 text-left font-semibold">Reason</th>
              <th className="px-6 py-3 text-left font-semibold">Status</th>
              <th className="px-6 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {messages.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No flagged messages</td></tr>
            ) : (
              messages.map((m) => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">{m.sender.name}</td>
                  <td className="px-6 py-4 text-sm">{m.receiver.name}</td>
                  <td className="px-6 py-4 text-sm truncate max-w-xs">{m.content}</td>
                  <td className="px-6 py-4 text-sm"><span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">{m.reason}</span></td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${m.status === "pending" ? "bg-yellow-100 text-yellow-800" : m.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => handleApprove(m.id)} disabled={m.status !== "pending"} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs disabled:opacity-50">Approve</button>
                    <button onClick={() => handleReject(m.id)} disabled={m.status !== "pending"} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs disabled:opacity-50">Reject</button>
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
