"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { getDashboardPath } from "@/lib/utils/routes";
import { getUnreadNotificationCount } from "@/lib/api/notifications";

interface NavLink {
  href: string;
  label: string;
}

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const cartCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );
  const [open, setOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const baseLinks: NavLink[] = [
    { href: "/products", label: "Products" },
    { href: "/privacy", label: "Privacy" },
  ];

  const authenticatedLinks: NavLink[] = user
    ? [
        { href: getDashboardPath(user.role), label: "Dashboard" },
        { href: "/orders", label: "Orders" },
        { href: "/messages", label: "Messages" },
        { href: "/notifications", label: "Notifications" },
        { href: "/account/privacy", label: "Privacy Center" },
      ]
    : [];

  const buyerLinks: NavLink[] =
    user?.role === "BUYER"
      ? [
          { href: "/disputes", label: "Disputes" },
          { href: "/rewards", label: "Rewards" },
          { href: "/referrals", label: "Referrals" },
          { href: "/subscription", label: "Eco-Box" },
          { href: "/recommendations", label: "For You" },
        ]
      : [];

  const sellerLinks: NavLink[] =
    user?.role === "SELLER"
      ? [
          { href: "/seller/kyc", label: "KYC" },
          { href: "/dashboard/seller/tiers", label: "Tiers" },
          { href: "/dashboard/seller/earnings", label: "Earnings" },
          { href: "/dashboard/seller/delivery", label: "Delivery" },
        ]
      : [];

  const adminLinks: NavLink[] =
    user?.role === "ADMIN"
      ? [
          { href: "/dashboard/admin/products", label: "Approve" },
          { href: "/dashboard/admin/kyc", label: "KYC" },
          { href: "/dashboard/admin/tiers", label: "Tiers" },
          { href: "/dashboard/admin/balance", label: "Balance" },
          { href: "/dashboard/admin/operations", label: "Ops" },
          { href: "/dashboard/admin/growth", label: "Growth" },
          { href: "/dashboard/admin/disputes", label: "Disputes" },
          { href: "/dashboard/admin/refunds", label: "Refunds" },
          { href: "/dashboard/admin/analytics", label: "Analytics" },
          { href: "/dashboard/admin/audit-logs", label: "Audit" },
        ]
      : [];

  const supportLinks: NavLink[] =
    user?.role === "ADMIN" || user?.role === "CUSTOMER_SERVICE"
      ? [
          { href: "/dashboard/admin/moderation", label: "Moderation" },
          { href: "/dashboard/customer-service", label: "Support" },
        ]
      : [];

  const links = [
    ...baseLinks,
    ...authenticatedLinks,
    ...buyerLinks,
    ...sellerLinks,
    ...adminLinks,
    ...supportLinks,
  ];

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    const loadNotificationCount = async () => {
      try {
        const count = await getUnreadNotificationCount();
        if (!cancelled) {
          setNotificationCount(count);
        }
      } catch {
        if (!cancelled) {
          setNotificationCount(0);
        }
      }
    };

    void loadNotificationCount();
    const interval = window.setInterval(loadNotificationCount, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <Link
          href="/"
          className="text-2xl font-semibold text-[var(--accent)]"
          onClick={() => setOpen(false)}
        >
          EARTHLYN
        </Link>

        <button
          type="button"
          className="rounded-lg border border-black/10 px-3 py-2 text-sm md:hidden"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="primary-navigation"
          aria-label={
            open ? "Close primary navigation" : "Open primary navigation"
          }
        >
          Menu
        </button>

        <div
          id="primary-navigation"
          className={`${
            open ? "flex" : "hidden"
          } absolute left-0 right-0 top-full flex-col gap-2 border-b border-black/5 bg-white px-4 py-4 text-sm shadow-lg md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 transition hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] md:py-1"
              onClick={() => setOpen(false)}
            >
              {link.label}
              {link.href === "/notifications" && notificationCount > 0 && (
                <span className="ml-2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-white">
                  {notificationCount}
                </span>
              )}
            </Link>
          ))}

          <Link
            href="/cart"
            className="relative rounded-full px-3 py-2 transition hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] md:py-1"
            onClick={() => setOpen(false)}
          >
            Cart
            {cartCount > 0 && (
              <span className="ml-2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {!user ? (
            <div className="flex flex-col gap-2 pt-2 md:flex-row md:pt-0">
              <Link
                href="/login"
                className="btn-secondary text-center"
                onClick={() => setOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="btn-primary text-center"
                onClick={() => setOpen(false)}
              >
                Register
              </Link>
            </div>
          ) : (
            <button onClick={handleLogout} className="btn-primary">
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
