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
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-green-600">
          EARTHLYN
        </Link>

        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link href="/products" className="text-gray-700 hover:text-green-600">
                Products
              </Link>
              <Link href="/dashboard" className="text-gray-700 hover:text-green-600">
                Dashboard
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className="text-gray-700 hover:text-green-600">
                  Admin
                </Link>
              )}
              <span className="text-gray-600 text-sm">
                {user.name} ({user.role})
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-700 hover:text-green-600">
                Login
              </Link>
              <Link href="/register" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
