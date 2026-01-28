import api from "./api";

export interface Unit {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  brandId?: string;
  createdAt: string;
}

export interface CreateUnitDto {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateUnitDto {
  name?: string;
  description?: string;
  sortOrder?: number;
}

export const unitService = {
  getAll: async (brandId?: string): Promise<Unit[]> => {
    const params: Record<string, any> = {};
    if (brandId) params.brandId = brandId;
    const response = await api.get<Unit[]>("/units", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Unit> => {
    const response = await api.get<Unit>(`/api/units/${id}`);
    return response.data;
  },

  create: async (data: CreateUnitDto): Promise<Unit> => {
    const response = await api.post<Unit>("/units", data);
    return response.data;
  },

  update: async (id: string, data: UpdateUnitDto): Promise<Unit> => {
    const response = await api.put<Unit>(`/api/units/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<Unit> => {
    const response = await api.patch<Unit>(`/api/units/${id}/toggle-active`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/units/${id}`);
  },
};
