"use client";

import * as React from "react";
import {
  Store,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Building2,
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
import type { Brand, BusinessModel } from "@/types";
import { formatDateTime } from "@/lib/utils";

const businessModelLabels: Record<BusinessModel, string> = {
  order_only: "Chỉ Order",
  ccb_only: "Chỉ Thu Ngân",
  full_system: "Full Hệ Thống",
};

const businessModelColors: Record<BusinessModel, "default" | "secondary" | "success"> = {
  order_only: "secondary",
  ccb_only: "default",
  full_system: "success",
};

// Mock data
const mockBrands: Brand[] = [
  {
    id: "1",
    companyId: "1",
    companyName: "Công ty TNHH ABC Food",
    name: "Coffee House ABC",
    code: "CHABC",
    businessModel: "full_system",
    logo: "",
    description: "Chuỗi cà phê cao cấp",
    isActive: true,
    branchCount: 15,
    createdAt: "2024-01-20T10:30:00Z",
    updatedAt: "2024-01-20T10:30:00Z",
  },
  {
    id: "2",
    companyId: "1",
    companyName: "Công ty TNHH ABC Food",
    name: "Trà Sữa ABC",
    code: "TSABC",
    businessModel: "order_only",
    logo: "",
    description: "Chuỗi trà sữa",
    isActive: true,
    branchCount: 8,
    createdAt: "2024-02-15T14:45:00Z",
    updatedAt: "2024-02-15T14:45:00Z",
  },
  {
    id: "3",
    companyId: "2",
    companyName: "Công ty Cổ phần XYZ Restaurant",
    name: "Nhà hàng XYZ Premium",
    code: "XYZPM",
    businessModel: "full_system",
    logo: "",
    description: "Nhà hàng cao cấp",
    isActive: true,
    branchCount: 5,
    createdAt: "2024-03-10T09:15:00Z",
    updatedAt: "2024-03-10T09:15:00Z",
  },
  {
    id: "4",
    companyId: "2",
    companyName: "Công ty Cổ phần XYZ Restaurant",
    name: "XYZ Express",
    code: "XYZEX",
    businessModel: "ccb_only",
    logo: "",
    description: "Ẩm thực nhanh",
    isActive: false,
    branchCount: 3,
    createdAt: "2024-03-20T11:00:00Z",
    updatedAt: "2024-03-20T11:00:00Z",
  },
];

// Mock companies for select
const mockCompanies = [
  { id: "1", name: "Công ty TNHH ABC Food" },
  { id: "2", name: "Công ty Cổ phần XYZ Restaurant" },
  { id: "3", name: "Công ty TNHH DEF Beverages" },
];

interface BrandFormData {
  companyId: string;
  name: string;
  code: string;
  businessModel: BusinessModel;
  description: string;
}

const initialFormData: BrandFormData = {
  companyId: "",
  name: "",
  code: "",
  businessModel: "full_system",
  description: "",
};

export default function BrandsPage() {
  const [brands, setBrands] = React.useState<Brand[]>(mockBrands);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterCompany, setFilterCompany] = React.useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedBrand, setSelectedBrand] = React.useState<Brand | null>(null);
  const [formData, setFormData] = React.useState<BrandFormData>(initialFormData);
  const [isViewMode, setIsViewMode] = React.useState(false);

  const filteredBrands = brands.filter((brand) => {
    const matchesSearch =
      brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany =
      filterCompany === "all" || brand.companyId === filterCompany;
    return matchesSearch && matchesCompany;
  });

  const handleOpenCreate = () => {
    setSelectedBrand(null);
    setFormData(initialFormData);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (brand: Brand) => {
    setSelectedBrand(brand);
    setFormData({
      companyId: brand.companyId,
      name: brand.name,
      code: brand.code,
      businessModel: brand.businessModel,
      description: brand.description || "",
    });
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenView = (brand: Brand) => {
    setSelectedBrand(brand);
    setFormData({
      companyId: brand.companyId,
      name: brand.name,
      code: brand.code,
      businessModel: brand.businessModel,
      description: brand.description || "",
    });
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (brand: Brand) => {
    setSelectedBrand(brand);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const company = mockCompanies.find((c) => c.id === formData.companyId);
    if (selectedBrand) {
      setBrands((prev) =>
        prev.map((b) =>
          b.id === selectedBrand.id
            ? {
                ...b,
                ...formData,
                companyName: company?.name || "",
                updatedAt: new Date().toISOString(),
              }
            : b
        )
      );
    } else {
      const newBrand: Brand = {
        id: String(Date.now()),
        ...formData,
        companyName: company?.name || "",
        isActive: true,
        branchCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setBrands((prev) => [newBrand, ...prev]);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (selectedBrand) {
      setBrands((prev) => prev.filter((b) => b.id !== selectedBrand.id));
      setIsDeleteDialogOpen(false);
      setSelectedBrand(null);
    }
  };

  const handleToggleStatus = (brand: Brand) => {
    setBrands((prev) =>
      prev.map((b) => (b.id === brand.id ? { ...b, isActive: !b.isActive } : b))
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
            Quản lý Thương hiệu
          </h2>
          <p className="text-muted-foreground">
            Quản lý danh sách thương hiệu theo công ty
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm thương hiệu
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              Danh sách thương hiệu ({filteredBrands.length})
            </CardTitle>
            <div className="flex gap-2">
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Lọc theo công ty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả công ty</SelectItem>
                  {mockCompanies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
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
                <TableHead>Thương hiệu</TableHead>
                <TableHead>Công ty</TableHead>
                <TableHead>Mô hình</TableHead>
                <TableHead>Chi nhánh</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBrands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                        <Store className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">{brand.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {brand.code}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{brand.companyName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={businessModelColors[brand.businessModel]}>
                      {businessModelLabels[brand.businessModel]}
                    </Badge>
                  </TableCell>
                  <TableCell>{brand.branchCount} chi nhánh</TableCell>
                  <TableCell>
                    <Badge
                      variant={brand.isActive ? "success" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(brand)}
                    >
                      {brand.isActive ? "Hoạt động" : "Tạm dừng"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(brand.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenView(brand)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEdit(brand)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDelete(brand)}
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
              {filteredBrands.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Không tìm thấy thương hiệu nào
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
                ? "Chi tiết thương hiệu"
                : selectedBrand
                ? "Chỉnh sửa thương hiệu"
                : "Thêm thương hiệu mới"}
            </DialogTitle>
            <DialogDescription>
              {isViewMode
                ? "Thông tin chi tiết của thương hiệu"
                : selectedBrand
                ? "Cập nhật thông tin thương hiệu"
                : "Nhập thông tin thương hiệu mới"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="companyId">Công ty *</Label>
                <Select
                  value={formData.companyId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, companyId: value }))
                  }
                  disabled={isViewMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn công ty" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tên thương hiệu *</Label>
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
                  <Label htmlFor="code">Mã thương hiệu *</Label>
                  <Input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    required
                    disabled={isViewMode || !!selectedBrand}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessModel">Mô hình kinh doanh *</Label>
                <Select
                  value={formData.businessModel}
                  onValueChange={(value: BusinessModel) =>
                    setFormData((prev) => ({ ...prev, businessModel: value }))
                  }
                  disabled={isViewMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn mô hình" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order_only">Chỉ Order</SelectItem>
                    <SelectItem value="ccb_only">Chỉ Thu Ngân</SelectItem>
                    <SelectItem value="full_system">Full Hệ Thống</SelectItem>
                  </SelectContent>
                </Select>
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
                    {selectedBrand ? "Cập nhật" : "Thêm mới"}
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
              Bạn có chắc chắn muốn xóa thương hiệu{" "}
              <span className="font-medium">{selectedBrand?.name}</span>? Hành
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
