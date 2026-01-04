import api from "./api";

export interface Area {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  brandId?: string;
  branchId?: string;
  createdAt: string;
}

export interface QuickTableDto {
  name: string;
  capacity?: number;
}

export interface CreateAreaDto {
  name: string;
  description?: string;
  sortOrder?: number;
  tables?: QuickTableDto[];
}

export interface UpdateAreaDto {
  name?: string;
  description?: string;
  sortOrder?: number;
}

export const areaService = {
  getAll: async (): Promise<Area[]> => {
    const response = await api.get<Area[]>("/areas");
    return response.data;
  },

  getById: async (id: string): Promise<Area> => {
    const response = await api.get<Area>(`/areas/${id}`);
    return response.data;
  },

  create: async (data: CreateAreaDto): Promise<Area> => {
    const response = await api.post<Area>("/areas", data);
    return response.data;
  },

  update: async (id: string, data: UpdateAreaDto): Promise<Area> => {
    const response = await api.put<Area>(`/areas/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<Area> => {
    const response = await api.patch<Area>(`/areas/${id}/toggle-active`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/areas/${id}`);
  },
};
