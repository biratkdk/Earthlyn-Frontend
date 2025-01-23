import axios from "axios";
import { clearAuthToken } from "@/lib/store/auth";
import { getPublicBackendUrl } from "@/lib/config/public-env";
import {
  ensureXsrfToken,
  getXsrfTokenFromCookie,
  XSRF_HEADER_NAME,
} from "@/lib/api/csrf";

const BACKEND_URL = getPublicBackendUrl();
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const apiClient = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  if (typeof window === "undefined") {
    return config;
  }

  const method = (config.method || "GET").toUpperCase();
  const xsrfToken = SAFE_METHODS.has(method)
    ? getXsrfTokenFromCookie()
    : getXsrfTokenFromCookie() || (await ensureXsrfToken());

  if (xsrfToken) {
    config.headers[XSRF_HEADER_NAME] = xsrfToken;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      clearAuthToken();
    }

    return Promise.reject(error);
  },
);

export default apiClient;

