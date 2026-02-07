"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";

export default function DisputesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    load();
  }, [user]);

  const load = async () => {
    const { data } = await apiClient.get("/disputes/my");
    setDisputes(data || []);
  };

  const create = async () => {
    if (!orderId || !reason) return;
    await apiClient.post("/disputes", { orderId, reason });
    setOrderId("");
    setReason("");
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Disputes</h1>

      <div className="card p-6 mt-6">
        <h2 className="text-xl font-semibold">Open a dispute</h2>
        <div className="mt-4 grid md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Order ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="rounded-xl border border-black/10 px-4 py-2"
          />
          <input
            type="text"
            placeholder="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-xl border border-black/10 px-4 py-2 md:col-span-2"
          />
        </div>
        <button onClick={create} className="btn-primary mt-4">Submit</button>
      </div>

      <div className="card p-6 mt-6">
        <h2 className="text-xl font-semibold">Your disputes</h2>
        <div className="mt-4 space-y-3">
          {disputes.length === 0 ? (
            <p className="text-gray-500">No disputes yet.</p>
          ) : (
            disputes.map((d) => (
              <div key={d.id} className="flex justify-between">
                <span>{d.orderId}</span>
                <span className="badge">{d.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
