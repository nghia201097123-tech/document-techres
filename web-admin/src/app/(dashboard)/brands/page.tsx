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
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterCompany, setFilterCompany] = React.useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);
  const [selectedBrand, setSelectedBrand] = React.useState<Brand | null>(null);
  const [formData, setFormData] = React.useState<BrandFormData>(initialFormData);
  const [isViewMode, setIsViewMode] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

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
              {!isLoading && brands.map((brand) => (
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
    </div>
  );
}
