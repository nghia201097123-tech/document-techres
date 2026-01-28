import { api } from "./api";
import type { LoginResponse, Staff, Company } from "@/types";

export interface LoginCredentials {
  tenantId: string;
  username: string;
  password: string;
}

// api-dashboard login response type
interface DashboardLoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId?: string;
    branchId?: string;
  };
}

export const authService = {
  /**
   * Đăng nhập với tenant_id + username + password
   * APISIX routing: /api/tenant/auth/login -> api-dashboard /api/auth/login
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<DashboardLoginResponse>("/api/tenant/auth/login", {
      tenantId: credentials.tenantId,
      username: credentials.username,
      password: credentials.password,
    });

    const data = response.data;

    // Transform response to expected format
    const staff: Staff = {
      id: data.user.id,
      tenantId: data.user.tenantId || credentials.tenantId,
      companyId: data.user.tenantId || credentials.tenantId,
      branchId: data.user.branchId || "",
      name: data.user.name,
      email: data.user.email,
      username: credentials.username,
      role: data.user.role as Staff["role"],
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
      token: data.accessToken,
    };
  },

  /**
   * Đổi mật khẩu
   * APISIX routing: /api/tenant/auth/change-password -> api-dashboard /api/auth/change-password
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post("/api/tenant/auth/change-password", {
      currentPassword,
      newPassword,
    });
  },

  /**
   * Lấy thông tin user hiện tại
   * APISIX routing: /api/tenant/auth/me -> api-dashboard /api/auth/me
   */
  getMe: async (): Promise<LoginResponse> => {
    const response = await api.get<{ user: DashboardLoginResponse["user"] }>("/api/tenant/auth/me");
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
   * APISIX routing: /api/tenant/auth/forgot-password -> api-dashboard /api/auth/forgot-password
   */
  forgotPassword: async (tenantId: string, email: string): Promise<void> => {
    await api.post("/api/tenant/auth/forgot-password", { tenantId, email });
  },

  /**
   * Đăng xuất
   * APISIX routing: /api/tenant/auth/logout -> api-dashboard /api/auth/logout
   */
  logout: async (): Promise<void> => {
    try {
      await api.post("/api/tenant/auth/logout");
    } catch (error) {
      console.error("Logout API error:", error);
    }
  },
};
