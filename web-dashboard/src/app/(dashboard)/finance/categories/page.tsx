"use client";

import * as React from "react";
import {
  Plus,
  FolderTree,
  Loader2,
  MoreHorizontal,
  Pencil,
  Power,
  Trash2,
  TrendingUp,
  TrendingDown,
  Search,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  transactionCategoryService,
  TransactionType,
  transactionTypeLabels,
  type TransactionCategory,
  type CreateTransactionCategoryDto,
} from "@/services/transaction-service";

type DialogMode = "create" | "edit" | null;

const initialFormData: CreateTransactionCategoryDto = {
  name: "",
  code: "",
  type: TransactionType.EXPENSE,
  description: "",
};

export default function TransactionCategoriesPage() {
  const { toast } = useToast();

  // State
  const [categories, setCategories] = React.useState<TransactionCategory[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [selectedCategory, setSelectedCategory] =
    React.useState<TransactionCategory | null>(null);
  const [formData, setFormData] =
    React.useState<CreateTransactionCategoryDto>(initialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterType, setFilterType] = React.useState<TransactionType | "all">(
    "all"
  );
  const [filterStatus, setFilterStatus] = React.useState<
    "all" | "active" | "inactive"
  >("all");

  // Fetch categories
  const fetchCategories = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await transactionCategoryService.getList({
        type: filterType === "all" ? undefined : filterType,
        search: searchTerm || undefined,
        isActive:
          filterStatus === "all"
            ? undefined
            : filterStatus === "active"
            ? true
            : false,
        limit: 100,
      });
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể tải danh sách danh mục",
      });
    } finally {
      setIsLoading(false);
    }
  }, [filterType, filterStatus, searchTerm, toast]);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Handle seed default categories
  const handleSeed = async () => {
    try {
      const result = await transactionCategoryService.seed();
      toast({
        title: "Thành công",
        description: result.message,
      });
      fetchCategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description:
          error.response?.data?.message || "Không thể khởi tạo danh mục",
      });
    }
  };

  // Open dialog
  const openCreateDialog = () => {
    setSelectedCategory(null);
    setFormData(initialFormData);
    setDialogMode("create");
  };

  const openEditDialog = (category: TransactionCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      code: category.code,
      type: category.type,
      description: category.description || "",
    });
    setDialogMode("edit");
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (dialogMode === "create") {
        await transactionCategoryService.create(formData);
        toast({
          title: "Thành công",
          description: "Đã tạo danh mục mới",
        });
      } else if (selectedCategory) {
        await transactionCategoryService.update(selectedCategory.id, formData);
        toast({
          title: "Thành công",
          description: "Đã cập nhật danh mục",
        });
      }
      setDialogMode(null);
      fetchCategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể lưu danh mục",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (category: TransactionCategory) => {
    try {
      await transactionCategoryService.toggleActive(category.id);
      toast({
        title: "Thành công",
        description: `Đã ${
          category.isActive ? "tạm ngưng" : "kích hoạt"
        } danh mục`,
      });
      fetchCategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description:
          error.response?.data?.message || "Không thể thay đổi trạng thái",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await transactionCategoryService.delete(deleteId);
      toast({
        title: "Thành công",
        description: "Đã xóa danh mục",
      });
      setDeleteId(null);
      fetchCategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể xóa danh mục",
      });
    }
  };

  // Stats
  const incomeCategories = categories.filter(
    (c) => c.type === TransactionType.INCOME
  );
  const expenseCategories = categories.filter(
    (c) => c.type === TransactionType.EXPENSE
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Danh mục thu chi
          </h1>
          <p className="text-muted-foreground">
            Quản lý danh mục phiếu thu chi theo quy định thuế
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeed}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Khởi tạo mặc định
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm danh mục
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng danh mục</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Danh mục thu</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {incomeCategories.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Danh mục chi</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {expenseCategories.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên hoặc mã..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filterType}
                onValueChange={(v) =>
                  setFilterType(v as TransactionType | "all")
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value={TransactionType.INCOME}>Thu</SelectItem>
                  <SelectItem value={TransactionType.EXPENSE}>Chi</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filterStatus}
                onValueChange={(v) =>
                  setFilterStatus(v as "all" | "active" | "inactive")
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="inactive">Tạm ngưng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên danh mục</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Chưa có danh mục nào
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-mono text-sm">
                        {category.code}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {category.type === TransactionType.INCOME ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-medium">{category.name}</span>
                          {category.isSystem && (
                            <Badge variant="secondary" className="text-xs">
                              Hệ thống
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            category.type === TransactionType.INCOME
                              ? "default"
                              : "destructive"
                          }
                          className={
                            category.type === TransactionType.INCOME
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : "bg-red-100 text-red-800 hover:bg-red-100"
                          }
                        >
                          {transactionTypeLabels[category.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {category.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={category.isActive ? "default" : "secondary"}
                          className={
                            category.isActive
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : ""
                          }
                        >
                          {category.isActive ? "Hoạt động" : "Tạm ngưng"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!category.isSystem && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEditDialog(category)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(category)}
                              >
                                <Power className="mr-2 h-4 w-4" />
                                {category.isActive ? "Tạm ngưng" : "Kích hoạt"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteId(category.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => !open && setDialogMode(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Thêm danh mục mới" : "Chỉnh sửa danh mục"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Tạo danh mục thu chi mới"
                : "Cập nhật thông tin danh mục"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Mã danh mục *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="VD: DT_BH, CP_NVL..."
                  disabled={dialogMode === "edit"}
                />
                <p className="text-xs text-muted-foreground">
                  Chỉ gồm chữ in hoa, số và gạch dưới
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Tên danh mục *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="VD: Doanh thu bán hàng"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Loại *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) =>
                    setFormData(prev => ({ ...prev, type: v as TransactionType }))
                  }
                  disabled={dialogMode === "edit"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TransactionType.INCOME}>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Thu
                      </div>
                    </SelectItem>
                    <SelectItem value={TransactionType.EXPENSE}>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        Chi
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Mô tả chi tiết về danh mục..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogMode(null)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : dialogMode === "create" ? (
                  "Tạo danh mục"
                ) : (
                  "Cập nhật"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa danh mục này? Hành động này không thể
              hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
