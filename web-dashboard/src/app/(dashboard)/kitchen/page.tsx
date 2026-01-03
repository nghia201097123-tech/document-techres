"use client";

import * as React from "react";
import { Plus, ChefHat, Loader2, MoreHorizontal, Pencil, Power, Trash2, UtensilsCrossed, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { kitchenService, type Kitchen, type CreateKitchenDto, type UpdateKitchenDto, type PrintMode } from "@/services/kitchen-service";
import { productService, type Product, ProductType } from "@/services/product-service";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Common paper sizes for thermal printers
const PAPER_SIZE_SUGGESTIONS = ["58mm", "80mm", "76mm", "110mm", "A4"];

type DialogMode = "create" | "edit" | "products" | null;

export default function KitchenPage() {
  const { toast } = useToast();
  const [kitchens, setKitchens] = React.useState<Kitchen[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [selectedKitchen, setSelectedKitchen] = React.useState<Kitchen | null>(null);
  const [deleteKitchen, setDeleteKitchen] = React.useState<Kitchen | null>(null);
  const [formData, setFormData] = React.useState<CreateKitchenDto>({
    name: "",
    printerName: "",
    printerIp: "",
    printerPort: 9100,
    paperSize: "80mm" as PaperSize,
    printMode: "list" as PrintMode,
    description: "",
  });

  // Product assignment state
  const [allProducts, setAllProducts] = React.useState<Product[]>([]);
  const [kitchenProducts, setKitchenProducts] = React.useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(false);
  const [selectedProductIds, setSelectedProductIds] = React.useState<Set<string>>(new Set());
  const [productSearch, setProductSearch] = React.useState("");

  // Load kitchens
  const loadKitchens = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await kitchenService.getAll();
      setKitchens(data);
    } catch (error) {
      console.error("Error loading kitchens:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách bếp", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadKitchens();
  }, [loadKitchens]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedKitchen(null);
    setFormData({
      name: "",
      printerName: "",
      printerIp: "",
      printerPort: 9100,
      paperSize: "80mm",
      printMode: "list",
      description: "",
    });
    setDialogMode("create");
  };

  // Open edit dialog
  const handleOpenEdit = (kitchen: Kitchen) => {
    setSelectedKitchen(kitchen);
    setFormData({
      name: kitchen.name,
      printerName: kitchen.printerName || "",
      printerIp: kitchen.printerIp || "",
      printerPort: kitchen.printerPort || 9100,
      paperSize: kitchen.paperSize || "80mm",
      printMode: kitchen.printMode || "list",
      description: kitchen.description || "",
    });
    setDialogMode("edit");
  };

  // Open products dialog
  const handleOpenProducts = async (kitchen: Kitchen) => {
    setSelectedKitchen(kitchen);
    setDialogMode("products");
    setLoadingProducts(true);
    setProductSearch("");
    try {
      const [products, assigned] = await Promise.all([
        productService.getAll(),
        kitchenService.getKitchenProducts(kitchen.id),
      ]);
      // Filter out toppings from the product list
      setAllProducts(products.filter(p => p.type !== ProductType.TOPPING));
      setKitchenProducts(assigned);
      setSelectedProductIds(new Set(assigned.map(p => p.id)));
    } catch (error) {
      console.error("Error loading products:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách món ăn", variant: "destructive" });
    } finally {
      setLoadingProducts(false);
    }
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedKitchen(null);
    setFormData({
      name: "",
      printerName: "",
      printerIp: "",
      printerPort: 9100,
      paperSize: "80mm",
      printMode: "list",
      description: "",
    });
    setAllProducts([]);
    setKitchenProducts([]);
    setSelectedProductIds(new Set());
    setProductSearch("");
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);

      if (dialogMode === "create") {
        const result = await kitchenService.create(formData);
        setKitchens((prev) => [...prev, { ...result, productCount: 0 }]);
        toast({ title: "Thành công", description: "Đã tạo bếp mới" });
      } else if (dialogMode === "edit" && selectedKitchen) {
        const updateData: UpdateKitchenDto = {
          name: formData.name,
          printerName: formData.printerName,
          printerIp: formData.printerIp,
          printerPort: formData.printerPort,
          paperSize: formData.paperSize,
          printMode: formData.printMode,
          description: formData.description,
        };
        const result = await kitchenService.update(selectedKitchen.id, updateData);
        setKitchens((prev) => prev.map((k) => (k.id === selectedKitchen.id ? { ...result, productCount: k.productCount } : k)));
        toast({ title: "Thành công", description: "Đã cập nhật bếp" });
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving kitchen:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi lưu bếp",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (kitchen: Kitchen) => {
    try {
      const updated = await kitchenService.toggleActive(kitchen.id);
      setKitchens((prev) => prev.map((k) => (k.id === kitchen.id ? { ...updated, productCount: k.productCount } : k)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} bếp "${kitchen.name}"`,
      });
    } catch (error: any) {
      console.error("Error toggling kitchen:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteKitchen) return;

    try {
      await kitchenService.delete(deleteKitchen.id);
      setKitchens((prev) => prev.filter((k) => k.id !== deleteKitchen.id));
      toast({ title: "Thành công", description: `Đã xóa bếp "${deleteKitchen.name}"` });
    } catch (error: any) {
      console.error("Error deleting kitchen:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi xóa",
        variant: "destructive",
      });
    } finally {
      setDeleteKitchen(null);
    }
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

  // Save product assignments
  const handleSaveProducts = async () => {
    if (!selectedKitchen) return;

    try {
      setSaving(true);
      const productIds = Array.from(selectedProductIds);
      await kitchenService.setKitchenProducts(selectedKitchen.id, productIds);

      // Update kitchen product count
      setKitchens(prev => prev.map(k =>
        k.id === selectedKitchen.id
          ? { ...k, productCount: productIds.length }
          : k
      ));

      toast({ title: "Thành công", description: `Đã gán ${productIds.length} món vào bếp "${selectedKitchen.name}"` });
      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving products:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter products by search
  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.code?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Group products by type
  const productsByType = React.useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(p => {
      if (!groups[p.type]) {
        groups[p.type] = [];
      }
      groups[p.type].push(p);
    });
    return groups;
  }, [filteredProducts]);

  const typeLabels: Record<string, string> = {
    food: "Đồ ăn",
    drink: "Đồ uống",
    other: "Khác",
    combo: "Combo",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý bếp</h1>
          <p className="text-muted-foreground">Cấu hình bếp và gán món vào bếp để in</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm bếp
        </Button>
      </div>

      {/* Kitchen Stations */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách bếp</CardTitle>
          <CardDescription>Tổng cộng {kitchens.length} bếp</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : kitchens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ChefHat className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có bếp nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm bếp&quot; để bắt đầu cấu hình
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {kitchens.map((kitchen) => (
                <Card key={kitchen.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${kitchen.isActive ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-500'}`}>
                          <ChefHat className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{kitchen.name}</p>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {kitchen.printerName && <p>Máy in: {kitchen.printerName}</p>}
                            {kitchen.printerIp && (
                              <p>IP: {kitchen.printerIp}{kitchen.printerPort ? `:${kitchen.printerPort}` : ""}</p>
                            )}
                            {kitchen.paperSize && (
                              <p>Giấy: {kitchen.paperSize} | {kitchen.printMode === "individual" ? "In từng món" : "In danh sách"}</p>
                            )}
                            <p>{kitchen.productCount || 0} món được gán</p>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenProducts(kitchen)}>
                            <UtensilsCrossed className="mr-2 h-4 w-4" />
                            Gán món ăn
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(kitchen)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(kitchen)}>
                            <Power className="mr-2 h-4 w-4" />
                            {kitchen.isActive ? "Tạm ngưng" : "Kích hoạt"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteKitchen(kitchen)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant={kitchen.isActive ? "default" : "secondary"}>
                        {kitchen.isActive ? "Hoạt động" : "Tạm ngưng"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Kitchen Dialog */}
      <Dialog open={dialogMode === "create" || dialogMode === "edit"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Thêm bếp mới" : "Chỉnh sửa bếp"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Nhập thông tin bếp. Bếp sẽ nhận order in từ món ăn được gán."
                : "Cập nhật thông tin bếp."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên bếp *</Label>
                <Input
                  id="name"
                  placeholder="Bếp chính, Bar, Bếp nướng..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="printerName">Tên máy in</Label>
                  <Input
                    id="printerName"
                    placeholder="Kitchen Printer 1"
                    value={formData.printerName}
                    onChange={(e) => setFormData({ ...formData, printerName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="printerIp">IP máy in</Label>
                  <Input
                    id="printerIp"
                    placeholder="192.168.1.100"
                    value={formData.printerIp}
                    onChange={(e) => setFormData({ ...formData, printerIp: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="printerPort">Cổng máy in</Label>
                  <Input
                    id="printerPort"
                    type="number"
                    placeholder="9100"
                    value={formData.printerPort || ""}
                    onChange={(e) => setFormData({ ...formData, printerPort: e.target.value ? parseInt(e.target.value) : undefined })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="paperSize">Kích thước giấy</Label>
                  <Input
                    id="paperSize"
                    list="paperSizeList"
                    placeholder="58mm, 80mm..."
                    value={formData.paperSize || ""}
                    onChange={(e) => setFormData({ ...formData, paperSize: e.target.value })}
                  />
                  <datalist id="paperSizeList">
                    {PAPER_SIZE_SUGGESTIONS.map((size) => (
                      <option key={size} value={size} />
                    ))}
                  </datalist>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="printMode">Chế độ in</Label>
                  <Select
                    value={formData.printMode}
                    onValueChange={(value: PrintMode) => setFormData({ ...formData, printMode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chế độ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="list">In danh sách món</SelectItem>
                      <SelectItem value="individual">In từng món</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả bếp..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving || !formData.name.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dialogMode === "create" ? "Tạo bếp" : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Assignment Dialog */}
      <Dialog open={dialogMode === "products"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Gán món ăn - {selectedKitchen?.name}</DialogTitle>
            <DialogDescription>
              Chọn các món ăn sẽ được in vào bếp này. Một món có thể được gán vào nhiều bếp.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col py-4">
            {loadingProducts ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <Input
                    placeholder="Tìm kiếm món ăn..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                <div className="flex-1 overflow-y-auto space-y-4">
                  {Object.entries(productsByType).map(([type, products]) => (
                    <div key={type}>
                      <div className="sticky top-0 bg-background py-2 mb-2">
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {typeLabels[type] || type} ({products.length})
                        </h4>
                      </div>
                      <div className="grid gap-2">
                        {products.map((product) => (
                          <div
                            key={product.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${
                              selectedProductIds.has(product.id) ? 'border-primary bg-primary/5' : ''
                            }`}
                            onClick={() => toggleProductSelection(product.id)}
                          >
                            <Checkbox
                              checked={selectedProductIds.has(product.id)}
                              onCheckedChange={() => toggleProductSelection(product.id)}
                            />
                            <div className="flex-1">
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.code}</p>
                            </div>
                            {selectedProductIds.has(product.id) && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <UtensilsCrossed className="h-10 w-10 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Không tìm thấy món ăn</p>
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Đã chọn <span className="font-medium text-foreground">{selectedProductIds.size}</span> món
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseDialog}>
              Hủy
            </Button>
            <Button onClick={handleSaveProducts} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu ({selectedProductIds.size} món)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteKitchen !== null} onOpenChange={() => setDeleteKitchen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bếp &quot;{deleteKitchen?.name}&quot;? Hành động này không thể hoàn tác.
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
