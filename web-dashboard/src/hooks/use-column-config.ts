"use client";

import * as React from "react";

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  locked?: boolean; // Some columns cannot be hidden (like name, actions)
}

interface UseColumnConfigOptions {
  storageKey: string;
  defaultColumns: ColumnConfig[];
}

interface UseColumnConfigReturn {
  columns: ColumnConfig[];
  visibleColumns: ColumnConfig[];
  toggleColumn: (key: string) => void;
  setColumnVisibility: (key: string, visible: boolean) => void;
  resetToDefault: () => void;
  isColumnVisible: (key: string) => boolean;
}

export function useColumnConfig({
  storageKey,
  defaultColumns,
}: UseColumnConfigOptions): UseColumnConfigReturn {
  const [columns, setColumns] = React.useState<ColumnConfig[]>(() => {
    // Try to load from localStorage on initial render
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as ColumnConfig[];
          // Merge saved config with defaults to handle new columns
          const mergedColumns = defaultColumns.map((defaultCol) => {
            const savedCol = parsed.find((c) => c.key === defaultCol.key);
            return savedCol
              ? { ...defaultCol, visible: savedCol.visible }
              : defaultCol;
          });
          return mergedColumns;
        } catch {
          return defaultColumns;
        }
      }
    }
    return defaultColumns;
  });

  // Save to localStorage when columns change
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(columns));
    }
  }, [columns, storageKey]);

  const visibleColumns = React.useMemo(
    () => columns.filter((col) => col.visible),
    [columns]
  );

  const toggleColumn = React.useCallback((key: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === key && !col.locked ? { ...col, visible: !col.visible } : col
      )
    );
  }, []);

  const setColumnVisibility = React.useCallback(
    (key: string, visible: boolean) => {
      setColumns((prev) =>
        prev.map((col) =>
          col.key === key && !col.locked ? { ...col, visible } : col
        )
      );
    },
    []
  );

  const resetToDefault = React.useCallback(() => {
    setColumns(defaultColumns);
  }, [defaultColumns]);

  const isColumnVisible = React.useCallback(
    (key: string) => {
      const col = columns.find((c) => c.key === key);
      return col?.visible ?? false;
    },
    [columns]
  );

  return {
    columns,
    visibleColumns,
    toggleColumn,
    setColumnVisibility,
    resetToDefault,
    isColumnVisible,
  };
}
