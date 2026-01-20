"use client";

import * as React from "react";
import { Plus, Gift, Loader2, MoreHorizontal, Pencil, Power, Trash2, Search, Check, X, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { giftItemService, type GiftItem, type CreateGiftItemDto, type UpdateGiftItemDto } from "@/services/gift-item-service";
import { productService, type Product, ProductType } from "@/services/product-service";
import { BrandBranchFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";
import { useColumnConfig, type ColumnConfig } from "@/hooks/use-column-config";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";
import { useBackgroundProgress } from "@/components/ui/background-progress";
import GiftItemCreateDialog from "./GiftItemCreateDialog";
import GiftItemFormDialog from "./GiftItemFormDialog";

// Format currency (no decimals for VND)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
};

// Default column configuration
const defaultColumns: ColumnConfig[] = [
  { key: "name", label: "Món tặng", visible: true, locked: true },
  { key: "product", label: "Món ăn gốc", visible: true },
  { key: "maxQuantity", label: "SL tối đa", visible: true },
  { key: "minOrderAmount", label: "Đơn tối thiểu", visible: true },
  { key: "description", label: "Mô tả", visible: false },
  { key: "sortOrder", label: "Thứ tự", visible: false },
  { key: "isActive", label: "Trạng thái", visible: true },
];

type DialogMode = "create" | "edit" | null;

export default function GiftItemsPage() {
  const { toast } = useToast();
  const { addProgress, updateProgress, completeProgress, errorProgress } = useBackgroundProgress();

  // Global filter state from Redux
  const { brandId: filterBrandId, branchId: filterBranchId, setBrandId: setFilterBrandId, setBranchId: setFilterBranchId } = useGlobalFilters();

  // Column configuration
  const {
    columns,
    toggleColumn,
    resetToDefault,
    isColumnVisible,
  } = useColumnConfig({
    storageKey: "gift-items-table-columns",
    defaultColumns,
  });

  const [giftItems, setGiftItems] = React.useState<GiftItem[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingProducts, setLoadingProducts] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<GiftItem | null>(null);
  const [deleteItem, setDeleteItem] = React.useState<GiftItem | null>(null);

  // Status filter state
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Track newly created and updated IDs for badges
  const [newItemIds, setNewItemIds] = React.useState<Set<string>>(new Set());
  const [updatedItemIds, setUpdatedItemIds] = React.useState<Set<string>>(new Set());

  // Bulk operations state
  const [selectedItemIds, setSelectedItemIds] = React.useState<Set<string>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);
  const pageSizeOptions = [10, 20, 50, 100, 200];

  // Load products when brand changes (exclude COMBO and TOPPING)
  const loadProducts = React.useCallback(async (brandId: string) => {
    if (!brandId) {
      setProducts([]);
      return;
    }
    try {
      setLoadingProducts(true);
      const data = await productService.getAll(brandId);
      // Filter: only active products, exclude COMBO and TOPPING
      const filteredProducts = data.filter(p =>
        p.isActive &&
        p.type !== ProductType.COMBO &&
        p.type !== ProductType.TOPPING
      );
      setProducts(filteredProducts);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  React.useEffect(() => {
    loadProducts(filterBrandId);
  }, [filterBrandId, loadProducts]);

  // Load gift items - only when branch is selected
  const loadGiftItems = React.useCallback(async (branchId: string) => {
    if (!branchId) {
      setGiftItems([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await giftItemService.getAll(branchId);
      // Sort by createdAt descending (newest first)
      const sortedData = [...data].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setGiftItems(sortedData);
    } catch (error) {
      console.error("Error loading gift items:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách món tặng", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadGiftItems(filterBranchId);
  }, [filterBranchId, loadGiftItems]);

  // Get existing product IDs that are already gift items
  const existingProductIds = React.useMemo(() => {
    return new Set(giftItems.map(item => item.productId).filter((id): id is string => Boolean(id)));
  }, [giftItems]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedItem(null);
    setDialogMode("create");
  };

  // Open edit dialog
  const handleOpenEdit = (item: GiftItem) => {
    setSelectedItem(item);
    setDialogMode("edit");
    // Remove badges when editing
    setNewItemIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
    setUpdatedItemIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedItem(null);
  };

  // Handle create success
  const handleCreateSuccess = (createdItems: GiftItem[]) => {
    setGiftItems(prev => [...createdItems, ...prev]);
    createdItems.forEach(item => {
      setNewItemIds(prev => new Set([...prev, item.id]));
    });
  };

  // Handle edit success
  const handleEditSuccess = (updatedItem: GiftItem) => {
    setGiftItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    setUpdatedItemIds(prev => new Set([...prev, updatedItem.id]));
    setNewItemIds(prev => {
      const next = new Set(prev);
      next.delete(updatedItem.id);
      return next;
    });
  };

  // Handle toggle active
  const handleToggleActive = async (item: GiftItem) => {
    try {
      const updated = await giftItemService.toggleActive(item.id);
      setGiftItems((prev) => prev.map((g) => (g.id === item.id ? updated : g)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} món tặng "${item.name}"`,
      });
    } catch (error: any) {
      console.error("Error toggling gift item:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      await giftItemService.delete(deleteItem.id);
      setGiftItems((prev) => prev.filter((g) => g.id !== deleteItem.id));
      toast({ title: "Thành công", description: `Đã xóa món tặng "${deleteItem.name}"` });
    } catch (error: any) {
      console.error("Error deleting gift item:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi xóa",
        variant: "destructive",
      });
    } finally {
      setDeleteItem(null);
    }
  };

  // Filter gift items by status
  const filteredItems = React.useMemo(() => {
    if (statusFilter === "all") {
      return giftItems;
    }
    if (statusFilter === "active") {
      return giftItems.filter(item => item.isActive);
    }
    if (statusFilter === "inactive") {
      return giftItems.filter(item => !item.isActive);
    }
    return giftItems;
  }, [giftItems, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const paginatedItems = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, filterBranchId]);

  // Clear selection when filter changes (not when page changes)
  React.useEffect(() => {
    setSelectedItemIds(new Set());
  }, [statusFilter, filterBranchId]);

  // Toggle single item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Select all filtered items (across all pages)
  const selectAllFilteredItems = () => {
    const allFilteredIds = filteredItems.map(item => item.id);
    setSelectedItemIds(new Set(allFilteredIds));
  };

  // Deselect all items
  const deselectAllItems = () => {
    setSelectedItemIds(new Set());
  };

  // Check if all filtered items are selected (across all pages)
  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every(item => selectedItemIds.has(item.id));

  // Check if some items are selected (for indeterminate state)
  const someItemsSelected = selectedItemIds.size > 0 && !allFilteredSelected;

  // Bulk toggle active with batch processing
  const handleBulkToggleActive = async (isActive: boolean) => {
    if (selectedItemIds.size === 0) return;

    const itemIds = Array.from(selectedItemIds);
    const total = itemIds.length;
    const batchSize = 50;
    const totalBatches = Math.ceil(total / batchSize);
    const progressId = `bulk-gift-toggle-${Date.now()}`;
    const action = isActive ? "Kích hoạt" : "Tạm ngưng";

    // Clear selection immediately
    setSelectedItemIds(new Set());

    // Add to background progress
    addProgress({
      id: progressId,
      title: `${action} món tặng`,
      current: 0,
      total,
      batchNumber: 1,
      totalBatches,
    });

    let successCount = 0;
    let failCount = 0;
    const updatedItems: Map<string, boolean> = new Map();

    try {
      // Process in batches
      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const start = batchNum * batchSize;
        const end = Math.min(start + batchSize, total);
        const batch = itemIds.slice(start, end);

        updateProgress(progressId, {
          current: start,
          batchNumber: batchNum + 1,
          totalBatches,
        });

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (itemId) => {
            const item = giftItems.find(g => g.id === itemId);
            if (!item || item.isActive === isActive) {
              return { success: true, itemId, skipped: true };
            }
            try {
              await giftItemService.toggleActive(itemId);
              return { success: true, itemId, skipped: false };
            } catch (error) {
              console.error(`Error toggling gift item ${itemId}:`, error);
              return { success: false, itemId, skipped: false };
            }
          })
        );

        // Count results and track updates
        batchResults.forEach((result) => {
          if (result.success && !result.skipped) {
            successCount++;
            updatedItems.set(result.itemId, isActive);
          } else if (!result.success) {
            failCount++;
          }
        });

        updateProgress(progressId, {
          current: end,
          batchNumber: batchNum + 1,
          totalBatches,
        });
      }

      // Update local state
      setGiftItems(prev => prev.map(item => {
        if (updatedItems.has(item.id)) {
          return { ...item, isActive: updatedItems.get(item.id)! };
        }
        return item;
      }));

      if (failCount === 0) {
        completeProgress(progressId, `Đã ${action.toLowerCase()} ${successCount} món`);
      } else {
        completeProgress(progressId, `Thành công: ${successCount}, Thất bại: ${failCount}`);
      }
    } catch (error) {
      console.error("Error bulk toggling gift items:", error);
      errorProgress(progressId, "Có lỗi xảy ra");
    }
  };

  // Bulk delete with batch processing
  const handleBulkDelete = async () => {
    if (selectedItemIds.size === 0) return;

    const itemIds = Array.from(selectedItemIds);
    const total = itemIds.length;
    const batchSize = 50;
    const totalBatches = Math.ceil(total / batchSize);
    const progressId = `bulk-gift-delete-${Date.now()}`;

    // Clear selection immediately
    setSelectedItemIds(new Set());

    // Add to background progress
    addProgress({
      id: progressId,
      title: "Xóa món tặng",
      current: 0,
      total,
      batchNumber: 1,
      totalBatches,
    });

    let successCount = 0;
    let failCount = 0;
    const deletedIds: Set<string> = new Set();

    try {
      // Process in batches
      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const start = batchNum * batchSize;
        const end = Math.min(start + batchSize, total);
        const batch = itemIds.slice(start, end);

        updateProgress(progressId, {
          current: start,
          batchNumber: batchNum + 1,
          totalBatches,
        });

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (itemId) => {
            try {
              await giftItemService.delete(itemId);
              return { success: true, itemId };
            } catch (error) {
              console.error(`Error deleting gift item ${itemId}:`, error);
              return { success: false, itemId };
            }
          })
        );

        // Count results and track updates
        batchResults.forEach((result) => {
          if (result.success) {
            successCount++;
            deletedIds.add(result.itemId);
          } else {
            failCount++;
          }
        });

        updateProgress(progressId, {
          current: end,
          batchNumber: batchNum + 1,
          totalBatches,
        });
      }

      // Update local state
      setGiftItems(prev => prev.filter(item => !deletedIds.has(item.id)));

      if (failCount === 0) {
        completeProgress(progressId, `Đã xóa ${successCount} món`);
      } else {
        completeProgress(progressId, `Thành công: ${successCount}, Thất bại: ${failCount}`);
      }
    } catch (error) {
      console.error("Error bulk deleting gift items:", error);
      errorProgress(progressId, "Có lỗi xảy ra");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý món tặng</h1>
          <p className="text-muted-foreground">Chọn món ăn từ thực đơn để làm món tặng kèm (không bao gồm combo và topping)</p>
        </div>
        <div className="flex items-center gap-2">
          <BrandBranchFilter
            selectedBrandId={filterBrandId}
            selectedBranchId={filterBranchId}
            onBrandChange={setFilterBrandId}
            onBranchChange={setFilterBranchId}
            showAllBranchOption={false}
          />
          <Button onClick={handleOpenCreate} disabled={!filterBranchId}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm món tặng
          </Button>
        </div>
      </div>

      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách món tặng</CardTitle>
              <CardDescription>Tổng cộng {filteredItems.length} món tặng</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {filterBranchId && giftItems.length > 0 && (
                <>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="active">Hoạt động</SelectItem>
                      <SelectItem value="inactive">Tạm ngưng</SelectItem>
                    </SelectContent>
                  </Select>
                  {statusFilter !== "all" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setStatusFilter("all")}
                      className="h-9 w-9"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              {filterBranchId && giftItems.length > 0 && (
                <ColumnConfigDialog
                  columns={columns}
                  onToggle={toggleColumn}
                  onReset={resetToDefault}
                />
              )}
            </div>
          </div>
          {/* Bulk actions */}
          {selectedItemIds.size > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={true}
                  onCheckedChange={() => deselectAllItems()}
                />
                <span className="text-sm text-muted-foreground">
                  Đã chọn <strong>{selectedItemIds.size}</strong> / {filteredItems.length} món tặng
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Thao tác hàng loạt
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => handleBulkToggleActive(true)}>
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                    Kích hoạt tất cả
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkToggleActive(false)}>
                    <Power className="mr-2 h-4 w-4 text-orange-600" />
                    Tạm ngưng tất cả
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleBulkDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Xóa tất cả
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={deselectAllItems}>
                    Bỏ chọn
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {!filterBranchId ? (
            <FilterRequiredPlaceholder
              title="Vui lòng chọn chi nhánh"
              description="Chọn một chi nhánh từ bộ lọc phía trên để xem danh sách món tặng"
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Gift className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có món tặng nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm món tặng&quot; để chọn món từ thực đơn
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto min-h-0">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <div className="flex items-center gap-1">
                          <Checkbox
                            checked={allFilteredSelected}
                            ref={(el) => {
                              if (el) {
                                (el as unknown as HTMLInputElement).indeterminate = someItemsSelected;
                              }
                            }}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                selectAllFilteredItems();
                              } else {
                                deselectAllItems();
                              }
                            }}
                          />
                          {filteredItems.length > pageSize && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              ({filteredItems.length})
                            </span>
                          )}
                        </div>
                      </TableHead>
                      {isColumnVisible("name") && <TableHead>Món tặng</TableHead>}
                      {isColumnVisible("product") && <TableHead>Món ăn gốc</TableHead>}
                      {isColumnVisible("maxQuantity") && <TableHead>SL tối đa</TableHead>}
                      {isColumnVisible("minOrderAmount") && <TableHead>Đơn tối thiểu</TableHead>}
                      {isColumnVisible("description") && <TableHead>Mô tả</TableHead>}
                      {isColumnVisible("sortOrder") && <TableHead>Thứ tự</TableHead>}
                      {isColumnVisible("isActive") && <TableHead>Trạng thái</TableHead>}
                      <TableHead className="w-[80px]">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item) => (
                      <TableRow key={item.id} className={selectedItemIds.has(item.id) ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItemIds.has(item.id)}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />
                        </TableCell>
                        {isColumnVisible("name") && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded bg-pink-100 text-pink-800">
                                <Gift className="h-3.5 w-3.5" />
                              </div>
                              <span className="font-medium">{item.name}</span>
                              {newItemIds.has(item.id) && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Mới</Badge>
                              )}
                              {updatedItemIds.has(item.id) && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">Cập nhật</Badge>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {isColumnVisible("product") && (
                          <TableCell className="text-muted-foreground">
                            {item.product?.name || "-"}
                          </TableCell>
                        )}
                        {isColumnVisible("maxQuantity") && (
                          <TableCell>{item.maxQuantity}</TableCell>
                        )}
                        {isColumnVisible("minOrderAmount") && (
                          <TableCell className="text-muted-foreground">
                            {Number(item.minOrderAmount) > 0 ? formatCurrency(Number(item.minOrderAmount)) : "Không giới hạn"}
                          </TableCell>
                        )}
                        {isColumnVisible("description") && (
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {item.description || "-"}
                          </TableCell>
                        )}
                        {isColumnVisible("sortOrder") && (
                          <TableCell>{item.sortOrder}</TableCell>
                        )}
                        {isColumnVisible("isActive") && (
                          <TableCell>
                            <Badge variant={item.isActive ? "default" : "secondary"}>
                              {item.isActive ? "Hoạt động" : "Tạm ngưng"}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(item)}>
                                <Power className="mr-2 h-4 w-4" />
                                {item.isActive ? "Tạm ngưng" : "Kích hoạt"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteItem(item)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Hiển thị</span>
                    <Select value={pageSize.toString()} onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1); }}>
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pageSizeOptions.map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">
                      / {filteredItems.length} món tặng
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Trang {currentPage} / {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <GiftItemCreateDialog
        open={dialogMode === "create"}
        products={products}
        loadingProducts={loadingProducts}
        existingProductIds={existingProductIds}
        onClose={handleCloseDialog}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Dialog */}
      <GiftItemFormDialog
        open={dialogMode === "edit"}
        giftItemId={selectedItem?.id}
        products={products}
        existingProductIds={existingProductIds}
        onClose={handleCloseDialog}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteItem !== null} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa món tặng &quot;{deleteItem?.name}&quot;? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
