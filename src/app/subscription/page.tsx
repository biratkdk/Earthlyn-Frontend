"use client";
import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";

interface Plan { id: string; name: string; price: number; features: string[]; }

const plans: Plan[] = [
  { id: "basic", name: "Basic Eco-Box", price: 299, features: ["1 eco product/month", "5% discount", "Eco tips newsletter"] },
  { id: "standard", name: "Standard Eco-Box", price: 599, features: ["3 eco products/month", "10% discount", "Priority support", "Monthly guide"] },
  { id: "premium", name: "Premium Eco-Box", price: 999, features: ["5 eco products/month", "20% discount", "VIP support", "Weekly guide", "Exclusive items"] }
];

export default function SubscriptionPage() {
  const { user } = useAuthStore();
  const [frequency, setFrequency] = useState<string>("monthly");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (planId: string) => {
    if (!user) return alert("Login required");
    setLoading(true);
    try {
      const { data } = await apiClient.post("/subscription/subscribe", { planId, frequency });
      window.location.href = data.paymentUrl;
    } catch (e: any) {
      alert("Error: " + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4 text-green-600 text-center">EARTHLYN Subscription Eco-Boxes</h1>
      <p className="text-center text-gray-600 mb-8">Get curated eco-friendly products delivered monthly</p>
      <div className="mb-8 flex justify-center gap-4">
        <button onClick={() => setFrequency("monthly")} className={`px-6 py-2 rounded ${frequency === "monthly" ? "bg-green-600 text-white" : "bg-gray-200"}`}>Monthly</button>
        <button onClick={() => setFrequency("quarterly")} className={`px-6 py-2 rounded ${frequency === "quarterly" ? "bg-green-600 text-white" : "bg-gray-200"}`}>Quarterly</button>
        <button onClick={() => setFrequency("yearly")} className={`px-6 py-2 rounded ${frequency === "yearly" ? "bg-green-600 text-white" : "bg-gray-200"}`}>Yearly</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white p-6 rounded-lg shadow border-2 border-gray-200 hover:border-green-600">
            <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
            <p className="text-4xl font-bold text-green-600 mb-4">?{plan.price}</p>
            <p className="text-gray-600 mb-6">per {frequency}</p>
            <ul className="space-y-2 mb-6">
              {plan.features.map((f, i) => <li key={i} className="flex items-start"><span className="text-green-600 mr-2">?</span> {f}</li>)}
            </ul>
            <button onClick={() => handleSubscribe(plan.id)} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded">{loading ? "Processing..." : "Subscribe Now"}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
