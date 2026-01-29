import axios, { AxiosInstance } from "axios";

// Helper function to get required environment variable
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// APISIX Gateway Configuration
// Gateway sẽ điều hướng request dựa trên header x-svc-id (port của microservice)
// CONFIG_* variables are exposed to browser via next.config.ts env property
const GATEWAY_URL = getRequiredEnv("CONFIG_API_GATEWAY_URL");

// Service IDs (dùng làm x-svc-id header khi gọi qua gateway)
export const SERVICE_IDS = {
  API_ADMIN: getRequiredEnv("CONFIG_NODEJS_ADMIN_SERVICE_ID"),
  API_DASHBOARD: getRequiredEnv("CONFIG_NODEJS_MANAGEMENT_SERVICE_ID"),
  API_UPLOAD: getRequiredEnv("CONFIG_NODEJS_MEDIA_SERVICE_ID"),
  API_OAUTH: getRequiredEnv("CONFIG_NODEJS_OAUTH_SERVICE_ID"),
  API_APP_FOOD: getRequiredEnv("CONFIG_NODEJS_APP_FOOD_SERVICE_ID"),
};

console.log("[API] Gateway URL:", GATEWAY_URL);
console.log("[API] Service IDs:", SERVICE_IDS);

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
