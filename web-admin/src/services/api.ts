import axios from "axios";

// API Gateway URL - use environment variable for production deployment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";

console.log("[API] Base URL:", API_BASE_URL);

// In-memory token storage as fallback when localStorage isn't persisted yet
let inMemoryToken: string | null = null;

export const setInMemoryToken = (token: string | null) => {
  inMemoryToken = token;
};

export const getInMemoryToken = () => inMemoryToken;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      let token: string | null = null;

      // First try localStorage
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

      // Fallback to in-memory token if localStorage doesn't have it yet
      if (!token && inMemoryToken) {
        token = inMemoryToken;
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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
      // Only redirect to login if we're not already on login-related pages
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.startsWith("/login") ||
          currentPath.startsWith("/forgot-password") ||
          currentPath.startsWith("/register");

        if (!isAuthPage) {
          // Clear auth and redirect to login
          localStorage.removeItem("auth-storage");
          inMemoryToken = null;
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
