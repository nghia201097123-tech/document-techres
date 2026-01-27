import api from "./api";

export enum VoucherType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export interface Voucher {
  id: string;
  code: string;
  name: string;
  description?: string;
  voucherType: VoucherType;
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount: number;
  usageLimit?: number;
  usageCount: number;
  startDate?: string;
  endDate?: string;
  sortOrder: number;
  isActive: boolean;
  brandId?: string;
  createdAt: string;
}

export interface CreateVoucherDto {
  code: string;
  name: string;
  description?: string;
  voucherType: VoucherType;
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  startDate?: string;
  endDate?: string;
  sortOrder?: number;
}

export interface UpdateVoucherDto {
  name?: string;
  description?: string;
  voucherType?: VoucherType;
  discountValue?: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  startDate?: string;
  endDate?: string;
  sortOrder?: number;
}

export const voucherService = {
  getAll: async (brandId?: string): Promise<Voucher[]> => {
    const params: Record<string, any> = {};
    if (brandId) params.brandId = brandId;
    const response = await api.get<Voucher[]>("/api/vouchers", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Voucher> => {
    const response = await api.get<Voucher>(`/api/vouchers/${id}`);
    return response.data;
  },

  getByCode: async (code: string): Promise<Voucher> => {
    const response = await api.get<Voucher>(`/api/vouchers/code/${code}`);
    return response.data;
  },

  create: async (data: CreateVoucherDto): Promise<Voucher> => {
    const response = await api.post<Voucher>("/api/vouchers", data);
    return response.data;
  },

  update: async (id: string, data: UpdateVoucherDto): Promise<Voucher> => {
    const response = await api.put<Voucher>(`/api/vouchers/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<Voucher> => {
    const response = await api.patch<Voucher>(`/api/vouchers/${id}/toggle-active`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/vouchers/${id}`);
  },
};
