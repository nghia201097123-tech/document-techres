import axios, { AxiosInstance } from "axios";
// Import generated client-side config (generated from .env by scripts/generate-client-env.js)
import { GATEWAY_URL, SERVICE_IDS } from "@/config/client-env";

// Re-export for other modules
export { GATEWAY_URL, SERVICE_IDS };

if (GATEWAY_URL) {
  console.log("[Dashboard API] Gateway URL:", GATEWAY_URL);
  console.log("[Dashboard API] Service IDs:", SERVICE_IDS);
} else {
  console.error("[Dashboard API] WARNING: Environment variables not configured!");
  console.error("[Dashboard API] Make sure CONFIG_* variables are set in .env and restart dev server");
}

// Factory function to create API client for specific service via APISIX Gateway
export const createServiceApi = (serviceId: string): AxiosInstance => {
  const instance = axios.create({
    baseURL: GATEWAY_URL,
    headers: {
      "Content-Type": "application/json",
      "x-svc-id": serviceId,
    },
  });

  // Add auth and tenant interceptor
  instance.interceptors.request.use(
    (config) => {
      // Validate that env is configured before making requests
      if (!GATEWAY_URL) {
        return Promise.reject(new Error("API not configured: Check CONFIG_API_GATEWAY_URL in .env and restart dev server"));
      }

      if (typeof window !== "undefined") {
        const authStorage = localStorage.getItem("dashboard-auth-storage");
        if (authStorage) {
          try {
            const { state } = JSON.parse(authStorage);
            if (state?.token) {
              config.headers.Authorization = `Bearer ${state.token}`;
            }
            // Add tenant_id to header for multi-tenant isolation
            if (state?.tenantId) {
              config.headers["X-Tenant-ID"] = state.tenantId;
            }
          } catch (e) {
            console.error("Error parsing auth storage:", e);
          }
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
          localStorage.removeItem("dashboard-auth-storage");
          window.location.href = "/login";
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

// Default API client - sử dụng apiDashboard cho web-dashboard
export const api = apiDashboard;

export default api;
