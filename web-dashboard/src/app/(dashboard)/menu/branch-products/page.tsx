"use client";

import * as React from "react";
import { Store, Loader2, Search, Check, X, Package, Filter, ChevronLeft, ChevronRight, Pencil, RotateCcw, DollarSign, ChevronDown, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { branchProductService, type BranchProduct, type BranchProductStats } from "@/services/branch-product-service";
import { ProductType } from "@/services/product-service";
import { kitchenService, type Kitchen } from "@/services/kitchen-service";
import { BrandBranchFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";
import { cn } from "@/lib/utils";
import { useColumnConfig, type ColumnConfig } from "@/hooks/use-column-config";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";
import { useBackgroundProgress } from "@/components/ui/background-progress";

const typeLabels: Record<string, { label: string; color: string }> = {
  food: { label: "Đồ ăn", color: "bg-orange-100 text-orange-800" },
  drink: { label: "Đồ uống", color: "bg-blue-100 text-blue-800" },
  other: { label: "Khác", color: "bg-gray-100 text-gray-800" },
  topping: { label: "Topping", color: "bg-purple-100 text-purple-800" },
  combo: { label: "Combo", color: "bg-green-100 text-green-800" },
};

// Default column configuration
const defaultColumns: ColumnConfig[] = [
  { key: "select", label: "Chọn", visible: true, locked: true },
  { key: "image", label: "Ảnh", visible: true },
  { key: "code", label: "Mã", visible: true },
  { key: "name", label: "Tên món", visible: true, locked: true },
  { key: "type", label: "Loại", visible: true },
  { key: "kitchens", label: "Bếp", visible: true },
  { key: "originalPrice", label: "Giá gốc", visible: true },
  { key: "branchPrice", label: "Giá bán CN", visible: true },
  { key: "seasonalPrice", label: "Giá thời vụ", visible: true },
  { key: "vat", label: "VAT", visible: true },
  { key: "status", label: "Trạng thái", visible: true },
  { key: "availability", label: "Bán tại CN", visible: true },
  { key: "actions", label: "Thao tác", visible: true, locked: true },
];

// Format currency (no decimals for VND)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(amount)) + " đ";
};

// Format number for input display (with thousand separators, no decimals)
const formatNumberInput = (value: string | number): string => {
  if (value === "" || value === null || value === undefined) return "";
  const num = typeof value === "string" ? parseFloat(value.replace(/\./g, "").replace(/,/g, "")) : value;
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(num));
};

