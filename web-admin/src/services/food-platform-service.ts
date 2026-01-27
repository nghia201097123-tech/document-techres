import api from "./api";

// Platform types - match backend enum
export enum FoodPlatformType {
  GRAB = "grab",
  BEFOOD = "befood",
  SHOPEE_FOOD = "shopee_food",
}

// Auth types
export enum FoodPlatformAuthType {
  USERNAME_PASSWORD = "username_password",
  PHONE_OTP = "phone_otp",
}

// Connection status
export enum FoodPlatformStatus {
  PENDING = "pending",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
}

// Platform display info
export const PlatformInfo: Record<
  FoodPlatformType,
  { name: string; color: string; bgColor: string }
> = {
  [FoodPlatformType.GRAB]: {
    name: "GrabFood",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  [FoodPlatformType.BEFOOD]: {
    name: "BeFood",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  [FoodPlatformType.SHOPEE_FOOD]: {
    name: "Shopee Food",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
};

// Status display info
export const StatusInfo: Record<
  FoodPlatformStatus,
  { label: string; color: string; bgColor: string }
> = {
  [FoodPlatformStatus.PENDING]: {
    label: "Chờ kết nối",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
  [FoodPlatformStatus.CONNECTING]: {
    label: "Đang kết nối",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  [FoodPlatformStatus.CONNECTED]: {
    label: "Đã kết nối",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  [FoodPlatformStatus.DISCONNECTED]: {
    label: "Mất kết nối",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  [FoodPlatformStatus.ERROR]: {
    label: "Lỗi",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
};

// Food platform account interface
export interface FoodPlatformAccount {
  id: string;
  tenantId: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
    brand?: {
      id: string;
      name: string;
      company?: {
        id: string;
        name: string;
        code: string;
      };
    };
  };
  name: string;
  platform: FoodPlatformType;
  authType: FoodPlatformAuthType;
  status: FoodPlatformStatus;
  username?: string;
  phoneNumber?: string;
  externalMerchantId?: string;
  externalStoreName?: string;
  pollIntervalSeconds: number;
  lastPollAt?: string;
  errorCount: number;
  lastError?: string;
  shopNumber: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Create DTO
export interface CreateFoodPlatformDto {
  branchId: string;
  name: string;
  platform: FoodPlatformType;
  authType?: FoodPlatformAuthType;
  pollIntervalSeconds?: number;
  sortOrder?: number;
  isActive?: boolean;
}

// Update DTO
export interface UpdateFoodPlatformDto {
  name?: string;
  pollIntervalSeconds?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export const foodPlatformService = {
  /**
   * Get all food platform accounts
   */
  async getAll(tenantId?: string): Promise<FoodPlatformAccount[]> {
    const params = tenantId ? { tenantId } : {};
    const response = await api.get<FoodPlatformAccount[]>("/api/food-platforms", {
      params,
    });
    return response.data;
  },

  /**
   * Get food platform accounts by branch
   */
  async getByBranch(branchId: string): Promise<FoodPlatformAccount[]> {
    const response = await api.get<FoodPlatformAccount[]>(
      `/food-platforms/branch/${branchId}`
    );
    return response.data;
  },

  /**
   * Get food platform accounts by company
   */
  async getByCompany(companyCode: string): Promise<FoodPlatformAccount[]> {
    const response = await api.get<FoodPlatformAccount[]>(
      `/food-platforms/company/${companyCode}`
    );
    return response.data;
  },

  /**
   * Get food platform account by ID
   */
  async getById(id: string): Promise<FoodPlatformAccount> {
    const response = await api.get<FoodPlatformAccount>(`/food-platforms/${id}`);
    return response.data;
  },

  /**
   * Create food platform account
   */
  async create(data: CreateFoodPlatformDto): Promise<FoodPlatformAccount> {
    const response = await api.post<FoodPlatformAccount>("/api/food-platforms", data);
    return response.data;
  },

  /**
   * Create all platforms for a branch
   */
  async createAllForBranch(branchId: string): Promise<FoodPlatformAccount[]> {
    const response = await api.post<FoodPlatformAccount[]>(
      `/food-platforms/branch/${branchId}/all-platforms`
    );
    return response.data;
  },

  /**
   * Update food platform account
   */
  async update(
    id: string,
    data: UpdateFoodPlatformDto
  ): Promise<FoodPlatformAccount> {
    const response = await api.patch<FoodPlatformAccount>(
      `/food-platforms/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Toggle active status
   */
  async toggleActive(id: string): Promise<FoodPlatformAccount> {
    const response = await api.patch<FoodPlatformAccount>(
      `/food-platforms/${id}/toggle`
    );
    return response.data;
  },

  /**
   * Delete food platform account
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/food-platforms/${id}`);
  },
};
