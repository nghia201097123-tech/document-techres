"use client";

import * as React from "react";
import { useBackgroundProgress } from "@/components/ui/background-progress";
import { bulkProductService, productService, type ProductBulkOperationResult, type BulkProductItem, type ProductBulkImportResult } from "@/services/product-service";

/**
 * Storage key for product batch operations
 */
const PRODUCT_BATCH_STORAGE_KEY = "product-batch-operation";

/**
 * Types of product batch operations
 */
export type ProductBatchOperationType =
  | "category"
  | "activate"
  | "deactivate"
  | "delete"
  | "vat"
  | "price"
  | "print-label"
  | "print-seafood"
  | "print-dish"
  | "unit"
  | "selling-type"
  | "preparation-time"
  | "import";

/**
 * Stored batch operation data
 */
export interface StoredProductBatchOperation {
  id: string;
  type: ProductBatchOperationType;
  title: string;
  // All product IDs to process (for bulk operations)
  productIds: string[];
  // Product IDs that have been successfully processed
  processedIds: string[];
  // Failed items with errors
  failedItems: { productId: string; error: string }[];
  // Additional parameters for bulk operations
  categoryId?: string;
  vatRate?: number;
  price?: number;
  boolValue?: boolean;
  stringValue?: string;
  numberValue?: number;
  // Import-specific fields
  importItems?: BulkProductItem[];
  importProcessedIndex?: number; // Index of last processed item
  importCreated?: number;
  importUpdated?: number;
  importErrors?: { row: number; message: string }[];
  brandId?: string;
  // Timestamps
  createdAt: number;
  updatedAt: number;
}

/**
 * Storage helpers
 */
const storage = {
  get: (): StoredProductBatchOperation | null => {
    if (typeof window === "undefined") return null;
    try {
      const data = localStorage.getItem(PRODUCT_BATCH_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  save: (operation: StoredProductBatchOperation) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(PRODUCT_BATCH_STORAGE_KEY, JSON.stringify(operation));
    } catch (e) {
      console.error("Failed to save product batch operation:", e);
    }
  },

  update: (updates: Partial<StoredProductBatchOperation>) => {
    const current = storage.get();
    if (current) {
      storage.save({
        ...current,
        ...updates,
        updatedAt: Date.now(),
      });
    }
  },

  clear: () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(PRODUCT_BATCH_STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear product batch operation:", e);
    }
  },
};

/**
 * Options for starting a batch operation
 */
interface StartBatchOptions {
  productIds: string[];
  type: ProductBatchOperationType;
  categoryId?: string;
  vatRate?: number;
  price?: number;
  boolValue?: boolean;
  stringValue?: string;
  numberValue?: number;
  batchSize?: number;
  onComplete?: (result: ProductBulkOperationResult) => void;
}

/**
 * Options for starting an import operation
 */
interface StartImportOptions {
  items: BulkProductItem[];
  brandId: string;
  batchSize?: number;
  onComplete?: (result: ProductBulkImportResult) => void;
}

/**
 * Hook for managing persistent product batch operations
 */
