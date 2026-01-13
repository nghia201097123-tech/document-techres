"use client";

import * as React from "react";
import { useBackgroundProgress, type BackgroundProgressInfo } from "@/components/ui/background-progress";
import { bulkStaffService, staffService, type BulkOperationResult, type BatchProgressInfo, type BulkStaffItem, type BulkImportResult } from "@/services/staff-service";

/**
 * Storage key for staff batch operations
 */
const STAFF_BATCH_STORAGE_KEY = "staff-batch-operation";

/**
 * Types of staff batch operations
 */
export type StaffBatchOperationType = "department" | "branch" | "activate" | "deactivate" | "delete" | "import";

/**
 * Stored batch operation data
 */
export interface StoredStaffBatchOperation {
  id: string;
  type: StaffBatchOperationType;
  title: string;
  // All staff IDs to process (for bulk operations)
  staffIds: string[];
  // Staff IDs that have been successfully processed
  processedIds: string[];
  // Failed items with errors
  failedItems: { staffId: string; error: string }[];
  // Additional parameters for bulk operations
  departmentId?: string;
  branchId?: string;
  // Import-specific fields
  importItems?: BulkStaffItem[];
  importProcessedIndex?: number; // Index of last processed item
  importCreated?: number;
  importUpdated?: number;
  importErrors?: { row: number; message: string }[];
  usernamePrefix?: string;
  // Timestamps
  createdAt: number;
  updatedAt: number;
}

/**
 * Storage helpers
 */
const storage = {
  get: (): StoredStaffBatchOperation | null => {
    if (typeof window === "undefined") return null;
    try {
      const data = localStorage.getItem(STAFF_BATCH_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  save: (operation: StoredStaffBatchOperation) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STAFF_BATCH_STORAGE_KEY, JSON.stringify(operation));
    } catch (e) {
      console.error("Failed to save staff batch operation:", e);
    }
  },

  update: (updates: Partial<StoredStaffBatchOperation>) => {
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
      localStorage.removeItem(STAFF_BATCH_STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear staff batch operation:", e);
    }
  },
};

/**
 * Options for starting a batch operation
 */
interface StartBatchOptions {
  staffIds: string[];
  type: StaffBatchOperationType;
  departmentId?: string;
  branchId?: string;
  batchSize?: number;
  onComplete?: (result: BulkOperationResult) => void;
}

/**
 * Options for starting an import operation
 */
interface StartImportOptions {
  items: BulkStaffItem[];
  usernamePrefix?: string;
  batchSize?: number;
  onComplete?: (result: BulkImportResult) => void;
}

/**
 * Hook for managing persistent staff batch operations
 */
