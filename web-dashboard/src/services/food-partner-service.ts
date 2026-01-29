import { apiAppFood } from "./api";

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
  externalMerchantId?: string; // Merchant ID (for BeFood)
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
  branchId?: string;  // UUID string
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
  externalMerchantId?: string; // Merchant ID (for BeFood)
  externalStoreName: string;
  externalStoreAddress?: string;
  externalStorePhone?: string;
  externalStoreEmail?: string;
  branchId: string;  // UUID string of TechRes branch
  branchName?: string;
}

// Menu item from GrabFood
export interface ExternalMenuItem {
  itemID: string;
  itemName: string;
  description?: string;
  priceInMin: number;
  priceDisplay: string;
  imageURL?: string;
  webPURL?: string;
  availableStatus: number; // 1=available, 3=unavailable
  sortOrder: number;
  categoryID: string;
  categoryName?: string;
  linkedModifierGroupIDs?: string[];
  nameTranslation?: {
    translation: Record<string, string>;
  };
}

// Menu category from GrabFood
export interface ExternalMenuCategory {
  categoryID: string;
  categoryName: string;
  availableStatus: number;
  sortOrder: number;
  items: ExternalMenuItem[];
  sellingTimeID?: string;
  nameTranslation?: {
    translation: Record<string, string>;
  };
}

// Modifier from GrabFood
export interface ExternalModifier {
  modifierID: string;
  modifierName: string;
  priceInMin: number;
  priceDisplay: string;
  availableStatus: number;
  sortOrder: number;
}

// Modifier group from GrabFood
export interface ExternalModifierGroup {
  modifierGroupID: string;
  modifierGroupName: string;
  selectionRangeMin: number;
  selectionRangeMax: number;
  modifiers: ExternalModifier[];
  availableStatus: number;
}

// Menu response from GrabFood
export interface ExternalMenu {
  categories: ExternalMenuCategory[];
  modifierGroups: ExternalModifierGroup[];
  sellingTimes: any[];
}

