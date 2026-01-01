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
import type { Branch } from "@/types";
import { formatDateTime } from "@/lib/utils";

// Mock data
const mockBranches: Branch[] = [
  {
    id: "1",
    brandId: "1",
    brandName: "Coffee House ABC",
    companyName: "Công ty TNHH ABC Food",
    name: "Chi nhánh Quận 1",
    code: "CHABC-Q1",
    address: "123 Nguyễn Huệ, Quận 1, TP.HCM",
    phone: "028 1234 5678",
    email: "q1@coffeehouse.vn",
    manager: "Nguyễn Văn A",
    openTime: "07:00",
    closeTime: "22:00",
    packageId: "3",
    packageName: "Premium",
    isActive: true,
    createdAt: "2024-01-20T10:30:00Z",
    updatedAt: "2024-01-20T10:30:00Z",
  },
  {
    id: "2",
    brandId: "1",
    brandName: "Coffee House ABC",
    companyName: "Công ty TNHH ABC Food",
    name: "Chi nhánh Quận 7",
    code: "CHABC-Q7",
    address: "456 Nguyễn Văn Linh, Quận 7, TP.HCM",
    phone: "028 7654 3210",
    email: "q7@coffeehouse.vn",
    manager: "Trần Thị B",
    openTime: "08:00",
    closeTime: "23:00",
    packageId: "2",
    packageName: "Standard",
    isActive: true,
    createdAt: "2024-02-15T14:45:00Z",
    updatedAt: "2024-02-15T14:45:00Z",
  },
  {
    id: "3",
    brandId: "3",
    brandName: "Nhà hàng XYZ Premium",
    companyName: "Công ty Cổ phần XYZ Restaurant",
    name: "Chi nhánh Thủ Đức",
    code: "XYZPM-TD",
    address: "789 Võ Văn Ngân, Thủ Đức, TP.HCM",
    phone: "028 3456 7890",
    email: "thuduc@xyzpremium.vn",
    manager: "Lê Văn C",
    openTime: "10:00",
    closeTime: "22:00",
    packageId: "4",
    packageName: "Enterprise",
    isActive: true,
    createdAt: "2024-03-10T09:15:00Z",
    updatedAt: "2024-03-10T09:15:00Z",
  },
  {
    id: "4",
    brandId: "2",
    brandName: "Trà Sữa ABC",
    companyName: "Công ty TNHH ABC Food",
    name: "Chi nhánh Bình Thạnh",
    code: "TSABC-BT",
    address: "321 Xô Viết Nghệ Tĩnh, Bình Thạnh, TP.HCM",
    phone: "028 9876 5432",
    email: "binhthanh@trasua.vn",
    manager: "Phạm Thị D",
    openTime: "09:00",
    closeTime: "21:00",
    packageId: "1",
    packageName: "Basic",
    isActive: false,
    createdAt: "2024-03-20T11:00:00Z",
    updatedAt: "2024-03-20T11:00:00Z",
  },
];

// Mock brands for select
const mockBrands = [
  { id: "1", name: "Coffee House ABC", companyName: "Công ty TNHH ABC Food" },
  { id: "2", name: "Trà Sữa ABC", companyName: "Công ty TNHH ABC Food" },
  { id: "3", name: "Nhà hàng XYZ Premium", companyName: "Công ty Cổ phần XYZ Restaurant" },
  { id: "4", name: "XYZ Express", companyName: "Công ty Cổ phần XYZ Restaurant" },
];

// Mock packages for select
const mockPackages = [
  { id: "1", name: "Basic", maxBranches: 3 },
  { id: "2", name: "Standard", maxBranches: 10 },
  { id: "3", name: "Premium", maxBranches: 30 },
  { id: "4", name: "Enterprise", maxBranches: -1 },
];

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
  const [branches, setBranches] = React.useState<Branch[]>(mockBranches);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterBrand, setFilterBrand] = React.useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedBranch, setSelectedBranch] = React.useState<Branch | null>(null);
  const [formData, setFormData] = React.useState<BranchFormData>(initialFormData);
  const [isViewMode, setIsViewMode] = React.useState(false);

  const filteredBranches = branches.filter((branch) => {
    const matchesSearch =
      branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (branch.address?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesBrand = filterBrand === "all" || branch.brandId === filterBrand;
    return matchesSearch && matchesBrand;
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const brand = mockBrands.find((b) => b.id === formData.brandId);
    const pkg = mockPackages.find((p) => p.id === formData.packageId);

    if (selectedBranch) {
      setBranches((prev) =>
        prev.map((b) =>
          b.id === selectedBranch.id
            ? {
                ...b,
                ...formData,
                brandName: brand?.name || "",
                companyName: brand?.companyName || "",
                packageName: pkg?.name,
                updatedAt: new Date().toISOString(),
              }
            : b
        )
      );
    } else {
      const newBranch: Branch = {
        id: String(Date.now()),
        ...formData,
        brandName: brand?.name || "",
        companyName: brand?.companyName || "",
        packageName: pkg?.name,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setBranches((prev) => [newBranch, ...prev]);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (selectedBranch) {
      setBranches((prev) => prev.filter((b) => b.id !== selectedBranch.id));
      setIsDeleteDialogOpen(false);
      setSelectedBranch(null);
    }
  };

  const handleToggleStatus = (branch: Branch) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === branch.id ? { ...b, isActive: !b.isActive } : b))
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
          <h2 className="text-2xl font-bold tracking-tight">
            Quản lý Chi nhánh
          </h2>
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
              Danh sách chi nhánh ({filteredBranches.length})
            </CardTitle>
            <div className="flex gap-2">
              <Select value={filterBrand} onValueChange={setFilterBrand}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Lọc theo thương hiệu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả thương hiệu</SelectItem>
                  {mockBrands.map((brand) => (
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
                <TableHead>Giờ mở cửa</TableHead>
                <TableHead>Gói</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBranches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <MapPin className="h-5 w-5 text-blue-500" />
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
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {branch.phone || "-"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {branch.manager || "Chưa có quản lý"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {branch.openTime} - {branch.closeTime}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{branch.packageName || "-"}</Badge>
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
              {filteredBranches.length === 0 && (
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
              <div className="grid grid-cols-2 gap-4">
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
                      {mockBrands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="packageId">Gói App Food</Label>
                  <Select
                    value={formData.packageId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, packageId: value }))
                    }
                    disabled={isViewMode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn gói" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPackages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} ({pkg.maxBranches === -1 ? "Unlimited" : `${pkg.maxBranches} chi nhánh`})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              <div className="grid grid-cols-3 gap-4">
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
                  <Button type="submit">
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
