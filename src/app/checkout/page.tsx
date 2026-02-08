"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";

export default function Checkout() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const { items, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    address: "",
    city: "",
    zipCode: "",
  });

  useEffect(() => {
    if (!user || items.length === 0) {
      router.push("/cart");
      return;
    }
  }, [user, items]);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: intentData } = await apiClient.post("/payments/create-intent", {
        amount: total,
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
        })),
        shippingAddress: {
          fullName: formData.fullName,
          address: formData.address,
          city: formData.city,
          zipCode: formData.zipCode,
        },
      });

      if (!intentData?.paymentIntentId) {
        throw new Error("Payment intent not created");
      }

      const paymentIntentId = intentData.paymentIntentId;

      for (const item of items) {
        await apiClient.post("/orders", {
          productId: item.id,
          quantity: item.quantity,
          paymentIntentId,
        });
      }

      await apiClient.post(`/payments/${paymentIntentId}/confirm`);

      clearCart();
      router.push("/orders");
    } catch (error: any) {
      console.error("Payment error:", error);
      alert(error.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2">
          <form onSubmit={handlePayment} className="card p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Shipping Address</h2>
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                className="w-full rounded-xl border border-black/10 px-4 py-2 mb-3"
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full rounded-xl border border-black/10 px-4 py-2 mb-3"
              />
              <input
                type="text"
                name="address"
                placeholder="Street Address"
                value={formData.address}
                onChange={handleInputChange}
                required
                className="w-full rounded-xl border border-black/10 px-4 py-2 mb-3"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-xl border border-black/10 px-4 py-2"
                />
                <input
                  type="text"
                  name="zipCode"
                  placeholder="ZIP Code"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-xl border border-black/10 px-4 py-2"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-2xl font-semibold mb-4">Payment</h2>
              <p className="text-sm text-gray-600">Stripe test mode ? payment intent will be confirmed automatically.</p>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Processing..." : `Pay $${total.toFixed(2)}`}
            </button>
          </form>
        </div>

        <div className="card p-8 h-fit">
          <h2 className="text-2xl font-semibold mb-6">Order Summary</h2>

          <div className="space-y-3 mb-6 border-b pb-6">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="border-t pt-4 flex justify-between font-semibold text-lg">
              <span>TOTAL</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
