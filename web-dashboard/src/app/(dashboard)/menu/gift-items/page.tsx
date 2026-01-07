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

  // Form data for edit mode (single product)
  const [formData, setFormData] = React.useState<CreateGiftItemDto>({
    productId: "",
    name: "",
    description: "",
    maxQuantity: 1,
    minOrderAmount: 0,
    sortOrder: 0,
  });

  // Multi-select state for create mode
  const [selectedProductIds, setSelectedProductIds] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState("");

  // Status filter state
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Track newly created and updated IDs for badges
  const [newItemIds, setNewItemIds] = React.useState<Set<string>>(new Set());
  const [updatedItemIds, setUpdatedItemIds] = React.useState<Set<string>>(new Set());

  // Progress state for batch creation
  const [createProgress, setCreateProgress] = React.useState<{
    current: number;
    total: number;
    batchNumber: number;
    totalBatches: number;
  } | null>(null);

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
    return new Set(giftItems.map(item => item.productId).filter(Boolean));
  }, [giftItems]);

  // Filter products based on search and exclude already added
  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const notAlreadyAdded = !existingProductIds.has(p.id);
      return matchesSearch && notAlreadyAdded;
    });
  }, [products, searchQuery, existingProductIds]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedItem(null);
    setSelectedProductIds(new Set());
    setSearchQuery("");
    setFormData({
      productId: "",
      name: "",
      description: "",
      maxQuantity: 1,
      minOrderAmount: 0,
      sortOrder: 0,
    });
    setDialogMode("create");
  };

  // Open edit dialog
  const handleOpenEdit = (item: GiftItem) => {
    setSelectedItem(item);
    setFormData({
      productId: item.productId || "",
      name: item.name || "",
      description: item.description || "",
      maxQuantity: Number(item.maxQuantity) || 1,
      minOrderAmount: Number(item.minOrderAmount) || 0,
      sortOrder: Number(item.sortOrder) || 0,
    });
    setDialogMode("edit");
    // Remove badges when editing
    setNewItemIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
    setUpdatedItemIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedItem(null);
    setSelectedProductIds(new Set());
    setSearchQuery("");
    setFormData({
      productId: "",
      name: "",
      description: "",
      maxQuantity: 1,
      minOrderAmount: 0,
      sortOrder: 0,
    });
  };

  // Toggle product selection
  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Select all filtered products
  const selectAllFiltered = () => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      filteredProducts.forEach(p => next.add(p.id));
      return next;
    });
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedProductIds(new Set());
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (dialogMode === "create") {
      // Create mode - multiple products with batch processing
      if (selectedProductIds.size === 0) {
        toast({ title: "Lỗi", description: "Vui lòng chọn ít nhất một món ăn", variant: "destructive" });
        return;
      }

      const productIdArray = Array.from(selectedProductIds);
      const batchSize = 50;
      const totalBatches = Math.ceil(productIdArray.length / batchSize);
      const isLargeList = productIdArray.length > 10; // Use background for lists > 10
      const progressId = `gift-items-${Date.now()}`;

      // For large lists, close dialog and use background progress
      if (isLargeList) {
        handleCloseDialog();
        addProgress({
          id: progressId,
          title: "Tạo món tặng",
          current: 0,
          total: productIdArray.length,
          batchNumber: 1,
          totalBatches,
        });
      } else {
        setSaving(true);
      }

      try {
        const createdItems: GiftItem[] = [];
        const errors: string[] = [];

        // Create gift items in batches
        for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
          const start = batchNum * batchSize;
          const end = Math.min(start + batchSize, productIdArray.length);
          const batch = productIdArray.slice(start, end);

          if (isLargeList) {
            updateProgress(progressId, {
              current: start,
              batchNumber: batchNum + 1,
              totalBatches,
            });
          } else {
            setCreateProgress({
              current: start,
              total: productIdArray.length,
              batchNumber: batchNum + 1,
              totalBatches,
            });
          }

          // Process each product in batch
          for (let i = 0; i < batch.length; i++) {
            const productId = batch[i];
            try {
              const submitData = {
                productId,
                maxQuantity: Number(formData.maxQuantity) || 1,
                minOrderAmount: Number(formData.minOrderAmount) || 0,
                sortOrder: Number(formData.sortOrder) || 0,
              };
              const result = await giftItemService.create(submitData);
              createdItems.push(result);

              // Update progress within batch
              if (isLargeList) {
                updateProgress(progressId, {
                  current: start + i + 1,
                  batchNumber: batchNum + 1,
                  totalBatches,
                });
              } else {
                setCreateProgress({
                  current: start + i + 1,
                  total: productIdArray.length,
                  batchNumber: batchNum + 1,
                  totalBatches,
                });
              }
            } catch (error: any) {
              const product = products.find(p => p.id === productId);
              errors.push(product?.name || productId);
            }
          }
        }

        if (createdItems.length > 0) {
          setGiftItems(prev => [...createdItems, ...prev]);
          createdItems.forEach(item => {
            setNewItemIds(prev => new Set([...prev, item.id]));
          });
        }

        if (isLargeList) {
          if (errors.length > 0) {
            completeProgress(progressId, `Thành công: ${createdItems.length}, Lỗi: ${errors.length}`);
          } else {
            completeProgress(progressId, `Đã tạo ${createdItems.length} món tặng`);
          }
        } else {
          setCreateProgress(null);
          if (createdItems.length > 0) {
            toast({
              title: "Thành công",
              description: `Đã thêm ${createdItems.length} món tặng${errors.length > 0 ? `, ${errors.length} món lỗi` : ""}`
            });
          }
          if (errors.length > 0 && createdItems.length === 0) {
            toast({
              title: "Lỗi",
              description: `Không thể thêm món tặng: ${errors.join(", ")}`,
              variant: "destructive"
            });
          }
          handleCloseDialog();
        }
      } catch (error: any) {
        console.error("Error creating gift items:", error);
        if (isLargeList) {
          errorProgress(progressId, error.response?.data?.message || "Có lỗi xảy ra");
        } else {
          toast({
            title: "Lỗi",
            description: error.response?.data?.message || "Có lỗi xảy ra khi thêm món tặng",
            variant: "destructive",
          });
        }
      } finally {
        if (!isLargeList) {
          setSaving(false);
          setCreateProgress(null);
        }
      }
    } else if (dialogMode === "edit" && selectedItem) {
      // Edit mode - single product
      try {
        setSaving(true);
        const submitData = {
          productId: formData.productId,
          name: formData.name || undefined,
          description: formData.description || undefined,
          maxQuantity: Number(formData.maxQuantity) || 1,
          minOrderAmount: Number(formData.minOrderAmount) || 0,
          sortOrder: Number(formData.sortOrder) || 0,
        };
        const result = await giftItemService.update(selectedItem.id, submitData);
        setGiftItems(prev => prev.map(item => (item.id === selectedItem.id ? result : item)));
        setUpdatedItemIds(prev => new Set([...prev, result.id]));
        setNewItemIds(prev => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
        toast({ title: "Thành công", description: "Đã cập nhật món tặng" });
        handleCloseDialog();
      } catch (error: any) {
        console.error("Error updating gift item:", error);
        toast({
          title: "Lỗi",
          description: error.response?.data?.message || "Có lỗi xảy ra khi cập nhật món tặng",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    }
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

  // Clear selection when page changes or filter changes
  React.useEffect(() => {
    setSelectedItemIds(new Set());
  }, [currentPage, statusFilter, filterBranchId]);

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

  // Select all items on current page
  const selectAllOnPage = () => {
    const pageIds = paginatedItems.map(item => item.id);
    setSelectedItemIds(new Set(pageIds));
  };

  // Deselect all items
  const deselectAllItems = () => {
    setSelectedItemIds(new Set());
  };

  // Check if all items on current page are selected
  const allOnPageSelected = paginatedItems.length > 0 && paginatedItems.every(item => selectedItemIds.has(item.id));

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
                  Đã chọn {selectedItemIds.size} món tặng
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
                        <Checkbox
                          checked={allOnPageSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllOnPage();
                            } else {
                              deselectAllItems();
                            }
                          }}
                        />
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

      {/* Create Dialog - Multi-select */}
      <Dialog open={dialogMode === "create"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Thêm món tặng</DialogTitle>
            <DialogDescription>
              Chọn một hoặc nhiều món ăn từ thực đơn để làm món tặng kèm
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm món ăn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Selection info and actions */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Đã chọn: <strong>{selectedProductIds.size}</strong> món
                  {filteredProducts.length > 0 && ` / ${filteredProducts.length} món có sẵn`}
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAllFiltered}>
                    Chọn tất cả
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={deselectAll}>
                    Bỏ chọn
                  </Button>
                </div>
              </div>

              {/* Product list with checkboxes */}
              <ScrollArea className="h-[300px] border rounded-md">
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <p className="text-muted-foreground">
                      {searchQuery ? "Không tìm thấy món ăn phù hợp" : "Tất cả món ăn đã được thêm vào danh sách món tặng"}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredProducts.map((product) => {
                      const isSelected = selectedProductIds.has(product.id);
                      return (
                        <div
                          key={product.id}
                          className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
                            isSelected ? "bg-primary/10" : ""
                          }`}
                          onClick={() => toggleProductSelection(product.id)}
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                            isSelected ? "bg-primary border-primary" : "border-input"
                          }`}>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(Number(product.price))}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Common settings for all selected items */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="maxQuantity">Số lượng tối đa (mỗi món)</Label>
                  <Input
                    id="maxQuantity"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formData.maxQuantity || 1}
                    onChange={(e) => setFormData({ ...formData, maxQuantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minOrderAmount">Đơn tối thiểu (VNĐ)</Label>
                  <Input
                    id="minOrderAmount"
                    type="text"
                    inputMode="numeric"
                    placeholder="500000"
                    value={formData.minOrderAmount ? new Intl.NumberFormat("vi-VN").format(Math.floor(formData.minOrderAmount)) : ""}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\./g, "");
                      const numValue = parseInt(rawValue, 10);
                      setFormData({ ...formData, minOrderAmount: isNaN(numValue) ? 0 : numValue });
                    }}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving || selectedProductIds.size === 0}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {createProgress
                  ? `Đang xử lý... ${createProgress.current}/${createProgress.total} (batch ${createProgress.batchNumber}/${createProgress.totalBatches})`
                  : `Thêm ${selectedProductIds.size > 0 ? `${selectedProductIds.size} món` : "món tặng"}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Single product */}
      <Dialog open={dialogMode === "edit"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa món tặng</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin món tặng
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Select product */}
              <div className="grid gap-2">
                <Label>Món ăn *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm món ăn..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-[200px] border rounded-md">
                  {loadingProducts ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : products.filter(p =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.code?.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <p className="text-muted-foreground">Không tìm thấy món ăn</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {products
                        .filter(p =>
                          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.code?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((product) => {
                          const isSelected = formData.productId === product.id;
                          return (
                            <div
                              key={product.id}
                              className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
                                isSelected ? "bg-primary/10 border border-primary" : ""
                              }`}
                              onClick={() => setFormData({ ...formData, productId: product.id })}
                            >
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                isSelected ? "bg-primary border-primary" : "border-input"
                              }`}>
                                {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {product.code} - {formatCurrency(Number(product.price))}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Custom name (optional) */}
              <div className="grid gap-2">
                <Label htmlFor="editName">Tên hiển thị (tùy chọn)</Label>
                <Input
                  id="editName"
                  placeholder="Để trống sẽ dùng tên món ăn"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="editMaxQuantity">Số lượng tối đa</Label>
                  <Input
                    id="editMaxQuantity"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formData.maxQuantity || 1}
                    onChange={(e) => setFormData({ ...formData, maxQuantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editMinOrderAmount">Đơn tối thiểu (VNĐ)</Label>
                  <Input
                    id="editMinOrderAmount"
                    type="text"
                    inputMode="numeric"
                    placeholder="500000"
                    value={formData.minOrderAmount ? new Intl.NumberFormat("vi-VN").format(Math.floor(formData.minOrderAmount)) : ""}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\./g, "");
                      const numValue = parseInt(rawValue, 10);
                      setFormData({ ...formData, minOrderAmount: isNaN(numValue) ? 0 : numValue });
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="editDescription">Mô tả</Label>
                <Textarea
                  id="editDescription"
                  placeholder="Mô tả điều kiện tặng..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="editSortOrder">Thứ tự hiển thị</Label>
                <Input
                  id="editSortOrder"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.sortOrder || 0}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cập nhật
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
