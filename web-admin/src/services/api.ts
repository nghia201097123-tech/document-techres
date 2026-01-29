import axios, { AxiosInstance } from "axios";
// Import generated client-side config (generated from .env by scripts/generate-client-env.js)
import { GATEWAY_URL, SERVICE_IDS } from "@/config/client-env";

// Re-export for other modules
export { GATEWAY_URL, SERVICE_IDS };

if (GATEWAY_URL) {
  console.log("[Admin API] Gateway URL:", GATEWAY_URL);
  console.log("[Admin API] Service IDs:", SERVICE_IDS);
} else {
  console.error("[Admin API] WARNING: Environment variables not configured!");
  console.error("[Admin API] Make sure CONFIG_* variables are set in .env and restart dev server");
}

// In-memory token storage as fallback when localStorage isn't persisted yet
let inMemoryToken: string | null = null;

export const setInMemoryToken = (token: string | null) => {
  inMemoryToken = token;
};

export const getInMemoryToken = () => inMemoryToken;

// Factory function to create API client for specific service via APISIX Gateway
export const createServiceApi = (serviceId: string): AxiosInstance => {
  const instance = axios.create({
    baseURL: GATEWAY_URL,
    headers: {
      "Content-Type": "application/json",
      "x-svc-id": serviceId,
    },
  });

  // Add auth interceptor
  instance.interceptors.request.use(
    (config) => {
      // Validate that env is configured before making requests
      if (!GATEWAY_URL) {
        return Promise.reject(new Error("API not configured: Check CONFIG_API_GATEWAY_URL in .env and restart dev server"));
      }

      if (typeof window !== "undefined") {
        let token: string | null = null;

        const authStorage = localStorage.getItem("auth-storage");
        if (authStorage) {
          try {
            const { state } = JSON.parse(authStorage);
            if (state?.token) {
              token = state.token;
            }
          } catch (e) {
            console.error("Error parsing auth storage:", e);
          }
        }

        if (!token && inMemoryToken) {
          token = inMemoryToken;
        }

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add response interceptor
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname;
          const isAuthPage = currentPath.startsWith("/login") ||
            currentPath.startsWith("/forgot-password") ||
            currentPath.startsWith("/register");

          if (!isAuthPage) {
            localStorage.removeItem("auth-storage");
            inMemoryToken = null;
            window.location.href = "/login";
          }
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Pre-configured API clients for each service (gọi qua APISIX Gateway)
export const apiAdmin = createServiceApi(SERVICE_IDS.API_ADMIN);
export const apiDashboard = createServiceApi(SERVICE_IDS.API_DASHBOARD);
export const apiUpload = createServiceApi(SERVICE_IDS.API_UPLOAD);
export const apiOAuth = createServiceApi(SERVICE_IDS.API_OAUTH);
export const apiAppFood = createServiceApi(SERVICE_IDS.API_APP_FOOD);

// Default API client - sử dụng apiAdmin cho web-admin
export const api = apiAdmin;

export default api;
