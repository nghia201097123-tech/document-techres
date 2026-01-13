"use client";

import * as React from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchTransactionCategories,
  invalidateTransactionCategoriesCache,
  addCategory,
  updateCategory,
  removeCategory,
} from "@/store/slices/transactionCategoriesSlice";
import {
  transactionCategoryService,
  type TransactionCategory,
  type TransactionType,
  type CreateTransactionCategoryDto,
  type UpdateTransactionCategoryDto,
} from "@/services/transaction-category-service";

const initialFormData: CreateTransactionCategoryDto = {
  name: "",
  code: "",
  type: "income",
  description: "",
};

export default function TransactionCategoriesPage() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  // Redux state
  const { items: categories, loading, total } = useAppSelector(
    (state) => state.transactionCategories
  );

  // Local state
  const [search, setSearch] = React.useState("");
  const [filterType, setFilterType] = React.useState<TransactionType | "all">("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<TransactionCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = React.useState<TransactionCategory | null>(null);
  const [formData, setFormData] = React.useState<CreateTransactionCategoryDto>(initialFormData);

  // Load categories on mount and when filter changes
  React.useEffect(() => {
    dispatch(
      fetchTransactionCategories({
        type: filterType === "all" ? undefined : filterType,
        search: search || undefined,
      })
    );
  }, [dispatch, filterType]);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(
        fetchTransactionCategories({
          type: filterType === "all" ? undefined : filterType,
          search: search || undefined,
        })
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [search, dispatch, filterType]);

  // Open create dialog
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  // Open edit dialog
  const handleOpenEdit = (category: TransactionCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      code: category.code,
      type: category.type,
      description: category.description || "",
    });
    setDialogOpen(true);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.code.trim()) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc",
      });
      return;
    }

    try {
      setSaving(true);

      if (editingCategory) {
        // Update
        const updated = await transactionCategoryService.update(editingCategory.id, {
          name: formData.name,
          type: formData.type,
          description: formData.description,
        });
        dispatch(updateCategory(updated));
        toast({ title: "Thành công", description: "Đã cập nhật danh mục" });
      } else {
        // Create
        const created = await transactionCategoryService.create(formData);
        dispatch(addCategory(created));
        toast({ title: "Thành công", description: "Đã tạo danh mục mới" });
      }

      setDialogOpen(false);
      setFormData(initialFormData);
      setEditingCategory(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!categoryToDelete) return;

    try {
      await transactionCategoryService.delete(categoryToDelete.id);
      dispatch(removeCategory(categoryToDelete.id));
      toast({ title: "Thành công", description: "Đã xóa danh mục" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể xóa danh mục",
      });
    } finally {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (category: TransactionCategory) => {
    try {
      const updated = await transactionCategoryService.toggleActive(category.id);
      dispatch(updateCategory(updated));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tắt"} danh mục`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
      });
    }
  };

  // Handle seed defaults
  const handleSeedDefaults = async () => {
    try {
      await transactionCategoryService.seedDefaults();
      dispatch(invalidateTransactionCategoriesCache());
      dispatch(fetchTransactionCategories({}));
      toast({ title: "Thành công", description: "Đã tạo danh mục mặc định" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
      });
    }
  };

  // Filter categories for display
  const filteredCategories = categories.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || c.type === filterType;
    return matchSearch && matchType;
  });

  // Separate by type
  const incomeCategories = filteredCategories.filter((c) => c.type === "income");
  const expenseCategories = filteredCategories.filter((c) => c.type === "expense");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Danh mục thu/chi</h1>
          <p className="text-muted-foreground">
            Quản lý các danh mục thu nhập và chi phí
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeedDefaults}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tạo mặc định
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm danh mục
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên, mã..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={filterType} onValueChange={(v) => setFilterType(v as TransactionType | "all")}>
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="income" className="text-green-600">
              <ArrowUpCircle className="mr-1 h-4 w-4" />
              Thu
            </TabsTrigger>
            <TabsTrigger value="expense" className="text-red-600">
              <ArrowDownCircle className="mr-1 h-4 w-4" />
              Chi
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách danh mục</CardTitle>
          <CardDescription>
            Tổng cộng {filteredCategories.length} danh mục
            {filterType !== "all" && ` (${filterType === "income" ? "Thu" : "Chi"})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-muted-foreground">Chưa có danh mục nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm danh mục&quot; hoặc &quot;Tạo mặc định&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Mã</TableHead>
                  <TableHead>Tên danh mục</TableHead>
                  <TableHead className="w-[100px]">Loại</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="w-[100px]">Trạng thái</TableHead>
                  <TableHead className="w-[80px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-mono text-sm">{category.code}</TableCell>
                    <TableCell className="font-medium">
                      {category.name}
                      {category.isSystem && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Hệ thống
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {category.type === "income" ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <ArrowUpCircle className="mr-1 h-3 w-3" />
                          Thu
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                          <ArrowDownCircle className="mr-1 h-3 w-3" />
                          Chi
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {category.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.isActive ? "default" : "secondary"}>
                        {category.isActive ? "Hoạt động" : "Tạm ngưng"}
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
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(category)}
                            disabled={category.isSystem}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(category)}
                            disabled={category.isSystem && category.isActive}
                          >
                            {category.isActive ? "Tạm ngưng" : "Kích hoạt"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              setCategoryToDelete(category);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={category.isSystem}
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Cập nhật thông tin danh mục thu/chi"
                : "Tạo danh mục thu/chi mới cho hệ thống"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tên danh mục *</Label>
                  <Input
                    id="name"
                    placeholder="VD: Doanh thu bán hàng"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Mã danh mục *</Label>
                  <Input
                    id="code"
                    placeholder="VD: DT_BH"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
                      })
                    }
                    disabled={!!editingCategory}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Loại danh mục *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v: TransactionType) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">
                      <div className="flex items-center">
                        <ArrowUpCircle className="mr-2 h-4 w-4 text-green-600" />
                        Thu (Income)
                      </div>
                    </SelectItem>
                    <SelectItem value="expense">
                      <div className="flex items-center">
                        <ArrowDownCircle className="mr-2 h-4 w-4 text-red-600" />
                        Chi (Expense)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả chi tiết về danh mục..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCategory ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa danh mục &quot;{categoryToDelete?.name}&quot;? Hành động này
              không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
