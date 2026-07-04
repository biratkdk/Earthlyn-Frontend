"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { getDashboardPath } from "@/lib/utils/routes";
import { getUnreadNotificationCount } from "@/lib/api/notifications";

const ShoppingBagIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const ChevronDown = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const LeafIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
);

function NavPill({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium px-3.5 py-1.5 rounded-full transition-all ${
        active
          ? "bg-[var(--accent)] text-white shadow-sm"
          : "text-gray-600 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10"
      }`}
    >
      {label}
    </Link>
  );
}

function DropdownItem({ href, label, icon, onClick }: { href?: string; label: string; icon: string; onClick?: () => void }) {
  const cls = "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-[var(--accent)]/8 hover:text-[var(--accent)] transition-colors text-left";
  if (href) return <Link href={href} className={cls}><span className="text-base">{icon}</span>{label}</Link>;
  return <button onClick={onClick} className={cls}><span className="text-base">{icon}</span>{label}</button>;
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMobileOpen(false); setUserMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    let gone = false;
    const load = async () => {
      try { const n = await getUnreadNotificationCount(); if (!gone) setNotifCount(n); }
      catch { if (!gone) setNotifCount(0); }
    };
    void load();
    const t = setInterval(load, 60_000);
    return () => { gone = true; clearInterval(t); };
  }, [user]);

  const dashPath = getDashboardPath(user?.role);
  const initials = user?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  const userMenuLinks = () => {
    if (!user) return [];
    const common = [
      { href: dashPath,            icon: "⊞", label: "Dashboard" },
      { href: "/orders",           icon: "📦", label: "My Orders" },
      { href: "/messages",         icon: "💬", label: "Messages" },
      { href: "/notifications",    icon: "🔔", label: `Notifications${notifCount > 0 ? ` · ${notifCount}` : ""}` },
      { href: "/account/privacy",  icon: "🔒", label: "Privacy Centre" },
    ];
    const byRole: Record<string, { href: string; icon: string; label: string }[]> = {
      BUYER: [
        { href: "/wishlist",          icon: "🤍", label: "Wishlist" },
        { href: "/rewards",           icon: "🌱", label: "Eco Rewards" },
        { href: "/referrals",         icon: "🤝", label: "Referrals" },
        { href: "/subscription",      icon: "📮", label: "Eco-Box" },
        { href: "/disputes",          icon: "⚖️",  label: "Disputes" },
        { href: "/recommendations",   icon: "✨", label: "For You" },
      ],
      SELLER: [
        { href: "/dashboard/seller/earnings",  icon: "💰", label: "Earnings" },
        { href: "/dashboard/seller/delivery",  icon: "🚚", label: "Delivery" },
        { href: "/dashboard/seller/tiers",     icon: "🏅", label: "My Tier" },
        { href: "/seller/kyc",                 icon: "📋", label: "KYC Docs" },
      ],
      ADMIN: [
        { href: "/dashboard/admin/products",   icon: "✅", label: "Approvals" },
        { href: "/dashboard/admin/analytics",  icon: "📊", label: "Analytics" },
        { href: "/dashboard/admin/disputes",   icon: "⚖️",  label: "Disputes" },
        { href: "/dashboard/admin/refunds",    icon: "↩️",  label: "Refunds" },
        { href: "/dashboard/admin/kyc",        icon: "🪪", label: "KYC Review" },
        { href: "/dashboard/admin/growth",     icon: "📈", label: "Growth" },
        { href: "/dashboard/admin/audit-logs", icon: "📜", label: "Audit Log" },
      ],
    };
    return [...common, ...(byRole[user.role] ?? [])];
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-black/[0.07] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 h-16">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--accent)] text-white shadow-sm group-hover:scale-105 transition-transform duration-150">
            <LeafIcon />
          </span>
          <span className="font-bold tracking-tight text-[var(--ink)] hidden sm:block">EARTHLYN</span>
        </Link>

        {/* Center links — desktop */}
        <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
          <NavPill href="/products" label="Shop" active={pathname === "/products"} />
          <NavPill href="/products?category=Personal+Care" label="Personal Care" />
          <NavPill href="/products?category=Kitchen" label="Kitchen" />
          <NavPill href="/products?category=Outdoor+%26+Garden" label="Outdoor" />
          <NavPill href="/products?category=Drinkware" label="Drinkware" />
          {user && <NavPill href={dashPath} label="Dashboard" active={pathname?.startsWith("/dashboard")} />}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">

          {/* Cart */}
          <Link href="/cart" className="relative flex items-center justify-center w-9 h-9 rounded-full text-gray-600 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors">
            <ShoppingBagIcon />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[var(--accent)] text-white text-[10px] font-bold px-1 leading-none">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <>
              {/* Bell */}
              <Link href="/notifications" className="relative hidden sm:flex items-center justify-center w-9 h-9 rounded-full text-gray-600 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors">
                <BellIcon />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                    {notifCount}
                  </span>
                )}
              </Link>

              {/* User menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border border-black/10 hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/5 transition-all"
                >
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent)] to-emerald-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {initials}
                  </span>
                  <span className="hidden sm:block text-sm font-medium text-[var(--ink)] max-w-[90px] truncate">
                    {user.name?.split(" ")[0]}
                  </span>
                  <span className={`hidden sm:block text-gray-400 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}>
                    <ChevronDown />
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2.5 w-60 rounded-2xl border border-black/[0.08] bg-white shadow-2xl shadow-black/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-4 py-3 bg-[var(--muted)] border-b border-black/[0.06]">
                      <p className="text-sm font-semibold text-[var(--ink)] truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      <span className="mt-1.5 inline-block px-2.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] font-bold uppercase tracking-wider">
                        {user.role.replace("_", " ")}
                      </span>
                    </div>
                    <div className="p-2 max-h-80 overflow-y-auto">
                      {userMenuLinks().map((item) => (
                        <DropdownItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
                      ))}
                      <div className="my-1 mx-2 border-t border-black/[0.06]" />
                      <DropdownItem icon="🚪" label="Sign out" onClick={() => { logout(); router.push("/login"); }} />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login" className="text-sm font-medium text-gray-700 px-3.5 py-1.5 rounded-full border border-black/10 hover:border-[var(--accent)]/30 hover:text-[var(--accent)] transition-all">
                Sign in
              </Link>
              <Link href="/register" className="text-sm font-medium bg-[var(--accent)] text-white px-3.5 py-1.5 rounded-full shadow-sm hover:bg-[var(--accent)]/90 transition-all">
                Join free
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-full text-gray-600 hover:bg-[var(--accent)]/10 transition-colors"
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-black/[0.06] bg-white px-4 pb-4 pt-2 space-y-0.5">
          {[
            { href: "/products", label: "🛍️  Shop all" },
            { href: "/products?category=Personal+Care", label: "🌿  Personal Care" },
            { href: "/products?category=Kitchen", label: "🍃  Kitchen" },
            { href: "/products?category=Outdoor+%26+Garden", label: "☀️  Outdoor" },
            { href: "/cart", label: `🛒  Cart${cartCount > 0 ? ` (${cartCount})` : ""}` },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors">
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <div className="pt-2 pb-1 px-3">
                <div className="h-px bg-black/[0.06]" />
              </div>
              {userMenuLinks().map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors">
                  <span>{item.icon}</span>{item.label}
                </Link>
              ))}
              <div className="pt-2 pb-1 px-3"><div className="h-px bg-black/[0.06]" /></div>
              <button onClick={() => { logout(); router.push("/login"); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                <span>🚪</span> Sign out
              </button>
            </>
          ) : (
            <>
              <div className="pt-2 pb-1 px-3"><div className="h-px bg-black/[0.06]" /></div>
              <Link href="/login" className="block px-3 py-2.5 rounded-xl text-sm font-medium text-center border border-black/10 text-gray-700">Sign in</Link>
              <Link href="/register" className="block px-3 py-2.5 rounded-xl text-sm font-medium text-center bg-[var(--accent)] text-white mt-1">Join free</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
