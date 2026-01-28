import api from "./api";
import type { Brand, BusinessModel } from "@/types";

export type { Brand };

interface BrandListParams {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  isActive?: boolean;
}

interface BrandListResponse {
  data: Brand[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CreateBrandData {
  companyId: string;
  name: string;
  code: string;
  businessModel: BusinessModel;
  logoUrl?: string;
  provinceCode?: string;
  wardCode?: string;
  address?: string;
  description?: string;
}

interface UpdateBrandData extends Partial<CreateBrandData> {
  isActive?: boolean;
}

// Helper to clean data - remove empty strings for optional fields
function cleanBrandData<T extends object>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== undefined && value !== ""
    )
  ) as Partial<T>;
}

export const brandService = {
  async getList(params?: BrandListParams): Promise<BrandListResponse> {
    // Filter out empty/undefined params
    const cleanParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, value]) => value !== undefined && value !== ""
          )
        )
      : undefined;
    const response = await api.get<BrandListResponse>("/api/brands", {
      params: cleanParams,
    });
    return response.data;
  },

  async getById(id: string): Promise<Brand> {
    const response = await api.get<Brand>(`/api/brands/${id}`);
    return response.data;
  },

  async create(data: CreateBrandData): Promise<Brand> {
    const cleanedData = cleanBrandData(data);
    const response = await api.post<Brand>("/api/brands", cleanedData);
    return response.data;
  },

  async update(id: string, data: UpdateBrandData): Promise<Brand> {
    const cleanedData = cleanBrandData(data);
    const response = await api.patch<Brand>(`/api/brands/${id}`, cleanedData);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/brands/${id}`);
  },

  async toggleStatus(id: string): Promise<Brand> {
    const response = await api.patch<Brand>(`/api/brands/${id}/toggle-status`);
    return response.data;
  },

  async getByCompany(companyId: string): Promise<Brand[]> {
    const response = await api.get<BrandListResponse>("/api/brands", {
      params: { companyId, limit: 100 },
    });
    return response.data.data;
  },
};
