"use client";
import { useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";

interface UserBalance { id: string; name: string; email: string; role: string; balance?: number; }

export default function BalancePage() {
  const { user, isHydrated } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<UserBalance[]>([]);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchUsers();
  }, [user, isHydrated]);

  const fetchUsers = async () => {
    try {
      const { data } = await apiClient.get("/admin/users");
      setUsers(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustment = async (type: "CREDIT" | "DEBIT") => {
    if (!selectedUserId || !amount) return alert("Select user and amount");
    await apiClient.post("/admin/manage-balance", {
      userId: selectedUserId,
      amount,
      type,
      reason: reason || "Admin adjustment",
    });
    setAmount(0);
    setReason("");
    setSelectedUserId("");
    fetchUsers();
  };

  if (loading) return <div className="p-8">Loading...</div>;

  
  if (!isHydrated) {
    return <div className="max-w-7xl mx-auto px-4 py-10">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Balance Management</h1>
      <div className="card p-6 mt-6">
        <div className="grid md:grid-cols-4 gap-4">
          <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="rounded-xl border border-black/10 px-3 py-2">
            <option value="">Select user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
          <input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} placeholder="Amount" className="rounded-xl border border-black/10 px-3 py-2" />
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="rounded-xl border border-black/10 px-3 py-2" />
          <div className="flex gap-2">
            <button onClick={() => handleAdjustment("CREDIT")} className="btn-primary">Credit</button>
            <button onClick={() => handleAdjustment("DEBIT")} className="btn-secondary">Debit</button>
          </div>
        </div>
      </div>
    </div>
  );
}



