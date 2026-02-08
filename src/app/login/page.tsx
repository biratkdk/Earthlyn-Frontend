"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { getDashboardPath } from "@/lib/utils/routes";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      const role = useAuthStore.getState().user?.role;
      router.push(getDashboardPath(role));
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="card max-w-md w-full p-8">
        <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent)]">Welcome back</p>
        <h1 className="text-3xl font-semibold mt-2">Login to EARTHLYN</h1>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-black/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-black/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              placeholder=""
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-6">
          New here?{" "}
          <Link href="/register" className="text-[var(--accent)] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
