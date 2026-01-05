"use client";

import * as React from "react";
import { Plus, Gift, Loader2, MoreHorizontal, Pencil, Power, Trash2, Search } from "lucide-react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { giftItemService, type GiftItem, type CreateGiftItemDto, type UpdateGiftItemDto } from "@/services/gift-item-service";
import { productService, type Product } from "@/services/product-service";
import { BrandBranchFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";
import { useColumnConfig, type ColumnConfig } from "@/hooks/use-column-config";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";

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
  const [formData, setFormData] = React.useState<CreateGiftItemDto>({
    productId: "",
    name: "",
    description: "",
    maxQuantity: 1,
    minOrderAmount: 0,
    sortOrder: 0,
  });

  // Product selector state
  const [productSelectorOpen, setProductSelectorOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);

  // Track newly created and updated IDs for badges
  const [newItemIds, setNewItemIds] = React.useState<Set<string>>(new Set());
  const [updatedItemIds, setUpdatedItemIds] = React.useState<Set<string>>(new Set());

  // Continue creating checkbox state
  const [continueCreating, setContinueCreating] = React.useState(false);

  // Load products when brand changes
  const loadProducts = React.useCallback(async (brandId: string) => {
    if (!brandId) {
      setProducts([]);
      return;
    }
    try {
      setLoadingProducts(true);
      const data = await productService.getAll(brandId);
      // Filter only active products
      setProducts(data.filter(p => p.isActive));
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

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedItem(null);
    setSelectedProduct(null);
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
    // Find the product for this gift item
    const product = products.find(p => p.id === item.productId) || null;
    setSelectedProduct(product);
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
    setSelectedProduct(null);
    setFormData({
      productId: "",
      name: "",
      description: "",
      maxQuantity: 1,
      minOrderAmount: 0,
      sortOrder: 0,
    });
  };

  // Handle product selection
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setFormData({ ...formData, productId: product.id, name: "" });
    setProductSelectorOpen(false);
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId) {
      toast({ title: "Lỗi", description: "Vui lòng chọn món ăn", variant: "destructive" });
      return;
    }

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

      if (dialogMode === "create") {
        const result = await giftItemService.create(submitData);
        setGiftItems((prev) => [result, ...prev]);
        setNewItemIds(prev => new Set([...prev, result.id]));
        toast({ title: "Thành công", description: "Đã thêm món tặng mới" });
      } else if (dialogMode === "edit" && selectedItem) {
        const result = await giftItemService.update(selectedItem.id, submitData);
        setGiftItems((prev) => prev.map((item) => (item.id === selectedItem.id ? result : item)));
        setUpdatedItemIds(prev => new Set([...prev, result.id]));
        setNewItemIds(prev => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
        toast({ title: "Thành công", description: "Đã cập nhật món tặng" });
      }

      // If continue creating is checked and in create mode, reset form instead of closing
      if (continueCreating && dialogMode === "create") {
        setSelectedProduct(null);
        setFormData({
          productId: "",
          name: "",
          description: "",
          maxQuantity: 1,
          minOrderAmount: 0,
          sortOrder: 0,
        });
      } else {
        handleCloseDialog();
      }
    } catch (error: any) {
      console.error("Error saving gift item:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi lưu món tặng",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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

  // Filter gift items by branch (already filtered by API)
  const filteredItems = giftItems;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý món tặng</h1>
          <p className="text-muted-foreground">Chọn món ăn từ thực đơn để làm món tặng kèm</p>
        </div>
        <div className="flex items-center gap-2">
          <BrandBranchFilter
            selectedBrandId={filterBrandId}
            selectedBranchId={filterBranchId}
            onBrandChange={setFilterBrandId}
            onBranchChange={setFilterBranchId}
            showAllBranchOption={false}
            className="w-[360px]"
          />
          <Button onClick={handleOpenCreate} disabled={!filterBranchId}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm món tặng
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách món tặng</CardTitle>
              <CardDescription>Tổng cộng {filteredItems.length} món tặng</CardDescription>
            </div>
            {filterBranchId && filteredItems.length > 0 && (
              <ColumnConfigDialog
                columns={columns}
                onToggle={toggleColumn}
                onReset={resetToDefault}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
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
            <Table>
              <TableHeader>
                <TableRow>
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
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
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
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Thêm món tặng" : "Chỉnh sửa món tặng"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Chọn món ăn từ thực đơn để làm món tặng kèm"
                : "Cập nhật thông tin món tặng"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Product Selector */}
              <div className="grid gap-2">
                <Label>Chọn món ăn *</Label>
                <Popover open={productSelectorOpen} onOpenChange={setProductSelectorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={productSelectorOpen}
                      className="justify-between font-normal"
                    >
                      {selectedProduct ? (
                        <span>{selectedProduct.name}</span>
                      ) : (
                        <span className="text-muted-foreground">Tìm và chọn món ăn...</span>
                      )}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Tìm món ăn..." />
                      <CommandList>
                        <CommandEmpty>
                          {loadingProducts ? "Đang tải..." : "Không tìm thấy món ăn"}
                        </CommandEmpty>
                        <CommandGroup>
                          {products.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.name}
                              onSelect={() => handleSelectProduct(product)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span>{product.name}</span>
                                {product.price && (
                                  <span className="text-xs text-muted-foreground">
                                    - {formatCurrency(Number(product.price))}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Custom name (optional) */}
              <div className="grid gap-2">
                <Label htmlFor="name">Tên hiển thị (tùy chọn)</Label>
                <Input
                  id="name"
                  placeholder="Để trống sẽ dùng tên món ăn"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Nếu để trống, sẽ sử dụng tên của món ăn đã chọn
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="maxQuantity">Số lượng tối đa</Label>
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
                  <p className="text-xs text-muted-foreground">
                    Để 0 nếu không giới hạn
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả điều kiện tặng..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sortOrder">Thứ tự hiển thị</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.sortOrder || 0}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-3">
              {dialogMode === "create" && (
                <div className="flex items-center space-x-2 mr-auto">
                  <Checkbox
                    id="continueCreating"
                    checked={continueCreating}
                    onCheckedChange={(checked) => setContinueCreating(checked as boolean)}
                  />
                  <Label htmlFor="continueCreating" className="text-sm font-normal cursor-pointer">
                    Tiếp tục thêm
                  </Label>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Hủy
                </Button>
                <Button type="submit" disabled={saving || !formData.productId}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {dialogMode === "create" ? "Thêm món tặng" : "Cập nhật"}
                </Button>
              </div>
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
