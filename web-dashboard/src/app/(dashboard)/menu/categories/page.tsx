"use client";

import * as React from "react";
import { Plus, FolderOpen, Loader2, MoreHorizontal, Pencil, Power, Trash2, Filter, X, Check } from "lucide-react";
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
import { categoryService, type Category, type CreateCategoryDto, type UpdateCategoryDto } from "@/services/category-service";
import { ProductType } from "@/services/product-service";
import { BrandFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";
import { useColumnConfig, type ColumnConfig } from "@/hooks/use-column-config";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";

const typeLabels: Record<string, { label: string; color: string }> = {
  food: { label: "Đồ ăn", color: "bg-orange-100 text-orange-800" },
  drink: { label: "Đồ uống", color: "bg-blue-100 text-blue-800" },
  other: { label: "Khác", color: "bg-gray-100 text-gray-800" },
  topping: { label: "Topping", color: "bg-purple-100 text-purple-800" },
  combo: { label: "Combo", color: "bg-green-100 text-green-800" },
};

// Default column configuration
const defaultColumns: ColumnConfig[] = [
  { key: "name", label: "Tên danh mục", visible: true, locked: true },
  { key: "productType", label: "Loại món", visible: true },
  { key: "description", label: "Mô tả", visible: true },
  { key: "sortOrder", label: "Thứ tự", visible: false },
  { key: "isActive", label: "Trạng thái", visible: true },
];

type DialogMode = "create" | "edit" | null;

export default function CategoriesPage() {
  const { toast } = useToast();

  // Global filter state from Redux
  const { brandId: filterBrandId, setBrandId: setFilterBrandId } = useGlobalFilters();

  // Column configuration
  const {
    columns,
    toggleColumn,
    resetToDefault,
    isColumnVisible,
  } = useColumnConfig({
    storageKey: "categories-table-columns",
    defaultColumns,
  });

  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = React.useState<Category | null>(null);
  const [formData, setFormData] = React.useState<CreateCategoryDto>({
    name: "",
    productType: ProductType.FOOD,
    description: "",
    sortOrder: 0,
  });
  const [continueCreating, setContinueCreating] = React.useState(false);

  // Track newly created and updated category IDs for badges
  const [newCategoryIds, setNewCategoryIds] = React.useState<Set<string>>(new Set());
  const [updatedCategoryIds, setUpdatedCategoryIds] = React.useState<Set<string>>(new Set());

  // Filter state
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Load categories - only when brand is selected
  const loadCategories = React.useCallback(async (brandId: string) => {
    if (!brandId) {
      setCategories([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await categoryService.getAll(brandId);
      // Sort by createdAt descending (newest first)
      const sortedData = [...data].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setCategories(sortedData);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách danh mục", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadCategories(filterBrandId);
  }, [filterBrandId, loadCategories]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedCategory(null);
    setFormData({ name: "", productType: ProductType.FOOD, description: "", sortOrder: 0 });
    setDialogMode("create");
  };

  // Open edit dialog
  const handleOpenEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      productType: category.productType,
      description: category.description || "",
      sortOrder: category.sortOrder,
    });
    setDialogMode("edit");
    // Remove badges when editing
    setNewCategoryIds(prev => { const next = new Set(prev); next.delete(category.id); return next; });
    setUpdatedCategoryIds(prev => { const next = new Set(prev); next.delete(category.id); return next; });
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedCategory(null);
    setFormData({ name: "", productType: ProductType.FOOD, description: "", sortOrder: 0 });
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);

      if (dialogMode === "create") {
        const result = await categoryService.create(formData);
        setCategories((prev) => [result, ...prev]);
        setNewCategoryIds(prev => new Set([...prev, result.id]));
        toast({ title: "Thành công", description: "Đã tạo danh mục mới" });
        if (continueCreating) {
          setFormData({ name: "", productType: formData.productType, description: "", sortOrder: 0 });
          return;
        }
      } else if (dialogMode === "edit" && selectedCategory) {
        const updateData: UpdateCategoryDto = {
          name: formData.name,
          description: formData.description,
          productType: formData.productType,
          sortOrder: formData.sortOrder,
        };
        const result = await categoryService.update(selectedCategory.id, updateData);
        setCategories((prev) => prev.map((c) => (c.id === selectedCategory.id ? result : c)));
        setUpdatedCategoryIds(prev => new Set([...prev, result.id]));
        setNewCategoryIds(prev => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
        toast({ title: "Thành công", description: "Đã cập nhật danh mục" });
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi lưu danh mục",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (category: Category) => {
    try {
      const updated = await categoryService.toggleActive(category.id);
      setCategories((prev) => prev.map((c) => (c.id === category.id ? updated : c)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} danh mục ${category.name}`,
      });
    } catch (error: any) {
      console.error("Error toggling category:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteCategory) return;

    try {
      await categoryService.delete(deleteCategory.id);
      setCategories((prev) => prev.filter((c) => c.id !== deleteCategory.id));
      toast({ title: "Thành công", description: `Đã xóa danh mục ${deleteCategory.name}` });
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi xóa",
        variant: "destructive",
      });
    } finally {
      setDeleteCategory(null);
    }
  };

  // Filter categories by type and status
  const filteredCategories = React.useMemo(() => {
    return categories.filter(cat => {
      const matchesType = typeFilter === "all" || cat.productType === typeFilter;
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && cat.isActive) ||
        (statusFilter === "inactive" && !cat.isActive);
      return matchesType && matchesStatus;
    });
  }, [categories, typeFilter, statusFilter]);

  // Check if any filter is active
  const hasActiveFilters = typeFilter !== "all" || statusFilter !== "all";

  // Clear all filters
  const clearFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
  };

  // Count categories by type (use original categories, not filtered)
  const countByType = (type: string) => {
    return categories.filter((c) => c.productType === type).length;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý danh mục</h1>
          <p className="text-muted-foreground">Phân loại món ăn theo danh mục (thuộc 5 loại món)</p>
        </div>
        <div className="flex items-center gap-2">
          <BrandFilter
            selectedBrandId={filterBrandId}
            onBrandChange={setFilterBrandId}
            showAllOption={false}
            className="w-[180px]"
          />
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm danh mục
          </Button>
        </div>
      </div>

      {/* Category types */}
      <div className="grid gap-4 md:grid-cols-5 mb-4">
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

      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách danh mục</CardTitle>
              <CardDescription>Tổng cộng {filteredCategories.length} danh mục</CardDescription>
            </div>
            {filterBrandId && (
              <div className="flex items-center gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px] h-9">
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">Hoạt động</SelectItem>
                    <SelectItem value="inactive">Tạm ngưng</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <ColumnConfigDialog
                  columns={columns}
                  onToggle={toggleColumn}
                  onReset={resetToDefault}
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {!filterBrandId ? (
            <FilterRequiredPlaceholder
              title="Vui lòng chọn thương hiệu"
              description="Chọn một thương hiệu từ bộ lọc phía trên để xem danh sách danh mục"
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có danh mục nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm danh mục&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto min-h-0">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  {isColumnVisible("name") && <TableHead>Tên danh mục</TableHead>}
                  {isColumnVisible("productType") && <TableHead>Loại món</TableHead>}
                  {isColumnVisible("description") && <TableHead>Mô tả</TableHead>}
                  {isColumnVisible("sortOrder") && <TableHead>Thứ tự</TableHead>}
                  {isColumnVisible("isActive") && <TableHead>Trạng thái</TableHead>}
                  <TableHead className="w-[80px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    {isColumnVisible("name") && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${typeLabels[category.productType]?.color || "bg-gray-100"}`}>
                            <FolderOpen className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-medium">{category.name}</span>
                          {newCategoryIds.has(category.id) && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Mới</Badge>
                          )}
                          {updatedCategoryIds.has(category.id) && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">Cập nhật</Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible("productType") && (
                      <TableCell>
                        <Badge variant="outline" className={typeLabels[category.productType]?.color}>
                          {typeLabels[category.productType]?.label || category.productType}
                        </Badge>
                      </TableCell>
                    )}
                    {isColumnVisible("description") && (
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {category.description || "-"}
                      </TableCell>
                    )}
                    {isColumnVisible("sortOrder") && (
                      <TableCell>{category.sortOrder}</TableCell>
                    )}
                    {isColumnVisible("isActive") && (
                      <TableCell>
                        <Badge variant={category.isActive ? "default" : "secondary"}>
                          {category.isActive ? "Hoạt động" : "Tạm ngưng"}
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
                          <DropdownMenuItem onClick={() => handleOpenEdit(category)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(category)}>
                            <Power className="mr-2 h-4 w-4" />
                            {category.isActive ? "Tạm ngưng" : "Kích hoạt"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteCategory(category)}
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
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Category Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Thêm danh mục mới" : "Chỉnh sửa danh mục"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Nhập thông tin danh mục. Mỗi danh mục thuộc một loại món."
                : "Cập nhật thông tin danh mục."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên danh mục *</Label>
                <Input
                  id="name"
                  placeholder="Phở, Cơm chiên, Trà sữa..."
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
            <DialogFooter className="flex-col sm:flex-row gap-4">
              {dialogMode === "create" && (
                <div className="flex items-center gap-2 mr-auto">
                  <Checkbox
                    id="continueCreating"
                    checked={continueCreating}
                    onCheckedChange={(checked) => setContinueCreating(!!checked)}
                  />
                  <Label htmlFor="continueCreating" className="text-sm cursor-pointer">
                    Tiếp tục tạo
                  </Label>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Hủy
                </Button>
                <Button type="submit" disabled={saving || !formData.name.trim()}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {dialogMode === "create" ? "Tạo danh mục" : "Cập nhật"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteCategory !== null} onOpenChange={() => setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa danh mục &quot;{deleteCategory?.name}&quot;? Hành động này không thể hoàn tác.
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