// Synced external item (stored in DB after sync)
export interface SyncedExternalItem {
  id: string;
  tenantId: string;
  accountId: string;
  externalItemId: string;
  externalItemName: string;
  description?: string;
  priceInMin: number;
  priceDisplay?: string;
  imageUrl?: string;
  externalCategoryId: string;
  externalCategoryName: string;
  availableStatus: number;
  isActive: boolean;
  isMapped: boolean;
  rawData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

// Synced items grouped by category
export interface SyncedItemsByCategory {
  categoryId: string;
  categoryName: string;
  items: SyncedExternalItem[];
}

// Item mapping types
export enum ItemMappingType {
  DIRECT = 'direct',
  COMBO = 'combo',
  VARIANT = 'variant',
}

// Item mapping (links external item to TechRes item)
export interface ItemMapping {
  id: string;
  tenantId: string;
  accountId: string;
  externalItemId: string;
  externalPlatformItemId: string;
  externalItemName: string;
  techresBrandId: string;
  techresBrandName?: string;
  techresItemId: string;
  techresItemName?: string;
  mappingType: ItemMappingType;
  comboItems?: { itemId: string; quantity: number; itemName?: string }[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  externalItem?: SyncedExternalItem;
}

// DTO for creating item mapping
export interface CreateItemMappingDto {
  externalItemId: string; // UUID of SyncedExternalItem
  techresBrandId: string; // UUID string of TechRes brand
  techresBrandName?: string;
  techresItemId: string; // UUID string of TechRes item/product
  techresItemName?: string;
  mappingType?: ItemMappingType;
  comboItems?: { itemId: string; quantity: number; itemName?: string }[];
}

// Menu sync result
export interface MenuSyncResult {
  success: boolean;
  syncedCount: number;
  updatedCount: number;
  categories: number;
  message: string;
}

// Menu sync status
export interface MenuSyncStatus {
  totalItems: number;
  mappedItems: number;
  unmappedItems: number;
  lastSyncedAt?: string;
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

// DTO for creating account
export interface CreateAccountDto {
  tenantId: string;
  platform: FoodPartnerType;
  authType: AuthType;
  displayName?: string;
}

export const foodPartnerService = {
  /**
   * Create a new food platform account
   */
  async createAccount(dto: CreateAccountDto): Promise<FoodPlatformAccount> {
    const response = await apiAppFood.post<ApiResponse<FoodPlatformAccount>>('/api/accounts', dto);
    return response.data.data;
  },

  /**
   * Get all available connection ports for a branch
   */
  async getAvailablePorts(branchId: string): Promise<PartnerConnectionPort[]> {
    const response = await apiAppFood.get<ApiResponse<FoodPlatformAccount[]>>(`/api/accounts/branch/${branchId}`);
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
    const response = await apiAppFood.get<ApiResponse<FoodPlatformAccount[]>>(`/api/accounts/branch/${branchId}`);
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
    const response = await apiAppFood.get<ApiResponse<FoodPlatformAccount[]>>(`/api/accounts/branch/${branchId}`);
    const accounts = response.data.data || [];
    return accounts.map(transformToConnectionView);
  },

  /**
   * Link an account to a connection port (login)
   */
  async linkAccount(dto: LinkPartnerAccountDto): Promise<PartnerAccountConnection> {
    const response = await apiAppFood.post<ApiResponse<any>>(`/api/accounts/${dto.portId}/login`, {
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
    const response = await apiAppFood.post<ApiResponse<any>>(`/api/accounts/${connectionId}/login`, {
      username: dto.username,
      password: dto.password,
    });
    return response.data.data;
  },

  /**
   * Disconnect/unlink an account
   */
  async unlinkAccount(connectionId: string): Promise<void> {
    await apiAppFood.post(`/api/accounts/${connectionId}/disconnect`);
  },

  /**
   * Reconnect account using stored credentials
   * Used when token expires and needs to re-authenticate
   */
  async reconnectAccount(accountId: string): Promise<FoodPlatformAccount> {
    const response = await apiAppFood.post<ApiResponse<FoodPlatformAccount>>(`/api/accounts/${accountId}/reconnect`);
    return response.data.data;
  },

  /**
   * Test connection by calling platform API (with auto-reconnect)
   */
  async testConnection(connectionId: string): Promise<{ status: ConnectionStatus; message?: string; success?: boolean }> {
    const response = await apiAppFood.post<ApiResponse<{ success: boolean; status: ConnectionStatus; message: string }>>(`/api/accounts/${connectionId}/test`);
    return response.data.data;
  },

  /**
   * Get menu from platform (GrabFood, etc.)
   */
  async getMenu(accountId: string): Promise<ExternalMenu> {
    const response = await apiAppFood.get<ApiResponse<ExternalMenu>>(`/api/accounts/${accountId}/menu`);
    return response.data.data;
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
    const response = await apiAppFood.get<ApiResponse<FoodPlatformAccount[]>>(`/api/accounts`, {
      params: { tenantId }
    });
    return response.data.data || [];
  },

  /**
   * Update account branch assignment
   */
  async updateAccountBranch(accountId: string, branchId: string): Promise<FoodPlatformAccount> {
    const response = await apiAppFood.patch<ApiResponse<FoodPlatformAccount>>(`/api/accounts/${accountId}/branch`, {
      branchId,
    });
    return response.data.data;
  },

  /**
   * Get stores from a connected food platform account
   * Fetches stores from GrabFood unified-profile API
   */
  async getStores(accountId: string): Promise<ExternalStore[]> {
    const response = await apiAppFood.get<ApiResponse<ExternalStore[]>>(`/api/accounts/${accountId}/stores`);
    return response.data.data || response.data || [];
  },

  /**
   * Get store mappings for an account (from DB)
   */
  async getStoreMappings(accountId: string): Promise<StoreMapping[]> {
    const response = await apiAppFood.get<ApiResponse<StoreMapping[]>>(`/api/food-platforms/accounts/${accountId}/store-mappings`);
    return response.data.data || [];
  },

  /**
   * Create store mappings for an account
   */
  async createStoreMappings(accountId: string, mappings: CreateStoreMappingDto[]): Promise<StoreMapping[]> {
    const response = await apiAppFood.post<ApiResponse<StoreMapping[]>>(`/api/food-platforms/accounts/${accountId}/store-mappings`, {
      mappings,
    });
    return response.data.data || [];
  },

  /**
   * Update a store mapping (e.g., change branch assignment)
   */
  async updateStoreMapping(mappingId: string, data: { branchId?: string; branchName?: string; isActive?: boolean }): Promise<StoreMapping> {
    const response = await apiAppFood.put<ApiResponse<StoreMapping>>(`/api/food-platforms/store-mappings/${mappingId}`, data);
    return response.data.data;
  },

  /**
   * Delete a store mapping
   */
  async deleteStoreMapping(mappingId: string): Promise<void> {
    await apiAppFood.delete(`/api/food-platforms/store-mappings/${mappingId}`);
  },

  /**
   * Sync store info from platform (update store details)
   */
  async syncStoreMapping(mappingId: string): Promise<StoreMapping> {
    const response = await apiAppFood.post<ApiResponse<StoreMapping>>(`/api/food-platforms/store-mappings/${mappingId}/sync`);
    return response.data.data;
  },

  // ==================== Menu Sync & Item Mapping ====================

  /**
   * Sync menu items from platform to database
   * Calls GrabFood API and saves items to DB
   */
  async syncMenuItems(accountId: string): Promise<MenuSyncResult> {
    const response = await apiAppFood.post<ApiResponse<MenuSyncResult>>(`/api/menu/${accountId}/sync`);
    return response.data.data;
  },

  /**
   * Get menu sync status for an account
   */
  async getMenuSyncStatus(accountId: string): Promise<MenuSyncStatus> {
    const response = await apiAppFood.get<ApiResponse<MenuSyncStatus>>(`/api/menu/${accountId}/sync-status`);
    return response.data.data;
  },

  /**
   * Get synced external items for an account
   */
  async getSyncedItems(accountId: string, categoryId?: string): Promise<SyncedExternalItem[]> {
    const params: Record<string, string> = {};
    if (categoryId) {
      params.categoryId = categoryId;
    }
    const response = await apiAppFood.get<ApiResponse<SyncedExternalItem[]>>(`/api/menu/${accountId}/items`, { params });
    return response.data.data || [];
  },

  /**
   * Get synced external items grouped by category
   */
  async getSyncedItemsByCategory(accountId: string): Promise<SyncedItemsByCategory[]> {
    const response = await apiAppFood.get<ApiResponse<SyncedItemsByCategory[]>>(`/api/menu/${accountId}/items/by-category`);
    return response.data.data || [];
  },

  /**
   * Get item mappings for an account
   */
  async getItemMappings(accountId: string): Promise<ItemMapping[]> {
    const response = await apiAppFood.get<ApiResponse<ItemMapping[]>>(`/api/menu/${accountId}/mappings`);
    return response.data.data || [];
  },

  /**
   * Create item mapping
   */
  async createItemMapping(accountId: string, dto: CreateItemMappingDto): Promise<ItemMapping> {
    const response = await apiAppFood.post<ApiResponse<ItemMapping>>(`/api/menu/${accountId}/mappings`, dto);
    return response.data.data;
  },

  /**
   * Batch create/update item mappings
   */
  async batchItemMappings(accountId: string, mappings: CreateItemMappingDto[]): Promise<{
    success: boolean;
    createdCount: number;
    updatedCount: number;
    message: string;
  }> {
    const response = await apiAppFood.post<ApiResponse<{
      success: boolean;
      createdCount: number;
      updatedCount: number;
      message: string;
    }>>(`/api/menu/${accountId}/mappings/batch`, { mappings });
    return response.data.data;
  },

  /**
   * Update item mapping
   */
  async updateItemMapping(mappingId: string, dto: Partial<CreateItemMappingDto>): Promise<ItemMapping> {
    const response = await apiAppFood.put<ApiResponse<ItemMapping>>(`/api/menu/mappings/${mappingId}`, dto);
    return response.data.data;
  },

  /**
   * Delete item mapping
   */
  async deleteItemMapping(mappingId: string): Promise<void> {
    await apiAppFood.delete(`/api/menu/mappings/${mappingId}`);
  },
};
