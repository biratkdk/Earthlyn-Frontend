"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth";
import { getDashboardPath } from "@/lib/utils/routes";

export default function Home() {
  const { user } = useAuthStore();

  return (
    <div>
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 opacity-40">
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(15,91,75,0.25),_transparent_55%)]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-center">
          <div>
            <p className="badge">Sustainability-first marketplace</p>
            <h1 className="mt-6 text-5xl leading-tight">
              Hypnotic, earth-centric commerce for eco-minded buyers and makers.
            </h1>
            <p className="mt-6 text-lg text-gray-700 max-w-xl">
              EARTHLYN connects verified sellers of biodegradable products with buyers who care. Automated payouts, eco impact, and intelligent recommendations in one seamless platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/products" className="btn-primary">Start Shopping</Link>
              {!user ? (
                <Link href="/register" className="btn-secondary">Become a Seller</Link>
              ) : (
                <Link href={getDashboardPath(user.role)} className="btn-secondary">Go to Dashboard</Link>
              )}
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-xl font-semibold">Platform snapshot</h3>
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              <li>Automated processing fees and tiered profit credits</li>
              <li>Real-time order tracking and eco-impact points</li>
              <li>Secure messaging with moderation and disputes</li>
              <li>Referrals, subscriptions, and analytics built-in</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Eco Discovery", text: "Curated categories and trusted sellers for low-impact products." },
              { title: "Seamless Checkout", text: "Stripe-backed payments with automated order confirmations." },
              { title: "Impact Rewards", text: "Earn eco points, track impact, and level up sustainably." },
            ].map((feature) => (
              <div key={feature.title} className="card p-6">
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="mt-3 text-gray-700">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[var(--accent)] text-white">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-4xl">Ready to build a greener marketplace?</h2>
          <p className="mt-4 text-lg text-white/80">
            {user ? `Welcome back, ${user.name}. Your dashboard is ready.` : "Join buyers and sellers creating change through commerce."}
          </p>
          <div className="mt-8 flex justify-center gap-4">
            {user ? (
              <Link href={getDashboardPath(user.role)} className="btn-secondary">Open Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="btn-secondary">Login</Link>
                <Link href="/register" className="btn-primary">Register</Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
