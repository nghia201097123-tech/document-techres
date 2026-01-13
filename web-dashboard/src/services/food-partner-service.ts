import api from "./api";

// Partner types
export enum FoodPartnerType {
  SHOPEE = "shopee",
  GRAB = "grab",
  BEFOOD = "befood",
}

// Partner display info
export const FoodPartnerInfo: Record<FoodPartnerType, { name: string; color: string; bgColor: string }> = {
  [FoodPartnerType.SHOPEE]: { name: "Shopee Food", color: "text-orange-600", bgColor: "bg-orange-100" },
  [FoodPartnerType.GRAB]: { name: "GrabFood", color: "text-green-600", bgColor: "bg-green-100" },
  [FoodPartnerType.BEFOOD]: { name: "BeFood", color: "text-yellow-600", bgColor: "bg-yellow-100" },
};

// Connection status
export enum ConnectionStatus {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  PENDING = "pending",
  ERROR = "error",
}

// Partner connection port (opened by web-admin)
export interface PartnerConnectionPort {
  id: string;
  partnerType: FoodPartnerType;
  shopNumber: number; // 1, 2, 3... for multiple shops per partner
  branchId: string;
  branchName?: string;
  maxConnections: number;
  isActive: boolean;
  createdAt: string;
}

// Account connection (linked by web-dashboard)
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

export const foodPartnerService = {
  /**
   * Get all available connection ports for a branch
   */
  async getAvailablePorts(branchId: string): Promise<PartnerConnectionPort[]> {
    const response = await api.get(`/food-partners/ports/branch/${branchId}`);
    return response.data;
  },

  /**
   * Get all account connections for a branch
   */
  async getConnections(branchId: string): Promise<PartnerAccountConnection[]> {
    const response = await api.get(`/food-partners/connections/branch/${branchId}`);
    return response.data;
  },

  /**
   * Get combined view of ports and connections
   */
  async getConnectionsView(branchId: string): Promise<PartnerConnectionView[]> {
    const response = await api.get(`/food-partners/view/branch/${branchId}`);
    return response.data;
  },

  /**
   * Link an account to a connection port
   */
  async linkAccount(dto: LinkPartnerAccountDto): Promise<PartnerAccountConnection> {
    const response = await api.post(`/food-partners/connections/link`, dto);
    return response.data;
  },

  /**
   * Update connection credentials
   */
  async updateConnection(connectionId: string, dto: UpdatePartnerConnectionDto): Promise<PartnerAccountConnection> {
    const response = await api.patch(`/food-partners/connections/${connectionId}`, dto);
    return response.data;
  },

  /**
   * Disconnect/unlink an account
   */
  async unlinkAccount(connectionId: string): Promise<void> {
    await api.delete(`/food-partners/connections/${connectionId}`);
  },

  /**
   * Test connection status
   */
  async testConnection(connectionId: string): Promise<{ status: ConnectionStatus; message?: string }> {
    const response = await api.post(`/food-partners/connections/${connectionId}/test`);
    return response.data;
  },

  /**
   * Sync menu to partner platform
   */
  async syncMenu(connectionId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/food-partners/connections/${connectionId}/sync-menu`);
    return response.data;
  },
};
