import { getPublicBackendUrl } from "@/lib/config/public-env";

const BACKEND_URL = getPublicBackendUrl();

export function getAssetUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }

  return `${BACKEND_URL.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}
