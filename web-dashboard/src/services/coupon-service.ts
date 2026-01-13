import api from "./api";

export enum CouponType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
}

export interface Coupon {
  id: string;
  tenantId: string;
  branchId: string;
  code: string;
  name: string;
  description?: string;
  couponType: CouponType;
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  usageCount: number;
  dailyLimit?: number;
  dailyUsageCount: number;
  lastUsageDate?: string;
  requiresApproval: boolean;
  approvalThreshold?: number;
  startDate?: string;
  endDate?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponDto {
  code: string;
  name: string;
  description?: string;
  couponType: CouponType;
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  dailyLimit?: number;
  requiresApproval?: boolean;
  approvalThreshold?: number;
  startDate?: string;
  endDate?: string;
  sortOrder?: number;
}

export interface UpdateCouponDto extends Partial<CreateCouponDto> {}

export interface ValidateCouponResult {
  valid: boolean;
  coupon?: Coupon;
  discountAmount?: number;
  requiresApproval?: boolean;
  message?: string;
}

export const couponService = {
  getAll: async (branchId?: string): Promise<Coupon[]> => {
    const params = branchId ? { branchId } : {};
    const response = await api.get("/coupons", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Coupon> => {
    const response = await api.get(`/coupons/${id}`);
    return response.data;
  },

  getByCode: async (branchId: string, code: string): Promise<Coupon> => {
    const response = await api.get(`/coupons/code/${code}`, {
      params: { branchId },
    });
    return response.data;
  },

  create: async (branchId: string, data: CreateCouponDto): Promise<Coupon> => {
    const response = await api.post("/coupons", data, {
      params: { branchId },
    });
    return response.data;
  },

  update: async (id: string, data: UpdateCouponDto): Promise<Coupon> => {
    const response = await api.put(`/coupons/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<Coupon> => {
    const response = await api.patch(`/coupons/${id}/toggle-active`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/coupons/${id}`);
  },

  validate: async (
    branchId: string,
    code: string,
    orderAmount: number
  ): Promise<ValidateCouponResult> => {
    const response = await api.post(
      "/coupons/validate",
      { code, orderAmount },
      { params: { branchId } }
    );
    return response.data;
  },

  use: async (id: string): Promise<Coupon> => {
    const response = await api.post(`/coupons/${id}/use`);
    return response.data;
  },
};
