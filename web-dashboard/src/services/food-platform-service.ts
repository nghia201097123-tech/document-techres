import axios from "axios";

// API App Food URL - connects directly to api-app-food service
const API_APP_FOOD_URL =
  process.env.NEXT_PUBLIC_API_APP_FOOD_URL || "http://localhost:3010/api";

const foodApi = axios.create({
  baseURL: API_APP_FOOD_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token and tenant ID
foodApi.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const authStorage = localStorage.getItem("auth-storage");
      if (authStorage) {
        try {
          const { state } = JSON.parse(authStorage);
          if (state?.token) {
            config.headers.Authorization = `Bearer ${state.token}`;
          }
          if (state?.tenantId) {
            config.headers["X-Tenant-ID"] = state.tenantId;
          }
        } catch (e) {
          console.error("Error parsing auth storage:", e);
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Platform types - khớp với backend enum
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
export const FoodPlatformInfo: Record<
  FoodPlatformType,
  {
    name: string;
    color: string;
    bgColor: string;
    icon: string;
    authType: FoodPlatformAuthType;
  }
> = {
  [FoodPlatformType.GRAB]: {
    name: "GrabFood",
    color: "text-green-600",
    bgColor: "bg-green-100",
    icon: "🟢",
    authType: FoodPlatformAuthType.USERNAME_PASSWORD,
  },
  [FoodPlatformType.BEFOOD]: {
    name: "BeFood",
    color: "text-red-600",
    bgColor: "bg-red-100",
    icon: "🔴",
    authType: FoodPlatformAuthType.USERNAME_PASSWORD,
  },
  [FoodPlatformType.SHOPEE_FOOD]: {
    name: "ShopeeFood",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    icon: "🟠",
    authType: FoodPlatformAuthType.PHONE_OTP,
  },
};

// Status display info
export const FoodPlatformStatusInfo: Record<
  FoodPlatformStatus,
  { label: string; color: string; bgColor: string }
> = {
  [FoodPlatformStatus.PENDING]: {
    label: "Chua ket noi",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
  [FoodPlatformStatus.CONNECTING]: {
    label: "Dang ket noi",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  [FoodPlatformStatus.CONNECTED]: {
    label: "Da ket noi",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  [FoodPlatformStatus.DISCONNECTED]: {
    label: "Mat ket noi",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  [FoodPlatformStatus.ERROR]: {
    label: "Loi",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
};

// Food Platform Account interface
export interface FoodPlatformAccount {
  id: string;
  tenantId: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
    code: string;
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
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// DTOs
export interface CreateFoodPlatformDto {
  branchId: string;
  name: string;
  platform: FoodPlatformType;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateFoodPlatformDto {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
  pollIntervalSeconds?: number;
}

export interface LoginUsernamePasswordDto {
  username: string;
  password: string;
}

export interface RequestOtpDto {
  phoneNumber: string;
}

export interface VerifyOtpDto {
  otp: string;
}

export interface SelectStoreDto {
  storeId: string;
  storeName: string;
}

export interface ShopeeStore {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

// Service
export const foodPlatformService = {
  /**
   * Lay tat ca cong ket noi trong tenant
   */
  async getAll(brandId?: string): Promise<FoodPlatformAccount[]> {
    const params = brandId ? { brandId } : {};
    const response = await foodApi.get("/accounts", { params });
    return response.data;
  },

  /**
   * Lay danh sach cong theo chi nhanh
   */
  async getByBranch(branchId: string): Promise<FoodPlatformAccount[]> {
    const response = await foodApi.get(`/accounts/branch/${branchId}`);
    return response.data;
  },

  /**
   * Lay chi tiet cong
   */
  async getOne(id: string): Promise<FoodPlatformAccount> {
    const response = await foodApi.get(`/accounts/${id}`);
    return response.data;
  },

  /**
   * Tao cong ket noi moi
   */
  async create(dto: CreateFoodPlatformDto): Promise<FoodPlatformAccount> {
    const response = await foodApi.post("/accounts", dto);
    return response.data;
  },

  /**
   * Cap nhat thong tin cong
   */
  async update(id: string, dto: UpdateFoodPlatformDto): Promise<FoodPlatformAccount> {
    const response = await foodApi.put(`/accounts/${id}`, dto);
    return response.data;
  },

  /**
   * Xoa cong ket noi
   */
  async delete(id: string): Promise<void> {
    await foodApi.delete(`/accounts/${id}`);
  },

  /**
   * Bat/tat cong
   */
  async toggle(id: string): Promise<FoodPlatformAccount> {
    const response = await foodApi.patch(`/accounts/${id}/toggle`);
    return response.data;
  },

  // ====== Authentication ======

  /**
   * Dang nhap bang username/password (Grab, BeFood)
   */
  async login(id: string, dto: LoginUsernamePasswordDto): Promise<{ success: boolean; message: string }> {
    const response = await foodApi.post(`/accounts/${id}/login`, dto);
    return response.data;
  },

  /**
   * Yeu cau gui OTP (ShopeeFood)
   */
  async requestOtp(id: string, dto: RequestOtpDto): Promise<{ success: boolean; message: string; expiresAt: string }> {
    const response = await foodApi.post(`/accounts/${id}/request-otp`, dto);
    return response.data;
  },

  /**
   * Xac thuc OTP (ShopeeFood)
   */
  async verifyOtp(id: string, dto: VerifyOtpDto): Promise<{ success: boolean; message: string; stores: ShopeeStore[] }> {
    const response = await foodApi.post(`/accounts/${id}/verify-otp`, dto);
    return response.data;
  },

  /**
   * Chon cua hang sau khi xac thuc OTP (ShopeeFood)
   */
  async selectStore(id: string, dto: SelectStoreDto): Promise<{ success: boolean; message: string; account: FoodPlatformAccount }> {
    const response = await foodApi.post(`/accounts/${id}/select-store`, dto);
    return response.data;
  },

  /**
   * Ngat ket noi
   */
  async disconnect(id: string): Promise<{ success: boolean; message: string }> {
    const response = await foodApi.post(`/accounts/${id}/disconnect`);
    return response.data;
  },

  // ====== Sync (cho CCB) ======

  /**
   * Lay danh sach cong cho CCB sync
   */
  async getForCCBSync(branchId: string): Promise<FoodPlatformAccount[]> {
    const response = await foodApi.get(`/accounts/sync/branch/${branchId}`);
    return response.data;
  },
};
