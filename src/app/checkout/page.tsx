"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { useRouter } from "next/navigation";

export default function Checkout() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { items, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    address: "",
    city: "",
    zipCode: "",
    cardNumber: "",
    cardExpiry: "",
    cardCVC: "",
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
      // Step 1: Create payment intent on backend
      const intentResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/payments/create-intent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: Math.round(total * 100), // Convert to cents
            items,
            shippingAddress: {
              fullName: formData.fullName,
              address: formData.address,
              city: formData.city,
              zipCode: formData.zipCode,
            },
          }),
        }
      );

      const intentData = await intentResponse.json();

      // Step 2: In real app, use Stripe.js to handle payment
      // For demo, simulate successful payment
      if (intentData.clientSecret) {
        // Success - create order
        const orderResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/orders`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              items: items.map((item) => ({
                productId: item.id,
                quantity: item.quantity,
              })),
              total,
              paymentIntentId: intentData.clientSecret,
              shippingAddress: formData,
            }),
          }
        );

        if (orderResponse.ok) {
          clearCart();
          const order = await orderResponse.json();
          router.push(`/orders/confirmation/${order.id}`);
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handlePayment} className="bg-white rounded-lg shadow p-8 space-y-6">
            {/* Shipping Info */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Shipping Address</h2>
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                name="address"
                placeholder="Street Address"
                value={formData.address}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="zipCode"
                  placeholder="ZIP Code"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Payment Info */}
            <div className="border-t pt-6">
              <h2 className="text-2xl font-bold mb-4">Payment Information</h2>
              <input
                type="text"
                name="cardNumber"
                placeholder="Card Number (4242 4242 4242 4242)"
                value={formData.cardNumber}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  name="cardExpiry"
                  placeholder="MM/YY"
                  value={formData.cardExpiry}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="cardCVC"
                  placeholder="CVC"
                  value={formData.cardCVC}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold text-lg"
            >
              {loading ? "Processing..." : `Pay $${total.toFixed(2)}`}
            </button>
          </form>

          <p className="text-sm text-gray-600 mt-4">
            Use test card: 4242 4242 4242 4242 | Any future expiry | Any CVC
          </p>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow p-8 h-fit">
          <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

          <div className="space-y-3 mb-6 border-b pb-6">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <div>
                  <p className="font-bold">{item.name}</p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                </div>
                <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (10%)</span>
              <span>${(total * 0.1).toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t pt-4 flex justify-between font-bold text-lg">
            <span>TOTAL</span>
            <span>${(total * 1.1).toFixed(2)}</span>
          </div>

          <div className="mt-6 p-3 bg-green-50 rounded-lg border border-green-200 text-sm">
            <p>? Secure SSL encrypted payment</p>
            <p>? 30-day money back guarantee</p>
          </div>
        </div>
      </div>
    </div>
  );
}
