"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-green-600">EARTHLYN</Link>
          <div className="flex items-center gap-3 flex-wrap text-sm">
            {user ? (
              <>
                <Link href="/products" className="text-gray-700 hover:text-green-600">Products</Link>
                <Link href="/cart" className="text-gray-700 hover:text-green-600">Cart</Link>
                <Link href="/dashboard" className="text-gray-700 hover:text-green-600">Dashboard</Link>
                <Link href="/orders" className="text-gray-700 hover:text-green-600">Orders</Link>
                <Link href="/messages" className="text-gray-700 hover:text-green-600">Messages</Link>
                <Link href="/rewards" className="text-gray-700 hover:text-green-600">Rewards</Link>
                <Link href="/refferals" className="text-gray-700 hover:text-green-600">Referrals</Link>
                <Link href="/subscription" className="text-gray-700 hover:text-green-600">Eco-Boxes</Link>
                <Link href="/recommendations" className="text-gray-700 hover:text-green-600">AI Recs</Link>
                {user.role === "seller" && (
                  <>
                    <Link href="/seller/kyc" className="text-gray-700 hover:text-green-600">KYC</Link>
                    <Link href="/dashboard/seller/tiers" className="text-gray-700 hover:text-green-600">Tiers</Link>
                  </>
                )}
                {user.role === "admin" && (
                  <>
                    <Link href="/dashboard/admin/products" className="text-gray-700 hover:text-green-600">Approve</Link>
                    <Link href="/dashboard/admin/balance" className="text-gray-700 hover:text-green-600">Balance</Link>
                    <Link href="/dashboard/admin/analytics" className="text-gray-700 hover:text-green-600">Analytics</Link>
                    <Link href="/dashboard/customer-service" className="text-gray-700 hover:text-green-600">Support</Link>
                  </>
                )}
                <span className="text-gray-600 text-xs border-l pl-3">{user.name} ({user.role})</span>
                <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs">Logout</button>
              </>
            ) : (
              <>
                <Link href="/products" className="text-gray-700 hover:text-green-600">Products</Link>
                <Link href="/login" className="text-gray-700 hover:text-green-600">Login</Link>
                <Link href="/register" className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
