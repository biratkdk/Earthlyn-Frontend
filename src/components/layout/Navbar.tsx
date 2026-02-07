"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";

const roleDashboardPath = (role?: string) => {
  switch (role) {
    case "SELLER":
      return "/dashboard/seller";
    case "ADMIN":
      return "/dashboard/admin";
    case "CUSTOMER_SERVICE":
      return "/dashboard/customer-service";
    default:
      return "/dashboard";
  }
};

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-black/5 bg-white/70 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-2xl font-semibold text-[var(--accent)]">EARTHLYN</Link>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/products" className="hover:text-[var(--accent)]">Products</Link>
          <Link href="/cart" className="hover:text-[var(--accent)]">Cart</Link>
          {user && (
            <Link href={roleDashboardPath(user.role)} className="hover:text-[var(--accent)]">Dashboard</Link>
          )}
          <Link href="/orders" className="hover:text-[var(--accent)]">Orders</Link>
          <Link href="/messages" className="hover:text-[var(--accent)]">Messages</Link>
          <Link href="/disputes" className="hover:text-[var(--accent)]">Disputes</Link>
          <Link href="/rewards" className="hover:text-[var(--accent)]">Rewards</Link>
          <Link href="/refferals" className="hover:text-[var(--accent)]">Referrals</Link>
          <Link href="/subscription" className="hover:text-[var(--accent)]">Eco-Box</Link>
          <Link href="/recommendations" className="hover:text-[var(--accent)]">AI</Link>
          {user?.role === "SELLER" && (
            <>
              <Link href="/seller/kyc" className="hover:text-[var(--accent)]">KYC</Link>
              <Link href="/dashboard/seller/tiers" className="hover:text-[var(--accent)]">Tiers</Link>
              <Link href="/dashboard/seller/delivery" className="hover:text-[var(--accent)]">Delivery</Link>
            </>
          )}
          {(user?.role === "ADMIN" || user?.role === "CUSTOMER_SERVICE") && (
            <>
              <Link href="/dashboard/admin/products" className="hover:text-[var(--accent)]">Approve</Link>
              <Link href="/dashboard/admin/balance" className="hover:text-[var(--accent)]">Balance</Link>
              <Link href="/dashboard/admin/analytics" className="hover:text-[var(--accent)]">Analytics</Link>
              <Link href="/dashboard/admin/moderation" className="hover:text-[var(--accent)]">Moderation</Link>
              <Link href="/dashboard/customer-service" className="hover:text-[var(--accent)]">Support</Link>
            </>
          )}
          {!user ? (
            <>
              <Link href="/login" className="btn-secondary">Login</Link>
              <Link href="/register" className="btn-primary">Register</Link>
            </>
          ) : (
            <button onClick={handleLogout} className="btn-primary">Logout</button>
          )}
        </div>
      </div>
    </nav>
  );
}
