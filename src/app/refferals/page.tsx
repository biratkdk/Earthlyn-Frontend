"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";

export default function ReferralsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [refereeId, setRefereeId] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    loadReferrals();
  }, [user]);

  const loadReferrals = async () => {
    const { data } = await apiClient.get("/referrals/my");
    setReferrals(data || []);
  };

  const createReferral = async () => {
    if (!refereeId) return;
    await apiClient.post("/referrals", { refereeId });
    setRefereeId("");
    loadReferrals();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Referrals</h1>
      <div className="card p-6 mt-6">
        <h2 className="text-xl font-semibold">Invite a user</h2>
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder="Referee user ID"
            value={refereeId}
            onChange={(e) => setRefereeId(e.target.value)}
            className="flex-1 rounded-xl border border-black/10 px-4 py-2"
          />
          <button onClick={createReferral} className="btn-primary">Send</button>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <h2 className="text-xl font-semibold">Your referrals</h2>
        <div className="mt-4 space-y-3">
          {referrals.length === 0 ? (
            <p className="text-gray-500">No referrals yet.</p>
          ) : (
            referrals.map((r) => (
              <div key={r.id} className="flex justify-between">
                <span>{r.refereeId}</span>
                <span className="badge">{r.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
