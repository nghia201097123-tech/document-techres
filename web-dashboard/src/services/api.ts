import axios, { AxiosInstance } from "axios";

// Helper function to get environment variable with validation on access
function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing environment variable: ${name}`);
    // Return empty string to allow app to load, API calls will fail with clear error
    return "";
  }
  return value;
}

// APISIX Gateway Configuration
// Gateway sẽ điều hướng request dựa trên header x-svc-id (port của microservice)
// NEXT_PUBLIC_* variables are mapped from CONFIG_* in next.config.ts
export const GATEWAY_URL = getEnv("NEXT_PUBLIC_API_GATEWAY_URL");

// Service IDs (dùng làm x-svc-id header khi gọi qua gateway)
export const SERVICE_IDS = {
  API_ADMIN: getEnv("NEXT_PUBLIC_ADMIN_SERVICE_ID"),
  API_DASHBOARD: getEnv("NEXT_PUBLIC_MANAGEMENT_SERVICE_ID"),
  API_UPLOAD: getEnv("NEXT_PUBLIC_MEDIA_SERVICE_ID"),
  API_OAUTH: getEnv("NEXT_PUBLIC_OAUTH_SERVICE_ID"),
  API_APP_FOOD: getEnv("NEXT_PUBLIC_APP_FOOD_SERVICE_ID"),
};

if (GATEWAY_URL) {
  console.log("[Dashboard API] Gateway URL:", GATEWAY_URL);
  console.log("[Dashboard API] Service IDs:", SERVICE_IDS);
} else {
  console.error("[Dashboard API] WARNING: Environment variables not configured!");
  console.error("[Dashboard API] Make sure CONFIG_* variables are set in .env");
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
        return Promise.reject(new Error("API not configured: CONFIG_API_GATEWAY_URL is missing"));
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
