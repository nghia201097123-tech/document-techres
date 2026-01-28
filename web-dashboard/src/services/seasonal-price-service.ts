import api from "./api";

export enum AdjustmentType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export interface SeasonalPriceProduct {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    price: number;
  };
}

export interface SeasonalPrice {
  id: string;
  name: string;
  description?: string;
  adjustmentType: AdjustmentType;
  adjustmentValue: number;
  startDate: string;
  endDate: string;
  sortOrder: number;
  isActive: boolean;
  branchId?: string;
  createdAt: string;
  seasonalPriceProducts?: SeasonalPriceProduct[];
}

export interface CreateSeasonalPriceDto {
  branchId: string;
  name: string;
  description?: string;
  adjustmentType: AdjustmentType;
  adjustmentValue: number;
  startDate: string;
  endDate: string;
  sortOrder?: number;
  productIds: string[];
}

export interface UpdateSeasonalPriceDto {
  name?: string;
  description?: string;
  adjustmentType?: AdjustmentType;
  adjustmentValue?: number;
  startDate?: string;
  endDate?: string;
  sortOrder?: number;
  productIds?: string[];
}

export const seasonalPriceService = {
  getAll: async (branchId?: string): Promise<SeasonalPrice[]> => {
    const params: Record<string, any> = {};
    if (branchId) params.branchId = branchId;
    const response = await api.get<SeasonalPrice[]>("/seasonal-prices", { params });
    return response.data;
  },

  getById: async (id: string): Promise<SeasonalPrice> => {
    const response = await api.get<SeasonalPrice>(`/api/seasonal-prices/${id}`);
    return response.data;
  },

  create: async (data: CreateSeasonalPriceDto): Promise<SeasonalPrice> => {
    const response = await api.post<SeasonalPrice>("/seasonal-prices", data);
    return response.data;
  },

  update: async (id: string, data: UpdateSeasonalPriceDto): Promise<SeasonalPrice> => {
    const response = await api.put<SeasonalPrice>(`/api/seasonal-prices/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<SeasonalPrice> => {
    const response = await api.patch<SeasonalPrice>(`/api/seasonal-prices/${id}/toggle-active`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/seasonal-prices/${id}`);
  },
};
