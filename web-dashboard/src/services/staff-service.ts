import api from "./api";

export type Gender = "male" | "female";

export interface Staff {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  gender?: Gender;
  idNumber?: string; // CCCD
  address?: string;
  provinceCode?: string;
  provinceName?: string;
  wardCode?: string;
  wardName?: string;
  departmentId?: string;
  departmentName?: string;
  brandId?: string;
  brandName?: string;
  branchId?: string;
  branchName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateStaffDto {
  name: string;
  avatarUrl?: string;
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
  avatarUrl?: string;
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
  getAll: async (branchId?: string, brandId?: string): Promise<Staff[]> => {
    const params: Record<string, string> = {};
    if (branchId) params.branchId = branchId;
    if (brandId) params.brandId = brandId;
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

  /**
   * Bulk import with batch processing to avoid timeout errors
   * Splits large datasets into smaller chunks and processes them sequentially
   */
  bulkImportBatched: async (
    items: BulkStaffItem[],
    usernamePrefix?: string,
    options?: {
      batchSize?: number;
      onProgress?: (progress: { current: number; total: number; batchNumber: number; totalBatches: number }) => void;
    }
  ): Promise<BulkImportResult> => {
    const batchSize = options?.batchSize || 100; // Default 100 items per batch
    const totalBatches = Math.ceil(items.length / batchSize);

    const aggregatedResult: BulkImportResult = {
      created: 0,
      updated: 0,
      errors: [],
    };

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, items.length);
      const batch = items.slice(start, end);

      // Report progress before processing
      options?.onProgress?.({
        current: start,
        total: items.length,
        batchNumber: i + 1,
        totalBatches,
      });

      try {
        const response = await api.post<BulkImportResult>("/staff/bulk-import", {
          items: batch,
          usernamePrefix,
        });

        aggregatedResult.created += response.data.created;
        aggregatedResult.updated += response.data.updated;

        // Adjust error row numbers to reflect actual position in full dataset
        const adjustedErrors = response.data.errors.map((err) => ({
          row: start + err.row,
          message: err.message,
        }));
        aggregatedResult.errors.push(...adjustedErrors);
      } catch (error: any) {
        // If batch fails, add error for entire batch range
        aggregatedResult.errors.push({
          row: start + 1,
          message: `Batch ${i + 1} failed: ${error.response?.data?.message || error.message || "Unknown error"}`,
        });
      }
    }

    // Final progress update
    options?.onProgress?.({
      current: items.length,
      total: items.length,
      batchNumber: totalBatches,
      totalBatches,
    });

    return aggregatedResult;
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
  isActive?: boolean;
}

export interface BulkImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

// Bulk Operations Types
export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: { staffId: string; message: string }[];
  passwords?: { staffId: string; username: string; password: string }[];
}

export const bulkStaffService = {
  updateDepartment: async (staffIds: string[], departmentId: string): Promise<BulkOperationResult> => {
    const response = await api.post<BulkOperationResult>("/staff/bulk/update-department", {
      staffIds,
      departmentId,
    });
    return response.data;
  },

  updateBranch: async (staffIds: string[], branchId: string): Promise<BulkOperationResult> => {
    const response = await api.post<BulkOperationResult>("/staff/bulk/update-branch", {
      staffIds,
      branchId,
    });
    return response.data;
  },

  toggleActive: async (staffIds: string[], isActive: boolean): Promise<BulkOperationResult> => {
    const response = await api.post<BulkOperationResult>("/staff/bulk/toggle-active", {
      staffIds,
      isActive,
    });
    return response.data;
  },

  resetPassword: async (staffIds: string[], newPassword?: string): Promise<BulkOperationResult> => {
    const response = await api.post<BulkOperationResult>("/staff/bulk/reset-password", {
      staffIds,
      newPassword,
    });
    return response.data;
  },
};
