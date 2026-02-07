"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";

const PLANS = ["SEED_BOX", "BLOOM_BOX", "EVERGREEN_BOX"];

export default function SubscriptionPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plan, setPlan] = useState(PLANS[0]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    loadSubscriptions();
  }, [user]);

  const loadSubscriptions = async () => {
    const { data } = await apiClient.get("/subscriptions/my");
    setSubscriptions(data || []);
  };

  const createSubscription = async () => {
    await apiClient.post("/subscriptions", { plan });
    loadSubscriptions();
  };

  const cancelSubscription = async (id: string) => {
    await apiClient.patch(`/subscriptions/${id}/cancel`);
    loadSubscriptions();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Eco-Box Subscription</h1>

      <div className="card p-6 mt-6">
        <h2 className="text-xl font-semibold">Choose a plan</h2>
        <div className="mt-4 flex gap-3 flex-wrap">
          {PLANS.map((p) => (
            <button key={p} onClick={() => setPlan(p)} className={plan === p ? "btn-primary" : "btn-secondary"}>
              {p.replace("_", " ")}
            </button>
          ))}
        </div>
        <button onClick={createSubscription} className="btn-primary mt-4">Subscribe</button>
      </div>

      <div className="card p-6 mt-6">
        <h2 className="text-xl font-semibold">Your subscriptions</h2>
        <div className="mt-4 space-y-3">
          {subscriptions.length === 0 ? (
            <p className="text-gray-500">No subscriptions yet.</p>
          ) : (
            subscriptions.map((s) => (
              <div key={s.id} className="flex justify-between">
                <span>{s.plan}</span>
                <div className="flex gap-2">
                  <span className="badge">{s.status}</span>
                  {s.status === "ACTIVE" && (
                    <button onClick={() => cancelSubscription(s.id)} className="btn-secondary">Cancel</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
