import api from "./api";
import type { LoginResponse } from "@/types";

export interface LoginCredentials {
  tenantId: string;
  username: string;
  password: string;
}

export const authService = {
  /**
   * Đăng nhập với tenant_id + username + password
   * tenant_id = company.code (tiên định danh)
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/auth/login", credentials);
    return response.data;
  },

  /**
   * Đổi mật khẩu
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });
  },

  /**
   * Lấy thông tin user hiện tại
   */
  getMe: async (): Promise<LoginResponse> => {
    const response = await api.get<LoginResponse>("/auth/me");
    return response.data;
  },

  /**
   * Quên mật khẩu - gửi email reset
   */
  forgotPassword: async (tenantId: string, email: string): Promise<void> => {
    await api.post("/auth/forgot-password", { tenantId, email });
  },
};
