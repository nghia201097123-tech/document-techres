import api from "./api";
import { ProductType } from "./product-service";

export interface Category {
  id: string;
  name: string;
  description?: string;
  productType: ProductType;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
  productType: ProductType;
  sortOrder?: number;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  productType?: ProductType;
  sortOrder?: number;
}

export interface CategoryCount {
  productType: ProductType;
  count: number;
}

export const categoryService = {
  getAll: async (brandId?: string, productType?: ProductType): Promise<Category[]> => {
    const params: Record<string, any> = {};
    if (brandId) params.brandId = brandId;
    if (productType) params.productType = productType;
    const response = await api.get<Category[]>("/categories", { params });
    return response.data;
  },

  getCountByType: async (brandId?: string): Promise<CategoryCount[]> => {
    const params = brandId ? { brandId } : {};
    const response = await api.get<CategoryCount[]>("/categories/count-by-type", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Category> => {
    const response = await api.get<Category>(`/categories/${id}`);
    return response.data;
  },

  create: async (data: CreateCategoryDto): Promise<Category> => {
    const response = await api.post<Category>("/categories", data);
    return response.data;
  },

  update: async (id: string, data: UpdateCategoryDto): Promise<Category> => {
    const response = await api.put<Category>(`/categories/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<Category> => {
    const response = await api.patch<Category>(`/categories/${id}/toggle-active`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};
