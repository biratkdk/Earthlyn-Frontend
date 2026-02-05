"use client";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";

interface SellerBalance { id: string; seller: { name: string }; balance: number; }

export default function BalancePage() {
  const { user } = useAuthStore();
  const [balances, setBalances] = useState<SellerBalance[]>([]);
  const [adjustments, setAdjustments] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user?.role !== "admin") return;
    fetchBalances();
  }, [user]);

  const fetchBalances = async () => {
    try {
      const { data } = await apiClient.get("/admin/seller-balances");
      setBalances(data.data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCredit = async (sellerId: string) => {
    const amount = adjustments[sellerId];
    if (!amount) return alert("Enter amount");
    try {
      await apiClient.post(`/admin/credit-balance`, { sellerId, amount });
      fetchBalances();
      setAdjustments({ ...adjustments, [sellerId]: 0 });
    } catch (e: any) {
      alert("Error: " + (e.response?.data?.message || e.message));
    }
  };

  const handleDebit = async (sellerId: string) => {
    const amount = adjustments[sellerId];
    if (!amount) return alert("Enter amount");
    try {
      await apiClient.post(`/admin/debit-balance`, { sellerId, amount });
      fetchBalances();
      setAdjustments({ ...adjustments, [sellerId]: 0 });
    } catch (e: any) {
      alert("Error: " + (e.response?.data?.message || e.message));
    }
  };

  if (!user || user.role !== "admin") return <div className="p-8 text-red-600">Admin only</div>;
  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-green-600">Admin Balance Management</h1>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Seller Name</th>
              <th className="px-6 py-3 text-left font-semibold">Current Balance</th>
              <th className="px-6 py-3 text-left font-semibold">Adjustment Amount</th>
              <th className="px-6 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4">{b.seller.name}</td>
                <td className="px-6 py-4 font-semibold">₹{b.balance.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <input type="number" placeholder="0" value={adjustments[b.id] || ""} onChange={(e) => setAdjustments({ ...adjustments, [b.id]: parseFloat(e.target.value) || 0 })} className="border px-2 py-1 w-32" />
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => handleCredit(b.id)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">Credit</button>
                  <button onClick={() => handleDebit(b.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">Debit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
