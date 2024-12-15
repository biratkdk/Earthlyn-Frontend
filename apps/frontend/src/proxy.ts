import { NextRequest, NextResponse } from "next/server";

const isDev = process.env.NODE_ENV !== "production";
const fallbackBackendUrl = "http://localhost:3001";
const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || fallbackBackendUrl;

const authenticatedRoutes = [
  "/account",
  "/checkout",
  "/dashboard",
  "/disputes",
  "/messages",
  "/notifications",
  "/orders",
  "/recommendations",
  "/referrals",
  "/rewards",
  "/seller/kyc",
  "/subscription",
];

const roleRoutes: Array<{ prefix: string; roles: string[] }> = [
  {
    prefix: "/dashboard/admin/moderation",
    roles: ["ADMIN", "CUSTOMER_SERVICE"],
  },
  { prefix: "/dashboard/admin", roles: ["ADMIN"] },
  { prefix: "/dashboard/seller", roles: ["SELLER"] },
  { prefix: "/seller/kyc", roles: ["SELLER"] },
  {
    prefix: "/dashboard/customer-service",
    roles: ["ADMIN", "CUSTOMER_SERVICE"],
  },
];

function startsWithRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function buildCspHeader(nonce: string) {
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' ${backendUrl} blob: data:;
    font-src 'self' data:;
    connect-src 'self' ${backendUrl} https://api.stripe.com https://*.stripe.com;
    frame-src https://js.stripe.com https://hooks.stripe.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = buildCspHeader(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const next = () => {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("Content-Security-Policy", cspHeader);
    return response;
  };

  const isAuthenticated = Boolean(request.cookies.get("earthlyn-session"));
  const role = request.cookies.get("earthlyn-session-role")?.value;

  const requiresAuth = authenticatedRoutes.some((route) =>
    startsWithRoute(pathname, route),
  );

  if (requiresAuth && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Content-Security-Policy", cspHeader);
    return response;
  }

  const routeRule = roleRoutes.find((rule) =>
    startsWithRoute(pathname, rule.prefix),
  );

  if (routeRule && (!role || !routeRule.roles.includes(role))) {
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.headers.set("Content-Security-Policy", cspHeader);
    return response;
  }

  return next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