export function useStaffBatch() {
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
  const getOperationTitle = (type: StaffBatchOperationType): string => {
    const titles: Record<StaffBatchOperationType, string> = {
      department: "Cập nhật bộ phận",
      branch: "Cập nhật chi nhánh",
      activate: "Bật nhân viên",
      deactivate: "Tắt nhân viên",
      delete: "Xóa nhân viên",
      import: "Import nhân viên",
    };
    return titles[type] || "Xử lý nhân viên";
  };

  // Process remaining items in a batch operation
  const processRemainingItems = React.useCallback(
    async (
      operation: StoredStaffBatchOperation,
      onComplete?: (result: BulkOperationResult) => void
    ) => {
      if (isProcessingRef.current) {
        console.warn("Already processing a batch operation");
        return;
      }

      const { id, type, staffIds, processedIds, failedItems, departmentId, branchId, title } = operation;
      const batchSize = 50;

      // Calculate remaining items
      const processedSet = new Set(processedIds);
      const remainingIds = staffIds.filter((sid) => !processedSet.has(sid));

      if (remainingIds.length === 0) {
        // Already completed
        const result: BulkOperationResult = {
          success: processedIds.length,
          failed: failedItems.length,
          errors: failedItems.map((f) => ({ staffId: f.staffId, message: f.error })),
        };
        completeProgress(id, `Đã xử lý ${result.success} nhân viên`);
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
            let result: BulkOperationResult;

            switch (type) {
              case "department":
                result = await bulkStaffService.updateDepartment(batch, departmentId!);
                break;
              case "branch":
                result = await bulkStaffService.updateBranch(batch, branchId!);
                break;
              case "activate":
                result = await bulkStaffService.toggleActive(batch, true);
                break;
              case "deactivate":
                result = await bulkStaffService.toggleActive(batch, false);
                break;
              case "delete":
                result = await bulkStaffService.delete(batch);
                break;
              default:
                throw new Error(`Unknown operation type: ${type}`);
            }

            // Track successful items
            const failedStaffIds = new Set(result.errors.map((e) => e.staffId));
            const successfulIds = batch.filter((sid) => !failedStaffIds.has(sid));
            currentProcessed.push(...successfulIds);

            // Track failed items
            result.errors.forEach((err) => {
              currentFailed.push({ staffId: err.staffId, error: err.message });
            });

            // Save progress after each batch
            storage.update({
              processedIds: currentProcessed,
              failedItems: currentFailed,
            });
          } catch (error: any) {
            // If entire batch fails, mark all items as failed but continue
            const errorMsg = error?.response?.data?.message || error?.message || "Unknown error";
            batch.forEach((sid) => {
              currentFailed.push({ staffId: sid, error: errorMsg });
            });
            storage.update({
              processedIds: currentProcessed,
              failedItems: currentFailed,
            });
          }
        }

        // Completed
        const finalResult: BulkOperationResult = {
          success: currentProcessed.length,
          failed: currentFailed.length,
          errors: currentFailed.map((f) => ({ staffId: f.staffId, message: f.error })),
        };

        if (finalResult.failed > 0) {
          completeProgress(id, `Thành công: ${finalResult.success}, Thất bại: ${finalResult.failed}`);
        } else {
          completeProgress(id, `Đã xử lý ${finalResult.success} nhân viên`);
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
      operation: StoredStaffBatchOperation,
      onComplete?: (result: BulkImportResult) => void
    ) => {
      if (isProcessingRef.current) {
        console.warn("Already processing an import operation");
        return;
      }

      const { id, importItems, importProcessedIndex, importCreated, importUpdated, importErrors, usernamePrefix } = operation;

      if (!importItems || importItems.length === 0) {
        storage.clear();
        return;
      }

      const batchSize = 100;
      const startIndex = importProcessedIndex || 0;
      const remainingItems = importItems.slice(startIndex);

      if (remainingItems.length === 0) {
        // Already completed
        const result: BulkImportResult = {
          created: importCreated || 0,
          updated: importUpdated || 0,
          errors: importErrors || [],
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
            const result = await staffService.bulkImport(batch, usernamePrefix);

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
        const finalResult: BulkImportResult = {
          created: currentCreated,
          updated: currentUpdated,
          errors: currentErrors,
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
      const { staffIds, type, departmentId, branchId, onComplete } = options;

      if (staffIds.length === 0) return;

      const id = `staff-batch-${Date.now()}`;
      const title = getOperationTitle(type);
      const total = staffIds.length;
      const batchSize = options.batchSize || 50;
      const totalBatches = Math.ceil(total / batchSize);

      // Create operation in storage
      const operation: StoredStaffBatchOperation = {
        id,
        type,
        title,
        staffIds,
        processedIds: [],
        failedItems: [],
        departmentId,
        branchId,
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
        persistentType: `staff-${type}`,
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
      const { items, usernamePrefix, onComplete } = options;

      if (items.length === 0) return;

      const id = `staff-import-${Date.now()}`;
      const title = getOperationTitle("import");
      const total = items.length;
      const batchSize = options.batchSize || 100;
      const totalBatches = Math.ceil(total / batchSize);

      // Create operation in storage
      const operation: StoredStaffBatchOperation = {
        id,
        type: "import",
        title,
        staffIds: [], // Not used for import
        processedIds: [],
        failedItems: [],
        importItems: items,
        importProcessedIndex: 0,
        importCreated: 0,
        importUpdated: 0,
        importErrors: [],
        usernamePrefix,
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
        persistentType: "staff-import",
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
    // Register handler with type "staff" so it can be looked up by persistentType prefix
    setResumeHandler(handleResume, "staff");

    const pendingOperation = storage.get();
    if (pendingOperation) {
      const { id, title, type, staffIds, processedIds, importItems, importProcessedIndex } = pendingOperation;

      let total: number;
      let current: number;

      if (type === "import") {
        total = importItems?.length || 0;
        current = importProcessedIndex || 0;
      } else {
        total = staffIds.length;
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
          persistentType: type === "import" ? "staff-import" : `staff-${type}`,
          canResume: true,
        });
      }
    }

    return () => {
      setResumeHandler(undefined, "staff");
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
    return operation.processedIds.length < operation.staffIds.length;
  }, []);

  // Get pending operation info
  const getPendingOperation = React.useCallback((): StoredStaffBatchOperation | null => {
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
