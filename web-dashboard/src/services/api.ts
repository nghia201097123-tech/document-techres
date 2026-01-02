import axios from "axios";

// API Dashboard URL - port 3003
const API_BASE_URL = "http://localhost:3003/api";

console.log("[Dashboard API] Base URL:", API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
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
