import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const localBackendUrl = "http://localhost:3001";

function getBackendUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();

  if (!rawUrl) {
    if (!isDev) {
      throw new Error("NEXT_PUBLIC_BACKEND_URL is required in production.");
    }

    return localBackendUrl;
  }

  return new URL(rawUrl).toString().replace(/\/$/, "");
}

const backendUrl = getBackendUrl();
const backendImageUrl = new URL(backendUrl);
const backendImageProtocol =
  backendImageUrl.protocol === "https:" ? "https" : "http";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: backendImageProtocol,
        hostname: backendImageUrl.hostname,
        port: backendImageUrl.port,
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
