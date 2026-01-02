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
    const response = await api.get<Department>(`/departments/${id}`);
    return response.data;
  },

  create: async (data: CreateDepartmentDto): Promise<Department> => {
    const response = await api.post<Department>("/departments", data);
    return response.data;
  },

  update: async (id: string, data: UpdateDepartmentDto): Promise<Department> => {
    const response = await api.put<Department>(`/departments/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<Department> => {
    const response = await api.patch<Department>(`/departments/${id}/toggle-active`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },
};
