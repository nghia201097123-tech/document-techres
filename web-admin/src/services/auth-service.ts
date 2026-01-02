import axios from "axios";
import api from "./api";
import type { AdminUser } from "@/types";

// Separate axios instance for login (without auth interceptors)
const authApi = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

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
