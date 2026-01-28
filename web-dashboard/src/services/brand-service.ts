import api from "./api";

export interface Brand {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export const brandService = {
  getAll: async (): Promise<Brand[]> => {
    const response = await api.get<Brand[]>("/brands");
    return response.data;
  },
};
