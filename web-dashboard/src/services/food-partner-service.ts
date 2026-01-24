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

// Partner types - match backend FoodPlatformType
export enum FoodPartnerType {
  SHOPEE = "shopee_food",
  GRAB = "grab",
  BEFOOD = "befood",
}

// Partner display info
export const FoodPartnerInfo: Record<FoodPartnerType, { name: string; color: string; bgColor: string }> = {
  [FoodPartnerType.SHOPEE]: { name: "Shopee Food", color: "text-orange-600", bgColor: "bg-orange-100" },
  [FoodPartnerType.GRAB]: { name: "GrabFood", color: "text-green-600", bgColor: "bg-green-100" },
  [FoodPartnerType.BEFOOD]: { name: "BeFood", color: "text-yellow-600", bgColor: "bg-yellow-100" },
};

// Connection status - match backend FoodPlatformStatus
export enum ConnectionStatus {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  PENDING = "pending",
  CONNECTING = "connecting",
  ERROR = "error",
}

// Auth types - match backend FoodPlatformAuthType
export enum AuthType {
  USERNAME_PASSWORD = "username_password",
  PHONE_OTP = "phone_otp",
}

// API Response wrapper from backend
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Food platform account from backend
export interface FoodPlatformAccount {
  id: string;
  tenantId: string;
  branchId: string;
  displayName: string;
  platform: FoodPartnerType;
  authType: AuthType;
  status: ConnectionStatus;
  username?: string;
  phoneNumber?: string;
  externalMerchantId?: string;
  externalMerchantName?: string;
  pollIntervalSeconds: number;
  lastPollAt?: string;
  errorCount: number;
  lastError?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Partner connection port (created by admin)
export interface PartnerConnectionPort {
  id: string;
  partnerType: FoodPartnerType;
  shopNumber: number;
  branchId: string;
  branchName?: string;
  maxConnections: number;
  isActive: boolean;
  createdAt: string;
}

// Account connection (linked by user)
export interface PartnerAccountConnection {
  id: string;
  portId: string;
  partnerType: FoodPartnerType;
  shopNumber: number;
  username: string;
  status: ConnectionStatus;
  lastSyncAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// DTO for linking account
export interface LinkPartnerAccountDto {
  portId: string;
  username: string;
  password: string;
  branchId?: string; // Branch to assign account to when linking
}

// DTO for updating connection
export interface UpdatePartnerConnectionDto {
  username?: string;
  password?: string;
}

// Combined view for UI
export interface PartnerConnectionView {
  port: PartnerConnectionPort;
  connection?: PartnerAccountConnection;
}

// External store from food platform (GrabFood, Shopee, etc.)
export interface ExternalStore {
  externalStoreId: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

// Store mapping saved in DB (links external store to TechRes branch)
export interface StoreMapping {
  id: string;
  accountId: string;
  tenantId: string;
  externalStoreId: string;
  externalStoreName: string;
  externalStoreAddress?: string;
  externalStorePhone?: string;
  externalStoreEmail?: string;
  branchId?: number;
  branchName?: string;
  isActive: boolean;
  isStoreActive: boolean;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
  account?: FoodPlatformAccount;
}

// DTO for creating store mapping
export interface CreateStoreMappingDto {
  externalStoreId: string;
  externalStoreName: string;
  externalStoreAddress?: string;
  externalStorePhone?: string;
  externalStoreEmail?: string;
  branchId: number;
  branchName?: string;
}

/**
 * Transform backend FoodPlatformAccount to frontend PartnerConnectionView
 */
function transformToConnectionView(account: FoodPlatformAccount, index: number): PartnerConnectionView {
  const port: PartnerConnectionPort = {
    id: account.id,
    partnerType: account.platform,
    shopNumber: index + 1,
    branchId: account.branchId,
    maxConnections: 1,
    isActive: account.isActive,
    createdAt: account.createdAt,
  };

  // If account has username or is not pending, create connection
  const hasConnection = account.status !== ConnectionStatus.PENDING || account.username;

  const connection: PartnerAccountConnection | undefined = hasConnection
    ? {
        id: account.id,
        portId: account.id,
        partnerType: account.platform,
        shopNumber: index + 1,
        username: account.username || account.phoneNumber || account.displayName,
        status: account.status,
        lastSyncAt: account.lastPollAt,
        errorMessage: account.lastError,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      }
    : undefined;

  return { port, connection };
}

export const foodPartnerService = {
  /**
   * Get all available connection ports for a branch
   */
  async getAvailablePorts(branchId: string): Promise<PartnerConnectionPort[]> {
    const response = await foodApi.get<ApiResponse<FoodPlatformAccount[]>>(`/accounts/branch/${branchId}`);
    const accounts = response.data.data || [];
    return accounts.map((account, index) => ({
      id: account.id,
      partnerType: account.platform,
      shopNumber: index + 1,
      branchId: account.branchId,
      maxConnections: 1,
      isActive: account.isActive,
      createdAt: account.createdAt,
    }));
  },

  /**
   * Get all account connections for a branch
   */
  async getConnections(branchId: string): Promise<PartnerAccountConnection[]> {
    const response = await foodApi.get<ApiResponse<FoodPlatformAccount[]>>(`/accounts/branch/${branchId}`);
    const accounts = response.data.data || [];
    return accounts
      .filter((account) => account.status !== ConnectionStatus.PENDING || account.username)
      .map((account, index) => ({
        id: account.id,
        portId: account.id,
        partnerType: account.platform,
        shopNumber: index + 1,
        username: account.username || account.phoneNumber || account.displayName,
        status: account.status,
        lastSyncAt: account.lastPollAt,
        errorMessage: account.lastError,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      }));
  },

  /**
   * Get combined view of ports and connections
   */
  async getConnectionsView(branchId: string): Promise<PartnerConnectionView[]> {
    const response = await foodApi.get<ApiResponse<FoodPlatformAccount[]>>(`/accounts/branch/${branchId}`);
    const accounts = response.data.data || [];
    return accounts.map(transformToConnectionView);
  },

  /**
   * Link an account to a connection port (login)
   */
  async linkAccount(dto: LinkPartnerAccountDto): Promise<PartnerAccountConnection> {
    const response = await foodApi.post<ApiResponse<any>>(`/accounts/${dto.portId}/login`, {
      username: dto.username,
      password: dto.password,
      branchId: dto.branchId,
    });
    return response.data.data;
  },

  /**
   * Update connection credentials
   */
  async updateConnection(connectionId: string, dto: UpdatePartnerConnectionDto): Promise<PartnerAccountConnection> {
    const response = await foodApi.post<ApiResponse<any>>(`/accounts/${connectionId}/login`, {
      username: dto.username,
      password: dto.password,
    });
    return response.data.data;
  },

  /**
   * Disconnect/unlink an account
   */
  async unlinkAccount(connectionId: string): Promise<void> {
    await foodApi.post(`/accounts/${connectionId}/disconnect`);
  },

  /**
   * Test connection status
   */
  async testConnection(connectionId: string): Promise<{ status: ConnectionStatus; message?: string }> {
    // For now, just get the account status
    const response = await foodApi.get<ApiResponse<FoodPlatformAccount>>(`/accounts/${connectionId}`);
    const account = response.data.data;
    return {
      status: account.status,
      message: account.status === ConnectionStatus.CONNECTED
        ? "Tài khoản đang hoạt động bình thường"
        : account.lastError || "Kết nối có vấn đề",
    };
  },

  /**
   * Sync menu to partner platform
   */
  async syncMenu(connectionId: string): Promise<{ success: boolean; message: string }> {
    // Placeholder - will be implemented when backend supports it
    return { success: true, message: "Sync completed" };
  },

  /**
   * Get all accounts by tenant
   */
  async getAccountsByTenant(tenantId: string): Promise<FoodPlatformAccount[]> {
    const response = await foodApi.get<ApiResponse<FoodPlatformAccount[]>>(`/accounts`, {
      params: { tenantId }
    });
    return response.data.data || [];
  },

  /**
   * Update account branch assignment
   */
  async updateAccountBranch(accountId: string, branchId: string): Promise<FoodPlatformAccount> {
    const response = await foodApi.patch<ApiResponse<FoodPlatformAccount>>(`/accounts/${accountId}/branch`, {
      branchId,
    });
    return response.data.data;
  },

  /**
   * Get stores from a connected food platform account
   * Fetches stores from GrabFood unified-profile API
   */
  async getStores(accountId: string): Promise<ExternalStore[]> {
    const response = await foodApi.get<ApiResponse<ExternalStore[]>>(`/accounts/${accountId}/stores`);
    return response.data.data || response.data || [];
  },

  /**
   * Get store mappings for an account (from DB)
   */
  async getStoreMappings(accountId: string): Promise<StoreMapping[]> {
    const response = await foodApi.get<ApiResponse<StoreMapping[]>>(`/food-platforms/accounts/${accountId}/store-mappings`);
    return response.data.data || [];
  },

  /**
   * Create store mappings for an account
   */
  async createStoreMappings(accountId: string, mappings: CreateStoreMappingDto[]): Promise<StoreMapping[]> {
    const response = await foodApi.post<ApiResponse<StoreMapping[]>>(`/food-platforms/accounts/${accountId}/store-mappings`, {
      mappings,
    });
    return response.data.data || [];
  },

  /**
   * Update a store mapping (e.g., change branch assignment)
   */
  async updateStoreMapping(mappingId: string, data: { branchId?: number; branchName?: string; isActive?: boolean }): Promise<StoreMapping> {
    const response = await foodApi.put<ApiResponse<StoreMapping>>(`/food-platforms/store-mappings/${mappingId}`, data);
    return response.data.data;
  },

  /**
   * Delete a store mapping
   */
  async deleteStoreMapping(mappingId: string): Promise<void> {
    await foodApi.delete(`/food-platforms/store-mappings/${mappingId}`);
  },

  /**
   * Sync store info from platform (update store details)
   */
  async syncStoreMapping(mappingId: string): Promise<StoreMapping> {
    const response = await foodApi.post<ApiResponse<StoreMapping>>(`/food-platforms/store-mappings/${mappingId}/sync`);
    return response.data.data;
  },
};
