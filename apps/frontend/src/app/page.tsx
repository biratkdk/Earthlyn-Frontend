"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/lib/store/auth";
import { getDashboardPath } from "@/lib/utils/routes";

const FEATURED = [
  {
    name: "Bamboo Starter Kit",
    category: "Personal Care",
    price: "$24.99",
    eco: 94,
    img: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80",
    href: "/products?category=Personal+Care",
  },
  {
    name: "Organic Beeswax Wraps",
    category: "Kitchen",
    price: "$18.50",
    eco: 91,
    img: "https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=600&q=80",
    href: "/products?category=Kitchen",
  },
  {
    name: "Stainless Steel Bottle",
    category: "Drinkware",
    price: "$28.00",
    eco: 87,
    img: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80",
    href: "/products?category=Drinkware",
  },
  {
    name: "Solar-Powered Lantern",
    category: "Outdoor & Garden",
    price: "$42.00",
    eco: 89,
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    href: "/products?category=Outdoor+%26+Garden",
  },
];

const CATEGORIES = [
  { label: "Personal Care", emoji: "🌿", href: "/products?category=Personal+Care", color: "from-emerald-50 to-teal-100" },
  { label: "Kitchen", emoji: "🍃", href: "/products?category=Kitchen", color: "from-lime-50 to-green-100" },
  { label: "Drinkware", emoji: "💧", href: "/products?category=Drinkware", color: "from-cyan-50 to-sky-100" },
  { label: "Outdoor & Garden", emoji: "☀️", href: "/products?category=Outdoor+%26+Garden", color: "from-yellow-50 to-amber-100" },
  { label: "Tech Accessories", emoji: "♻️", href: "/products?category=Tech+Accessories", color: "from-violet-50 to-purple-100" },
];

const STATS = [
  { value: "2,400+", label: "Eco products" },
  { value: "98%", label: "Plastic-free packaging" },
  { value: "340 kg", label: "CO₂ offset this month" },
  { value: "12,000+", label: "Happy buyers" },
];

export default function Home() {
  const { user } = useAuthStore();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#f0faf5] via-white to-[#e8f5f0] py-20 lg:py-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-[var(--accent)]/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-emerald-200/20 blur-2xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/12 text-[var(--accent)] text-xs font-semibold uppercase tracking-widest mb-6">
              🌍 Sustainability-first marketplace
            </span>
            <h1 className="text-5xl lg:text-6xl font-bold leading-[1.12] tracking-tight text-[var(--ink)]">
              Shop eco.
              <br />
              <span className="text-[var(--accent)]">Live greener.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-lg leading-relaxed">
              Earthlyn connects you with verified sellers of biodegradable, zero-waste products. Every purchase earns eco points and offsets your carbon footprint.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn-primary text-base px-6 py-3">
                Shop now →
              </Link>
              {!user ? (
                <Link href="/register" className="btn-secondary text-base px-6 py-3">
                  Become a seller
                </Link>
              ) : (
                <Link href={getDashboardPath(user.role)} className="btn-secondary text-base px-6 py-3">
                  My dashboard
                </Link>
              )}
            </div>

            {/* Mini stats row */}
            <div className="mt-10 flex flex-wrap gap-6">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-[var(--accent)]">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero image grid */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURED.slice(0, 4).map((p, i) => (
              <Link
                key={p.name}
                href={p.href}
                className={`group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 ${i === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square"}`}
              >
                <Image
                  src={p.img}
                  alt={p.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white text-sm font-semibold leading-tight">{p.name}</p>
                  <p className="text-white/70 text-xs">{p.price} · Eco {p.eco}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Category pills */}
      <section className="py-12 bg-white border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-6">Browse by category</h2>
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                className={`group flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-br ${cat.color} border border-black/[0.06] hover:shadow-md transition-all duration-200 font-medium text-sm text-gray-800 hover:text-[var(--accent)]`}
              >
                <span className="text-xl">{cat.emoji}</span>
                {cat.label}
              </Link>
            ))}
            <Link
              href="/products"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-black/10 text-sm font-medium text-gray-600 hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all"
            >
              View all →
            </Link>
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section className="py-16 bg-[var(--muted)]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-[var(--ink)]">Featured picks</h2>
              <p className="text-gray-500 mt-1 text-sm">Hand-picked products with the highest eco scores</p>
            </div>
            <Link href="/products" className="text-sm font-medium text-[var(--accent)] hover:underline">
              See all →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURED.map((product) => (
              <Link
                key={product.name}
                href={product.href}
                className="group bg-white rounded-2xl overflow-hidden border border-black/[0.06] hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={product.img}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-2.5 right-2.5 bg-[var(--accent)] text-white text-[10px] font-bold px-2 py-1 rounded-full">
                    ECO {product.eco}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--accent)] font-semibold">{product.category}</p>
                  <h3 className="font-semibold text-[var(--ink)] mt-1 text-sm leading-snug">{product.name}</h3>
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-[var(--accent)]">{product.price}</span>
                    <span className="text-xs text-gray-500 group-hover:text-[var(--accent)] transition-colors">Shop →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Earthlyn */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[var(--ink)]">Why Earthlyn?</h2>
            <p className="text-gray-500 mt-2">Built for the planet, powered by verified makers</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🌱", title: "Verified eco sellers", text: "Every seller is KYC-verified and their products audited for sustainability standards before going live." },
              { icon: "⚡", title: "Instant payouts", text: "Stripe-powered payments with automated processing fees and tiered seller profit credits in real time." },
              { icon: "🏆", title: "Eco rewards", text: "Earn eco points on every purchase. Redeem them for discounts, donations, or subscription boxes." },
            ].map((f) => (
              <div key={f.title} className="group p-6 rounded-2xl border border-black/[0.07] hover:border-[var(--accent)]/30 hover:shadow-lg transition-all duration-300 bg-white">
                <span className="text-3xl">{f.icon}</span>
                <h3 className="mt-4 text-lg font-bold text-[var(--ink)]">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="py-20 bg-gradient-to-r from-[var(--accent)] to-emerald-700 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold leading-tight">
            Ready to make every purchase count?
          </h2>
          <p className="mt-4 text-white/80 text-lg">
            {user
              ? `Welcome back, ${user.name}. Your eco journey continues.`
              : "Join thousands of buyers and sellers creating change through commerce."}
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            {user ? (
              <Link
                href={getDashboardPath(user.role)}
                className="bg-white text-[var(--accent)] font-semibold px-7 py-3.5 rounded-full hover:bg-white/90 transition-colors shadow-lg"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="bg-white text-[var(--accent)] font-semibold px-7 py-3.5 rounded-full hover:bg-white/90 transition-colors shadow-lg"
                >
                  Get started free
                </Link>
                <Link
                  href="/products"
                  className="border border-white/40 text-white font-semibold px-7 py-3.5 rounded-full hover:bg-white/10 transition-colors"
                >
                  Browse products
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