export function useProductBatch() {
  const {
    addProgress,
    updateProgress,
    completeProgress,
    errorProgress,
    setResumeHandler,
    progresses,
  } = useBackgroundProgress();

  const isProcessingRef = React.useRef(false);
  const abortRef = React.useRef(false);

  // Operation titles
  const getOperationTitle = (type: ProductBatchOperationType): string => {
    const titles: Record<ProductBatchOperationType, string> = {
      category: "Cập nhật danh mục",
      activate: "Kích hoạt sản phẩm",
      deactivate: "Tắt sản phẩm",
      delete: "Xóa sản phẩm",
      vat: "Cập nhật VAT",
      price: "Cập nhật giá",
      "print-label": "Cập nhật in tem",
      "print-seafood": "Cập nhật in hồ hải sản",
      "print-dish": "Cập nhật in món",
      unit: "Cập nhật đơn vị",
      "selling-type": "Cập nhật loại bán",
      "preparation-time": "Cập nhật thời gian chế biến",
      import: "Import món ăn",
    };
    return titles[type] || "Xử lý sản phẩm";
  };

  // Process remaining items in a batch operation
  const processRemainingItems = React.useCallback(
    async (
      operation: StoredProductBatchOperation,
      onComplete?: (result: ProductBulkOperationResult) => void
    ) => {
      if (isProcessingRef.current) {
        console.warn("Already processing a batch operation");
        return;
      }

      const { id, type, productIds, processedIds, failedItems, categoryId, vatRate, price, boolValue, stringValue, numberValue, title } = operation;
      const batchSize = 50;

      // Calculate remaining items
      const processedSet = new Set(processedIds);
      const remainingIds = productIds.filter((pid) => !processedSet.has(pid));

      if (remainingIds.length === 0) {
        // Already completed
        const result: ProductBulkOperationResult = {
          success: processedIds.length,
          failed: failedItems.length,
          errors: failedItems.map((f) => ({ productId: f.productId, message: f.error })),
        };
        completeProgress(id, `Đã xử lý ${result.success} sản phẩm`);
        storage.clear();
        onComplete?.(result);
        return;
      }

      isProcessingRef.current = true;
      abortRef.current = false;

      // Update progress to running
      updateProgress(id, { status: "running", canResume: false });

      let currentProcessed = [...processedIds];
      let currentFailed = [...failedItems];
      const totalBatches = Math.ceil(remainingIds.length / batchSize);

      try {
        for (let i = 0; i < totalBatches; i++) {
          // Check if aborted
          if (abortRef.current) {
            storage.update({
              processedIds: currentProcessed,
              failedItems: currentFailed,
            });
            updateProgress(id, { status: "paused", canResume: true });
            isProcessingRef.current = false;
            return;
          }

          const start = i * batchSize;
          const end = Math.min(start + batchSize, remainingIds.length);
          const batch = remainingIds.slice(start, end);

          // Update progress
          const progressCurrent = processedIds.length + start;
          updateProgress(id, {
            current: progressCurrent,
            batchNumber: i + 1,
            totalBatches,
          });

          // Process batch based on type
          try {
            let result: ProductBulkOperationResult;

            switch (type) {
              case "category":
                result = await bulkProductService.updateCategory(batch, categoryId!);
                break;
              case "activate":
                result = await bulkProductService.toggleActive(batch, true);
                break;
              case "deactivate":
                result = await bulkProductService.toggleActive(batch, false);
                break;
              case "delete":
                result = await bulkProductService.delete(batch);
                break;
              case "vat":
                result = await bulkProductService.updateVatRate(batch, vatRate!);
                break;
              case "price":
                result = await bulkProductService.updatePrice(batch, price!);
                break;
              case "print-label":
                result = await bulkProductService.updatePrintLabel(batch, boolValue!);
                break;
              case "print-seafood":
                result = await bulkProductService.updatePrintSeafood(batch, boolValue!);
                break;
              case "print-dish":
                result = await bulkProductService.updatePrintDish(batch, boolValue!);
                break;
              case "unit":
                result = await bulkProductService.updateUnit(batch, stringValue!);
                break;
              case "selling-type":
                result = await bulkProductService.updateSellingType(batch, stringValue! as any);
                break;
              case "preparation-time":
                result = await bulkProductService.updatePreparationTime(batch, numberValue!);
                break;
              default:
                throw new Error(`Unknown operation type: ${type}`);
            }

            // Track successful items
            const failedProductIds = new Set(result.errors.map((e) => e.productId));
            const successfulIds = batch.filter((pid) => !failedProductIds.has(pid));
            currentProcessed.push(...successfulIds);

            // Track failed items
            result.errors.forEach((err) => {
              currentFailed.push({ productId: err.productId, error: err.message });
            });

            // Save progress after each batch
            storage.update({
              processedIds: currentProcessed,
              failedItems: currentFailed,
            });
          } catch (error: any) {
            // If entire batch fails, mark all items as failed but continue
            const errorMsg = error?.response?.data?.message || error?.message || "Unknown error";
            batch.forEach((pid) => {
              currentFailed.push({ productId: pid, error: errorMsg });
            });
            storage.update({
              processedIds: currentProcessed,
              failedItems: currentFailed,
            });
          }
        }

        // Completed
        const finalResult: ProductBulkOperationResult = {
          success: currentProcessed.length,
          failed: currentFailed.length,
          errors: currentFailed.map((f) => ({ productId: f.productId, message: f.error })),
        };

        if (finalResult.failed > 0) {
          completeProgress(id, `Thành công: ${finalResult.success}, Thất bại: ${finalResult.failed}`);
        } else {
          completeProgress(id, `Đã xử lý ${finalResult.success} sản phẩm`);
        }

        storage.clear();
        onComplete?.(finalResult);
      } catch (error: any) {
        const errorMsg = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
        errorProgress(id, errorMsg);
        storage.clear();
      } finally {
        isProcessingRef.current = false;
      }
    },
    [updateProgress, completeProgress, errorProgress]
  );

  // Process remaining items in an import operation
  const processRemainingImportItems = React.useCallback(
    async (
      operation: StoredProductBatchOperation,
      onComplete?: (result: ProductBulkImportResult) => void
    ) => {
      if (isProcessingRef.current) {
        console.warn("Already processing an import operation");
        return;
      }

      const { id, importItems, importProcessedIndex, importCreated, importUpdated, importErrors, brandId } = operation;

      if (!importItems || importItems.length === 0 || !brandId) {
        storage.clear();
        return;
      }

      const batchSize = 100;
      const startIndex = importProcessedIndex || 0;
      const remainingItems = importItems.slice(startIndex);

      if (remainingItems.length === 0) {
        // Already completed
        const result: ProductBulkImportResult = {
          created: importCreated || 0,
          updated: importUpdated || 0,
          errors: importErrors || [],
          products: [],
        };
        if ((importErrors?.length || 0) > 0) {
          completeProgress(id, `Tạo: ${result.created}, Cập nhật: ${result.updated}, Lỗi: ${result.errors.length}`);
        } else {
          completeProgress(id, `Tạo: ${result.created}, Cập nhật: ${result.updated}`);
        }
        storage.clear();
        onComplete?.(result);
        return;
      }

      isProcessingRef.current = true;
      abortRef.current = false;

      // Update progress to running
      updateProgress(id, { status: "running", canResume: false });

      let currentProcessedIndex = startIndex;
      let currentCreated = importCreated || 0;
      let currentUpdated = importUpdated || 0;
      let currentErrors = [...(importErrors || [])];
      const totalBatches = Math.ceil(remainingItems.length / batchSize);

      try {
        for (let i = 0; i < totalBatches; i++) {
          // Check if aborted
          if (abortRef.current) {
            storage.update({
              importProcessedIndex: currentProcessedIndex,
              importCreated: currentCreated,
              importUpdated: currentUpdated,
              importErrors: currentErrors,
            });
            updateProgress(id, { status: "paused", canResume: true });
            isProcessingRef.current = false;
            return;
          }

          const batchStart = i * batchSize;
          const batchEnd = Math.min(batchStart + batchSize, remainingItems.length);
          const batch = remainingItems.slice(batchStart, batchEnd);

          // Update progress
          updateProgress(id, {
            current: currentProcessedIndex,
            batchNumber: i + 1,
            totalBatches,
          });

          try {
            const result = await productService.bulkImport(batch, brandId);

            currentCreated += result.created;
            currentUpdated += result.updated;

            // Adjust row numbers for errors (add startIndex offset)
            result.errors.forEach((err) => {
              currentErrors.push({
                row: err.row + startIndex,
                message: err.message,
              });
            });

            currentProcessedIndex = startIndex + batchEnd;

            // Save progress after each batch
            storage.update({
              importProcessedIndex: currentProcessedIndex,
              importCreated: currentCreated,
              importUpdated: currentUpdated,
              importErrors: currentErrors,
            });
          } catch (error: any) {
            // If entire batch fails, mark all items in batch as errors
            const errorMsg = error?.response?.data?.message || error?.message || "Unknown error";
            batch.forEach((_, idx) => {
              currentErrors.push({
                row: startIndex + batchStart + idx + 2, // +2 for Excel header
                message: errorMsg,
              });
            });
            currentProcessedIndex = startIndex + batchEnd;
            storage.update({
              importProcessedIndex: currentProcessedIndex,
              importCreated: currentCreated,
              importUpdated: currentUpdated,
              importErrors: currentErrors,
            });
          }
        }

        // Completed
        const finalResult: ProductBulkImportResult = {
          created: currentCreated,
          updated: currentUpdated,
          errors: currentErrors,
          products: [],
        };

        if (finalResult.errors.length > 0) {
          completeProgress(id, `Tạo: ${finalResult.created}, Cập nhật: ${finalResult.updated}, Lỗi: ${finalResult.errors.length}`);
        } else {
          completeProgress(id, `Tạo: ${finalResult.created}, Cập nhật: ${finalResult.updated}`);
        }

        storage.clear();
        onComplete?.(finalResult);
      } catch (error: any) {
        const errorMsg = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
        errorProgress(id, errorMsg);
        storage.clear();
      } finally {
        isProcessingRef.current = false;
      }
    },
    [updateProgress, completeProgress, errorProgress]
  );

  // Start a new batch operation
  const startBatch = React.useCallback(
    async (options: StartBatchOptions) => {
      const { productIds, type, categoryId, vatRate, price, boolValue, stringValue, numberValue, onComplete } = options;

      if (productIds.length === 0) return;

      const id = `product-batch-${Date.now()}`;
      const title = getOperationTitle(type);
      const total = productIds.length;
      const batchSize = options.batchSize || 50;
      const totalBatches = Math.ceil(total / batchSize);

      // Create operation in storage
      const operation: StoredProductBatchOperation = {
        id,
        type,
        title,
        productIds,
        processedIds: [],
        failedItems: [],
        categoryId,
        vatRate,
        price,
        boolValue,
        stringValue,
        numberValue,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      storage.save(operation);

      // Add to progress UI
      addProgress({
        id,
        title,
        current: 0,
        total,
        batchNumber: 1,
        totalBatches,
        persistentType: `product-${type}`,
        canResume: true,
      });

      // Process
      await processRemainingItems(operation, onComplete);
    },
    [addProgress, processRemainingItems]
  );

  // Start a new import operation
  const startImport = React.useCallback(
    async (options: StartImportOptions) => {
      const { items, brandId, onComplete } = options;

      if (items.length === 0) return;

      const id = `product-import-${Date.now()}`;
      const title = getOperationTitle("import");
      const total = items.length;
      const batchSize = options.batchSize || 100;
      const totalBatches = Math.ceil(total / batchSize);

      // Create operation in storage
      const operation: StoredProductBatchOperation = {
        id,
        type: "import",
        title,
        productIds: [], // Not used for import
        processedIds: [],
        failedItems: [],
        importItems: items,
        importProcessedIndex: 0,
        importCreated: 0,
        importUpdated: 0,
        importErrors: [],
        brandId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      storage.save(operation);

      // Add to progress UI
      addProgress({
        id,
        title,
        current: 0,
        total,
        batchNumber: 1,
        totalBatches,
        persistentType: "product-import",
        canResume: true,
      });

      // Process
      await processRemainingImportItems(operation, onComplete);
    },
    [addProgress, processRemainingImportItems]
  );

  // Resume handler for when user clicks resume button
  const handleResume = React.useCallback(
    (progressId: string) => {
      const operation = storage.get();
      if (operation && operation.id === progressId) {
        if (operation.type === "import") {
          processRemainingImportItems(operation);
        } else {
          processRemainingItems(operation);
        }
      }
    },
    [processRemainingItems, processRemainingImportItems]
  );

  // Check for pending operations on mount and setup resume handler
  React.useEffect(() => {
    // Register handler with type "product" so it can be looked up by persistentType prefix
    setResumeHandler(handleResume, "product");

    const pendingOperation = storage.get();
    if (pendingOperation) {
      const { id, title, type, productIds, processedIds, importItems, importProcessedIndex } = pendingOperation;

      let total: number;
      let current: number;

      if (type === "import") {
        total = importItems?.length || 0;
        current = importProcessedIndex || 0;
      } else {
        total = productIds.length;
        current = processedIds.length;
      }

      // Check if already shown in progresses
      const alreadyShown = progresses.some((p) => p.id === id);
      if (!alreadyShown && current < total) {
        // Add to progress as resumable
        addProgress({
          id,
          title,
          current,
          total,
          status: "resumable",
          persistentType: type === "import" ? "product-import" : `product-${type}`,
          canResume: true,
        });
      }
    }

    return () => {
      setResumeHandler(undefined, "product");
    };
  }, [setResumeHandler, handleResume, addProgress, progresses]);

  // Abort current operation
  const abortBatch = React.useCallback(() => {
    abortRef.current = true;
  }, []);

  // Check if there's a pending operation
  const hasPendingOperation = React.useCallback((): boolean => {
    const operation = storage.get();
    if (!operation) return false;
    if (operation.type === "import") {
      return (operation.importProcessedIndex || 0) < (operation.importItems?.length || 0);
    }
    return operation.processedIds.length < operation.productIds.length;
  }, []);

  // Get pending operation info
  const getPendingOperation = React.useCallback((): StoredProductBatchOperation | null => {
    return storage.get();
  }, []);

  // Clear pending operation
  const clearPendingOperation = React.useCallback(() => {
    storage.clear();
  }, []);

  return {
    startBatch,
    startImport,
    abortBatch,
    hasPendingOperation,
    getPendingOperation,
    clearPendingOperation,
    isProcessing: isProcessingRef.current,
  };
}
