"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { getDashboardPath } from "@/lib/utils/routes";
import { getErrorMessage } from "@/lib/utils/errors";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, user, isHydrated } = useAuthStore();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "BUYER",
  });
  const [error, setError] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendingVerification, setResendingVerification] = useState(false);

  useEffect(() => {
    if (isHydrated && user) {
      router.push(getDashboardPath(user.role));
    }
  }, [isHydrated, router, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (
      formData.password.length < 8 ||
      !/[A-Za-z]/.test(formData.password) ||
      !/\d/.test(formData.password)
    ) {
      setError("Password must be at least 8 characters and include a letter and number");
      return;
    }

    try {
      const result = await register(
        formData.email,
        formData.password,
        formData.name,
        formData.role,
      );
      if (result.requiresEmailVerification) {
        setVerificationEmail(result.email);
        return;
      }

      const role = useAuthStore.getState().user?.role;
      router.push(getDashboardPath(role));
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed"));
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) return;

    setResendingVerification(true);
    setError("");
    try {
      await apiClient.post("/auth/resend-verification", {
        email: verificationEmail,
      });
    } catch (err) {
      setError(getErrorMessage(err, "Could not resend verification email."));
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="card max-w-md w-full p-8">
        <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent)]">Join Earthlyn</p>
        <h1 className="text-3xl font-semibold mt-2">Create your account</h1>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {verificationEmail ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Account created. Verify {verificationEmail} before logging in.
            </div>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendingVerification}
              className="btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendingVerification ? "Sending..." : "Resend verification email"}
            </button>
            <Link href="/login" className="btn-primary inline-block w-full text-center">
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-black/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-black/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              pattern="(?=.*[A-Za-z])(?=.*\d).+"
              title="Use at least 8 characters with at least one letter and one number."
              aria-describedby="password-requirements"
              className="w-full rounded-xl border border-black/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            <p id="password-requirements" className="mt-1 text-xs text-gray-500">
              Use at least 8 characters with at least one letter and one number.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-black/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full rounded-xl border border-black/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="BUYER">Buyer</option>
              <option value="SELLER">Seller</option>
            </select>
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? "Registering..." : "Register"}
          </button>
          </form>
        )}

        {!verificationEmail && (
          <p className="text-sm text-gray-600 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            Login here
          </Link>
        </p>
        )}
      </div>
    </div>
  );
}
