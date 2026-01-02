import api from "./api";

export enum ProductType {
  FOOD = "food",
  DRINK = "drink",
  OTHER = "other",
  TOPPING = "topping",
  COMBO = "combo",
}

export interface Product {
  id: string;
  code: string;
  name: string;
  type: ProductType;
  categoryId?: string;
  categoryName?: string;
  price: number;
  discountPrice?: number;
  vatRate: number;
  unit?: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface CreateProductDto {
  name: string;
  type: ProductType;
  categoryId?: string;
  price: number;
  discountPrice?: number;
  vatRate?: number;
  unit?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
}

export interface UpdateProductDto {
  name?: string;
  type?: ProductType;
  categoryId?: string;
  price?: number;
  discountPrice?: number;
  vatRate?: number;
  unit?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
}

export const productService = {
  getAll: async (brandId?: string, type?: ProductType): Promise<Product[]> => {
    const params: Record<string, any> = {};
    if (brandId) params.brandId = brandId;
    if (type) params.type = type;
    const response = await api.get<Product[]>("/products", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Product> => {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  },

  create: async (data: CreateProductDto): Promise<Product> => {
    const response = await api.post<Product>("/products", data);
    return response.data;
  },

  update: async (id: string, data: UpdateProductDto): Promise<Product> => {
    const response = await api.put<Product>(`/products/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<Product> => {
    const response = await api.patch<Product>(`/products/${id}/toggle-active`);
    return response.data;
  },
};
