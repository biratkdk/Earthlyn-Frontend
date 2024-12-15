"use client";

import { useEffect, useRef } from "react";
import { isProtectedPath, useAuthStore } from "@/lib/store/auth";

export function AuthBootstrap() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const setHydrated = useAuthStore((state) => state.setHydrated);
  const refreshSessionRef = useRef(refreshSession);
  const refreshInFlightRef = useRef(false);
  const refreshedUserRef = useRef<string | null>(null);
  const checkedCookieSessionRef = useRef(false);

  useEffect(() => {
    refreshSessionRef.current = refreshSession;
  }, [refreshSession]);

  useEffect(() => {
    if (userId) {
      if (refreshInFlightRef.current || refreshedUserRef.current === userId) return;

      refreshInFlightRef.current = true;
      refreshedUserRef.current = userId;
      void refreshSessionRef.current().finally(() => {
        refreshInFlightRef.current = false;
      });
      return;
    }

    refreshedUserRef.current = null;
    if (refreshInFlightRef.current) return;

    if (!isHydrated) {
      setHydrated(true);
    }

    if (typeof window !== "undefined" && !isProtectedPath(window.location.pathname)) {
      setHydrated(true);
      return;
    }

    if (checkedCookieSessionRef.current) {
      setHydrated(true);
      return;
    }

    checkedCookieSessionRef.current = true;
    refreshInFlightRef.current = true;
    void refreshSessionRef.current().finally(() => {
      refreshInFlightRef.current = false;
    });
  }, [isHydrated, setHydrated, userId]);

  return null;
}
