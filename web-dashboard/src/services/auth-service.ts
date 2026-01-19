import axios from "axios";
import type { LoginResponse, Staff, Company } from "@/types";

// API Gateway URL for tenant auth endpoints
// Gateway routes /api/tenant/auth/* -> api-oauth /api/v1/auth/*
const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/tenant";

// Create axios instance for auth via API Gateway
const authApi = axios.create({
  baseURL: API_GATEWAY_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to authApi for authenticated requests
authApi.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const authStorage = localStorage.getItem("dashboard-auth-storage");
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

export interface LoginCredentials {
  tenantId: string;
  username: string;
  password: string;
}

// OAuth API response type
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
  /**
   * Đăng nhập với tenant_id + username + password
   * tenant_id = company.code (tiên định danh)
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await authApi.post<OAuthLoginResponse>("/auth/login", {
      tenantId: credentials.tenantId,
      username: credentials.username,
      password: credentials.password,
    });

    const oauthData = response.data;

    // Transform OAuth response to expected format
    const staff: Staff = {
      id: oauthData.user.id,
      tenantId: oauthData.user.tenantId || credentials.tenantId,
      companyId: oauthData.user.tenantId || credentials.tenantId,
      branchId: oauthData.user.branchId || "",
      name: oauthData.user.name,
      email: oauthData.user.email,
      username: credentials.username,
      role: oauthData.user.role as Staff["role"],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create company info from tenantId
    const company: Company = {
      id: credentials.tenantId,
      code: credentials.tenantId,
      name: credentials.tenantId,
      isActive: true,
    };

    return {
      staff,
      company,
      token: oauthData.accessToken,
    };
  },

  /**
   * Đổi mật khẩu
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await authApi.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });
  },

  /**
   * Lấy thông tin user hiện tại
   */
  getMe: async (): Promise<LoginResponse> => {
    const response = await authApi.get<{ user: OAuthLoginResponse["user"] }>("/auth/profile");
    const user = response.data.user || response.data;

    // Get stored auth info for tenantId
    let tenantId = "";
    if (typeof window !== "undefined") {
      const authStorage = localStorage.getItem("dashboard-auth-storage");
      if (authStorage) {
        try {
          const { state } = JSON.parse(authStorage);
          tenantId = state?.tenantId || "";
        } catch (e) {
          console.error("Error parsing auth storage:", e);
        }
      }
    }

    const staff: Staff = {
      id: user.id,
      tenantId: user.tenantId || tenantId,
      companyId: user.tenantId || tenantId,
      branchId: user.branchId || "",
      name: user.name,
      email: user.email,
      username: user.email,
      role: user.role as Staff["role"],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const company: Company = {
      id: tenantId,
      code: tenantId,
      name: tenantId,
      isActive: true,
    };

    return {
      staff,
      company,
      token: "",
    };
  },

  /**
   * Quên mật khẩu - gửi email reset
   */
  forgotPassword: async (tenantId: string, email: string): Promise<void> => {
    await authApi.post("/auth/forgot-password", { tenantId, email });
  },

  /**
   * Đăng xuất
   */
  logout: async (): Promise<void> => {
    try {
      await authApi.post("/auth/logout");
    } catch (error) {
      console.error("Logout API error:", error);
    }
  },
};
