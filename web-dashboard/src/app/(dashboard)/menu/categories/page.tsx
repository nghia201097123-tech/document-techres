"use client";

import * as React from "react";
import { Plus, FolderOpen, Loader2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { categoryService, type Category, type CreateCategoryDto } from "@/services/category-service";
import { ProductType } from "@/services/product-service";

const typeLabels: Record<string, { label: string; color: string }> = {
  food: { label: "Đồ ăn", color: "bg-orange-100 text-orange-800" },
  drink: { label: "Đồ uống", color: "bg-blue-100 text-blue-800" },
  other: { label: "Khác", color: "bg-gray-100 text-gray-800" },
  topping: { label: "Topping", color: "bg-purple-100 text-purple-800" },
  combo: { label: "Combo", color: "bg-green-100 text-green-800" },
};

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<CreateCategoryDto>({
    name: "",
    productType: ProductType.FOOD,
    description: "",
  });

  // Load categories
  const loadCategories = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);
      const result = await categoryService.create(formData);
      setCategories((prev) => [...prev, result]);
      setDialogOpen(false);
      setFormData({ name: "", productType: ProductType.FOOD, description: "" });
    } catch (error) {
      console.error("Error creating category:", error);
      alert("Có lỗi xảy ra khi tạo danh mục");
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (id: string) => {
    try {
      const updated = await categoryService.toggleActive(id);
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (error) {
      console.error("Error toggling category:", error);
    }
  };

  // Count categories by type
  const countByType = (type: string) => {
    return categories.filter((c) => c.productType === type).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý danh mục</h1>
          <p className="text-muted-foreground">Phân loại món ăn theo danh mục (thuộc 5 loại món)</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm danh mục
        </Button>
      </div>

      {/* Category types */}
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(typeLabels).map(([key, { label, color }]) => (
          <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color}`}>
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{countByType(key)} danh mục</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách danh mục</CardTitle>
          <CardDescription>Tổng cộng {categories.length} danh mục</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có danh mục nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm danh mục&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${typeLabels[category.productType]?.color || "bg-gray-100"}`}>
                      <FolderOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {typeLabels[category.productType]?.label || category.productType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={category.isActive ? "default" : "secondary"}>
                      {category.isActive ? "Hoạt động" : "Tạm ngưng"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(category.id)}
                    >
                      {category.isActive ? "Tạm ngưng" : "Kích hoạt"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm danh mục mới</DialogTitle>
            <DialogDescription>
              Nhập thông tin danh mục. Mỗi danh mục thuộc một loại món.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên danh mục *</Label>
                <Input
                  id="name"
                  placeholder="Phở"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="productType">Loại món *</Label>
                <Select
                  value={formData.productType}
                  onValueChange={(value) => setFormData({ ...formData, productType: value as ProductType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại món" />
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
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả danh mục..."
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
                Tạo danh mục
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
