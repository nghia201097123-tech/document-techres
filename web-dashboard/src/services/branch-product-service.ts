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

export interface BranchProductBatchProgressInfo {
  current: number;
  total: number;
  batchNumber: number;
  totalBatches: number;
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
   * Bulk toggle availability with batch processing to avoid timeout
   */
  async bulkToggleAvailabilityBatched(
    branchId: string,
    dto: BulkToggleAvailabilityDto,
    options?: {
      batchSize?: number;
      onProgress?: (progress: BranchProductBatchProgressInfo) => void;
    }
  ): Promise<{ updated: number }> {
    const batchSize = options?.batchSize || 50;
    const totalBatches = Math.ceil(dto.productIds.length / batchSize);
    let totalUpdated = 0;

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, dto.productIds.length);
      const batch = dto.productIds.slice(start, end);

      options?.onProgress?.({
        current: start,
        total: dto.productIds.length,
        batchNumber: i + 1,
        totalBatches,
      });

      try {
        const response = await api.post(`/branch-products/branch/${branchId}/bulk-toggle`, {
          productIds: batch,
          isAvailable: dto.isAvailable,
        });
        totalUpdated += response.data.updated;
      } catch (error) {
        console.error(`Batch ${i + 1} failed:`, error);
      }
    }

    options?.onProgress?.({
      current: dto.productIds.length,
      total: dto.productIds.length,
      batchNumber: totalBatches,
      totalBatches,
    });

    return { updated: totalUpdated };
  },

  /**
   * Sync all products to a branch
   */
  async syncAllProductsToBranch(branchId: string, brandId: string): Promise<{ synced: number }> {
    const response = await api.post(`/branch-products/branch/${branchId}/sync?brandId=${brandId}`);
    return response.data;
  },
};
