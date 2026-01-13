import api from "./api";
import type { Branch } from "@/types";

export type { Branch };

interface BranchListParams {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  brandId?: string;
  isActive?: boolean;
}

interface BranchListResponse {
  data: Branch[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CreateBranchData {
  brandId: string;
  name: string;
  code: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  manager?: string;
  openTime?: string;
  closeTime?: string;
  packageId?: string;
}

interface UpdateBranchData extends Partial<CreateBranchData> {
  isActive?: boolean;
}

// Helper to clean data - remove empty strings for optional fields
function cleanBranchData<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== undefined && value !== ""
    )
  ) as T;
}

export const branchService = {
  async getList(params?: BranchListParams): Promise<BranchListResponse> {
    // Filter out empty/undefined params
    const cleanParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, value]) => value !== undefined && value !== ""
          )
        )
      : undefined;
    const response = await api.get<BranchListResponse>("/branches", {
      params: cleanParams,
    });
    return response.data;
  },

  async getById(id: string): Promise<Branch> {
    const response = await api.get<Branch>(`/branches/${id}`);
    return response.data;
  },

  async create(data: CreateBranchData): Promise<Branch> {
    const cleanedData = cleanBranchData(data);
    const response = await api.post<Branch>("/branches", cleanedData);
    return response.data;
  },

  async update(id: string, data: UpdateBranchData): Promise<Branch> {
    const cleanedData = cleanBranchData(data);
    const response = await api.patch<Branch>(`/branches/${id}`, cleanedData);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/branches/${id}`);
  },

  async toggleStatus(id: string): Promise<Branch> {
    const response = await api.patch<Branch>(`/branches/${id}/toggle-status`);
    return response.data;
  },

  async getByBrand(brandId: string): Promise<Branch[]> {
    const response = await api.get<BranchListResponse>("/branches", {
      params: { brandId, limit: 100 },
    });
    return response.data.data;
  },
};
