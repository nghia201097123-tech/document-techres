import axios from "axios";
import api from "./api";
import type { AdminUser } from "@/types";

// API OAuth base URL
const OAUTH_API_URL = "http://localhost:3005/api/v1";

// Separate axios instance for auth (API OAuth service)
const authApi = axios.create({
  baseURL: OAUTH_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to authApi for authenticated requests (logout, etc.)
authApi.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const authStorage = localStorage.getItem("auth-storage");
      if (authStorage) {
        try {
          const { state } = JSON.parse(authStorage);
          if (state?.token) {
            config.headers.Authorization = `Bearer ${state.token}`;
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

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: AdminUser;
  token: string;
}

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await authApi.post<LoginResponse>("/auth/login", data);
    return response.data;
  },

  async logout(): Promise<void> {
    await authApi.post("/auth/logout");
  },

  async getCurrentUser(): Promise<AdminUser> {
    const response = await api.get<AdminUser>("/auth/me");
    return response.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await authApi.post("/auth/forgot-password", { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await authApi.post("/auth/reset-password", { token, newPassword });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await authApi.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });
  },
};
