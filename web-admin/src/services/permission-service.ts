import api from "./api";

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description?: string;
}

export interface PermissionGroup {
  id: string;
  name: string;
  code: string;
  description?: string;
  permissions: Permission[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePermissionGroupDto {
  name: string;
  code: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdatePermissionGroupDto {
  name?: string;
  code?: string;
  description?: string;
  permissionIds?: string[];
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

export const permissionService = {
  // Permission endpoints
  async getAllPermissions(params?: FilterParams): Promise<PaginatedResponse<Permission>> {
    const response = await api.get<PaginatedResponse<Permission>>("/permissions", { params });
    return response.data;
  },

  async getPermissionsByModule(module: string): Promise<Permission[]> {
    const response = await api.get<Permission[]>(`/permissions/module/${module}`);
    return response.data;
  },

  async getPermissionById(id: string): Promise<Permission> {
    const response = await api.get<Permission>(`/permissions/${id}`);
    return response.data;
  },

  // Permission Group endpoints
  async getAllGroups(params?: FilterParams): Promise<PaginatedResponse<PermissionGroup>> {
    const response = await api.get<PaginatedResponse<PermissionGroup>>("/permission-groups", { params });
    return response.data;
  },

  async getGroupById(id: string): Promise<PermissionGroup> {
    const response = await api.get<PermissionGroup>(`/permission-groups/${id}`);
    return response.data;
  },

  async createGroup(data: CreatePermissionGroupDto): Promise<PermissionGroup> {
    const response = await api.post<PermissionGroup>("/permission-groups", data);
    return response.data;
  },

  async updateGroup(id: string, data: UpdatePermissionGroupDto): Promise<PermissionGroup> {
    const response = await api.patch<PermissionGroup>(`/permission-groups/${id}`, data);
    return response.data;
  },

  async deleteGroup(id: string): Promise<void> {
    await api.delete(`/permission-groups/${id}`);
  },

  async toggleGroupStatus(id: string): Promise<PermissionGroup> {
    const response = await api.patch<PermissionGroup>(`/permission-groups/${id}/toggle-status`);
    return response.data;
  },
};
