"use client";

import * as React from "react";
import {
  Check,
  X,
  Pencil,
  Trash2,
  MoreHorizontal,
  Eye,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: keyof T | string;
  title: string;
  width?: string;
  editable?: boolean;
  type?: "text" | "email" | "phone" | "status" | "badge" | "custom";
  render?: (value: unknown, row: T) => React.ReactNode;
  validate?: (value: string) => boolean | string;
}

interface InlineEditableTableProps<T extends { id: string; isActive?: boolean }> {
  data: T[];
  columns: Column<T>[];
  onUpdate: (id: string, field: string, value: unknown) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onView?: (row: T) => void;
  onToggleStatus?: (id: string) => Promise<void>;
  isLoading?: boolean;
  emptyMessage?: string;
}

interface EditingCell {
  rowId: string;
  columnKey: string;
  value: string;
}

export function InlineEditableTable<T extends { id: string; isActive?: boolean }>({
  data,
  columns,
  onUpdate,
  onDelete,
  onView,
  onToggleStatus,
  isLoading = false,
  emptyMessage = "Không có dữ liệu",
}: InlineEditableTableProps<T>) {
  const [editingCell, setEditingCell] = React.useState<EditingCell | null>(null);
  const [savingCell, setSavingCell] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  React.useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const startEditing = (rowId: string, columnKey: string, currentValue: unknown) => {
    setEditingCell({
      rowId,
      columnKey,
      value: String(currentValue ?? ""),
    });
  };

  const cancelEditing = () => {
    setEditingCell(null);
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    const column = columns.find((c) => c.key === editingCell.columnKey);
    if (column?.validate) {
      const validationResult = column.validate(editingCell.value);
      if (validationResult !== true) {
        // Show validation error (could be enhanced with toast)
        console.error(validationResult);
        return;
      }
    }

    const cellKey = `${editingCell.rowId}-${editingCell.columnKey}`;
    setSavingCell(cellKey);

    try {
      await onUpdate(editingCell.rowId, editingCell.columnKey, editingCell.value);
      setEditingCell(null);
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setSavingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const getValue = (row: T, key: keyof T | string): unknown => {
    if (typeof key === "string" && key.includes(".")) {
      const keys = key.split(".");
      let value: unknown = row;
      for (const k of keys) {
        value = (value as Record<string, unknown>)?.[k];
      }
      return value;
    }
    return row[key as keyof T];
  };

  const renderCell = (row: T, column: Column<T>) => {
    const value = getValue(row, column.key);
    const isEditing =
      editingCell?.rowId === row.id && editingCell?.columnKey === column.key;
    const isSaving = savingCell === `${row.id}-${String(column.key)}`;

    // Custom render
    if (column.render) {
      return column.render(value, row);
    }

    // Status badge with toggle
    if (column.type === "status") {
      const isActive = value as boolean;
      return (
        <Badge
          variant={isActive ? "success" : "secondary"}
          className="cursor-pointer"
          onClick={() => onToggleStatus?.(row.id)}
        >
          {isActive ? "Hoạt động" : "Tạm dừng"}
        </Badge>
      );
    }

    // Editable cell
    if (column.editable) {
      if (isEditing) {
        return (
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              type={column.type === "email" ? "email" : "text"}
              value={editingCell.value}
              onChange={(e) =>
                setEditingCell({ ...editingCell, value: e.target.value })
              }
              onKeyDown={handleKeyDown}
              className="h-8 min-w-[120px]"
              disabled={isSaving}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-green-500 hover:text-green-600"
              onClick={saveEdit}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive/80"
              onClick={cancelEditing}
              disabled={isSaving}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      }

      return (
        <div
          className="group flex cursor-pointer items-center gap-2 rounded px-2 py-1 -mx-2 hover:bg-muted/50"
          onClick={() => startEditing(row.id, column.key as string, value)}
        >
          <span className="truncate">{String(value ?? "-")}</span>
          <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
        </div>
      );
    }

    // Default render
    return <span className="truncate">{String(value ?? "-")}</span>;
  };

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={String(column.key)}
                style={{ width: column.width }}
              >
                {column.title}
              </TableHead>
            ))}
            <TableHead className="w-[60px]">
              <span className="sr-only">Thao tác</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.id}
              className={cn(
                deletingId === row.id && "opacity-50 pointer-events-none"
              )}
            >
              {columns.map((column) => (
                <TableCell key={String(column.key)}>
                  {renderCell(row, column)}
                </TableCell>
              ))}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={deletingId === row.id}
                    >
                      {deletingId === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onView && (
                      <DropdownMenuItem onClick={() => onView(row)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Xem chi tiết
                      </DropdownMenuItem>
                    )}
                    {onToggleStatus && (
                      <DropdownMenuItem onClick={() => onToggleStatus(row.id)}>
                        <Save className="mr-2 h-4 w-4" />
                        {row.isActive ? "Tạm dừng" : "Kích hoạt"}
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(row.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
