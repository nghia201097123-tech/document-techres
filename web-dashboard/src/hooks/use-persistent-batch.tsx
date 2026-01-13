"use client";

import * as React from "react";

/**
 * Storage key for batch operations
 */
const BATCH_STORAGE_KEY = "persistent-batch-operations";

/**
 * Represents a single batch operation that can be persisted and resumed
 */
export interface PersistentBatchOperation {
  id: string;
  title: string;
  type: "staff-department" | "staff-branch" | "staff-activate" | "staff-deactivate" | "staff-import" | "product-import" | string;
  // All items to process
  items: string[];
  // Extra params needed for the operation (e.g., departmentId, branchId)
  params: Record<string, unknown>;
  // Items that have been successfully processed
  processedItems: string[];
  // Items that failed
  failedItems: { id: string; error: string }[];
  // Current status
  status: "running" | "paused" | "completed" | "error";
  // Creation timestamp
  createdAt: number;
  // Last update timestamp
  updatedAt: number;
  // Error message if status is error
  errorMessage?: string;
}

/**
 * Progress info for UI
 */
export interface BatchProgressInfo {
  id: string;
  title: string;
  current: number;
  total: number;
  status: "running" | "paused" | "completed" | "error";
  errorMessage?: string;
}

/**
 * Result of a batch operation
 */
export interface BatchOperationResult {
  success: number;
  failed: number;
  errors: { id: string; error: string }[];
}

/**
 * Options for processing a batch
 */
export interface BatchProcessOptions<T = unknown> {
  batchSize?: number;
  // Function to process a single batch of items
  processBatch: (items: string[], params: Record<string, unknown>) => Promise<{
    success: string[];
    failed: { id: string; error: string }[];
  }>;
  // Callback when progress updates
  onProgress?: (progress: BatchProgressInfo) => void;
  // Callback when completed
  onComplete?: (result: BatchOperationResult) => void;
  // Callback when error occurs
  onError?: (error: string) => void;
}

/**
 * Storage helper functions
 */
