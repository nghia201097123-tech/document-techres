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
  logo?: string;
  description?: string;
}

interface UpdateBrandData extends Partial<CreateBrandData> {
  isActive?: boolean;
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
    const response = await api.get<BrandListResponse>("/brands", {
      params: cleanParams,
    });
    return response.data;
  },

  async getById(id: string): Promise<Brand> {
    const response = await api.get<Brand>(`/brands/${id}`);
    return response.data;
  },

  async create(data: CreateBrandData): Promise<Brand> {
    const response = await api.post<Brand>("/brands", data);
    return response.data;
  },

  async update(id: string, data: UpdateBrandData): Promise<Brand> {
    const response = await api.patch<Brand>(`/brands/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/brands/${id}`);
  },

  async toggleStatus(id: string): Promise<Brand> {
    const response = await api.patch<Brand>(`/brands/${id}/toggle-status`);
    return response.data;
  },

  async getByCompany(companyId: string): Promise<Brand[]> {
    const response = await api.get<BrandListResponse>("/brands", {
      params: { companyId, limit: 100 },
    });
    return response.data.data;
  },
};
