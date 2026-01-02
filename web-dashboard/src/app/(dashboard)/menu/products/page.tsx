"use client";

import * as React from "react";
import { Plus, Search, UtensilsCrossed, Filter, Loader2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { productService, type Product, type CreateProductDto, ProductType } from "@/services/product-service";

const typeLabels: Record<ProductType, { label: string; color: string }> = {
  [ProductType.FOOD]: { label: "Đồ ăn", color: "bg-orange-100 text-orange-800" },
  [ProductType.DRINK]: { label: "Đồ uống", color: "bg-blue-100 text-blue-800" },
  [ProductType.OTHER]: { label: "Khác", color: "bg-gray-100 text-gray-800" },
  [ProductType.TOPPING]: { label: "Topping", color: "bg-purple-100 text-purple-800" },
  [ProductType.COMBO]: { label: "Combo", color: "bg-green-100 text-green-800" },
};

export default function ProductsPage() {
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<CreateProductDto>({
    name: "",
    type: ProductType.FOOD,
    price: 0,
    description: "",
  });

  // Load products
  const loadProducts = React.useCallback(async () => {
    try {
      setLoading(true);
      const filterType = typeFilter === "all" ? undefined : (typeFilter as ProductType);
      const data = await productService.getAll(undefined, filterType);
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);
      const result = await productService.create(formData);
      setProducts((prev) => [...prev, result]);
      setDialogOpen(false);
      setFormData({ name: "", type: ProductType.FOOD, price: 0, description: "" });
    } catch (error) {
      console.error("Error creating product:", error);
      alert("Có lỗi xảy ra khi tạo món ăn");
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (id: string) => {
    try {
      const updated = await productService.toggleActive(id);
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (error) {
      console.error("Error toggling product:", error);
    }
  };

  // Filter products by search
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase())
  );

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý món ăn</h1>
          <p className="text-muted-foreground">Thêm, sửa và quản lý menu món ăn theo thương hiệu</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
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
                  <TableHead className="text-right">Giá</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[100px]">Thao tác</TableHead>
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
                    <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? "Hoạt động" : "Tạm ngưng"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(product.id)}
                      >
                        {product.isActive ? "Tạm ngưng" : "Kích hoạt"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm món ăn mới</DialogTitle>
            <DialogDescription>
              Nhập thông tin món ăn. Mã món sẽ được tự động tạo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Loại món *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as ProductType })}
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
                  <Label htmlFor="price">Giá (VNĐ) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    placeholder="50000"
                    value={formData.price || ""}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả món ăn..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving || !formData.name.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tạo món ăn
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