const storage = {
  getAll: (): PersistentBatchOperation[] => {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(BATCH_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  save: (operations: PersistentBatchOperation[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(operations));
    } catch (e) {
      console.error("Failed to save batch operations:", e);
    }
  },

  get: (id: string): PersistentBatchOperation | null => {
    const operations = storage.getAll();
    return operations.find((op) => op.id === id) || null;
  },

  update: (id: string, updates: Partial<PersistentBatchOperation>) => {
    const operations = storage.getAll();
    const index = operations.findIndex((op) => op.id === id);
    if (index >= 0) {
      operations[index] = {
        ...operations[index],
        ...updates,
        updatedAt: Date.now(),
      };
      storage.save(operations);
    }
  },

  add: (operation: PersistentBatchOperation) => {
    const operations = storage.getAll();
    // Remove any existing operation with same id
    const filtered = operations.filter((op) => op.id !== operation.id);
    filtered.push(operation);
    storage.save(filtered);
  },

  remove: (id: string) => {
    const operations = storage.getAll();
    storage.save(operations.filter((op) => op.id !== id));
  },

  // Clean up completed/old operations (older than 1 hour)
  cleanup: () => {
    const operations = storage.getAll();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const active = operations.filter(
      (op) =>
        op.status === "running" ||
        op.status === "paused" ||
        op.updatedAt > oneHourAgo
    );
    storage.save(active);
  },
};

/**
 * Hook context type
 */
interface PersistentBatchContextType {
  // Active operations
  operations: PersistentBatchOperation[];
  // Start a new batch operation
  startBatch: (
    id: string,
    title: string,
    type: string,
    items: string[],
    params: Record<string, unknown>,
    options: BatchProcessOptions
  ) => Promise<BatchOperationResult>;
  // Resume a paused operation
  resumeBatch: (id: string, options: BatchProcessOptions) => Promise<BatchOperationResult>;
  // Pause a running operation (will be resumed on next page load)
  pauseBatch: (id: string) => void;
  // Cancel and remove an operation
  cancelBatch: (id: string) => void;
  // Get progress info for an operation
  getProgress: (id: string) => BatchProgressInfo | null;
  // Get all running operations
  getRunningOperations: () => PersistentBatchOperation[];
  // Check if there are operations to resume
  hasPendingOperations: () => boolean;
}

const PersistentBatchContext = React.createContext<PersistentBatchContextType | null>(null);

/**
 * Hook to use persistent batch operations
 */
export function usePersistentBatch() {
  const context = React.useContext(PersistentBatchContext);
  if (!context) {
    throw new Error("usePersistentBatch must be used within PersistentBatchProvider");
  }
  return context;
}

/**
 * Provider component for persistent batch operations
 */
export function PersistentBatchProvider({ children }: { children: React.ReactNode }) {
  const [operations, setOperations] = React.useState<PersistentBatchOperation[]>([]);
  const runningRef = React.useRef<Set<string>>(new Set());

  // Load operations from storage on mount
  React.useEffect(() => {
    storage.cleanup();
    const stored = storage.getAll();
    setOperations(stored);
  }, []);

  // Sync state with storage
  const syncOperations = React.useCallback(() => {
    setOperations(storage.getAll());
  }, []);

  // Process batch items
  const processBatchItems = React.useCallback(
    async (
      operation: PersistentBatchOperation,
      options: BatchProcessOptions
    ): Promise<BatchOperationResult> => {
      const batchSize = options.batchSize || 50;
      const { items, processedItems, failedItems, params, id, title } = operation;

      // Calculate remaining items
      const processedSet = new Set(processedItems);
      const remainingItems = items.filter((item) => !processedSet.has(item));

      if (remainingItems.length === 0) {
        // Already completed
        storage.update(id, { status: "completed" });
        syncOperations();
        return {
          success: processedItems.length,
          failed: failedItems.length,
          errors: failedItems,
        };
      }

      // Mark as running
      storage.update(id, { status: "running" });
      runningRef.current.add(id);
      syncOperations();

      const totalBatches = Math.ceil(remainingItems.length / batchSize);
      let currentProcessed = [...processedItems];
      let currentFailed = [...failedItems];

      try {
        for (let i = 0; i < totalBatches; i++) {
          // Check if operation was paused/cancelled
          if (!runningRef.current.has(id)) {
            storage.update(id, {
              status: "paused",
              processedItems: currentProcessed,
              failedItems: currentFailed,
            });
            syncOperations();
            break;
          }

          const start = i * batchSize;
          const end = Math.min(start + batchSize, remainingItems.length);
          const batch = remainingItems.slice(start, end);

          // Report progress
          const progress: BatchProgressInfo = {
            id,
            title,
            current: processedItems.length + start,
            total: items.length,
            status: "running",
          };
          options.onProgress?.(progress);

          // Process batch
          try {
            const result = await options.processBatch(batch, params);
            currentProcessed.push(...result.success);
            currentFailed.push(...result.failed);

            // Save progress after each batch
            storage.update(id, {
              processedItems: currentProcessed,
              failedItems: currentFailed,
            });
            syncOperations();
          } catch (error: any) {
            // If batch fails completely, mark all items as failed
            const errorMsg = error?.message || "Unknown error";
            batch.forEach((itemId) => {
              currentFailed.push({ id: itemId, error: errorMsg });
            });
            storage.update(id, {
              processedItems: currentProcessed,
              failedItems: currentFailed,
            });
            syncOperations();
          }
        }

        // Check if completed
        if (runningRef.current.has(id)) {
          const finalResult: BatchOperationResult = {
            success: currentProcessed.length,
            failed: currentFailed.length,
            errors: currentFailed,
          };

          storage.update(id, {
            status: "completed",
            processedItems: currentProcessed,
            failedItems: currentFailed,
          });
          runningRef.current.delete(id);
          syncOperations();

          options.onComplete?.(finalResult);
          return finalResult;
        }

        // Operation was paused
        return {
          success: currentProcessed.length,
          failed: currentFailed.length,
          errors: currentFailed,
        };
      } catch (error: any) {
        const errorMsg = error?.message || "Unknown error";
        storage.update(id, {
          status: "error",
          errorMessage: errorMsg,
          processedItems: currentProcessed,
          failedItems: currentFailed,
        });
        runningRef.current.delete(id);
        syncOperations();
        options.onError?.(errorMsg);

        return {
          success: currentProcessed.length,
          failed: currentFailed.length,
          errors: currentFailed,
        };
      }
    },
    [syncOperations]
  );

  // Start a new batch operation
  const startBatch = React.useCallback(
    async (
      id: string,
      title: string,
      type: string,
      items: string[],
      params: Record<string, unknown>,
      options: BatchProcessOptions
    ): Promise<BatchOperationResult> => {
      const operation: PersistentBatchOperation = {
        id,
        title,
        type,
        items,
        params,
        processedItems: [],
        failedItems: [],
        status: "running",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      storage.add(operation);
      syncOperations();

      return processBatchItems(operation, options);
    },
    [processBatchItems, syncOperations]
  );

  // Resume a paused operation
  const resumeBatch = React.useCallback(
    async (id: string, options: BatchProcessOptions): Promise<BatchOperationResult> => {
      const operation = storage.get(id);
      if (!operation) {
        throw new Error(`Operation ${id} not found`);
      }
      if (operation.status !== "paused" && operation.status !== "running") {
        throw new Error(`Operation ${id} is not paused (status: ${operation.status})`);
      }

      return processBatchItems(operation, options);
    },
    [processBatchItems]
  );

  // Pause a running operation
  const pauseBatch = React.useCallback((id: string) => {
    runningRef.current.delete(id);
    storage.update(id, { status: "paused" });
    syncOperations();
  }, [syncOperations]);

  // Cancel and remove an operation
  const cancelBatch = React.useCallback((id: string) => {
    runningRef.current.delete(id);
    storage.remove(id);
    syncOperations();
  }, [syncOperations]);

  // Get progress info for an operation
  const getProgress = React.useCallback((id: string): BatchProgressInfo | null => {
    const operation = storage.get(id);
    if (!operation) return null;

    return {
      id: operation.id,
      title: operation.title,
      current: operation.processedItems.length,
      total: operation.items.length,
      status: operation.status,
      errorMessage: operation.errorMessage,
    };
  }, []);

  // Get all running/paused operations
  const getRunningOperations = React.useCallback((): PersistentBatchOperation[] => {
    return storage.getAll().filter(
      (op) => op.status === "running" || op.status === "paused"
    );
  }, []);

  // Check if there are operations to resume
  const hasPendingOperations = React.useCallback((): boolean => {
    return getRunningOperations().length > 0;
  }, [getRunningOperations]);

  const contextValue = React.useMemo(
    () => ({
      operations,
      startBatch,
      resumeBatch,
      pauseBatch,
      cancelBatch,
      getProgress,
      getRunningOperations,
      hasPendingOperations,
    }),
    [
      operations,
      startBatch,
      resumeBatch,
      pauseBatch,
      cancelBatch,
      getProgress,
      getRunningOperations,
      hasPendingOperations,
    ]
  );

  return (
    <PersistentBatchContext.Provider value={contextValue}>
      {children}
    </PersistentBatchContext.Provider>
  );
}
