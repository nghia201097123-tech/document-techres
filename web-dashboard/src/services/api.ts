import axios, { AxiosInstance } from "axios";

// APISIX Gateway Configuration
// Gateway sẽ điều hướng request dựa trên header ProjectId (port của microservice)
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://172.16.10.118:7080";

// Service Port IDs (dùng làm ProjectId header khi gọi qua gateway)
export const SERVICE_PORTS = {
  API_ADMIN: process.env.NEXT_PUBLIC_API_ADMIN_PORT || "1502",
  API_DASHBOARD: process.env.NEXT_PUBLIC_API_DASHBOARD_PORT || "1503",
  API_MASTER_DATA: process.env.NEXT_PUBLIC_API_MASTER_DATA_PORT || "1504",
  API_UPLOAD: process.env.NEXT_PUBLIC_API_UPLOAD_PORT || "1505",
  API_OAUTH: process.env.NEXT_PUBLIC_API_OAUTH_PORT || "1506",
  SOCKET: process.env.NEXT_PUBLIC_SOCKET_PORT || "1507",
};

// Legacy API URL (fallback)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || `${GATEWAY_URL}/api/tenant`;

console.log("[Dashboard API] Gateway URL:", GATEWAY_URL);
console.log("[Dashboard API] Base URL:", API_BASE_URL);
console.log("[Dashboard API] Service Ports:", SERVICE_PORTS);

// Factory function to create API client for specific service
export const createServiceApi = (projectId: string): AxiosInstance => {
  const instance = axios.create({
    baseURL: GATEWAY_URL,
    headers: {
      "Content-Type": "application/json",
      "ProjectId": projectId,
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

// Pre-configured API clients for each service
export const apiAdmin = createServiceApi(SERVICE_PORTS.API_ADMIN);
export const apiDashboard = createServiceApi(SERVICE_PORTS.API_DASHBOARD);
export const apiMasterData = createServiceApi(SERVICE_PORTS.API_MASTER_DATA);
export const apiUpload = createServiceApi(SERVICE_PORTS.API_UPLOAD);
export const apiOAuth = createServiceApi(SERVICE_PORTS.API_OAUTH);

// Default API client (uses API_DASHBOARD for dashboard)
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "ProjectId": SERVICE_PORTS.API_DASHBOARD,
  },
});

// Request interceptor to add auth token and tenant_id
api.interceptors.request.use(
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
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("dashboard-auth-storage");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
