"use client";

import { useCartStore } from "@/lib/store/cart";
import Link from "next/link";
import { getAssetUrl } from "@/lib/utils/assets";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <Link href="/products" className="btn-secondary">Continue shopping</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">Image</th>
                  <th className="px-6 py-3 text-left">Product</th>
                  <th className="px-6 py-3 text-left">Price</th>
                  <th className="px-6 py-3 text-left">Quantity</th>
                  <th className="px-6 py-3 text-left">Subtotal</th>
                  <th className="px-6 py-3 text-left"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="px-6 py-4">
                      {getAssetUrl(item.imageUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getAssetUrl(item.imageUrl) || ""}
                          alt={item.name}
                          className="h-12 w-16 rounded object-cover"
                        />
                      ) : (
                        <span className="text-xs text-gray-500">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{item.name}</td>
                    <td className="px-6 py-4">${Number(item.price).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="bg-gray-200 px-2 py-1 rounded"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="bg-gray-200 px-2 py-1 rounded"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">${(item.price * item.quantity).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => removeItem(item.id)} className="text-red-600">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card p-6 h-fit">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>Included</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Earn ~{Math.floor(total)} eco points on delivery
              </div>
              <Link href="/checkout" className="btn-primary w-full text-center">
                Proceed to Checkout
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


