"use client";

import * as React from "react";
import { Plus, Search, UtensilsCrossed, Filter, Loader2, MoreHorizontal, Eye, Pencil, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { productService, type Product, type CreateProductDto, type UpdateProductDto, ProductType } from "@/services/product-service";

// Redux imports
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCategories } from "@/store/slices/categoriesSlice";

const typeLabels: Record<ProductType, { label: string; color: string }> = {
  [ProductType.FOOD]: { label: "Đồ ăn", color: "bg-orange-100 text-orange-800" },
  [ProductType.DRINK]: { label: "Đồ uống", color: "bg-blue-100 text-blue-800" },
  [ProductType.OTHER]: { label: "Khác", color: "bg-gray-100 text-gray-800" },
  [ProductType.TOPPING]: { label: "Topping", color: "bg-purple-100 text-purple-800" },
  [ProductType.COMBO]: { label: "Combo", color: "bg-green-100 text-green-800" },
};

const initialFormData: CreateProductDto = {
  name: "",
  type: ProductType.FOOD,
  price: 0,
  vatRate: 10,
  categoryId: "",
  description: "",
  imageUrl: "",
};

type DialogMode = "create" | "edit" | "view" | null;

export default function ProductsPage() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  // Redux selectors
  const { items: categories, byProductType: categoriesByType, loading: loadingCategories } = useAppSelector((state) => state.categories);

  // Local state
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<CreateProductDto>(initialFormData);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);

  // Get categories based on selected product type
  const availableCategories = React.useMemo(() => {
    if (!formData.type) return categories.filter(c => c.isActive);
    return categoriesByType[formData.type]?.filter(c => c.isActive) || [];
  }, [formData.type, categories, categoriesByType]);

  // Load products
  const loadProducts = React.useCallback(async () => {
    try {
      setLoading(true);
      const filterType = typeFilter === "all" ? undefined : (typeFilter as ProductType);
      const data = await productService.getAll(undefined, filterType);
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách món ăn", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [typeFilter, toast]);

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Load categories when dialog opens (using Redux - cached data)
  React.useEffect(() => {
    if (dialogMode === "create" || dialogMode === "edit") {
      dispatch(fetchCategories());
    }
  }, [dialogMode, dispatch]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setFormData(initialFormData);
    setDialogMode("create");
  };

  // Open view dialog
  const handleOpenView = (product: Product) => {
    setSelectedProduct(product);
    setDialogMode("view");
  };

  // Open edit dialog
  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      type: product.type,
      price: product.price,
      vatRate: product.vatRate || 10,
      categoryId: product.categoryId || "",
      description: product.description || "",
      imageUrl: product.imageUrl || "",
    });
    setDialogMode("edit");
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || formData.price <= 0) {
      toast({ title: "Lỗi", description: "Vui lòng điền đầy đủ tên món và giá", variant: "destructive" });
      return;
    }

    if (dialogMode === "create") {
      try {
        setSaving(true);
        const result = await productService.create({
          ...formData,
          categoryId: formData.categoryId || undefined,
        });
        setProducts((prev) => [...prev, result]);
        toast({ title: "Thành công", description: `Đã tạo món "${result.name}" với mã ${result.code}` });
        handleCloseDialog();
      } catch (error: any) {
        console.error("Error creating product:", error);
        toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra khi tạo món ăn", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    } else if (dialogMode === "edit" && selectedProduct) {
      const updateData: UpdateProductDto = {
        name: formData.name,
        type: formData.type,
        price: formData.price,
        vatRate: formData.vatRate,
        categoryId: formData.categoryId || undefined,
        description: formData.description || undefined,
        imageUrl: formData.imageUrl || undefined,
      };

      try {
        setSaving(true);
        const result = await productService.update(selectedProduct.id, updateData);
        setProducts((prev) => prev.map((p) => (p.id === selectedProduct.id ? result : p)));
        toast({ title: "Thành công", description: "Đã cập nhật thông tin món ăn" });
        handleCloseDialog();
      } catch (error: any) {
        console.error("Error updating product:", error);
        toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra khi cập nhật món ăn", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    }
  };

  // Handle toggle active
  const handleToggleActive = async (product: Product) => {
    try {
      const updated = await productService.toggleActive(product.id);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} món "${product.name}"`,
      });
    } catch (error: any) {
      console.error("Error toggling product:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    }
  };

  // Close dialog and reset
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedProduct(null);
    setFormData(initialFormData);
  };

  // Handle product type change - reset category when type changes
  const handleTypeChange = (type: ProductType) => {
    setFormData({ ...formData, type, categoryId: "" });
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  // Get category name by ID
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return "-";
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "-";
  };

  // Filter products by search
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý món ăn</h1>
          <p className="text-muted-foreground">Thêm, sửa và quản lý menu món ăn theo thương hiệu</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm món ăn
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách món ăn</CardTitle>
              <CardDescription>Tổng cộng {products.length} món</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Loại món" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="food">Đồ ăn</SelectItem>
                  <SelectItem value="drink">Đồ uống</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                  <SelectItem value="topping">Topping</SelectItem>
                  <SelectItem value="combo">Combo</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm món..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <UtensilsCrossed className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có món ăn nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm món ăn&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên món</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead className="text-right">Giá</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[80px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm">{product.code}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge className={typeLabels[product.type]?.color || ""}>
                        {typeLabels[product.type]?.label || product.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{getCategoryName(product.categoryId)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? "Hoạt động" : "Tạm ngưng"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenView(product)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(product)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleActive(product)}>
                            <Power className="mr-2 h-4 w-4" />
                            {product.isActive ? "Tạm ngưng" : "Kích hoạt"}
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

      {/* View Product Dialog */}
      <Dialog open={dialogMode === "view"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết món ăn</DialogTitle>
            <DialogDescription>Thông tin chi tiết của món ăn</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Mã món</Label>
                  <p className="font-mono font-medium">{selectedProduct.code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Loại món</Label>
                  <Badge className={typeLabels[selectedProduct.type]?.color || ""}>
                    {typeLabels[selectedProduct.type]?.label || selectedProduct.type}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Tên món</Label>
                <p className="font-medium text-lg">{selectedProduct.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Giá bán</Label>
                  <p className="font-medium text-lg text-green-600">{formatCurrency(selectedProduct.price)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">VAT</Label>
                  <p>{selectedProduct.vatRate || 10}%</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Danh mục</Label>
                <p>{getCategoryName(selectedProduct.categoryId)}</p>
              </div>
              {selectedProduct.description && (
                <div>
                  <Label className="text-muted-foreground text-xs">Mô tả</Label>
                  <p className="text-sm">{selectedProduct.description}</p>
                </div>
              )}
              {selectedProduct.imageUrl && (
                <div>
                  <Label className="text-muted-foreground text-xs">Hình ảnh</Label>
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="mt-2 w-full max-w-[200px] rounded-lg object-cover"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Trạng thái</Label>
                  <Badge variant={selectedProduct.isActive ? "default" : "secondary"}>
                    {selectedProduct.isActive ? "Hoạt động" : "Tạm ngưng"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Ngày tạo</Label>
                  <p>{new Date(selectedProduct.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCloseDialog()}>
              Đóng
            </Button>
            <Button onClick={() => selectedProduct && handleOpenEdit(selectedProduct)}>
              <Pencil className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Product Dialog */}
      <Dialog open={dialogMode === "create" || dialogMode === "edit"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Thêm món ăn mới" : "Chỉnh sửa món ăn"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Nhập thông tin món ăn. Mã món sẽ được tự động tạo."
                : "Cập nhật thông tin món ăn"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Row 1: Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">Tên món *</Label>
                <Input
                  id="name"
                  placeholder="Phở bò tái"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Row 2: Type and Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Loại món *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleTypeChange(value as ProductType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food">Đồ ăn</SelectItem>
                      <SelectItem value="drink">Đồ uống</SelectItem>
                      <SelectItem value="other">Khác</SelectItem>
                      <SelectItem value="topping">Topping</SelectItem>
                      <SelectItem value="combo">Combo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="categoryId">Danh mục</Label>
                  <Select
                    value={formData.categoryId || ""}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                    disabled={loadingCategories || availableCategories.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={availableCategories.length === 0 ? "Không có danh mục" : "Chọn danh mục"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Price and VAT */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">Giá bán (VNĐ) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="50000"
                    value={formData.price || ""}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vatRate">VAT (%)</Label>
                  <Input
                    id="vatRate"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="10"
                    value={formData.vatRate || ""}
                    onChange={(e) => setFormData({ ...formData, vatRate: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Row 4: Image URL */}
              <div className="grid gap-2">
                <Label htmlFor="imageUrl">URL Hình ảnh</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
                {formData.imageUrl && (
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="mt-2 w-full max-w-[150px] rounded-lg object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>

              {/* Row 5: Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả món ăn..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saving || !formData.name.trim() || formData.price <= 0}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dialogMode === "create" ? "Tạo món ăn" : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
