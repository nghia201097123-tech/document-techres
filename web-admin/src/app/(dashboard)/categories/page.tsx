"use client";

import * as React from "react";
import {
  Wallet,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TransactionCategory } from "@/types";
import { formatDateTime } from "@/lib/utils";

// Mock data
const mockCategories: TransactionCategory[] = [
  {
    id: "1",
    name: "Doanh thu bán hàng",
    code: "SALES_REVENUE",
    type: "income",
    description: "Thu nhập từ bán hàng trực tiếp",
    isSystem: true,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Thu phí dịch vụ",
    code: "SERVICE_FEE",
    type: "income",
    description: "Thu phí dịch vụ đặt bàn, ship...",
    isSystem: false,
    isActive: true,
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-05T00:00:00Z",
  },
  {
    id: "3",
    name: "Chi phí nguyên vật liệu",
    code: "RAW_MATERIAL",
    type: "expense",
    description: "Chi phí mua nguyên vật liệu",
    isSystem: true,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "4",
    name: "Chi phí lương nhân viên",
    code: "SALARY",
    type: "expense",
    description: "Lương và phụ cấp nhân viên",
    isSystem: true,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "5",
    name: "Chi phí điện nước",
    code: "UTILITIES",
    type: "expense",
    description: "Tiền điện, nước, internet...",
    isSystem: false,
    isActive: true,
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-10T00:00:00Z",
  },
  {
    id: "6",
    name: "Chi phí thuê mặt bằng",
    code: "RENT",
    type: "expense",
    description: "Tiền thuê mặt bằng hàng tháng",
    isSystem: false,
    isActive: true,
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-10T00:00:00Z",
  },
  {
    id: "7",
    name: "Thu nhập khác",
    code: "OTHER_INCOME",
    type: "income",
    description: "Các khoản thu nhập khác",
    isSystem: false,
    isActive: false,
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
];

interface CategoryFormData {
  name: string;
  code: string;
  type: "income" | "expense";
  description: string;
}

const initialFormData: CategoryFormData = {
  name: "",
  code: "",
  type: "income",
  description: "",
};

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState<TransactionCategory[]>(mockCategories);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<TransactionCategory | null>(null);
  const [formData, setFormData] = React.useState<CategoryFormData>(initialFormData);
  const [isViewMode, setIsViewMode] = React.useState(false);

  const filteredCategories = categories.filter((category) => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || category.type === filterType;
    return matchesSearch && matchesType;
  });

  const incomeCount = categories.filter((c) => c.type === "income").length;
  const expenseCount = categories.filter((c) => c.type === "expense").length;

  const handleOpenCreate = () => {
    setSelectedCategory(null);
    setFormData(initialFormData);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (category: TransactionCategory) => {
    if (category.isSystem) {
      return; // Don't allow editing system categories
    }
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      code: category.code,
      type: category.type,
      description: category.description || "",
    });
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenView = (category: TransactionCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      code: category.code,
      type: category.type,
      description: category.description || "",
    });
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (category: TransactionCategory) => {
    if (category.isSystem) {
      return; // Don't allow deleting system categories
    }
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategory) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === selectedCategory.id
            ? { ...c, ...formData, updatedAt: new Date().toISOString() }
            : c
        )
      );
    } else {
      const newCategory: TransactionCategory = {
        id: String(Date.now()),
        ...formData,
        isSystem: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCategories((prev) => [newCategory, ...prev]);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (selectedCategory) {
      setCategories((prev) => prev.filter((c) => c.id !== selectedCategory.id));
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
    }
  };

  const handleToggleStatus = (category: TransactionCategory) => {
    if (category.isSystem) {
      return; // Don't allow toggling system categories
    }
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, isActive: !c.isActive } : c))
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Danh mục Thu/Chi</h2>
          <p className="text-muted-foreground">
            Quản lý các danh mục khoản thu và khoản chi
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm danh mục
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Danh mục Thu
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{incomeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Danh mục Chi
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{expenseCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              Danh sách danh mục ({filteredCategories.length})
            </CardTitle>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Lọc theo loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="income">Khoản thu</SelectItem>
                  <SelectItem value="expense">Khoản chi</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên, mã..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Danh mục</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Hệ thống</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          category.type === "income"
                            ? "bg-green-500/10"
                            : "bg-red-500/10"
                        }`}
                      >
                        {category.type === "income" ? (
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {category.code}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={category.type === "income" ? "success" : "destructive"}
                    >
                      {category.type === "income" ? "Khoản thu" : "Khoản chi"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {category.description || "-"}
                  </TableCell>
                  <TableCell>
                    {category.isSystem ? (
                      <Badge variant="outline">Hệ thống</Badge>
                    ) : (
                      <Badge variant="secondary">Tùy chỉnh</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={category.isActive ? "success" : "secondary"}
                      className={category.isSystem ? "" : "cursor-pointer"}
                      onClick={() =>
                        !category.isSystem && handleToggleStatus(category)
                      }
                    >
                      {category.isActive ? "Hoạt động" : "Tạm dừng"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(category.createdAt)}
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
                          onClick={() => handleOpenView(category)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenEdit(category)}
                          disabled={category.isSystem}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDelete(category)}
                          disabled={category.isSystem}
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
              {filteredCategories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Không tìm thấy danh mục nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isViewMode
                ? "Chi tiết danh mục"
                : selectedCategory
                ? "Chỉnh sửa danh mục"
                : "Thêm danh mục mới"}
            </DialogTitle>
            <DialogDescription>
              {isViewMode
                ? "Thông tin chi tiết của danh mục"
                : selectedCategory
                ? "Cập nhật thông tin danh mục"
                : "Nhập thông tin danh mục mới"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="type">Loại danh mục *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "income" | "expense") =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                  disabled={isViewMode || !!selectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Khoản thu</SelectItem>
                    <SelectItem value="expense">Khoản chi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Tên danh mục *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Mã danh mục *</Label>
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  required
                  disabled={isViewMode || !!selectedCategory}
                  placeholder="VD: SALES_REVENUE"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={isViewMode}
                />
              </div>
            </div>
            <DialogFooter>
              {isViewMode ? (
                <Button type="button" onClick={() => setIsDialogOpen(false)}>
                  Đóng
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Hủy
                  </Button>
                  <Button type="submit">
                    {selectedCategory ? "Cập nhật" : "Thêm mới"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa danh mục{" "}
              <span className="font-medium">{selectedCategory?.name}</span>? Hành
              động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
