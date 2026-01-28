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
  brandId?: string;
  branchId?: string;
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
    const response = await api.get<Staff>(`/api/staff/${id}`);
    return response.data;
  },

  create: async (data: CreateStaffDto): Promise<Staff & { temporaryPassword: string }> => {
    const response = await api.post<Staff & { temporaryPassword: string }>("/staff", data);
    return response.data;
  },

  update: async (id: string, data: UpdateStaffDto): Promise<Staff> => {
    const response = await api.put<Staff>(`/api/staff/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<Staff> => {
    const response = await api.patch<Staff>(`/api/staff/${id}/toggle-active`);
    return response.data;
  },

  resetPassword: async (id: string): Promise<{ temporaryPassword: string }> => {
    const response = await api.post<{ temporaryPassword: string }>(`/api/staff/${id}/reset-password`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/staff/${id}`);
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

export interface BatchProgressInfo {
  current: number;
  total: number;
  batchNumber: number;
  totalBatches: number;
}

// Helper function to process bulk operations in batches
const processBulkInBatches = async <T>(
  items: string[],
  batchSize: number,
  processor: (batch: string[]) => Promise<BulkOperationResult>,
  onProgress?: (progress: BatchProgressInfo) => void
): Promise<BulkOperationResult> => {
  const totalBatches = Math.ceil(items.length / batchSize);
  const aggregatedResult: BulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
    passwords: [],
  };

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, items.length);
    const batch = items.slice(start, end);

    onProgress?.({
      current: start,
      total: items.length,
      batchNumber: i + 1,
      totalBatches,
    });

    try {
      const result = await processor(batch);
      aggregatedResult.success += result.success;
      aggregatedResult.failed += result.failed;
      aggregatedResult.errors.push(...result.errors);
      if (result.passwords) {
        aggregatedResult.passwords!.push(...result.passwords);
      }
    } catch (error: any) {
      aggregatedResult.failed += batch.length;
      batch.forEach(id => {
        aggregatedResult.errors.push({
          staffId: id,
          message: error.response?.data?.message || error.message || "Unknown error",
        });
      });
    }
  }

  onProgress?.({
    current: items.length,
    total: items.length,
    batchNumber: totalBatches,
    totalBatches,
  });

  return aggregatedResult;
};

export const bulkStaffService = {
  updateDepartment: async (staffIds: string[], departmentId: string): Promise<BulkOperationResult> => {
    const response = await api.post<BulkOperationResult>("/staff/bulk/update-department", {
      staffIds,
      departmentId,
    });
    return response.data;
  },

  updateDepartmentBatched: async (
    staffIds: string[],
    departmentId: string,
    options?: { batchSize?: number; onProgress?: (progress: BatchProgressInfo) => void }
  ): Promise<BulkOperationResult> => {
    const batchSize = options?.batchSize || 50;
    return processBulkInBatches(
      staffIds,
      batchSize,
      async (batch) => {
        const response = await api.post<BulkOperationResult>("/staff/bulk/update-department", {
          staffIds: batch,
          departmentId,
        });
        return response.data;
      },
      options?.onProgress
    );
  },

  updateBranch: async (staffIds: string[], branchId: string): Promise<BulkOperationResult> => {
    const response = await api.post<BulkOperationResult>("/staff/bulk/update-branch", {
      staffIds,
      branchId,
    });
    return response.data;
  },

  updateBranchBatched: async (
    staffIds: string[],
    branchId: string,
    options?: { batchSize?: number; onProgress?: (progress: BatchProgressInfo) => void }
  ): Promise<BulkOperationResult> => {
    const batchSize = options?.batchSize || 50;
    return processBulkInBatches(
      staffIds,
      batchSize,
      async (batch) => {
        const response = await api.post<BulkOperationResult>("/staff/bulk/update-branch", {
          staffIds: batch,
          branchId,
        });
        return response.data;
      },
      options?.onProgress
    );
  },

  toggleActive: async (staffIds: string[], isActive: boolean): Promise<BulkOperationResult> => {
    const response = await api.post<BulkOperationResult>("/staff/bulk/toggle-active", {
      staffIds,
      isActive,
    });
    return response.data;
  },

  toggleActiveBatched: async (
    staffIds: string[],
    isActive: boolean,
    options?: { batchSize?: number; onProgress?: (progress: BatchProgressInfo) => void }
  ): Promise<BulkOperationResult> => {
    const batchSize = options?.batchSize || 50;
    return processBulkInBatches(
      staffIds,
      batchSize,
      async (batch) => {
        const response = await api.post<BulkOperationResult>("/staff/bulk/toggle-active", {
          staffIds: batch,
          isActive,
        });
        return response.data;
      },
      options?.onProgress
    );
  },

  resetPassword: async (staffIds: string[], newPassword?: string): Promise<BulkOperationResult> => {
    const response = await api.post<BulkOperationResult>("/staff/bulk/reset-password", {
      staffIds,
      newPassword,
    });
    return response.data;
  },

  resetPasswordBatched: async (
    staffIds: string[],
    newPassword?: string,
    options?: { batchSize?: number; onProgress?: (progress: BatchProgressInfo) => void }
  ): Promise<BulkOperationResult> => {
    const batchSize = options?.batchSize || 50;
    return processBulkInBatches(
      staffIds,
      batchSize,
      async (batch) => {
        const response = await api.post<BulkOperationResult>("/staff/bulk/reset-password", {
          staffIds: batch,
          newPassword,
        });
        return response.data;
      },
      options?.onProgress
    );
  },

  delete: async (staffIds: string[]): Promise<BulkOperationResult> => {
    const response = await api.post<BulkOperationResult>("/staff/bulk/delete", {
      staffIds,
    });
    return response.data;
  },

  deleteBatched: async (
    staffIds: string[],
    options?: { batchSize?: number; onProgress?: (progress: BatchProgressInfo) => void }
  ): Promise<BulkOperationResult> => {
    const batchSize = options?.batchSize || 50;
    return processBulkInBatches(
      staffIds,
      batchSize,
      async (batch) => {
        const response = await api.post<BulkOperationResult>("/staff/bulk/delete", {
          staffIds: batch,
        });
        return response.data;
      },
      options?.onProgress
    );
  },
};
