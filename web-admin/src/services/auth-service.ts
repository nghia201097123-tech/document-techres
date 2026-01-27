import { apiOAuth } from "./api";
import type { AdminUser } from "@/types";

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
  // api-oauth endpoint: /api/v1/auth/login
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiOAuth.post<OAuthLoginResponse>("/api/v1/auth/login", data);
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

  // api-oauth endpoint: /api/v1/auth/logout
  async logout(): Promise<void> {
    await apiOAuth.post("/api/v1/auth/logout");
  },

  // api-oauth endpoint: /api/v1/auth/profile
  async getCurrentUser(): Promise<AdminUser> {
    const response = await apiOAuth.get<{ user: OAuthLoginResponse["user"] }>("/api/v1/auth/profile");
    const user = response.data.user || response.data;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AdminUser["role"],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  // api-oauth endpoint: /api/v1/auth/forgot-password
  async forgotPassword(email: string): Promise<void> {
    await apiOAuth.post("/api/v1/auth/forgot-password", { email });
  },

  // api-oauth endpoint: /api/v1/auth/reset-password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiOAuth.post("/api/v1/auth/reset-password", { token, newPassword });
  },

  // api-oauth endpoint: /api/v1/auth/change-password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiOAuth.post("/api/v1/auth/change-password", {
      currentPassword,
      newPassword,
    });
  },
};
