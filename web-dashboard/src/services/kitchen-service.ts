import api from "./api";

export interface Kitchen {
  id: string;
  name: string;
  printerName?: string;
  printerIp?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface CreateKitchenDto {
  name: string;
  printerName?: string;
  printerIp?: string;
  description?: string;
}

export interface UpdateKitchenDto {
  name?: string;
  printerName?: string;
  printerIp?: string;
  description?: string;
}

export const kitchenService = {
  getAll: async (branchId?: string): Promise<Kitchen[]> => {
    const params = branchId ? { branchId } : {};
    const response = await api.get<Kitchen[]>("/kitchen", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Kitchen> => {
    const response = await api.get<Kitchen>(`/kitchen/${id}`);
    return response.data;
  },

  create: async (data: CreateKitchenDto): Promise<Kitchen> => {
    const response = await api.post<Kitchen>("/kitchen", data);
    return response.data;
  },

  update: async (id: string, data: UpdateKitchenDto): Promise<Kitchen> => {
    const response = await api.put<Kitchen>(`/kitchen/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<Kitchen> => {
    const response = await api.patch<Kitchen>(`/kitchen/${id}/toggle-active`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/kitchen/${id}`);
  },
};
