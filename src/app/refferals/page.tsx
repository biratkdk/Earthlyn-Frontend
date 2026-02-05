"use client";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";

interface Referral { id: string; referredEmail: string; status: string; earnings: number; }

export default function ReferralPage() {
  const { user } = useAuthStore();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchReferrals();
  }, [user]);

  const fetchReferrals = async () => {
    try {
      const { data } = await apiClient.get("/referral/my-referrals");
      setReferralCode(data.referralCode || "");
      setReferrals(data.referrals || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (platform: string) => {
    const text = `Join EARTHLYN using my referral code: ${referralCode}`;
    const url = `${window.location.origin}/?ref=${referralCode}`;
    if (platform === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`);
    else if (platform === "twitter") window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text + " " + url)}`);
    else if (platform === "email") window.open(`mailto:?subject=${encodeURIComponent("Join EARTHLYN")}&body=${encodeURIComponent(text + " " + url)}`);
  };

  if (!user) return <div className="p-8 text-red-600">Login required</div>;
  if (loading) return <div className="p-8">Loading...</div>;

  const totalEarnings = referrals.reduce((sum, r) => sum + r.earnings, 0);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-green-600">Referral Program</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 mb-2">Your Referral Code</p>
          <p className="text-2xl font-bold text-green-600 mb-4">{referralCode}</p>
          <div className="flex gap-2">
            <button onClick={() => handleShare("whatsapp")} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded">WhatsApp</button>
            <button onClick={() => handleShare("twitter")} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded">Twitter</button>
            <button onClick={() => handleShare("email")} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded">Email</button>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600">Total Earnings</p>
          <p className="text-4xl font-bold text-green-600">?{totalEarnings.toFixed(2)}</p>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Referred Email</th>
              <th className="px-6 py-3 text-left font-semibold">Status</th>
              <th className="px-6 py-3 text-left font-semibold">Earnings</th>
            </tr>
          </thead>
          <tbody>
            {referrals.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-500">No referrals yet</td></tr>
            ) : (
              referrals.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">{r.referredEmail}</td>
                  <td className="px-6 py-4"><span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">{r.status}</span></td>
                  <td className="px-6 py-4 font-semibold">?{r.earnings.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
