import api from "./api";

export interface GiftItem {
  id: string;
  name: string;
  description?: string;
  productId?: string;
  product?: {
    id: string;
    name: string;
  };
  maxQuantity: number;
  minOrderAmount: number;
  sortOrder: number;
  isActive: boolean;
  branchId?: string;
  createdAt: string;
}

export interface CreateGiftItemDto {
  productId: string;
  name?: string;
  description?: string;
  maxQuantity?: number;
  minOrderAmount?: number;
  sortOrder?: number;
}

export interface UpdateGiftItemDto {
  productId?: string;
  name?: string;
  description?: string;
  maxQuantity?: number;
  minOrderAmount?: number;
  sortOrder?: number;
}

export const giftItemService = {
  getAll: async (branchId?: string): Promise<GiftItem[]> => {
    const params: Record<string, any> = {};
    if (branchId) params.branchId = branchId;
    const response = await api.get<GiftItem[]>("/gift-items", { params });
    return response.data;
  },

  getById: async (id: string): Promise<GiftItem> => {
    const response = await api.get<GiftItem>(`/gift-items/${id}`);
    return response.data;
  },

  create: async (data: CreateGiftItemDto): Promise<GiftItem> => {
    const response = await api.post<GiftItem>("/gift-items", data);
    return response.data;
  },

  update: async (id: string, data: UpdateGiftItemDto): Promise<GiftItem> => {
    const response = await api.put<GiftItem>(`/gift-items/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<GiftItem> => {
    const response = await api.patch<GiftItem>(`/gift-items/${id}/toggle-active`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/gift-items/${id}`);
  },
};
