import api from "./api";
import type { AdminUser } from "@/types";

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
    const response = await api.post<LoginResponse>("/auth/login", data);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },

  async getCurrentUser(): Promise<AdminUser> {
    const response = await api.get<AdminUser>("/auth/me");
    return response.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post("/auth/forgot-password", { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post("/auth/reset-password", { token, password });
  },
};
