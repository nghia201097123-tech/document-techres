import api from "./api";

export interface Package {
  id: string;
  name: string;
  code: string;
  description?: string;
  price: number;
  duration: number; // days
  features: string[];
  isActive: boolean;
  createdAt: string;
}

export const packageService = {
  async getAll(): Promise<Package[]> {
    const response = await api.get<Package[]>("/packages");
    return response.data;
  },

  async getById(id: string): Promise<Package> {
    const response = await api.get<Package>(`/packages/${id}`);
    return response.data;
  },
};
