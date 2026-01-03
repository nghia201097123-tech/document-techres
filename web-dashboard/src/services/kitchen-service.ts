import api from "./api";
import { Product } from "./product-service";

export type PrintMode = "individual" | "list";

export interface Kitchen {
  id: string;
  name: string;
  printerName?: string;
  printerIp?: string;
  printerPort?: number;
  paperSize?: string;
  printMode?: PrintMode;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  productCount?: number;
  createdAt: string;
}

export interface CreateKitchenDto {
  name: string;
  printerName?: string;
  printerIp?: string;
  printerPort?: number;
  paperSize?: string;
  printMode?: PrintMode;
  description?: string;
}

export interface UpdateKitchenDto {
  name?: string;
  printerName?: string;
  printerIp?: string;
  printerPort?: number;
  paperSize?: string;
  printMode?: PrintMode;
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

  // Product assignment APIs
  getKitchenProducts: async (kitchenId: string): Promise<Product[]> => {
    const response = await api.get<Product[]>(`/kitchen/${kitchenId}/products`);
    return response.data;
  },

  setKitchenProducts: async (kitchenId: string, productIds: string[]): Promise<Product[]> => {
    const response = await api.put<Product[]>(`/kitchen/${kitchenId}/products`, { productIds });
    return response.data;
  },

  addProductToKitchen: async (kitchenId: string, productId: string): Promise<Product[]> => {
    const response = await api.post<Product[]>(`/kitchen/${kitchenId}/products/${productId}`);
    return response.data;
  },

  removeProductFromKitchen: async (kitchenId: string, productId: string): Promise<Product[]> => {
    const response = await api.delete<Product[]>(`/kitchen/${kitchenId}/products/${productId}`);
    return response.data;
  },

  getProductKitchens: async (productId: string): Promise<Kitchen[]> => {
    const response = await api.get<Kitchen[]>(`/kitchen/product/${productId}/kitchens`);
    return response.data;
  },

  setProductKitchens: async (productId: string, kitchenIds: string[]): Promise<Kitchen[]> => {
    const response = await api.put<Kitchen[]>(`/kitchen/product/${productId}/kitchens`, { kitchenIds });
    return response.data;
  },
};
