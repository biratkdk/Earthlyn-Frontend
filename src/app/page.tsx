"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth";

export default function Home() {
  const { user } = useAuthStore();

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to EARTHLYN
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Discover and share sustainable products. Buy from trusted sellers, 
            sell your eco-friendly items globally.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/products"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold"
            >
              Start Shopping
            </Link>
            {!user && (
              <Link
                href="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold"
              >
                Become a Seller
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 text-center bg-gray-50 rounded-lg">
              <div className="text-4xl mb-4">🛍️</div>
              <h3 className="text-xl font-bold mb-2">Browse Products</h3>
              <p className="text-gray-600">
                Explore thousands of sustainable products from verified sellers worldwide.
              </p>
            </div>
            <div className="p-6 text-center bg-gray-50 rounded-lg">
              <div className="text-4xl mb-4">🛒</div>
              <h3 className="text-xl font-bold mb-2">Easy Checkout</h3>
              <p className="text-gray-600">
                Secure, fast checkout process. Add items to cart and place orders instantly.
              </p>
            </div>
            <div className="p-6 text-center bg-gray-50 rounded-lg">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-xl font-bold mb-2">Track Orders</h3>
              <p className="text-gray-600">
                Monitor your orders in real-time. Quick support from our team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-green-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg mb-8 opacity-90">
            {user
              ? `Welcome back, ${user.name}! Check your dashboard now.`
              : "Join thousands of sustainable product lovers and ethical sellers."}
          </p>
          <div className="flex justify-center gap-4">
            {user ? (
              <Link
                href={
                  user.role === "buyer"
                    ? "/dashboard"
                    : user.role === "seller"
                      ? "/dashboard/seller"
                      : "/dashboard/admin"
                }
                className="bg-white text-green-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-bold"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="bg-white text-green-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-bold"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-green-700 hover:bg-green-800 text-white px-8 py-3 rounded-lg font-bold border border-white"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; 2026 EARTHLYN. Sustainable products for a better future.</p>
        </div>
      </footer>
    </div>
  );
}
