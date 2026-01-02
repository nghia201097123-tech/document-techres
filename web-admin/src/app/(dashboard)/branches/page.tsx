"use client";

import * as React from "react";
import {
  MapPin,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Store,
  Clock,
  Phone,
  Loader2,
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
import type { Branch, Brand } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { branchService } from "@/services/branch-service";
import { brandService } from "@/services/brand-service";
import { useToast } from "@/hooks/use-toast";

interface BranchFormData {
  brandId: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  manager: string;
  openTime: string;
  closeTime: string;
  packageId: string;
}

const initialFormData: BranchFormData = {
  brandId: "",
  name: "",
  code: "",
  address: "",
  phone: "",
  email: "",
  manager: "",
  openTime: "08:00",
  closeTime: "22:00",
  packageId: "",
};

export default function BranchesPage() {
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterBrand, setFilterBrand] = React.useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedBranch, setSelectedBranch] = React.useState<Branch | null>(null);
  const [formData, setFormData] = React.useState<BranchFormData>(initialFormData);
  const [isViewMode, setIsViewMode] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  // Fetch branches from API
  const fetchBranches = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const params: { search?: string; brandId?: string } = {};
      if (searchQuery) params.search = searchQuery;
      if (filterBrand !== "all") params.brandId = filterBrand;

      const response = await branchService.getList(params);
      setBranches(response.data);
    } catch (error: any) {
      console.error("Error fetching branches:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tải danh sách chi nhánh",
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterBrand, toast]);

  // Fetch brands for dropdown
  const fetchBrands = React.useCallback(async () => {
    try {
      const response = await brandService.getList({ limit: 100 });
      setBrands(response.data);
    } catch (error: any) {
      console.error("Error fetching brands:", error);
    }
  }, []);

  // Initial fetch
  React.useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  React.useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleOpenCreate = () => {
    setSelectedBranch(null);
    setFormData(initialFormData);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setFormData({
      brandId: branch.brandId,
      name: branch.name,
      code: branch.code,
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      manager: branch.manager || "",
      openTime: branch.openTime || "08:00",
      closeTime: branch.closeTime || "22:00",
      packageId: branch.packageId || "",
    });
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenView = (branch: Branch) => {
    setSelectedBranch(branch);
    setFormData({
      brandId: branch.brandId,
      name: branch.name,
      code: branch.code,
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      manager: branch.manager || "",
      openTime: branch.openTime || "08:00",
      closeTime: branch.closeTime || "22:00",
      packageId: branch.packageId || "",
    });
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (selectedBranch) {
        await branchService.update(selectedBranch.id, formData);
        toast({
          title: "Thành công",
          description: "Cập nhật chi nhánh thành công",
        });
      } else {
        await branchService.create(formData);
        toast({
          title: "Thành công",
          description: "Tạo chi nhánh mới thành công",
        });
      }
      setIsDialogOpen(false);
      fetchBranches();
    } catch (error: any) {
      console.error("Error saving branch:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể lưu chi nhánh",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (selectedBranch) {
      try {
        await branchService.delete(selectedBranch.id);
        toast({
          title: "Thành công",
          description: "Xóa chi nhánh thành công",
        });
        setIsDeleteDialogOpen(false);
        setSelectedBranch(null);
        fetchBranches();
      } catch (error: any) {
        console.error("Error deleting branch:", error);
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: error.response?.data?.message || "Không thể xóa chi nhánh",
        });
      }
    }
  };

  const handleToggleStatus = async (branch: Branch) => {
    try {
      await branchService.toggleStatus(branch.id);
      toast({
        title: "Thành công",
        description: `Đã ${branch.isActive ? "tạm dừng" : "kích hoạt"} chi nhánh`,
      });
      fetchBranches();
    } catch (error: any) {
      console.error("Error toggling status:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể thay đổi trạng thái",
      });
    }
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
          <h2 className="text-2xl font-bold tracking-tight">Quản lý Chi nhánh</h2>
          <p className="text-muted-foreground">
            Quản lý danh sách chi nhánh theo thương hiệu
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm chi nhánh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              Danh sách chi nhánh ({branches.length})
            </CardTitle>
            <div className="flex gap-2">
              <Select value={filterBrand} onValueChange={setFilterBrand}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Lọc theo thương hiệu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả thương hiệu</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên, mã, địa chỉ..."
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
                <TableHead>Chi nhánh</TableHead>
                <TableHead>Thương hiệu</TableHead>
                <TableHead>Liên hệ</TableHead>
                <TableHead>Giờ hoạt động</TableHead>
                <TableHead>Gói dịch vụ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                        <MapPin className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium">{branch.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {branch.code}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">{branch.brandName}</p>
                        <p className="text-xs text-muted-foreground">
                          {branch.companyName}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        {branch.phone || "-"}
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {branch.address || "-"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3" />
                      {branch.openTime} - {branch.closeTime}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{branch.packageName || "Chưa gán"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={branch.isActive ? "success" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(branch)}
                    >
                      {branch.isActive ? "Hoạt động" : "Tạm dừng"}
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
                        <DropdownMenuItem onClick={() => handleOpenView(branch)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEdit(branch)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDelete(branch)}
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
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Đang tải...
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && branches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Không tìm thấy chi nhánh nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isViewMode
                ? "Chi tiết chi nhánh"
                : selectedBranch
                ? "Chỉnh sửa chi nhánh"
                : "Thêm chi nhánh mới"}
            </DialogTitle>
            <DialogDescription>
              {isViewMode
                ? "Thông tin chi tiết của chi nhánh"
                : selectedBranch
                ? "Cập nhật thông tin chi nhánh"
                : "Nhập thông tin chi nhánh mới"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="brandId">Thương hiệu *</Label>
                <Select
                  value={formData.brandId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, brandId: value }))
                  }
                  disabled={isViewMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn thương hiệu" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name} ({brand.companyName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tên chi nhánh *</Label>
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
                  <Label htmlFor="code">Mã chi nhánh *</Label>
                  <Input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    required
                    disabled={isViewMode || !!selectedBranch}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={isViewMode}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isViewMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isViewMode}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager">Quản lý</Label>
                <Input
                  id="manager"
                  name="manager"
                  value={formData.manager}
                  onChange={handleChange}
                  disabled={isViewMode}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="openTime">Giờ mở cửa</Label>
                  <Input
                    id="openTime"
                    name="openTime"
                    type="time"
                    value={formData.openTime}
                    onChange={handleChange}
                    disabled={isViewMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closeTime">Giờ đóng cửa</Label>
                  <Input
                    id="closeTime"
                    name="closeTime"
                    type="time"
                    value={formData.closeTime}
                    onChange={handleChange}
                    disabled={isViewMode}
                  />
                </div>
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
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedBranch ? "Cập nhật" : "Thêm mới"}
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
              Bạn có chắc chắn muốn xóa chi nhánh{" "}
              <span className="font-medium">{selectedBranch?.name}</span>? Hành
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
