import api from "./api";

export type Gender = "male" | "female";

export interface Staff {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  gender?: Gender;
  idNumber?: string; // CCCD
  address?: string;
  provinceCode?: string;
  wardCode?: string;
  departmentId?: string;
  departmentName?: string;
  brandId?: string;
  branchId?: string;
  branchName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateStaffDto {
  name: string;
  email?: string;
  phone?: string;
  birthDate: string; // Required - YYYY-MM-DD
  gender: Gender; // Required
  idNumber?: string; // CCCD
  address: string; // Required - Địa chỉ hành chính
  provinceCode?: string;
  wardCode?: string;
  departmentId: string; // Required
  brandId: string; // Required
  branchId: string; // Required
  usernamePrefix?: string; // 2 ký tự prefix, mặc định "tr". VD: tr000001
}

export interface UpdateStaffDto {
  name?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  gender?: Gender;
  idNumber?: string;
  address?: string;
  provinceCode?: string;
  wardCode?: string;
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

  bulkImport: async (
    items: BulkStaffItem[],
    usernamePrefix?: string
  ): Promise<BulkImportResult> => {
    const response = await api.post<BulkImportResult>("/staff/bulk-import", {
      items,
      usernamePrefix,
    });
    return response.data;
  },
};

export interface BulkStaffItem {
  id?: string; // Có ID = update, không có = create
  name: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  gender?: Gender;
  idNumber?: string;
  address?: string;
  provinceCode?: string;
  wardCode?: string;
  departmentId?: string;
  brandId?: string;
  branchId?: string;
}

export interface BulkImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}
