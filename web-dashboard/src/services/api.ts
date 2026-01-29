import axios, { AxiosInstance } from "axios";

// APISIX Gateway Configuration
// Gateway sẽ điều hướng request dựa trên header x-svc-id (port của microservice)
// Using CONFIG_API_GATEWAY_URL instead of NEXT_PUBLIC_* to allow runtime ENV changes in Docker
export const GATEWAY_URL = process.env.CONFIG_API_GATEWAY_URL || "https://beta.api.gateway.overate-vntech.com";

// Service IDs (dùng làm x-svc-id header khi gọi qua gateway)
export const SERVICE_IDS = {
  API_ADMIN: process.env.CONFIG_NODEJS_ADMIN_SERVICE_ID || "1502",
  API_DASHBOARD: process.env.CONFIG_NODEJS_MANAGEMENT_SERVICE_ID || "1503",
  API_UPLOAD: process.env.CONFIG_NODEJS_MEDIA_SERVICE_ID || "1505",
  API_OAUTH: process.env.CONFIG_NODEJS_OAUTH_SERVICE_ID || "1506",
  API_APP_FOOD: process.env.CONFIG_NODEJS_APP_FOOD_SERVICE_ID || "1509",
};

console.log("[Dashboard API] Gateway URL:", GATEWAY_URL);
console.log("[Dashboard API] Service IDs:", SERVICE_IDS);

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
