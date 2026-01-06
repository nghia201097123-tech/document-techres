"use client";

import * as React from "react";
import {
  Store,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Eye,
  Building2,
  Loader2,
  Power,
  ChevronLeft,
  ChevronRight,
  Copy,
  Zap,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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
import type { Brand, BusinessModel, Company } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { brandService } from "@/services/brand-service";
import { companyService } from "@/services/company-service";
import { useToast } from "@/hooks/use-toast";
import { BrandWizard } from "@/components/brand-wizard";
import { ImagePicker } from "@/components/ui/image-picker";

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

interface BrandFormData {
  companyId: string;
  name: string;
  code: string;
  logo: string;
  avatar: string;
  businessModel: BusinessModel;
  description: string;
}

const initialFormData: BrandFormData = {
  companyId: "",
  name: "",
  code: "",
  logo: "",
  avatar: "",
  businessModel: "full_system",
  description: "",
};

// Sorting types
type SortDirection = "asc" | "desc" | null;
type SortableColumn = "name" | "code" | "companyName" | "businessModel" | "branchCount" | "isActive" | "createdAt";

export default function BrandsPage() {
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterCompany, setFilterCompany] = React.useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = React.useState(false);
  const [selectedBrand, setSelectedBrand] = React.useState<Brand | null>(null);
  const [formData, setFormData] = React.useState<BrandFormData>(initialFormData);
  const [isViewMode, setIsViewMode] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDuplicating, setIsDuplicating] = React.useState(false);
  const { toast } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);
  const pageSizeOptions = [10, 20, 50, 100, 200, 500];

  // Sorting state
  const [sortColumn, setSortColumn] = React.useState<SortableColumn | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);

  // Fetch brands from API
  const fetchBrands = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const params: { search?: string; companyId?: string } = {};
      if (searchQuery) params.search = searchQuery;
      if (filterCompany !== "all") params.companyId = filterCompany;

      const response = await brandService.getList(params);
      setBrands(response.data);
    } catch (error: any) {
      console.error("Error fetching brands:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tải danh sách thương hiệu",
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterCompany, toast]);

  // Fetch companies for dropdown
  const fetchCompanies = React.useCallback(async () => {
    try {
      const response = await companyService.getList({ limit: 100 });
      setCompanies(response.data);
    } catch (error: any) {
      console.error("Error fetching companies:", error);
    }
  }, []);

  // Initial fetch
  React.useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  React.useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCompany]);

  // Sorting logic
  const sortedBrands = React.useMemo(() => {
    if (!sortColumn || !sortDirection) return brands;

    return [...brands].sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];

      if (aValue == null) aValue = "";
      if (bValue == null) bValue = "";

      if (typeof aValue === "boolean") {
        aValue = aValue ? 1 : 0;
        bValue = bValue ? 1 : 0;
      }

      if (sortColumn === "createdAt") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [brands, sortColumn, sortDirection]);

  // Handle column sort
  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Render sort icon
  const renderSortIcon = (column: SortableColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  // Pagination calculations
  const totalPages = Math.ceil(sortedBrands.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedBrands.length);
  const paginatedBrands = React.useMemo(() => {
    return sortedBrands.slice(startIndex, endIndex);
  }, [sortedBrands, startIndex, endIndex]);

  const handleOpenCreate = () => {
    setIsWizardOpen(true);
  };

  const handleWizardSuccess = () => {
    fetchBrands();
  };

  const handleOpenEdit = (brand: Brand) => {
    setSelectedBrand(brand);
    setFormData({
      companyId: brand.companyId,
      name: brand.name,
      code: brand.code,
      logo: brand.logo || "",
      avatar: brand.avatar || "",
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
      logo: brand.logo || "",
      avatar: brand.avatar || "",
      businessModel: brand.businessModel,
      description: brand.description || "",
    });
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (selectedBrand) {
        await brandService.update(selectedBrand.id, formData);
        toast({
          title: "Thành công",
          description: "Cập nhật thương hiệu thành công",
        });
      } else {
        await brandService.create(formData);
        toast({
          title: "Thành công",
          description: "Tạo thương hiệu mới thành công",
        });
      }
      setIsDialogOpen(false);
      fetchBrands();
    } catch (error: any) {
      console.error("Error saving brand:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể lưu thương hiệu",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (brand: Brand) => {
    try {
      await brandService.toggleStatus(brand.id);
      toast({
        title: "Thành công",
        description: `Đã ${brand.isActive ? "tạm dừng" : "kích hoạt"} thương hiệu`,
      });
      fetchBrands();
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

  // Quick create handler
  const handleQuickCreate = () => {
    setFormData(initialFormData);
    setSelectedBrand(null);
    setIsQuickCreateOpen(true);
  };

  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await brandService.create(formData);
      toast({
        title: "Thành công",
        description: "Tạo thương hiệu mới thành công",
      });
      setIsQuickCreateOpen(false);
      fetchBrands();
    } catch (error: any) {
      console.error("Error creating brand:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tạo thương hiệu",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Duplicate handler
  const handleDuplicate = async (brand: Brand) => {
    setIsDuplicating(true);
    try {
      const duplicateData = {
        companyId: brand.companyId,
        name: `${brand.name} (Bản sao)`,
        code: `${brand.code}_COPY`,
        businessModel: brand.businessModel,
        description: brand.description || "",
      };
      await brandService.create(duplicateData);
      toast({
        title: "Thành công",
        description: `Đã nhân bản thương hiệu "${brand.name}"`,
      });
      fetchBrands();
    } catch (error: any) {
      console.error("Error duplicating brand:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể nhân bản thương hiệu",
      });
    } finally {
      setIsDuplicating(false);
    }
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleQuickCreate}>
            <Zap className="mr-2 h-4 w-4" />
            Tạo nhanh
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm thương hiệu
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              Danh sách thương hiệu ({brands.length})
            </CardTitle>
            <div className="flex gap-2">
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Lọc theo công ty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả công ty</SelectItem>
                  {companies.map((company) => (
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
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-8 px-2 -ml-2 hover:bg-transparent"
                    onClick={() => handleSort("name")}
                  >
                    Thương hiệu
                    {renderSortIcon("name")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-8 px-2 -ml-2 hover:bg-transparent"
                    onClick={() => handleSort("companyName")}
                  >
                    Công ty
                    {renderSortIcon("companyName")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-8 px-2 -ml-2 hover:bg-transparent"
                    onClick={() => handleSort("businessModel")}
                  >
                    Mô hình
                    {renderSortIcon("businessModel")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-8 px-2 -ml-2 hover:bg-transparent"
                    onClick={() => handleSort("branchCount")}
                  >
                    Chi nhánh
                    {renderSortIcon("branchCount")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-8 px-2 -ml-2 hover:bg-transparent"
                    onClick={() => handleSort("isActive")}
                  >
                    Trạng thái
                    {renderSortIcon("isActive")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-8 px-2 -ml-2 hover:bg-transparent"
                    onClick={() => handleSort("createdAt")}
                  >
                    Ngày tạo
                    {renderSortIcon("createdAt")}
                  </Button>
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && paginatedBrands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {brand.logo ? (
                        <img
                          src={brand.logo}
                          alt={brand.name}
                          className="h-10 w-10 rounded-lg object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 ${brand.logo ? 'hidden' : ''}`}>
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
                  <TableCell>{brand.branchCount || 0} chi nhánh</TableCell>
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
                        <DropdownMenuItem onClick={() => handleDuplicate(brand)} disabled={isDuplicating}>
                          <Copy className="mr-2 h-4 w-4" />
                          Nhân bản
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(brand)}>
                          <Power className="mr-2 h-4 w-4" />
                          {brand.isActive ? "Tạm ngưng" : "Kích hoạt"}
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
              {!isLoading && brands.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Không tìm thấy thương hiệu nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {!isLoading && brands.length > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Hiển thị {startIndex + 1}-{endIndex} / {brands.length} thương hiệu</span>
                <span className="text-muted-foreground/50">|</span>
                <div className="flex items-center gap-2">
                  <span>Số dòng:</span>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pageSizeOptions.map((size) => (
                        <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  Đầu
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2">
                  Trang {currentPage} / {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                >
                  Cuối
                </Button>
              </div>
            </div>
          )}
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
                    {companies.map((company) => (
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
              <div className="grid grid-cols-2 gap-4">
                <ImagePicker
                  value={formData.logo}
                  onChange={(value) => setFormData((prev) => ({ ...prev, logo: value }))}
                  disabled={isViewMode}
                  label="Logo"
                />
                <ImagePicker
                  value={formData.avatar}
                  onChange={(value) => setFormData((prev) => ({ ...prev, avatar: value }))}
                  disabled={isViewMode}
                  label="Avatar"
                />
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
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedBrand ? "Cập nhật" : "Thêm mới"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Brand Wizard for creating new brand with branch */}
      <BrandWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSuccess={handleWizardSuccess}
      />

      {/* Quick Create Dialog */}
      <Dialog open={isQuickCreateOpen} onOpenChange={setIsQuickCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo nhanh thương hiệu</DialogTitle>
            <DialogDescription>
              Tạo thương hiệu mới với thông tin cơ bản
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickCreateSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="quick-companyId">Công ty *</Label>
                <Select
                  value={formData.companyId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, companyId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn công ty" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-name">Tên thương hiệu *</Label>
                <Input
                  id="quick-name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="VD: Coffee House"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-code">Mã thương hiệu *</Label>
                <Input
                  id="quick-code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="VD: CFH"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-businessModel">Mô hình kinh doanh *</Label>
                <Select
                  value={formData.businessModel}
                  onValueChange={(value: BusinessModel) =>
                    setFormData((prev) => ({ ...prev, businessModel: value }))
                  }
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
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuickCreateOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.companyId || !formData.name || !formData.code}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tạo thương hiệu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
