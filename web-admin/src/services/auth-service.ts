import axios from "axios";
import api from "./api";
import type { AdminUser } from "@/types";

// API Gateway URL for auth endpoints
// Gateway routes /api/auth/* -> api-oauth /api/v1/auth/*
const API_GATEWAY_URL = "http://localhost:4000/api";

// Separate axios instance for auth (via API Gateway)
const authApi = axios.create({
  baseURL: API_GATEWAY_URL,
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

// OAuth API response type (from api-oauth)
interface OAuthLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId?: string;
    branchId?: string;
    isTwoFactorEnabled: boolean;
  };
  requiresTwoFactor?: boolean;
}

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await authApi.post<OAuthLoginResponse>("/auth/login", data);
    const oauthData = response.data;

    // Transform OAuth response to expected format
    const user: AdminUser = {
      id: oauthData.user.id,
      email: oauthData.user.email,
      name: oauthData.user.name,
      role: oauthData.user.role as AdminUser["role"],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      user,
      token: oauthData.accessToken,
    };
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
