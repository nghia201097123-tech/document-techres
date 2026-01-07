import api from "./api";
import { AdjustmentType } from "./seasonal-price-service";

export enum ProductType {
  FOOD = "food",
  DRINK = "drink",
  OTHER = "other",
  TOPPING = "topping",
  COMBO = "combo",
}

export enum SellingType {
  PORTION = "portion",
  WEIGHT = "weight",
}

export interface SeasonalPriceInfo {
  seasonalPriceId: string;
  seasonalPriceName: string;
  adjustmentType: AdjustmentType;
  adjustmentValue: number;
  startDate: string;
  endDate: string;
  originalPrice: number;
  adjustedPrice: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  type: ProductType;
  categoryId?: string;
  categoryName?: string;
  price: number;
  discountPrice?: number;
  vatRate: number;
  unit?: string;
  description?: string;
  imageUrl?: string;
  preparationTime: number;
  costPrice: number;
  sellingType: SellingType;
  printDish: boolean;
  printLabel: boolean;
  printSeafood: boolean;
  isActive: boolean;
  sortOrder: number;
  brandId?: string;
  createdAt: string;
  seasonalPrice?: SeasonalPriceInfo | null;
}

export interface CreateProductDto {
  name: string;
  type: ProductType;
  categoryId?: string;
  price: number;
  discountPrice?: number;
  vatRate?: number;
  unit?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  preparationTime?: number;
  costPrice?: number;
  sellingType?: SellingType;
  printDish?: boolean;
  printLabel?: boolean;
  printSeafood?: boolean;
  noteIds?: string[];
}

export interface UpdateProductDto {
  name?: string;
  type?: ProductType;
  categoryId?: string;
  price?: number;
  discountPrice?: number;
  vatRate?: number;
  unit?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  preparationTime?: number;
  costPrice?: number;
  sellingType?: SellingType;
  printDish?: boolean;
  printLabel?: boolean;
  printSeafood?: boolean;
  noteIds?: string[];
}

// Product Note interfaces
export interface ProductNote {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  brandId?: string;
  createdAt: string;
}

export interface ProductNoteAssignment {
  id: string;
  noteId: string;
  note: ProductNote;
  sortOrder: number;
}

export interface CreateProductNoteDto {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateProductNoteDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// Combo Item interfaces
export interface ComboItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  sortOrder: number;
}

// Topping Group interfaces
export interface ToppingItem {
  id: string;
  toppingId: string;
  topping: Product;
  priceAdjustment: number;
  maxQuantity: number;
  sortOrder: number;
}

export interface ToppingGroup {
  id: string;
  name: string;
  description?: string;
  isRequired: boolean;
  minSelection: number;
  maxSelection: number;
  isActive: boolean;
  sortOrder: number;
  brandId?: string;
  items: ToppingItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateToppingGroupDto {
  name: string;
  isRequired?: boolean;
  minSelection?: number;
  maxSelection?: number;
  sortOrder?: number;
}

export interface UpdateToppingGroupDto {
  name?: string;
  isRequired?: boolean;
  minSelection?: number;
  maxSelection?: number;
  sortOrder?: number;
}

export interface AddToppingItemDto {
  toppingId: string;
  priceAdjustment?: number;
  maxQuantity?: number;
  sortOrder?: number;
}

export interface UpdateToppingItemDto {
  priceAdjustment?: number;
  maxQuantity?: number;
  sortOrder?: number;
}

// Bulk import interfaces
export interface BulkProductItem {
  id?: string; // If provided, will update existing product
  code?: string; // Product code (only for update)
  name: string;
  type: ProductType;
  categoryId?: string;
  categoryName?: string; // For lookup
  price: number;
  vatRate?: number;
  unit?: string;
  description?: string;
  imageUrl?: string;
  preparationTime?: number;
  costPrice?: number;
  sellingType?: SellingType;
  printDish?: boolean;
  printLabel?: boolean;
  printSeafood?: boolean;
}

export interface ProductBulkImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
  products: Product[];
}

