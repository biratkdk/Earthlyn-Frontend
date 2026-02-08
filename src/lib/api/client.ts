import axios from "axios";
import { clearAuthToken } from "@/lib/store/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

export const apiClient = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  let token = null;
  
  if (typeof window !== "undefined") {
    try {
      const authStorage = localStorage.getItem("auth-storage");
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed.state?.token || null;
        console.log("[API-REQ]", config.url, "- Token found:", !!token, token ? "length: " + token.length : "");
      } else {
        console.log("[API-REQ]", config.url, "- No auth-storage in localStorage");
      }
    } catch (e) {
      console.error("[API-REQ] Failed to parse auth storage:", e);
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log("[API-REQ]", config.url, "- Authorization header SET");
  } else {
    console.log("[API-REQ]", config.url, "- NO Authorization header (token null)");
  }
  
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    console.log("[API-RES]", response.config.url, "- Status:", response.status, "?");
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.response?.config?.url || error.config?.url;
    
    console.error("[API-RES]", url, "- Status:", status, "?");
    console.error("[API-ERR] Data:", error.response?.data);
    
    if (status === 401 || status === 403) {
      console.error("[API-AUTH] Clearing auth due to 401/403 on:", url);
      clearAuthToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
