import type { Metadata } from "next";
import type { Viewport } from "next";
import { headers } from "next/headers";
import { AuthBootstrap } from "@/components/auth/AuthBootstrap";
import { Navbar } from "@/components/layout/Navbar";
import { CookieConsent } from "@/components/privacy/CookieConsent";
import { ChatWidget } from "@/components/ChatWidget";
import { ToastProvider } from "@/components/ui/ToastProvider";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/fraunces/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "EARTHLYN - Sustainable E-commerce",
  description: "Buy and sell sustainable products",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await headers();

  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AuthBootstrap />
          <Navbar />
          <main>{children}</main>
          <CookieConsent />
          <ChatWidget />
        </ToastProvider>
      </body>
    </html>
  );
}