export const productService = {
  getAll: async (brandId?: string, type?: ProductType): Promise<Product[]> => {
    const params: Record<string, any> = {};
    if (brandId) params.brandId = brandId;
    if (type) params.type = type;
    const response = await api.get<Product[]>("/products", { params });
    return response.data;
  },

  getAllWithSeasonalPrices: async (brandId: string, branchId: string, type?: ProductType): Promise<Product[]> => {
    const params: Record<string, any> = { brandId, branchId };
    if (type) params.type = type;
    const response = await api.get<Product[]>("/products/with-seasonal-prices", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Product> => {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  },

  create: async (data: CreateProductDto): Promise<Product> => {
    const response = await api.post<Product>("/products", data);
    return response.data;
  },

  update: async (id: string, data: UpdateProductDto): Promise<Product> => {
    const response = await api.put<Product>(`/products/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<Product> => {
    const response = await api.patch<Product>(`/products/${id}/toggle-active`);
    return response.data;
  },

  // Available Toppings
  getAvailableToppings: async (brandId?: string): Promise<Product[]> => {
    const params: Record<string, any> = {};
    if (brandId) params.brandId = brandId;
    const response = await api.get<Product[]>("/products/toppings/available", { params });
    return response.data;
  },

  // === Shared Topping Group Management ===

  getAllToppingGroups: async (brandId?: string): Promise<ToppingGroup[]> => {
    const params = brandId ? { brandId } : {};
    const response = await api.get<ToppingGroup[]>("/products/topping-groups", { params });
    return response.data;
  },

  getToppingGroupById: async (groupId: string): Promise<ToppingGroup> => {
    const response = await api.get<ToppingGroup>(`/products/topping-groups/${groupId}`);
    return response.data;
  },

  createToppingGroup: async (data: CreateToppingGroupDto): Promise<ToppingGroup> => {
    const response = await api.post<ToppingGroup>("/products/topping-groups", data);
    return response.data;
  },

  updateToppingGroup: async (groupId: string, data: UpdateToppingGroupDto): Promise<ToppingGroup> => {
    const response = await api.put<ToppingGroup>(`/products/topping-groups/${groupId}`, data);
    return response.data;
  },

  deleteToppingGroup: async (groupId: string): Promise<void> => {
    await api.delete(`/products/topping-groups/${groupId}`);
  },

  toggleToppingGroupActive: async (groupId: string): Promise<ToppingGroup> => {
    const response = await api.patch<ToppingGroup>(`/products/topping-groups/${groupId}/toggle-active`);
    return response.data;
  },

  // === Topping Group Item Management ===

  addToppingItem: async (groupId: string, data: AddToppingItemDto): Promise<ToppingGroup> => {
    const response = await api.post<ToppingGroup>(`/products/topping-groups/${groupId}/items`, data);
    return response.data;
  },

  updateToppingItem: async (groupId: string, itemId: string, data: UpdateToppingItemDto): Promise<ToppingGroup> => {
    const response = await api.put<ToppingGroup>(`/products/topping-groups/${groupId}/items/${itemId}`, data);
    return response.data;
  },

  removeToppingItem: async (groupId: string, itemId: string): Promise<ToppingGroup> => {
    const response = await api.delete<ToppingGroup>(`/products/topping-groups/${groupId}/items/${itemId}`);
    return response.data;
  },

  // === Product Topping Group Assignment ===

  getProductToppingGroups: async (productId: string): Promise<ToppingGroup[]> => {
    const response = await api.get<ToppingGroup[]>(`/products/${productId}/topping-groups`);
    return response.data;
  },

  assignToppingGroupsToProduct: async (productId: string, groupIds: string[]): Promise<ToppingGroup[]> => {
    const response = await api.post<ToppingGroup[]>(`/products/${productId}/topping-groups`, { groupIds });
    return response.data;
  },

  addToppingGroupToProduct: async (productId: string, groupId: string): Promise<ToppingGroup[]> => {
    const response = await api.post<ToppingGroup[]>(`/products/${productId}/topping-groups/${groupId}`);
    return response.data;
  },

  removeToppingGroupFromProduct: async (productId: string, groupId: string): Promise<ToppingGroup[]> => {
    const response = await api.delete<ToppingGroup[]>(`/products/${productId}/topping-groups/${groupId}`);
    return response.data;
  },

  // === Product Notes Management ===

  getAllNotes: async (brandId?: string): Promise<ProductNote[]> => {
    const params = brandId ? { brandId } : {};
    const response = await api.get<ProductNote[]>("/products/notes/all", { params });
    return response.data;
  },

  createNote: async (data: CreateProductNoteDto): Promise<ProductNote> => {
    const response = await api.post<ProductNote>("/products/notes", data);
    return response.data;
  },

  updateNote: async (noteId: string, data: UpdateProductNoteDto): Promise<ProductNote> => {
    const response = await api.put<ProductNote>(`/products/notes/${noteId}`, data);
    return response.data;
  },

  deleteNote: async (noteId: string): Promise<void> => {
    await api.delete(`/products/notes/${noteId}`);
  },

  getProductNotes: async (productId: string): Promise<ProductNoteAssignment[]> => {
    const response = await api.get<ProductNoteAssignment[]>(`/products/${productId}/notes`);
    return response.data;
  },

  assignNotesToProduct: async (productId: string, noteIds: string[]): Promise<ProductNoteAssignment[]> => {
    const response = await api.post<ProductNoteAssignment[]>(`/products/${productId}/notes`, { noteIds });
    return response.data;
  },

  addNoteToProduct: async (productId: string, noteId: string): Promise<ProductNoteAssignment[]> => {
    const response = await api.post<ProductNoteAssignment[]>(`/products/${productId}/notes/${noteId}`);
    return response.data;
  },

  removeNoteFromProduct: async (productId: string, noteId: string): Promise<ProductNoteAssignment[]> => {
    const response = await api.delete<ProductNoteAssignment[]>(`/products/${productId}/notes/${noteId}`);
    return response.data;
  },

  // === Note to Multiple Products Assignment ===

  getProductsByNote: async (noteId: string): Promise<Product[]> => {
    const response = await api.get<Product[]>(`/products/notes/${noteId}/products`);
    return response.data;
  },

  assignNoteToProducts: async (noteId: string, productIds: string[]): Promise<{ noteId: string; productCount: number; products: Product[] }> => {
    const response = await api.post<{ noteId: string; productCount: number; products: Product[] }>(`/products/notes/${noteId}/products`, { productIds });
    return response.data;
  },

  // === Combo Items Management ===

  getAvailableProductsForCombo: async (brandId?: string): Promise<Product[]> => {
    const params: Record<string, any> = {};
    if (brandId) params.brandId = brandId;
    const response = await api.get<Product[]>("/products/combo/available-products", { params });
    return response.data;
  },

  getComboItems: async (comboId: string): Promise<ComboItem[]> => {
    const response = await api.get<ComboItem[]>(`/products/${comboId}/combo-items`);
    return response.data;
  },

  assignComboItems: async (comboId: string, items: { productId: string; quantity?: number }[]): Promise<ComboItem[]> => {
    const response = await api.post<ComboItem[]>(`/products/${comboId}/combo-items`, { items });
    return response.data;
  },

  addItemToCombo: async (comboId: string, productId: string, quantity?: number): Promise<ComboItem[]> => {
    const response = await api.post<ComboItem[]>(`/products/${comboId}/combo-items/${productId}`, { quantity });
    return response.data;
  },

  removeItemFromCombo: async (comboId: string, productId: string): Promise<ComboItem[]> => {
    const response = await api.delete<ComboItem[]>(`/products/${comboId}/combo-items/${productId}`);
    return response.data;
  },

  // === Bulk Import ===

  bulkImport: async (items: BulkProductItem[], brandId: string): Promise<ProductBulkImportResult> => {
    const response = await api.post<ProductBulkImportResult>("/products/bulk-import", { items, brandId });
    return response.data;
  },

  /**
   * Bulk import with batch processing to avoid timeout errors
   * Splits large datasets into smaller chunks and processes them sequentially
   */
  bulkImportBatched: async (
    items: BulkProductItem[],
    brandId: string,
    options?: {
      batchSize?: number;
      onProgress?: (progress: { current: number; total: number; batchNumber: number; totalBatches: number }) => void;
    }
  ): Promise<ProductBulkImportResult> => {
    const batchSize = options?.batchSize || 100; // Default 100 items per batch
    const totalBatches = Math.ceil(items.length / batchSize);

    const aggregatedResult: ProductBulkImportResult = {
      created: 0,
      updated: 0,
      errors: [],
      products: [],
    };

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, items.length);
      const batch = items.slice(start, end);

      // Report progress before processing
      options?.onProgress?.({
        current: start,
        total: items.length,
        batchNumber: i + 1,
        totalBatches,
      });

      try {
        const response = await api.post<ProductBulkImportResult>("/products/bulk-import", {
          items: batch,
          brandId,
        });

        aggregatedResult.created += response.data.created;
        aggregatedResult.updated += response.data.updated;
        aggregatedResult.products.push(...response.data.products);

        // Adjust error row numbers to reflect actual position in full dataset
        const adjustedErrors = response.data.errors.map((err) => ({
          row: start + err.row,
          message: err.message,
        }));
        aggregatedResult.errors.push(...adjustedErrors);
      } catch (error: any) {
        // If batch fails, add error for entire batch range
        aggregatedResult.errors.push({
          row: start + 1,
          message: `Batch ${i + 1} failed: ${error.response?.data?.message || error.message || "Unknown error"}`,
        });
      }
    }

    // Final progress update
    options?.onProgress?.({
      current: items.length,
      total: items.length,
      batchNumber: totalBatches,
      totalBatches,
    });

    return aggregatedResult;
  },
};

// Bulk Operations Types
export interface ProductBulkOperationResult {
  success: number;
  failed: number;
  errors: { productId: string; message: string }[];
}

export interface ProductBatchProgressInfo {
  current: number;
  total: number;
  batchNumber: number;
  totalBatches: number;
}

// Helper function to process product bulk operations in batches
const processProductBulkInBatches = async (
  items: string[],
  batchSize: number,
  processor: (batch: string[]) => Promise<ProductBulkOperationResult>,
  onProgress?: (progress: ProductBatchProgressInfo) => void
): Promise<ProductBulkOperationResult> => {
  const totalBatches = Math.ceil(items.length / batchSize);
  const aggregatedResult: ProductBulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, items.length);
    const batch = items.slice(start, end);

    onProgress?.({
      current: start,
      total: items.length,
      batchNumber: i + 1,
      totalBatches,
    });

    try {
      const result = await processor(batch);
      aggregatedResult.success += result.success;
      aggregatedResult.failed += result.failed;
      aggregatedResult.errors.push(...result.errors);
    } catch (error: any) {
      aggregatedResult.failed += batch.length;
      batch.forEach(id => {
        aggregatedResult.errors.push({
          productId: id,
          message: error.response?.data?.message || error.message || "Unknown error",
        });
      });
    }
  }

  onProgress?.({
    current: items.length,
    total: items.length,
    batchNumber: totalBatches,
    totalBatches,
  });

  return aggregatedResult;
};

export const bulkProductService = {
  updateCategory: async (productIds: string[], categoryId: string): Promise<ProductBulkOperationResult> => {
    const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-category", {
      productIds,
      categoryId,
    });
    return response.data;
  },

  updateCategoryBatched: async (
    productIds: string[],
    categoryId: string,
    options?: { batchSize?: number; onProgress?: (progress: ProductBatchProgressInfo) => void }
  ): Promise<ProductBulkOperationResult> => {
    return processProductBulkInBatches(
      productIds,
      options?.batchSize || 50,
      async (batch) => {
        const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-category", {
          productIds: batch,
          categoryId,
        });
        return response.data;
      },
      options?.onProgress
    );
  },

  toggleActive: async (productIds: string[], isActive: boolean): Promise<ProductBulkOperationResult> => {
    const response = await api.post<ProductBulkOperationResult>("/products/bulk/toggle-active", {
      productIds,
      isActive,
    });
    return response.data;
  },

  toggleActiveBatched: async (
    productIds: string[],
    isActive: boolean,
    options?: { batchSize?: number; onProgress?: (progress: ProductBatchProgressInfo) => void }
  ): Promise<ProductBulkOperationResult> => {
    return processProductBulkInBatches(
      productIds,
      options?.batchSize || 50,
      async (batch) => {
        const response = await api.post<ProductBulkOperationResult>("/products/bulk/toggle-active", {
          productIds: batch,
          isActive,
        });
        return response.data;
      },
      options?.onProgress
    );
  },

  delete: async (productIds: string[]): Promise<ProductBulkOperationResult> => {
    const response = await api.post<ProductBulkOperationResult>("/products/bulk/delete", {
      productIds,
    });
    return response.data;
  },

  deleteBatched: async (
    productIds: string[],
    options?: { batchSize?: number; onProgress?: (progress: ProductBatchProgressInfo) => void }
  ): Promise<ProductBulkOperationResult> => {
    return processProductBulkInBatches(
      productIds,
      options?.batchSize || 50,
      async (batch) => {
        const response = await api.post<ProductBulkOperationResult>("/products/bulk/delete", {
          productIds: batch,
        });
        return response.data;
      },
      options?.onProgress
    );
  },

  updateVatRate: async (productIds: string[], vatRate: number): Promise<ProductBulkOperationResult> => {
    const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-vat-rate", {
      productIds,
      vatRate,
    });
    return response.data;
  },

  updateVatRateBatched: async (
    productIds: string[],
    vatRate: number,
    options?: { batchSize?: number; onProgress?: (progress: ProductBatchProgressInfo) => void }
  ): Promise<ProductBulkOperationResult> => {
    return processProductBulkInBatches(
      productIds,
      options?.batchSize || 50,
      async (batch) => {
        const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-vat-rate", {
          productIds: batch,
          vatRate,
        });
        return response.data;
      },
      options?.onProgress
    );
  },

  updatePrice: async (productIds: string[], price: number): Promise<ProductBulkOperationResult> => {
    const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-price", {
      productIds,
      price,
    });
    return response.data;
  },

  updatePriceBatched: async (
    productIds: string[],
    price: number,
    options?: { batchSize?: number; onProgress?: (progress: ProductBatchProgressInfo) => void }
  ): Promise<ProductBulkOperationResult> => {
    return processProductBulkInBatches(
      productIds,
      options?.batchSize || 50,
      async (batch) => {
        const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-price", {
          productIds: batch,
          price,
        });
        return response.data;
      },
      options?.onProgress
    );
  },

  updatePrintLabel: async (productIds: string[], printLabel: boolean): Promise<ProductBulkOperationResult> => {
    const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-print-label", {
      productIds,
      printLabel,
    });
    return response.data;
  },

  updatePrintLabelBatched: async (
    productIds: string[],
    printLabel: boolean,
    options?: { batchSize?: number; onProgress?: (progress: ProductBatchProgressInfo) => void }
  ): Promise<ProductBulkOperationResult> => {
    return processProductBulkInBatches(
      productIds,
      options?.batchSize || 50,
      async (batch) => {
        const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-print-label", {
          productIds: batch,
          printLabel,
        });
        return response.data;
      },
      options?.onProgress
    );
  },

  updatePrintSeafood: async (productIds: string[], printSeafood: boolean): Promise<ProductBulkOperationResult> => {
    const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-print-seafood", {
      productIds,
      printSeafood,
    });
    return response.data;
  },

  updatePrintSeafoodBatched: async (
    productIds: string[],
    printSeafood: boolean,
    options?: { batchSize?: number; onProgress?: (progress: ProductBatchProgressInfo) => void }
  ): Promise<ProductBulkOperationResult> => {
    return processProductBulkInBatches(
      productIds,
      options?.batchSize || 50,
      async (batch) => {
        const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-print-seafood", {
          productIds: batch,
          printSeafood,
        });
        return response.data;
      },
      options?.onProgress
    );
  },

  updatePrintDish: async (productIds: string[], printDish: boolean): Promise<ProductBulkOperationResult> => {
    const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-print-dish", {
      productIds,
      printDish,
    });
    return response.data;
  },

  updatePrintDishBatched: async (
    productIds: string[],
    printDish: boolean,
    options?: { batchSize?: number; onProgress?: (progress: ProductBatchProgressInfo) => void }
  ): Promise<ProductBulkOperationResult> => {
    return processProductBulkInBatches(
      productIds,
      options?.batchSize || 50,
      async (batch) => {
        const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-print-dish", {
          productIds: batch,
          printDish,
        });
        return response.data;
      },
      options?.onProgress
    );
  },

  updateUnit: async (productIds: string[], unit: string): Promise<ProductBulkOperationResult> => {
    const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-unit", {
      productIds,
      unit,
    });
    return response.data;
  },

  updateUnitBatched: async (
    productIds: string[],
    unit: string,
    options?: { batchSize?: number; onProgress?: (progress: ProductBatchProgressInfo) => void }
  ): Promise<ProductBulkOperationResult> => {
    return processProductBulkInBatches(
      productIds,
      options?.batchSize || 50,
      async (batch) => {
        const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-unit", {
          productIds: batch,
          unit,
        });
        return response.data;
      },
      options?.onProgress
    );
  },

  updateSellingType: async (productIds: string[], sellingType: SellingType): Promise<ProductBulkOperationResult> => {
    const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-selling-type", {
      productIds,
      sellingType,
    });
    return response.data;
  },

  updateSellingTypeBatched: async (
    productIds: string[],
    sellingType: SellingType,
    options?: { batchSize?: number; onProgress?: (progress: ProductBatchProgressInfo) => void }
  ): Promise<ProductBulkOperationResult> => {
    return processProductBulkInBatches(
      productIds,
      options?.batchSize || 50,
      async (batch) => {
        const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-selling-type", {
          productIds: batch,
          sellingType,
        });
        return response.data;
      },
      options?.onProgress
    );
  },

  updatePreparationTime: async (productIds: string[], preparationTime: number): Promise<ProductBulkOperationResult> => {
    const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-preparation-time", {
      productIds,
      preparationTime,
    });
    return response.data;
  },

  updatePreparationTimeBatched: async (
    productIds: string[],
    preparationTime: number,
    options?: { batchSize?: number; onProgress?: (progress: ProductBatchProgressInfo) => void }
  ): Promise<ProductBulkOperationResult> => {
    return processProductBulkInBatches(
      productIds,
      options?.batchSize || 50,
      async (batch) => {
        const response = await api.post<ProductBulkOperationResult>("/products/bulk/update-preparation-time", {
          productIds: batch,
          preparationTime,
        });
        return response.data;
      },
      options?.onProgress
    );
  },

  updateAvatars: async (items: { productCode: string; avatarUrl: string }[]): Promise<BulkAvatarUpdateResult> => {
    const response = await api.post<BulkAvatarUpdateResult>("/products/bulk/update-avatar", {
      items,
    });
    return response.data;
  },
};

export interface BulkAvatarUpdateResult {
  success: number;
  failed: number;
  errors: { productCode: string; message: string }[];
  updated: { productCode: string; productName: string }[];
}
