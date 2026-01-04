import api from "./api";

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description?: string;
}

export interface StaffPermissionsResponse {
  ownPermissions: Permission[];
  departmentPermissions: Permission[];
  allPermissions: Permission[];
}

export interface AssignDepartmentPermissionsDto {
  departmentId: string;
  permissionIds: string[];
}

export interface AssignStaffPermissionsDto {
  staffId: string;
  permissionIds: string[];
}

export const permissionService = {
  // Get all permissions
  getAll: async (): Promise<Permission[]> => {
    const response = await api.get<Permission[]>("/permissions");
    return response.data;
  },

  // Get permissions grouped by module
  getGrouped: async (): Promise<Record<string, Permission[]>> => {
    const response = await api.get<Record<string, Permission[]>>("/permissions/grouped");
    return response.data;
  },

  // Get department permissions
  getDepartmentPermissions: async (departmentId: string): Promise<Permission[]> => {
    const response = await api.get<Permission[]>(`/permissions/department/${departmentId}`);
    return response.data;
  },

  // Assign permissions to department
  assignDepartmentPermissions: async (data: AssignDepartmentPermissionsDto): Promise<Permission[]> => {
    const response = await api.post<Permission[]>("/permissions/department", data);
    return response.data;
  },

  // Get staff permissions (including inherited from department)
  getStaffPermissions: async (staffId: string): Promise<StaffPermissionsResponse> => {
    const response = await api.get<StaffPermissionsResponse>(`/permissions/staff/${staffId}`);
    return response.data;
  },

  // Get staff's own permissions only
  getStaffOwnPermissions: async (staffId: string): Promise<Permission[]> => {
    const response = await api.get<Permission[]>(`/permissions/staff/${staffId}/own`);
    return response.data;
  },

  // Assign permissions to staff
  assignStaffPermissions: async (data: AssignStaffPermissionsDto): Promise<StaffPermissionsResponse> => {
    const response = await api.post<StaffPermissionsResponse>("/permissions/staff", data);
    return response.data;
  },

  // Get staff permission codes
  getStaffPermissionCodes: async (staffId: string): Promise<string[]> => {
    const response = await api.get<string[]>(`/permissions/staff/${staffId}/codes`);
    return response.data;
  },
};
