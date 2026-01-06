"use client";

import * as React from "react";
import { Store, Loader2, Search, Check, X, Package, Filter, ChevronLeft, ChevronRight, Pencil, RotateCcw, DollarSign } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { branchProductService, type BranchProduct, type BranchProductStats } from "@/services/branch-product-service";
import { ProductType } from "@/services/product-service";
import { BrandBranchFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, { label: string; color: string }> = {
  food: { label: "Đồ ăn", color: "bg-orange-100 text-orange-800" },
  drink: { label: "Đồ uống", color: "bg-blue-100 text-blue-800" },
  other: { label: "Khác", color: "bg-gray-100 text-gray-800" },
  topping: { label: "Topping", color: "bg-purple-100 text-purple-800" },
  combo: { label: "Combo", color: "bg-green-100 text-green-800" },
};

// Format currency (no decimals for VND)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(amount)) + " đ";
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
  const [processingBulkPrice, setProcessingBulkPrice] = React.useState(false);
  const [bulkPriceProgress, setBulkPriceProgress] = React.useState({ current: 0, total: 0 });

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);
  const pageSizeOptions = [10, 20, 50, 100, 200, 500];

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
    setEditPrice(String(currentPrice));
  };

  // Close edit price dialog
  const handleCloseEditPrice = () => {
    setEditingProduct(null);
    setEditPrice("");
  };

  // Save custom price
  const handleSaveCustomPrice = async () => {
    if (!editingProduct) return;

    const newPrice = editPrice.trim() === "" ? null : Number(editPrice);

    // Validate price
    if (newPrice !== null && (isNaN(newPrice) || newPrice < 0)) {
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
      setProducts(prev => prev.map(p =>
        p.id === editingProduct.id ? { ...p, customPrice: result.customPrice } : p
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
    setBulkPriceProgress({ current: 0, total: 0 });
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

  // Bulk update prices
  const handleBulkPriceUpdate = async () => {
    if (selectedProductIds.size === 0 || !bulkPriceValue) return;

    const selectedProducts = products.filter(p => selectedProductIds.has(p.id));
    const total = selectedProducts.length;

    setProcessingBulkPrice(true);
    setBulkPriceProgress({ current: 0, total });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedProducts.length; i++) {
      const product = selectedProducts[i];
      const currentPrice = getEffectivePrice(product);
      const newPrice = calculateNewPrice(currentPrice, product.price);

      if (newPrice === null) {
        failCount++;
        continue;
      }

      try {
        const result = await branchProductService.update(filterBranchId, product.id, {
          customPrice: newPrice,
        });
        setProducts(prev => prev.map(p =>
          p.id === product.id ? { ...p, customPrice: result.customPrice } : p
        ));
        successCount++;
      } catch (error) {
        console.error(`Error updating price for ${product.name}:`, error);
        failCount++;
      }

      setBulkPriceProgress({ current: i + 1, total });
    }

    setProcessingBulkPrice(false);
    setSelectedProductIds(new Set());
    handleCloseBulkPriceDialog();

    if (failCount === 0) {
      toast({
        title: "Thành công",
        description: `Đã cập nhật giá cho ${successCount} món ăn`,
      });
    } else {
      toast({
        title: "Hoàn thành",
        description: `Thành công: ${successCount}, Thất bại: ${failCount}`,
        variant: failCount === total ? "destructive" : "default",
      });
    }
  };

  // Bulk reset prices to original
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
    setProcessingBulkPrice(true);
    setBulkPriceProgress({ current: 0, total });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedProducts.length; i++) {
      const product = selectedProducts[i];

      try {
        await branchProductService.update(filterBranchId, product.id, {
          customPrice: null,
        });
        setProducts(prev => prev.map(p =>
          p.id === product.id ? { ...p, customPrice: null } : p
        ));
        successCount++;
      } catch (error) {
        console.error(`Error resetting price for ${product.name}:`, error);
        failCount++;
      }

      setBulkPriceProgress({ current: i + 1, total });
    }

    setProcessingBulkPrice(false);
    setSelectedProductIds(new Set());
    setBulkPriceProgress({ current: 0, total: 0 });

    toast({
      title: "Thành công",
      description: `Đã khôi phục giá gốc cho ${successCount} món ăn`,
    });
  };

  // Bulk toggle availability
  const handleBulkToggle = async (isAvailable: boolean) => {
    if (selectedProductIds.size === 0) return;

    const productIds = Array.from(selectedProductIds);
    try {
      await branchProductService.bulkToggleAvailability(filterBranchId, {
        productIds,
        isAvailable,
      });
      setProducts(prev => prev.map(p =>
        selectedProductIds.has(p.id) ? { ...p, isAvailable } : p
      ));
      // Reload stats
      const statsData = await branchProductService.getStats(filterBranchId);
      setStats(statsData);
      setSelectedProductIds(new Set());
      toast({
        title: "Thành công",
        description: `Đã ${isAvailable ? "bật" : "tắt"} ${productIds.length} món ăn`,
      });
    } catch (error) {
      console.error("Error bulk toggling:", error);
      toast({ title: "Lỗi", description: "Không thể cập nhật hàng loạt", variant: "destructive" });
    }
  };

  // Filter products
  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code?.toLowerCase().includes(search.toLowerCase());
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
              </div>
            )}
          </div>
          {/* Bulk actions */}
          {selectedProductIds.size > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t flex-wrap">
              <span className="text-sm text-muted-foreground">
                Đã chọn {selectedProductIds.size} món:
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkToggle(true)}
                className="text-green-600 border-green-600 hover:bg-green-50"
                disabled={processingBulkPrice}
              >
                <Check className="mr-1 h-4 w-4" />
                Bật tất cả
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkToggle(false)}
                className="text-red-600 border-red-600 hover:bg-red-50"
                disabled={processingBulkPrice}
              >
                <X className="mr-1 h-4 w-4" />
                Tắt tất cả
              </Button>
              <div className="h-4 w-px bg-border" />
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenBulkPriceDialog}
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
                disabled={processingBulkPrice}
              >
                <DollarSign className="mr-1 h-4 w-4" />
                Điều chỉnh giá
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkResetPrice}
                disabled={processingBulkPrice}
              >
                {processingBulkPrice && bulkPriceProgress.total > 0 ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    {bulkPriceProgress.current}/{bulkPriceProgress.total}
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Khôi phục giá gốc
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedProductIds(new Set())}
                disabled={processingBulkPrice}
              >
                Bỏ chọn
              </Button>
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
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        {...(isSomeSelected ? { "data-state": "indeterminate" } : {})}
                      />
                    </TableHead>
                    <TableHead className="w-[80px]">Ảnh</TableHead>
                    <TableHead>Mã</TableHead>
                    <TableHead>Tên món</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead className="text-right">Giá gốc</TableHead>
                    <TableHead className="text-right">Giá bán CN</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-center">Trạng thái</TableHead>
                    <TableHead className="text-center">Bán tại CN</TableHead>
                    <TableHead className="w-[80px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => (
                    <TableRow key={product.id} className={cn(!product.isAvailable && "opacity-60")}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProductIds.has(product.id)}
                          onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                        />
                      </TableCell>
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
                      <TableCell className="font-mono text-sm">{product.code}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeLabels[product.type]?.color}>
                          {typeLabels[product.type]?.label || product.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(product.price)}</TableCell>
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
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground cursor-help">
                                {formatCurrency(calculateVatAmount(getEffectivePrice(product), product.vatRate || 10))}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">VAT:</span>
                                  <span className="font-medium">{product.vatRate || 10}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Giá trước VAT:</span>
                                  <span className="font-medium">{formatCurrency(calculatePriceBeforeVat(getEffectivePrice(product), product.vatRate || 10))}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Tiền thuế:</span>
                                  <span className="font-medium">{formatCurrency(calculateVatAmount(getEffectivePrice(product), product.vatRate || 10))}</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={product.isActive ? "default" : "secondary"}>
                          {product.isActive ? "Hoạt động" : "Tạm ngưng"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={product.isAvailable}
                          disabled={processingIds.has(product.id)}
                          onCheckedChange={() => handleToggleAvailability(product)}
                        />
                      </TableCell>
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
                  <Label className="text-muted-foreground">VAT ({editingProduct.vatRate || 10}%)</Label>
                  <p className="font-medium">{formatCurrency(calculateVatAmount(editingProduct.price, editingProduct.vatRate || 10))}</p>
                </div>
              </div>

              {/* Custom price input */}
              <div className="grid gap-2">
                <Label htmlFor="customPrice">Giá bán tại chi nhánh (đã VAT)</Label>
                <Input
                  id="customPrice"
                  type="number"
                  placeholder="Để trống để dùng giá gốc"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  min={0}
                />
                <p className="text-xs text-muted-foreground">
                  Nhập giá bán mới cho chi nhánh này. Để trống nếu muốn sử dụng giá gốc từ thương hiệu.
                </p>
              </div>

              {/* Preview new VAT calculation */}
              {editPrice && Number(editPrice) > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm font-medium text-orange-800 mb-2">Xem trước:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Giá bán CN:</span>
                      <span className="ml-2 font-medium text-orange-600">{formatCurrency(Number(editPrice))}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Chênh lệch:</span>
                      <span className={cn(
                        "ml-2 font-medium",
                        Number(editPrice) > editingProduct.price ? "text-green-600" :
                        Number(editPrice) < editingProduct.price ? "text-red-600" : ""
                      )}>
                        {Number(editPrice) >= editingProduct.price ? "+" : ""}
                        {formatCurrency(Number(editPrice) - editingProduct.price)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Giá trước VAT:</span>
                      <span className="ml-2 font-medium">{formatCurrency(calculatePriceBeforeVat(Number(editPrice), editingProduct.vatRate || 10))}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tiền thuế VAT:</span>
                      <span className="ml-2 font-medium">{formatCurrency(calculateVatAmount(Number(editPrice), editingProduct.vatRate || 10))}</span>
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

            {/* Progress indicator */}
            {processingBulkPrice && bulkPriceProgress.total > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Đang xử lý...</span>
                  <span className="text-sm text-muted-foreground">
                    {bulkPriceProgress.current}/{bulkPriceProgress.total}
                  </span>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(bulkPriceProgress.current / bulkPriceProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseBulkPriceDialog}
              disabled={processingBulkPrice}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleBulkPriceUpdate}
              disabled={processingBulkPrice || !bulkPriceValue}
            >
              {processingBulkPrice ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Áp dụng
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
