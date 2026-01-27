import api from "./api";

export type AdminRole = "super_admin" | "support";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: AdminRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
  permissionGroup?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface CreateAdminUserDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: AdminRole;
  permissionGroupId?: string;
}

export interface UpdateAdminUserDto {
  fullName?: string;
  phone?: string;
  role?: AdminRole;
  permissionGroupId?: string;
  password?: string;
  isActive?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const adminService = {
  async getAll(params?: FilterParams): Promise<PaginatedResponse<AdminUser>> {
    const response = await api.get<PaginatedResponse<AdminUser>>("/api/admin-users", { params });
    return response.data;
  },

  async getById(id: string): Promise<AdminUser> {
    const response = await api.get<AdminUser>(`/admin-users/${id}`);
    return response.data;
  },

  async create(data: CreateAdminUserDto): Promise<AdminUser> {
    const response = await api.post<AdminUser>("/api/admin-users", data);
    return response.data;
  },

  async update(id: string, data: UpdateAdminUserDto): Promise<AdminUser> {
    const response = await api.patch<AdminUser>(`/admin-users/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/admin-users/${id}`);
  },

  async toggleStatus(id: string): Promise<AdminUser> {
    const response = await api.patch<AdminUser>(`/admin-users/${id}/toggle-status`);
    return response.data;
  },

  async getProfile(): Promise<AdminUser> {
    const response = await api.get<AdminUser>("/api/admin-users/me");
    return response.data;
  },
};
