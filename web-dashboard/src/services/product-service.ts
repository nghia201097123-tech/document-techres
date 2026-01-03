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

export interface ProductTopping {
  id: string;
  toppingId: string;
  topping: Product;
  isRequired: boolean;
  maxQuantity: number;
  sortOrder: number;
}

export interface ToppingItem {
  toppingId: string;
  isRequired?: boolean;
  maxQuantity?: number;
  sortOrder?: number;
}

export interface SetToppingsDto {
  toppings: ToppingItem[];
}

export interface AddToppingDto {
  toppingId: string;
  isRequired?: boolean;
  maxQuantity?: number;
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

  // Topping Management
  getAvailableToppings: async (brandId?: string): Promise<Product[]> => {
    const params: Record<string, any> = {};
    if (brandId) params.brandId = brandId;
    const response = await api.get<Product[]>("/products/toppings/available", { params });
    return response.data;
  },

  getToppings: async (productId: string): Promise<ProductTopping[]> => {
    const response = await api.get<ProductTopping[]>(`/products/${productId}/toppings`);
    return response.data;
  },

  setToppings: async (productId: string, data: SetToppingsDto): Promise<ProductTopping[]> => {
    const response = await api.put<ProductTopping[]>(`/products/${productId}/toppings`, data);
    return response.data;
  },

  addTopping: async (productId: string, data: AddToppingDto): Promise<ProductTopping[]> => {
    const response = await api.post<ProductTopping[]>(`/products/${productId}/toppings`, data);
    return response.data;
  },

  removeTopping: async (productId: string, toppingId: string): Promise<ProductTopping[]> => {
    const response = await api.delete<ProductTopping[]>(`/products/${productId}/toppings/${toppingId}`);
    return response.data;
  },
};
