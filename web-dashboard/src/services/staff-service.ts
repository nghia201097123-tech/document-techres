import api from "./api";

export interface Staff {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  departmentId?: string;
  departmentName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateStaffDto {
  name: string;
  email?: string;
  phone?: string;
  departmentId?: string;
}

export interface UpdateStaffDto {
  name?: string;
  email?: string;
  phone?: string;
  departmentId?: string;
}

export const staffService = {
  getAll: async (branchId?: string): Promise<Staff[]> => {
    const params = branchId ? { branchId } : {};
    const response = await api.get<Staff[]>("/staff", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Staff> => {
    const response = await api.get<Staff>(`/staff/${id}`);
    return response.data;
  },

  create: async (data: CreateStaffDto): Promise<Staff & { temporaryPassword: string }> => {
    const response = await api.post<Staff & { temporaryPassword: string }>("/staff", data);
    return response.data;
  },

  update: async (id: string, data: UpdateStaffDto): Promise<Staff> => {
    const response = await api.put<Staff>(`/staff/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<Staff> => {
    const response = await api.patch<Staff>(`/staff/${id}/toggle-active`);
    return response.data;
  },

  resetPassword: async (id: string): Promise<{ temporaryPassword: string }> => {
    const response = await api.post<{ temporaryPassword: string }>(`/staff/${id}/reset-password`);
    return response.data;
  },
};
