import api from "./api";

export interface Surcharge {
  id: string;
  name: string;
  description?: string;
  amount: number;
  vatRate: number;
  sortOrder: number;
  isActive: boolean;
  brandId?: string;
  createdAt: string;
}

export interface CreateSurchargeDto {
  name: string;
  description?: string;
  amount: number;
  vatRate?: number;
  sortOrder?: number;
}

export interface UpdateSurchargeDto {
  name?: string;
  description?: string;
  amount?: number;
  vatRate?: number;
  sortOrder?: number;
}

export const surchargeService = {
  getAll: async (brandId?: string): Promise<Surcharge[]> => {
    const params: Record<string, any> = {};
    if (brandId) params.brandId = brandId;
    const response = await api.get<Surcharge[]>("/api/surcharges", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Surcharge> => {
    const response = await api.get<Surcharge>(`/api/surcharges/${id}`);
    return response.data;
  },

  create: async (data: CreateSurchargeDto): Promise<Surcharge> => {
    const response = await api.post<Surcharge>("/api/surcharges", data);
    return response.data;
  },

  update: async (id: string, data: UpdateSurchargeDto): Promise<Surcharge> => {
    const response = await api.put<Surcharge>(`/api/surcharges/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<Surcharge> => {
    const response = await api.patch<Surcharge>(`/api/surcharges/${id}/toggle-active`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/surcharges/${id}`);
  },
};
