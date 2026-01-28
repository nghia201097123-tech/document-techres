import api from "./api";

export interface Branch {
  id: string;
  name: string;
  code: string;
  brandId: string;
  isActive: boolean;
  address?: string;
}

export const branchService = {
  getAll: async (brandId?: string): Promise<Branch[]> => {
    const params = brandId ? { brandId } : {};
    const response = await api.get<Branch[]>("/api/branches", { params });
    return response.data;
  },
};
