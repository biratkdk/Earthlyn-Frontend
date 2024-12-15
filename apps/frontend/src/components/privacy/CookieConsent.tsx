"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";

const CONSENT_STORAGE_KEY = "earthlyn-cookie-consent-v1";

interface ConsentState {
  analytics: boolean;
  marketing: boolean;
  savedAt: string;
}

function parseStoredConsent(rawValue: string | null): ConsentState | null {
  try {
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as Partial<ConsentState>;
    if (
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.marketing !== "boolean" ||
      typeof parsed.savedAt !== "string"
    ) {
      return null;
    }

    return {
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

function subscribeToConsent(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getConsentSnapshot() {
  if (typeof window === "undefined") return "loading";
  return window.localStorage.getItem(CONSENT_STORAGE_KEY) || "";
}

function getServerConsentSnapshot() {
  return "loading";
}

function storeConsent(consent: Omit<ConsentState, "savedAt">) {
  if (typeof window === "undefined") return null;

  const nextConsent: ConsentState = {
    ...consent,
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(nextConsent));
  return nextConsent;
}

export function CookieConsent() {
  const { user } = useAuthStore();
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const consentSnapshot = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );
  const storedConsent = parseStoredConsent(
    consentSnapshot === "loading" ? null : consentSnapshot,
  );
  const [dismissed, setDismissed] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const visible = consentSnapshot !== "loading" && !storedConsent && !dismissed;

  useEffect(() => {
    if (!visible || typeof window === "undefined") return undefined;

    const previousPadding = document.body.style.paddingBottom;
    const setBannerOffset = () => {
      const bannerHeight = bannerRef.current?.offsetHeight ?? 0;
      document.body.style.paddingBottom = `${bannerHeight}px`;
    };

    setBannerOffset();
    window.addEventListener("resize", setBannerOffset);

    return () => {
      window.removeEventListener("resize", setBannerOffset);
      document.body.style.paddingBottom = previousPadding;
    };
  }, [customizing, visible]);

  const saveConsent = async (nextConsent: Omit<ConsentState, "savedAt">) => {
    storeConsent(nextConsent);
    setAnalytics(nextConsent.analytics);
    setMarketing(nextConsent.marketing);
    setDismissed(true);
    setCustomizing(false);

    if (user) {
      await apiClient
        .post("/privacy/settings", {
          dataCollection: true,
          analytics: nextConsent.analytics,
          marketing: nextConsent.marketing,
        })
        .catch(() => undefined);
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={bannerRef}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-white px-4 py-4 shadow-2xl"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl">
          <p className="font-semibold text-[var(--ink)]">Privacy preferences</p>
          <p className="mt-1 text-sm text-gray-600">
            EARTHLYN uses necessary cookies for login and checkout. Optional
            analytics and marketing preferences can be changed anytime in the
            privacy center.
          </p>
          {customizing && (
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(event) => setAnalytics(event.target.checked)}
                />
                Analytics
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(event) => setMarketing(event.target.checked)}
                />
                Marketing
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {customizing ? (
            <button
              type="button"
              onClick={() => void saveConsent({ analytics, marketing })}
              className="btn-primary"
            >
              Save
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCustomizing(true)}
              className="btn-secondary"
            >
              Customize
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              void saveConsent({ analytics: false, marketing: false })
            }
            className="btn-secondary"
          >
            Reject optional
          </button>
          <button
            type="button"
            onClick={() =>
              void saveConsent({ analytics: true, marketing: true })
            }
            className="btn-primary"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