// Parse formatted number input back to number
const parseNumberInput = (value: string): number | null => {
  if (!value || value.trim() === "") return null;
  // Remove thousand separators (dots in Vietnamese format)
  const cleaned = value.replace(/\./g, "").replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

// Format VAT rate (remove unnecessary decimals)
const formatVatRate = (rate: number | string | undefined): string => {
  const vatRate = Number(rate) || 10;
  return Number.isInteger(vatRate) ? String(vatRate) : vatRate.toFixed(1);
};

// Calculate price before VAT
const calculatePriceBeforeVat = (price: number, vatRate: number) => {
  return Math.round(price / (1 + vatRate / 100));
};

// Calculate VAT amount
const calculateVatAmount = (price: number, vatRate: number) => {
  const priceBeforeVat = calculatePriceBeforeVat(price, vatRate);
  return price - priceBeforeVat;
};

export default function BranchProductsPage() {
  const { toast } = useToast();
  const { addProgress, updateProgress, completeProgress, errorProgress } = useBackgroundProgress();

  // Global filter state from Redux
  const { brandId: filterBrandId, branchId: filterBranchId, setBrandId: setFilterBrandId, setBranchId: setFilterBranchId } = useGlobalFilters();

  const [products, setProducts] = React.useState<BranchProduct[]>([]);
  const [stats, setStats] = React.useState<BranchProductStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = React.useState<string>("all");
  const [selectedProductIds, setSelectedProductIds] = React.useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = React.useState<Set<string>>(new Set());

  // Edit price dialog state
  const [editingProduct, setEditingProduct] = React.useState<BranchProduct | null>(null);
  const [editPrice, setEditPrice] = React.useState<string>("");
  const [savingPrice, setSavingPrice] = React.useState(false);

  // Bulk price adjustment state
  const [bulkPriceDialogOpen, setBulkPriceDialogOpen] = React.useState(false);
  const [bulkPriceMode, setBulkPriceMode] = React.useState<"fixed" | "adjust">("fixed");
  const [bulkPriceValue, setBulkPriceValue] = React.useState<string>("");
  const [bulkPriceAdjustType, setBulkPriceAdjustType] = React.useState<"increase" | "decrease">("increase");
  const [bulkPriceAdjustMode, setBulkPriceAdjustMode] = React.useState<"amount" | "percent">("amount");

  // Kitchen assignment state
  const [branchKitchens, setBranchKitchens] = React.useState<Kitchen[]>([]);
  const [productKitchensMap, setProductKitchensMap] = React.useState<Map<string, Kitchen[]>>(new Map());
  const [kitchenDialogProduct, setKitchenDialogProduct] = React.useState<BranchProduct | null>(null);
  const [selectedKitchenIds, setSelectedKitchenIds] = React.useState<Set<string>>(new Set());
  const [savingKitchens, setSavingKitchens] = React.useState(false);
  const [loadingKitchens, setLoadingKitchens] = React.useState(false);

  // Bulk kitchen assignment state
  const [bulkKitchenDialogOpen, setBulkKitchenDialogOpen] = React.useState(false);
  const [bulkKitchenMode, setBulkKitchenMode] = React.useState<"add" | "replace">("add");
  const [bulkSelectedKitchenIds, setBulkSelectedKitchenIds] = React.useState<Set<string>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);
  const pageSizeOptions = [10, 20, 50, 100, 200, 500];

  // Column configuration
  const {
    columns,
    visibleColumns,
    toggleColumn,
    resetToDefault: resetColumnsToDefault,
    isColumnVisible,
  } = useColumnConfig({
    storageKey: "branch-products-columns",
    defaultColumns,
  });

  // Load products when branch changes
  const loadProducts = React.useCallback(async (branchId: string) => {
    // Don't load if no branch selected or "all" branches selected
    if (!branchId || branchId === "all") {
      setProducts([]);
      setStats(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Fetch products and stats separately to handle errors gracefully
      let productsData: BranchProduct[] = [];
      let statsData: BranchProductStats = { totalProducts: 0, availableCount: 0, unavailableCount: 0 };

      try {
        productsData = await branchProductService.getByBranch(branchId);
      } catch (err: any) {
        // If 404, branch might not exist or no products - this is OK, show empty state
        if (err.response?.status !== 404) {
          throw err;
        }
      }

      try {
        statsData = await branchProductService.getStats(branchId);
      } catch (err: any) {
        // If 404, use default stats
        if (err.response?.status !== 404) {
          console.error("Error loading stats:", err);
        }
      }

      setProducts(productsData);
      setStats(statsData);
    } catch (error: any) {
      console.error("Error loading branch products:", error);
      // Only show error toast for non-404 errors
      if (error.response?.status !== 404) {
        toast({
          title: "Lỗi",
          description: error.response?.data?.message || "Không thể tải danh sách món ăn",
          variant: "destructive"
        });
      }
      // Set empty state on error
      setProducts([]);
      setStats({ totalProducts: 0, availableCount: 0, unavailableCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadProducts(filterBranchId);
  }, [filterBranchId, loadProducts]);

  // Load kitchens for the branch
  const loadKitchens = React.useCallback(async (branchId: string) => {
    if (!branchId || branchId === "all") {
      setBranchKitchens([]);
      return;
    }
    try {
      const kitchens = await kitchenService.getAll(branchId);
      setBranchKitchens(kitchens.filter(k => k.isActive));
    } catch (error) {
      console.error("Error loading kitchens:", error);
    }
  }, []);

  // Load kitchen assignments for all products
  const loadProductKitchenAssignments = React.useCallback(async (branchId: string) => {
    if (!branchId || branchId === "all") {
      setProductKitchensMap(new Map());
      return;
    }
    try {
      const productsWithKitchens = await kitchenService.getProductsWithKitchenAssignments(branchId);
      const newMap = new Map<string, Kitchen[]>();
      for (const product of productsWithKitchens) {
        if (product.assignedKitchens && product.assignedKitchens.length > 0) {
          // Convert to Kitchen[] format
          const kitchens: Kitchen[] = product.assignedKitchens.map(k => ({
            id: k.id,
            name: k.name,
            kitchenType: k.kitchenType as Kitchen["kitchenType"],
            isActive: true,
            sortOrder: 0,
            createdAt: "",
          }));
          newMap.set(product.id, kitchens);
        }
      }
      setProductKitchensMap(newMap);
    } catch (error) {
      console.error("Error loading product kitchen assignments:", error);
    }
  }, []);

  React.useEffect(() => {
    loadKitchens(filterBranchId);
    loadProductKitchenAssignments(filterBranchId);
  }, [filterBranchId, loadKitchens, loadProductKitchenAssignments]);

  // Open kitchen assignment dialog
  const handleOpenKitchenDialog = async (product: BranchProduct) => {
    setKitchenDialogProduct(product);
    setLoadingKitchens(true);
    try {
      const kitchens = await kitchenService.getProductKitchens(product.id);
      setSelectedKitchenIds(new Set(kitchens.map(k => k.id)));
      // Update the map for this product
      setProductKitchensMap(prev => new Map(prev).set(product.id, kitchens));
    } catch (error) {
      console.error("Error loading product kitchens:", error);
      setSelectedKitchenIds(new Set());
    } finally {
      setLoadingKitchens(false);
    }
  };

  // Close kitchen assignment dialog
  const handleCloseKitchenDialog = () => {
    setKitchenDialogProduct(null);
    setSelectedKitchenIds(new Set());
  };

  // Toggle kitchen selection
  const handleToggleKitchen = (kitchenId: string) => {
    setSelectedKitchenIds(prev => {
      const next = new Set(prev);
      if (next.has(kitchenId)) {
        next.delete(kitchenId);
      } else {
        next.add(kitchenId);
      }
      return next;
    });
  };

  // Save kitchen assignments
  const handleSaveKitchenAssignments = async () => {
    if (!kitchenDialogProduct) return;

    setSavingKitchens(true);
    try {
      const kitchenIds = Array.from(selectedKitchenIds);
      const kitchens = await kitchenService.setProductKitchens(kitchenDialogProduct.id, kitchenIds);
      // Update the map for this product
      setProductKitchensMap(prev => new Map(prev).set(kitchenDialogProduct.id, kitchens));
      toast({
        title: "Thành công",
        description: `Đã gán "${kitchenDialogProduct.name}" vào ${kitchens.length} bếp`,
      });
      handleCloseKitchenDialog();
    } catch (error: any) {
      console.error("Error saving kitchen assignments:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể lưu bếp",
        variant: "destructive",
      });
    } finally {
      setSavingKitchens(false);
    }
  };

  // Get kitchens for a product (from map or fetch)
  const getProductKitchens = (productId: string): Kitchen[] => {
    return productKitchensMap.get(productId) || [];
  };

  // Open bulk kitchen assignment dialog
  const handleOpenBulkKitchenDialog = () => {
    setBulkKitchenMode("add");
    setBulkSelectedKitchenIds(new Set());
    setBulkKitchenDialogOpen(true);
  };

  // Close bulk kitchen assignment dialog
  const handleCloseBulkKitchenDialog = () => {
    setBulkKitchenDialogOpen(false);
    setBulkSelectedKitchenIds(new Set());
  };

  // Toggle bulk kitchen selection
  const handleToggleBulkKitchen = (kitchenId: string) => {
    setBulkSelectedKitchenIds(prev => {
      const next = new Set(prev);
      if (next.has(kitchenId)) {
        next.delete(kitchenId);
      } else {
        next.add(kitchenId);
      }
      return next;
    });
  };

  // Bulk assign kitchens to selected products
  const handleBulkKitchenAssignment = async () => {
    if (selectedProductIds.size === 0 || bulkSelectedKitchenIds.size === 0) return;

    const productIds = Array.from(selectedProductIds);
    // Filter out toppings
    const validProductIds = productIds.filter(id => {
      const product = products.find(p => p.id === id);
      return product && product.type !== ProductType.TOPPING;
    });

    if (validProductIds.length === 0) {
      toast({
        title: "Thông báo",
        description: "Không có món ăn hợp lệ để gán bếp (topping không thể gán bếp)",
      });
      return;
    }

    const total = validProductIds.length;
    const batchSize = 20;
    const totalBatches = Math.ceil(total / batchSize);
    const progressId = `bulk-kitchen-${Date.now()}`;
    const kitchenIds = Array.from(bulkSelectedKitchenIds);
    const kitchenNames = branchKitchens
      .filter(k => bulkSelectedKitchenIds.has(k.id))
      .map(k => k.name)
      .join(", ");

    // Close dialog and clear selection
    handleCloseBulkKitchenDialog();
    setSelectedProductIds(new Set());

    // Add to background progress
    addProgress({
      id: progressId,
      title: `Gán bếp: ${kitchenNames}`,
      current: 0,
      total,
      batchNumber: 1,
      totalBatches,
    });

    let successCount = 0;
    let failCount = 0;
    const updatedProductKitchens: Map<string, Kitchen[]> = new Map();

    try {
      // Process in batches
      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const start = batchNum * batchSize;
        const end = Math.min(start + batchSize, total);
        const batch = validProductIds.slice(start, end);

        updateProgress(progressId, {
          current: start,
          batchNumber: batchNum + 1,
          totalBatches,
        });

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (productId) => {
            try {
              let finalKitchenIds = kitchenIds;

              // If "add" mode, merge with existing kitchens
              if (bulkKitchenMode === "add") {
                const existingKitchens = productKitchensMap.get(productId) || [];
                const existingIds = new Set(existingKitchens.map(k => k.id));
                finalKitchenIds = [...existingIds, ...kitchenIds.filter(id => !existingIds.has(id))];
              }

              const kitchens = await kitchenService.setProductKitchens(productId, finalKitchenIds);
              return { success: true, productId, kitchens };
            } catch (error) {
              console.error(`Error assigning kitchens to product ${productId}:`, error);
              return { success: false, productId, kitchens: [] };
            }
          })
        );

        // Count results and track updates
        batchResults.forEach((result) => {
          if (result.success) {
            successCount++;
            updatedProductKitchens.set(result.productId, result.kitchens);
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

      // Update productKitchensMap with all results
      setProductKitchensMap(prev => {
        const newMap = new Map(prev);
        updatedProductKitchens.forEach((kitchens, productId) => {
          newMap.set(productId, kitchens);
        });
        return newMap;
      });

      if (failCount === 0) {
        completeProgress(progressId, `Đã gán ${successCount} món vào ${kitchenIds.length} bếp`);
      } else {
        completeProgress(progressId, `Thành công: ${successCount}, Thất bại: ${failCount}`);
      }
    } catch (error) {
      console.error("Error bulk assigning kitchens:", error);
      errorProgress(progressId, "Có lỗi xảy ra khi gán bếp");
    }
  };

  // Toggle single product availability
  const handleToggleAvailability = async (product: BranchProduct) => {
    setProcessingIds(prev => new Set(prev).add(product.id));
    try {
      const result = await branchProductService.toggleAvailability(filterBranchId, product.id);
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, isAvailable: result.isAvailable } : p
      ));
      // Update stats
      setStats(prev => {
        if (!prev) return prev;
        const change = result.isAvailable ? 1 : -1;
        return {
          ...prev,
          availableCount: prev.availableCount + change,
          unavailableCount: prev.unavailableCount - change,
        };
      });
      toast({
        title: "Thành công",
        description: `Đã ${result.isAvailable ? "bật" : "tắt"} "${product.name}" tại chi nhánh`,
      });
    } catch (error) {
      console.error("Error toggling availability:", error);
      toast({ title: "Lỗi", description: "Không thể cập nhật trạng thái", variant: "destructive" });
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  };

  // Open edit price dialog
  const handleOpenEditPrice = (product: BranchProduct) => {
    setEditingProduct(product);
    // Set initial price: customPrice if exists, otherwise original price
    const currentPrice = product.customPrice !== null ? product.customPrice : product.price;
    setEditPrice(formatNumberInput(currentPrice));
  };

  // Close edit price dialog
  const handleCloseEditPrice = () => {
    setEditingProduct(null);
    setEditPrice("");
  };

  // Save custom price
  const handleSaveCustomPrice = async () => {
    if (!editingProduct) return;

    const newPrice = parseNumberInput(editPrice);

    // Validate price
    if (newPrice !== null && newPrice < 0) {
      toast({
        title: "Lỗi",
        description: "Giá không hợp lệ",
        variant: "destructive",
      });
      return;
    }

    setSavingPrice(true);
    try {
      const result = await branchProductService.update(filterBranchId, editingProduct.id, {
        customPrice: newPrice,
      });
      // Use newPrice directly since result.customPrice may be a string from API
      setProducts(prev => prev.map(p =>
        p.id === editingProduct.id ? { ...p, customPrice: newPrice } : p
      ));
      toast({
        title: "Thành công",
        description: newPrice !== null
          ? `Đã cập nhật giá "${editingProduct.name}" tại chi nhánh: ${formatCurrency(newPrice)}`
          : `Đã xóa giá riêng của "${editingProduct.name}", sử dụng giá gốc`,
      });
      handleCloseEditPrice();
    } catch (error: any) {
      console.error("Error updating custom price:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể cập nhật giá",
        variant: "destructive",
      });
    } finally {
      setSavingPrice(false);
    }
  };

  // Reset to original price
  const handleResetToOriginalPrice = async () => {
    if (!editingProduct) return;

    setSavingPrice(true);
    try {
      const result = await branchProductService.update(filterBranchId, editingProduct.id, {
        customPrice: null,
      });
      setProducts(prev => prev.map(p =>
        p.id === editingProduct.id ? { ...p, customPrice: null } : p
      ));
      toast({
        title: "Thành công",
        description: `Đã khôi phục giá gốc cho "${editingProduct.name}"`,
      });
      handleCloseEditPrice();
    } catch (error: any) {
      console.error("Error resetting price:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể khôi phục giá",
        variant: "destructive",
      });
    } finally {
      setSavingPrice(false);
    }
  };

  // Get effective price (customPrice or original price)
  const getEffectivePrice = (product: BranchProduct) => {
    return product.customPrice !== null ? product.customPrice : product.price;
  };

  // Get final price (effective price + seasonal price adjustment)
  const getFinalPrice = (product: BranchProduct) => {
    const effectivePrice = getEffectivePrice(product);
    if (product.seasonalPrice) {
      return product.seasonalPrice.adjustedPrice;
    }
    return effectivePrice;
  };

  // Open bulk price dialog
  const handleOpenBulkPriceDialog = () => {
    setBulkPriceMode("fixed");
    setBulkPriceValue("");
    setBulkPriceAdjustType("increase");
    setBulkPriceAdjustMode("amount");
    setBulkPriceDialogOpen(true);
  };

  // Close bulk price dialog
  const handleCloseBulkPriceDialog = () => {
    setBulkPriceDialogOpen(false);
    setBulkPriceValue("");
  };

  // Calculate new price based on adjustment settings
  const calculateNewPrice = (currentPrice: number, originalPrice: number): number | null => {
    // Ensure values are numbers
    const origPrice = Number(originalPrice);

    if (bulkPriceMode === "fixed") {
      const value = Number(bulkPriceValue);
      if (isNaN(value) || value < 0) return null;
      return Math.round(value);
    } else {
      // Adjust mode
      const value = Number(bulkPriceValue);
      if (isNaN(value) || value < 0) return null;

      let adjustment = 0;
      if (bulkPriceAdjustMode === "percent") {
        adjustment = Math.round(origPrice * value / 100);
      } else {
        adjustment = Math.round(value);
      }

      if (bulkPriceAdjustType === "decrease") {
        adjustment = -adjustment;
      }

      const newPrice = origPrice + adjustment;
      return Math.max(0, Math.round(newPrice));
    }
  };

  // Bulk update prices with batch processing (parallel within each batch)
  const handleBulkPriceUpdate = async () => {
    if (selectedProductIds.size === 0 || !bulkPriceValue) return;

    const selectedProducts = products.filter(p => selectedProductIds.has(p.id));
    const total = selectedProducts.length;
    const batchSize = 50;
    const totalBatches = Math.ceil(total / batchSize);
    const progressId = `bulk-price-${Date.now()}`;

    // Close dialog immediately and use background progress
    handleCloseBulkPriceDialog();
    setSelectedProductIds(new Set());

    // Add to background progress
    addProgress({
      id: progressId,
      title: "Cập nhật giá chi nhánh",
      current: 0,
      total,
      batchNumber: 1,
      totalBatches,
    });

    let successCount = 0;
    let failCount = 0;
    const updatedProducts: Map<string, number | null> = new Map();

    try {
      // Process in batches
      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const start = batchNum * batchSize;
        const end = Math.min(start + batchSize, total);
        const batch = selectedProducts.slice(start, end);

        updateProgress(progressId, {
          current: start,
          batchNumber: batchNum + 1,
          totalBatches,
        });

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (product) => {
            const currentPrice = getEffectivePrice(product);
            const newPrice = calculateNewPrice(currentPrice, product.price);

            if (newPrice === null) {
              return { success: false, productId: product.id, newPrice: null };
            }

            try {
              await branchProductService.update(filterBranchId, product.id, {
                customPrice: newPrice,
              });
              return { success: true, productId: product.id, newPrice };
            } catch (error) {
              console.error(`Error updating price for ${product.name}:`, error);
              return { success: false, productId: product.id, newPrice: null };
            }
          })
        );

        // Count results and track updates
        batchResults.forEach((result) => {
          if (result.success) {
            successCount++;
            updatedProducts.set(result.productId, result.newPrice);
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

      // Update all products at once after all batches complete
      setProducts(prev => prev.map(p => {
        if (updatedProducts.has(p.id)) {
          return { ...p, customPrice: updatedProducts.get(p.id)! };
        }
        return p;
      }));

      if (failCount === 0) {
        completeProgress(progressId, `Đã cập nhật ${successCount} món`);
      } else {
        completeProgress(progressId, `Thành công: ${successCount}, Thất bại: ${failCount}`);
      }
    } catch (error) {
      console.error("Error bulk updating prices:", error);
      errorProgress(progressId, "Có lỗi xảy ra khi cập nhật giá");
    }
  };

  // Bulk reset prices to original with batch processing
  const handleBulkResetPrice = async () => {
    if (selectedProductIds.size === 0) return;

    const selectedProducts = products.filter(p => selectedProductIds.has(p.id) && p.customPrice !== null);

    if (selectedProducts.length === 0) {
      toast({
        title: "Thông báo",
        description: "Không có món nào có giá riêng để khôi phục",
      });
      return;
    }

    const total = selectedProducts.length;
    const batchSize = 50;
    const totalBatches = Math.ceil(total / batchSize);
    const progressId = `bulk-reset-price-${Date.now()}`;

    // Clear selection immediately
    setSelectedProductIds(new Set());

    // Add to background progress
    addProgress({
      id: progressId,
      title: "Khôi phục giá gốc",
      current: 0,
      total,
      batchNumber: 1,
      totalBatches,
    });

    let successCount = 0;
    let failCount = 0;
    const resetProductIds: Set<string> = new Set();

    try {
      // Process in batches
      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const start = batchNum * batchSize;
        const end = Math.min(start + batchSize, total);
        const batch = selectedProducts.slice(start, end);

        updateProgress(progressId, {
          current: start,
          batchNumber: batchNum + 1,
          totalBatches,
        });

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (product) => {
            try {
              await branchProductService.update(filterBranchId, product.id, {
                customPrice: null,
              });
              return { success: true, productId: product.id };
            } catch (error) {
              console.error(`Error resetting price for ${product.name}:`, error);
              return { success: false, productId: product.id };
            }
          })
        );

        // Count results and track updates
        batchResults.forEach((result) => {
          if (result.success) {
            successCount++;
            resetProductIds.add(result.productId);
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

      // Update all products at once after all batches complete
      setProducts(prev => prev.map(p => {
        if (resetProductIds.has(p.id)) {
          return { ...p, customPrice: null };
        }
        return p;
      }));

      if (failCount === 0) {
        completeProgress(progressId, `Đã khôi phục ${successCount} món`);
      } else {
        completeProgress(progressId, `Thành công: ${successCount}, Thất bại: ${failCount}`);
      }
    } catch (error) {
      console.error("Error bulk resetting prices:", error);
      errorProgress(progressId, "Có lỗi xảy ra khi khôi phục giá");
    }
  };

  // Bulk toggle availability
  const handleBulkToggle = async (isAvailable: boolean) => {
    if (selectedProductIds.size === 0) return;

    const productIds = Array.from(selectedProductIds);
    const total = productIds.length;
    const batchSize = 50;
    const totalBatches = Math.ceil(total / batchSize);
    const progressId = `bulk-toggle-${Date.now()}`;
    const action = isAvailable ? "Bật" : "Tắt";

    // Clear selection immediately
    setSelectedProductIds(new Set());

    // Add to background progress
    addProgress({
      id: progressId,
      title: `${action} món tại chi nhánh`,
      current: 0,
      total,
      batchNumber: 1,
      totalBatches,
    });

    try {
      const result = await branchProductService.bulkToggleAvailabilityBatched(
        filterBranchId,
        { productIds, isAvailable },
        {
          batchSize,
          onProgress: (progress) => {
            updateProgress(progressId, {
              current: progress.current,
              batchNumber: progress.batchNumber,
              totalBatches: progress.totalBatches,
            });
          },
        }
      );

      setProducts(prev => prev.map(p =>
        productIds.includes(p.id) ? { ...p, isAvailable } : p
      ));

      // Reload stats
      const statsData = await branchProductService.getStats(filterBranchId);
      setStats(statsData);

      const failedCount = productIds.length - result.updated;
      if (failedCount > 0) {
        completeProgress(progressId, `${action} ${result.updated}/${productIds.length} món. Thất bại: ${failedCount}`);
      } else {
        completeProgress(progressId, `Đã ${action.toLowerCase()} ${result.updated} món`);
      }
    } catch (error) {
      console.error("Error bulk toggling:", error);
      errorProgress(progressId, "Có lỗi xảy ra khi cập nhật");
    }
  };

  // Filter products
  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      const searchLower = search.toLowerCase();
      const matchesSearch = !search ||
        p.name.toLowerCase().includes(searchLower) ||
        p.code?.toLowerCase().includes(searchLower) ||
        p.searchName?.toLowerCase().includes(searchLower) ||
        p.abbreviation?.toLowerCase().includes(searchLower);
      const matchesType = typeFilter === "all" || p.type === typeFilter;
      const matchesAvailability = availabilityFilter === "all" ||
        (availabilityFilter === "available" && p.isAvailable) ||
        (availabilityFilter === "unavailable" && !p.isAvailable);
      return matchesSearch && matchesType && matchesAvailability;
    });
  }, [products, search, typeFilter, availabilityFilter]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, availabilityFilter, filterBranchId]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredProducts.length);
  const paginatedProducts = React.useMemo(() => {
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, startIndex, endIndex]);

  // Selection helpers
  const isAllSelected = filteredProducts.length > 0 &&
    filteredProducts.every(p => selectedProductIds.has(p.id));
  const isSomeSelected = filteredProducts.some(p => selectedProductIds.has(p.id)) && !isAllSelected;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
    } else {
      setSelectedProductIds(new Set());
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý món ăn theo chi nhánh</h1>
          <p className="text-muted-foreground">Bật/tắt món ăn được bán tại từng chi nhánh</p>
        </div>
        <div className="flex items-center gap-2">
          <BrandBranchFilter
            selectedBrandId={filterBrandId}
            selectedBranchId={filterBranchId}
            onBrandChange={setFilterBrandId}
            onBranchChange={setFilterBranchId}
            showAllBranchOption={false}
          />
        </div>
      </div>

      {/* Stats Cards */}
      {stats && filterBranchId && (
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-800">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalProducts}</p>
                  <p className="text-xs text-muted-foreground">Tổng số món</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 text-green-800">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.availableCount}</p>
                  <p className="text-xs text-muted-foreground">Đang bán</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 text-red-800">
                  <X className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.unavailableCount}</p>
                  <p className="text-xs text-muted-foreground">Không bán</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách món ăn</CardTitle>
              <CardDescription>
                {filteredProducts.length} món ăn
                {selectedProductIds.size > 0 && ` (đã chọn ${selectedProductIds.size})`}
              </CardDescription>
            </div>
            {filterBranchId && products.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Loại món" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả loại</SelectItem>
                    {Object.entries(typeLabels).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="available">Đang bán</SelectItem>
                    <SelectItem value="unavailable">Không bán</SelectItem>
                  </SelectContent>
                </Select>
                <ColumnConfigDialog
                  columns={columns}
                  onToggle={toggleColumn}
                  onReset={resetColumnsToDefault}
                />
              </div>
            )}
          </div>
          {/* Bulk actions */}
          {selectedProductIds.size > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={true}
                  onCheckedChange={() => setSelectedProductIds(new Set())}
                />
                <span className="text-sm text-muted-foreground">
                  Đã chọn {selectedProductIds.size} món ăn
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
                  <DropdownMenuItem onClick={() => handleBulkToggle(true)}>
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                    Bật tất cả
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkToggle(false)}>
                    <X className="mr-2 h-4 w-4 text-red-600" />
                    Tắt tất cả
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleOpenBulkPriceDialog}>
                    <DollarSign className="mr-2 h-4 w-4 text-orange-600" />
                    Điều chỉnh giá
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBulkResetPrice}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Khôi phục giá gốc
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleOpenBulkKitchenDialog}>
                    <ChefHat className="mr-2 h-4 w-4 text-blue-600" />
                    Gán bếp hàng loạt
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedProductIds(new Set())}>
                    Bỏ chọn
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden p-0">
          {!filterBranchId || filterBranchId === "all" ? (
            <div className="p-6">
              <FilterRequiredPlaceholder
                title="Vui lòng chọn chi nhánh"
                description="Chọn một chi nhánh cụ thể từ bộ lọc phía trên để quản lý món ăn"
              />
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Store className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Không tìm thấy món ăn nào</p>
            </div>
          ) : (
            <>
            <div className="flex-1 overflow-auto min-h-0">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    {isColumnVisible("select") && (
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                          {...(isSomeSelected ? { "data-state": "indeterminate" } : {})}
                        />
                      </TableHead>
                    )}
                    {isColumnVisible("image") && <TableHead className="w-[80px]">Ảnh</TableHead>}
                    {isColumnVisible("code") && <TableHead>Mã</TableHead>}
                    {isColumnVisible("name") && <TableHead>Tên món</TableHead>}
                    {isColumnVisible("type") && <TableHead>Loại</TableHead>}
                    {isColumnVisible("kitchens") && <TableHead>Bếp</TableHead>}
                    {isColumnVisible("originalPrice") && <TableHead className="text-right">Giá gốc</TableHead>}
                    {isColumnVisible("branchPrice") && <TableHead className="text-right">Giá bán CN</TableHead>}
                    {isColumnVisible("seasonalPrice") && <TableHead className="text-right">Giá thời vụ</TableHead>}
                    {isColumnVisible("vat") && <TableHead className="text-right">VAT</TableHead>}
                    {isColumnVisible("status") && <TableHead className="text-center">Trạng thái</TableHead>}
                    {isColumnVisible("availability") && <TableHead className="text-center">Bán tại CN</TableHead>}
                    {isColumnVisible("actions") && <TableHead className="w-[80px]">Thao tác</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => (
                    <TableRow key={product.id} className={cn(!product.isAvailable && "opacity-60")}>
                      {isColumnVisible("select") && (
                        <TableCell>
                          <Checkbox
                            checked={selectedProductIds.has(product.id)}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                          />
                        </TableCell>
                      )}
                      {isColumnVisible("image") && (
                        <TableCell>
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-12 h-12 rounded object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                      )}
                      {isColumnVisible("code") && (
                        <TableCell className="font-mono text-sm">{product.code}</TableCell>
                      )}
                      {isColumnVisible("name") && (
                        <TableCell className="font-medium">{product.name}</TableCell>
                      )}
                      {isColumnVisible("type") && (
                        <TableCell>
                          <Badge variant="outline" className={typeLabels[product.type]?.color}>
                            {typeLabels[product.type]?.label || product.type}
                          </Badge>
                        </TableCell>
                      )}
                      {isColumnVisible("kitchens") && (
                        <TableCell>
                          {product.type !== ProductType.TOPPING && (
                            <div
                              className="flex flex-wrap gap-1 cursor-pointer hover:opacity-80"
                              onClick={() => handleOpenKitchenDialog(product)}
                            >
                              {productKitchensMap.has(product.id) && productKitchensMap.get(product.id)!.length > 0 ? (
                                productKitchensMap.get(product.id)!.map(k => (
                                  <Badge
                                    key={k.id}
                                    variant="outline"
                                    className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                  >
                                    <ChefHat className="h-3 w-3 mr-1" />
                                    {k.name}
                                  </Badge>
                                ))
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-1 text-xs text-muted-foreground hover:bg-blue-50"
                                >
                                  <ChefHat className="h-3.5 w-3.5 mr-1" />
                                  Gán bếp
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      )}
                      {isColumnVisible("originalPrice") && (
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(product.price)}</TableCell>
                      )}
                      {isColumnVisible("branchPrice") && (
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn(
                                  "font-medium cursor-help",
                                  product.customPrice !== null && product.customPrice !== product.price
                                    ? "text-orange-600"
                                    : "text-green-600"
                                )}>
                                  {formatCurrency(getEffectivePrice(product))}
                                  {product.customPrice !== null && product.customPrice !== product.price && (
                                    <sup className="text-[9px] ml-0.5">CN</sup>
                                  )}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Giá gốc:</span>
                                    <span className="font-medium">{formatCurrency(product.price)}</span>
                                  </div>
                                  {product.customPrice !== null && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Giá CN:</span>
                                      <span className="font-medium text-orange-600">{formatCurrency(product.customPrice)}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Chênh lệch:</span>
                                    <span className={cn(
                                      "font-medium",
                                      getEffectivePrice(product) > product.price ? "text-green-600" :
                                      getEffectivePrice(product) < product.price ? "text-red-600" : ""
                                    )}>
                                      {getEffectivePrice(product) >= product.price ? "+" : ""}
                                      {formatCurrency(getEffectivePrice(product) - product.price)}
                                    </span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      )}
                      {isColumnVisible("seasonalPrice") && (
                        <TableCell className="text-right">
                          {product.seasonalPrice ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-medium cursor-help text-orange-600">
                                    {formatCurrency(product.seasonalPrice.adjustedPrice)}
                                    <sup className="text-[9px] ml-0.5">TV</sup>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Giá gốc CN:</span>
                                      <span className="font-medium">{formatCurrency(product.seasonalPrice.originalPrice)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Điều chỉnh:</span>
                                      <span className="font-medium text-orange-600">
                                        {product.seasonalPrice.adjustmentType === 'percentage'
                                          ? `+${product.seasonalPrice.adjustmentValue}%`
                                          : `+${formatCurrency(product.seasonalPrice.adjustmentValue)}`}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Tăng thêm:</span>
                                      <span className="font-medium text-green-600">
                                        +{formatCurrency(product.seasonalPrice.adjustedPrice - product.seasonalPrice.originalPrice)}
                                      </span>
                                    </div>
                                    <div className="text-orange-600 font-medium border-t border-orange-200 pt-1 mt-1">
                                      {product.seasonalPrice.seasonalPriceName}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                      {isColumnVisible("vat") && (
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-muted-foreground cursor-help">
                                  {formatCurrency(calculateVatAmount(getFinalPrice(product), product.vatRate || 10))}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">VAT:</span>
                                    <span className="font-medium">{product.vatRate || 10}%</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Giá bán cuối:</span>
                                    <span className="font-medium">{formatCurrency(getFinalPrice(product))}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Giá trước VAT:</span>
                                    <span className="font-medium">{formatCurrency(calculatePriceBeforeVat(getFinalPrice(product), product.vatRate || 10))}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Tiền thuế:</span>
                                    <span className="font-medium">{formatCurrency(calculateVatAmount(getFinalPrice(product), product.vatRate || 10))}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      )}
                      {isColumnVisible("status") && (
                        <TableCell className="text-center">
                          <Badge variant={product.isActive ? "default" : "secondary"}>
                            {product.isActive ? "Hoạt động" : "Tạm ngưng"}
                          </Badge>
                        </TableCell>
                      )}
                      {isColumnVisible("availability") && (
                        <TableCell className="text-center">
                          <Switch
                            checked={product.isAvailable}
                            disabled={processingIds.has(product.id)}
                            onCheckedChange={() => handleToggleAvailability(product)}
                          />
                        </TableCell>
                      )}
                      {isColumnVisible("actions") && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditPrice(product)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-2 py-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Hiển thị {startIndex + 1}-{endIndex} / {filteredProducts.length} món</span>
                <span className="text-muted-foreground/50">|</span>
                <div className="flex items-center gap-2">
                  <span>Số dòng:</span>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pageSizeOptions.map((size) => (
                        <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  Đầu
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2">
                  Trang {currentPage} / {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                >
                  Cuối
                </Button>
              </div>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Price Dialog */}
      <Dialog open={editingProduct !== null} onOpenChange={() => handleCloseEditPrice()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cập nhật giá bán tại chi nhánh</DialogTitle>
            <DialogDescription>
              Điều chỉnh giá bán riêng cho sản phẩm này tại chi nhánh. Để trống để sử dụng giá gốc.
            </DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <div className="grid gap-4 py-4">
              {/* Product info */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {editingProduct.imageUrl ? (
                  <img
                    src={editingProduct.imageUrl}
                    alt={editingProduct.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-background flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{editingProduct.name}</p>
                  <p className="text-sm text-muted-foreground">{editingProduct.code}</p>
                </div>
              </div>

              {/* Original price info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Giá gốc (đã VAT)</Label>
                  <p className="font-medium text-lg">{formatCurrency(editingProduct.price)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">VAT ({formatVatRate(editingProduct.vatRate)}%)</Label>
                  <p className="font-medium">{formatCurrency(calculateVatAmount(editingProduct.price, editingProduct.vatRate || 10))}</p>
                </div>
              </div>

              {/* Custom price input */}
              <div className="grid gap-2">
                <Label htmlFor="customPrice">Giá bán tại chi nhánh (đã VAT)</Label>
                <div className="relative">
                  <Input
                    id="customPrice"
                    type="text"
                    placeholder="Để trống để dùng giá gốc"
                    value={editPrice}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      // Allow only digits and dots for formatting
                      const cleaned = rawValue.replace(/[^\d]/g, "");
                      if (cleaned === "") {
                        setEditPrice("");
                      } else {
                        setEditPrice(formatNumberInput(cleaned));
                      }
                    }}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">đ</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nhập giá bán mới cho chi nhánh này. Để trống nếu muốn sử dụng giá gốc từ thương hiệu.
                </p>
              </div>

              {/* Preview new VAT calculation */}
              {editPrice && parseNumberInput(editPrice) !== null && parseNumberInput(editPrice)! > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm font-medium text-orange-800 mb-2">Xem trước:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Giá bán CN:</span>
                      <span className="ml-2 font-medium text-orange-600">{formatCurrency(parseNumberInput(editPrice)!)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Chênh lệch:</span>
                      <span className={cn(
                        "ml-2 font-medium",
                        parseNumberInput(editPrice)! > editingProduct.price ? "text-green-600" :
                        parseNumberInput(editPrice)! < editingProduct.price ? "text-red-600" : ""
                      )}>
                        {parseNumberInput(editPrice)! >= editingProduct.price ? "+" : ""}
                        {formatCurrency(parseNumberInput(editPrice)! - editingProduct.price)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Giá trước VAT:</span>
                      <span className="ml-2 font-medium">{formatCurrency(calculatePriceBeforeVat(parseNumberInput(editPrice)!, editingProduct.vatRate || 10))}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tiền thuế VAT:</span>
                      <span className="ml-2 font-medium">{formatCurrency(calculateVatAmount(parseNumberInput(editPrice)!, editingProduct.vatRate || 10))}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editingProduct?.customPrice !== null && (
              <Button
                type="button"
                variant="outline"
                onClick={handleResetToOriginalPrice}
                disabled={savingPrice}
                className="sm:mr-auto"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Khôi phục giá gốc
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleCloseEditPrice}>
              Hủy
            </Button>
            <Button type="button" onClick={handleSaveCustomPrice} disabled={savingPrice}>
              {savingPrice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Price Adjustment Dialog */}
      <Dialog open={bulkPriceDialogOpen} onOpenChange={handleCloseBulkPriceDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Điều chỉnh giá hàng loạt</DialogTitle>
            <DialogDescription>
              Cập nhật giá cho {selectedProductIds.size} món đã chọn tại chi nhánh này.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Mode selection */}
            <div className="grid gap-2">
              <Label>Phương thức điều chỉnh</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={bulkPriceMode === "fixed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBulkPriceMode("fixed")}
                  className="flex-1"
                >
                  Đặt giá cố định
                </Button>
                <Button
                  type="button"
                  variant={bulkPriceMode === "adjust" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBulkPriceMode("adjust")}
                  className="flex-1"
                >
                  Tăng/Giảm từ giá gốc
                </Button>
              </div>
            </div>

            {bulkPriceMode === "fixed" ? (
              /* Fixed price input */
              <div className="grid gap-2">
                <Label htmlFor="bulkPrice">Giá mới (đã VAT)</Label>
                <Input
                  id="bulkPrice"
                  type="number"
                  placeholder="Nhập giá mới cho tất cả món đã chọn"
                  value={bulkPriceValue}
                  onChange={(e) => setBulkPriceValue(e.target.value)}
                  min={0}
                />
                <p className="text-xs text-muted-foreground">
                  Tất cả {selectedProductIds.size} món đã chọn sẽ có cùng giá này.
                </p>
              </div>
            ) : (
              /* Adjust price inputs */
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Loại điều chỉnh</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={bulkPriceAdjustType === "increase" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBulkPriceAdjustType("increase")}
                      className="flex-1"
                    >
                      Tăng giá
                    </Button>
                    <Button
                      type="button"
                      variant={bulkPriceAdjustType === "decrease" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBulkPriceAdjustType("decrease")}
                      className="flex-1"
                    >
                      Giảm giá
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Cách tính</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={bulkPriceAdjustMode === "amount" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBulkPriceAdjustMode("amount")}
                      className="flex-1"
                    >
                      Số tiền (VNĐ)
                    </Button>
                    <Button
                      type="button"
                      variant={bulkPriceAdjustMode === "percent" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBulkPriceAdjustMode("percent")}
                      className="flex-1"
                    >
                      Phần trăm (%)
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="bulkAdjustValue">
                    Giá trị {bulkPriceAdjustType === "increase" ? "tăng" : "giảm"} {bulkPriceAdjustMode === "percent" ? "(%)" : "(VNĐ)"}
                  </Label>
                  <Input
                    id="bulkAdjustValue"
                    type="number"
                    placeholder={bulkPriceAdjustMode === "percent" ? "Ví dụ: 10" : "Ví dụ: 5000"}
                    value={bulkPriceValue}
                    onChange={(e) => setBulkPriceValue(e.target.value)}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    {bulkPriceAdjustType === "increase" ? "Tăng" : "Giảm"} {bulkPriceAdjustMode === "percent" ? "phần trăm" : "số tiền cố định"} từ giá gốc của từng món.
                  </p>
                </div>
              </div>
            )}

          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseBulkPriceDialog}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleBulkPriceUpdate}
              disabled={!bulkPriceValue}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Áp dụng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kitchen Assignment Dialog */}
      <Dialog open={kitchenDialogProduct !== null} onOpenChange={() => handleCloseKitchenDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Gán bếp cho món ăn</DialogTitle>
            <DialogDescription>
              Chọn các bếp sẽ chế biến món ăn này
            </DialogDescription>
          </DialogHeader>
          {kitchenDialogProduct && (
            <div className="grid gap-4 py-4">
              {/* Product info */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {kitchenDialogProduct.imageUrl ? (
                  <img
                    src={kitchenDialogProduct.imageUrl}
                    alt={kitchenDialogProduct.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-background flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{kitchenDialogProduct.name}</p>
                  <p className="text-sm text-muted-foreground">{kitchenDialogProduct.code}</p>
                </div>
              </div>

              {/* Kitchens list */}
              {loadingKitchens ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : branchKitchens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ChefHat className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Chưa có bếp nào trong chi nhánh</p>
                  <p className="text-xs text-muted-foreground mt-1">Vui lòng tạo bếp trước</p>
                </div>
              ) : (
                <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                  {branchKitchens.map((kitchen) => (
                    <div
                      key={kitchen.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50",
                        selectedKitchenIds.has(kitchen.id) && "border-primary bg-primary/5"
                      )}
                      onClick={() => handleToggleKitchen(kitchen.id)}
                    >
                      <Checkbox
                        checked={selectedKitchenIds.has(kitchen.id)}
                        onCheckedChange={() => handleToggleKitchen(kitchen.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{kitchen.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {kitchen.kitchenType && `${kitchen.kitchenType} • `}
                          {kitchen.productCount ?? 0} món
                        </p>
                      </div>
                      {selectedKitchenIds.has(kitchen.id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  Đã chọn <span className="font-medium text-foreground">{selectedKitchenIds.size}</span> bếp
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseKitchenDialog}>
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleSaveKitchenAssignments}
              disabled={savingKitchens || loadingKitchens}
            >
              {savingKitchens && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <ChefHat className="mr-2 h-4 w-4" />
              Lưu ({selectedKitchenIds.size} bếp)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Kitchen Assignment Dialog */}
      <Dialog open={bulkKitchenDialogOpen} onOpenChange={handleCloseBulkKitchenDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Gán bếp hàng loạt</DialogTitle>
            <DialogDescription>
              Gán {selectedProductIds.size} món đã chọn vào các bếp
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Mode selection */}
            <div className="grid gap-2">
              <Label>Phương thức gán</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={bulkKitchenMode === "add" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBulkKitchenMode("add")}
                  className="flex-1"
                >
                  Thêm vào bếp đã có
                </Button>
                <Button
                  type="button"
                  variant={bulkKitchenMode === "replace" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBulkKitchenMode("replace")}
                  className="flex-1"
                >
                  Thay thế toàn bộ
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {bulkKitchenMode === "add"
                  ? "Giữ nguyên bếp cũ và thêm bếp mới"
                  : "Xóa tất cả bếp cũ và chỉ gán vào bếp đã chọn"}
              </p>
            </div>

            {/* Kitchens list */}
            {branchKitchens.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ChefHat className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Chưa có bếp nào trong chi nhánh</p>
                <p className="text-xs text-muted-foreground mt-1">Vui lòng tạo bếp trước</p>
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label>Chọn bếp để gán</Label>
                  <div className="grid gap-2 max-h-[250px] overflow-y-auto border rounded-lg p-2">
                    {branchKitchens.map((kitchen) => (
                      <div
                        key={kitchen.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50",
                          bulkSelectedKitchenIds.has(kitchen.id) && "border-primary bg-primary/5"
                        )}
                        onClick={() => handleToggleBulkKitchen(kitchen.id)}
                      >
                        <Checkbox
                          checked={bulkSelectedKitchenIds.has(kitchen.id)}
                          onCheckedChange={() => handleToggleBulkKitchen(kitchen.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{kitchen.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {kitchen.kitchenType && `${kitchen.kitchenType} • `}
                            {kitchen.productCount ?? 0} món
                          </p>
                        </div>
                        {bulkSelectedKitchenIds.has(kitchen.id) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    Đã chọn <span className="font-medium text-foreground">{bulkSelectedKitchenIds.size}</span> bếp
                    {" • "}
                    Sẽ gán <span className="font-medium text-foreground">{selectedProductIds.size}</span> món
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseBulkKitchenDialog}>
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleBulkKitchenAssignment}
              disabled={bulkSelectedKitchenIds.size === 0 || branchKitchens.length === 0}
            >
              <ChefHat className="mr-2 h-4 w-4" />
              Gán {bulkSelectedKitchenIds.size} bếp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
