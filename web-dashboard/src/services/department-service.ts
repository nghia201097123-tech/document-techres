import api from "./api";

export interface Department {
  id: string;
  name: string;
  parentId?: string;
  parentName?: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  children?: Department[];
  createdAt: string;
}

export interface CreateDepartmentDto {
  name: string;
  parentId?: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateDepartmentDto {
  name?: string;
  parentId?: string;
  description?: string;
  sortOrder?: number;
}

export interface DepartmentStaffCount {
  departmentId: string;
  departmentName: string;
  staffCount: number;
  childDepartments: DepartmentStaffCount[];
  totalStaffCount: number; // Including children
}

export interface CascadeToggleResult {
  department: Department;
  affectedDepartments: Department[];
  affectedStaffCount: number;
}

export const departmentService = {
  getAll: async (companyId?: string): Promise<Department[]> => {
    const params = companyId ? { companyId } : {};
    const response = await api.get<Department[]>("/departments", { params });
    return response.data;
  },

  getTree: async (companyId?: string): Promise<Department[]> => {
    const params = companyId ? { companyId } : {};
    const response = await api.get<Department[]>("/departments/tree", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Department> => {
    const response = await api.get<Department>(`/api/departments/${id}`);
    return response.data;
  },

  create: async (data: CreateDepartmentDto): Promise<Department> => {
    const response = await api.post<Department>("/departments", data);
    return response.data;
  },

  update: async (id: string, data: UpdateDepartmentDto): Promise<Department> => {
    const response = await api.put<Department>(`/api/departments/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<Department> => {
    const response = await api.patch<Department>(`/api/departments/${id}/toggle-active`);
    return response.data;
  },

  // Cascade toggle - deactivates/activates department, all children, and all staff
  toggleActiveCascade: async (id: string): Promise<CascadeToggleResult> => {
    const response = await api.patch<CascadeToggleResult>(`/api/departments/${id}/toggle-active-cascade`);
    return response.data;
  },

  // Get staff count for department and all children
  getStaffCount: async (id: string): Promise<DepartmentStaffCount> => {
    const response = await api.get<DepartmentStaffCount>(`/api/departments/${id}/staff-count`);
    return response.data;
  },

  // Transfer all staff from department (and children) to target department, then delete
  transferStaffAndDelete: async (id: string, targetDepartmentId: string): Promise<{ transferredCount: number }> => {
    const response = await api.post<{ transferredCount: number }>(`/api/departments/${id}/transfer-and-delete`, {
      targetDepartmentId,
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/departments/${id}`);
  },
};
