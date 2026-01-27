import axios, { AxiosInstance } from "axios";

// APISIX Gateway Configuration
// Gateway sẽ điều hướng request dựa trên header x-svc-id (port của microservice)
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://172.16.10.118:7080";

// Service Port IDs (dùng làm x-svc-id header khi gọi qua gateway)
export const SERVICE_PORTS = {
  API_ADMIN: process.env.NEXT_PUBLIC_API_ADMIN_PORT || "1502",
  API_DASHBOARD: process.env.NEXT_PUBLIC_API_DASHBOARD_PORT || "1503",
  API_MASTER_DATA: process.env.NEXT_PUBLIC_API_MASTER_DATA_PORT || "1504",
  API_UPLOAD: process.env.NEXT_PUBLIC_API_UPLOAD_PORT || "1505",
  API_OAUTH: process.env.NEXT_PUBLIC_API_OAUTH_PORT || "1506",
  SOCKET: process.env.NEXT_PUBLIC_SOCKET_PORT || "1507",
};

console.log("[Dashboard API] Gateway URL:", GATEWAY_URL);
console.log("[Dashboard API] Service Ports:", SERVICE_PORTS);

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
export const apiAdmin = createServiceApi(SERVICE_PORTS.API_ADMIN);
export const apiDashboard = createServiceApi(SERVICE_PORTS.API_DASHBOARD);
export const apiMasterData = createServiceApi(SERVICE_PORTS.API_MASTER_DATA);
export const apiUpload = createServiceApi(SERVICE_PORTS.API_UPLOAD);
export const apiOAuth = createServiceApi(SERVICE_PORTS.API_OAUTH);

// Default API client - sử dụng apiDashboard cho web-dashboard
export const api = apiDashboard;

export default api;
