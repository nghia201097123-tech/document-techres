"use client";

import * as React from "react";
import { Store, Loader2, Search, Check, X, Package, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
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

  // Load products when branch changes
  const loadProducts = React.useCallback(async (branchId: string) => {
    if (!branchId) {
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
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Đã chọn {selectedProductIds.size} món:
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkToggle(true)}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <Check className="mr-1 h-4 w-4" />
                Bật tất cả
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkToggle(false)}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <X className="mr-1 h-4 w-4" />
                Tắt tất cả
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedProductIds(new Set())}
              >
                Bỏ chọn
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden p-0">
          {!filterBranchId ? (
            <div className="p-6">
              <FilterRequiredPlaceholder
                title="Vui lòng chọn chi nhánh"
                description="Chọn một chi nhánh từ bộ lọc phía trên để quản lý món ăn"
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
                    <TableHead className="text-center">Trạng thái</TableHead>
                    <TableHead className="text-center">Bán tại CN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
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
                      <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
