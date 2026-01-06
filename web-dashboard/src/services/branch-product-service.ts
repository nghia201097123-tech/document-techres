import api from "./api";
import { Product, SeasonalPriceInfo } from "./product-service";

export interface BranchProduct extends Product {
  branchProductId: string | null;
  isAvailable: boolean;
  customPrice: number | null;
  branchSortOrder: number;
  seasonalPrice: SeasonalPriceInfo | null;
}

export interface BranchProductStats {
  totalProducts: number;
  availableCount: number;
  unavailableCount: number;
}

export interface UpdateBranchProductDto {
  isAvailable?: boolean;
  customPrice?: number | null;
  sortOrder?: number;
}

export interface BulkToggleAvailabilityDto {
  productIds: string[];
  isAvailable: boolean;
}

export const branchProductService = {
  /**
   * Get all products for a branch with availability status
   */
  async getByBranch(branchId: string): Promise<BranchProduct[]> {
    const response = await api.get(`/branch-products/branch/${branchId}`);
    return response.data;
  },

  /**
   * Get only available products for a branch
   */
  async getAvailableByBranch(branchId: string): Promise<BranchProduct[]> {
    const response = await api.get(`/branch-products/branch/${branchId}/available`);
    return response.data;
  },

  /**
   * Get branch product statistics
   */
  async getStats(branchId: string): Promise<BranchProductStats> {
    const response = await api.get(`/branch-products/branch/${branchId}/stats`);
    return response.data;
  },

  /**
   * Update a branch product (availability, custom price, sort order)
   */
  async update(branchId: string, productId: string, dto: UpdateBranchProductDto): Promise<BranchProduct> {
    const response = await api.patch(`/branch-products/branch/${branchId}/product/${productId}`, dto);
    return response.data;
  },

  /**
   * Toggle availability for a single product
   */
  async toggleAvailability(branchId: string, productId: string): Promise<BranchProduct> {
    const response = await api.post(`/branch-products/branch/${branchId}/product/${productId}/toggle`);
    return response.data;
  },

  /**
   * Bulk toggle availability for multiple products
   */
  async bulkToggleAvailability(branchId: string, dto: BulkToggleAvailabilityDto): Promise<{ updated: number }> {
    const response = await api.post(`/branch-products/branch/${branchId}/bulk-toggle`, dto);
    return response.data;
  },

  /**
   * Sync all products to a branch
   */
  async syncAllProductsToBranch(branchId: string, brandId: string): Promise<{ synced: number }> {
    const response = await api.post(`/branch-products/branch/${branchId}/sync?brandId=${brandId}`);
    return response.data;
  },
};
