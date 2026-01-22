"use client";

import * as React from "react";
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Eye,
  Loader2,
  Power,
  Zap,
  Files,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ImageIcon,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Company } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { companyService } from "@/services/company-service";
import { locationService, type Province, type Ward } from "@/services/location-service";
import { ProvinceSelect, WardSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { CompanyWizard } from "@/components/company-wizard";
import { QuickCreateDialog } from "@/components/quick-create-dialog";
import { CloneCompanyDialog } from "@/components/clone-company-dialog";
import { useColumnConfig, type ColumnConfig } from "@/hooks/use-column-config";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";
import { ImageUpload } from "@/components/ui/image-upload";

// Default column configuration
const defaultColumns: ColumnConfig[] = [
  { key: "company", label: "Công ty", visible: true, locked: true },
  { key: "taxCode", label: "Mã số thuế", visible: true },
  { key: "representative", label: "Người đại diện", visible: true },
  { key: "contact", label: "Liên hệ", visible: true },
  { key: "isActive", label: "Trạng thái", visible: true },
  { key: "createdAt", label: "Ngày tạo", visible: true },
];

interface CompanyFormData {
  name: string;
  code: string;
  logo: string;
  taxCode: string;
  provinceCode: string;
  wardCode: string;
  address: string;
  phone: string;
  email: string;
  representative: string;
}

const initialFormData: CompanyFormData = {
  name: "",
  code: "",
  logo: "",
  taxCode: "",
  provinceCode: "",
  wardCode: "",
  address: "",
  phone: "",
  email: "",
  representative: "",
};

// Sorting types
type SortDirection = "asc" | "desc" | null;
type SortableColumn = "name" | "code" | "taxCode" | "representative" | "isActive" | "createdAt";

export default function CompaniesPage() {
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = React.useState(false);
  const [isCloneOpen, setIsCloneOpen] = React.useState(false);
  const [companyToClone, setCompanyToClone] = React.useState<Company | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null);
  const [formData, setFormData] = React.useState<CompanyFormData>(initialFormData);
  const [isViewMode, setIsViewMode] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  // Location state
  const [provinces, setProvinces] = React.useState<Province[]>([]);
  const [wards, setWards] = React.useState<Ward[]>([]);
  const [loadingProvinces, setLoadingProvinces] = React.useState(false);
  const [loadingWards, setLoadingWards] = React.useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);
  const pageSizeOptions = [10, 20, 50, 100, 200, 500];

  // Sorting state
  const [sortColumn, setSortColumn] = React.useState<SortableColumn | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);

  // Column configuration
  const {
    columns,
    toggleColumn,
    resetToDefault,
    isColumnVisible,
  } = useColumnConfig({
    storageKey: "companies-table-columns",
    defaultColumns,
  });

  // Fetch companies from API
  const fetchCompanies = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await companyService.getList({ search: searchQuery });
      setCompanies(response.data);
    } catch (error: any) {
      console.error("Error fetching companies:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tải danh sách công ty",
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, toast]);

  // Initial fetch
  React.useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Load provinces on mount
  React.useEffect(() => {
    const loadProvinces = async () => {
      setLoadingProvinces(true);
      try {
        const data = await locationService.getProvinces();
        setProvinces(data);
      } catch (error) {
        console.error("Error loading provinces:", error);
      } finally {
        setLoadingProvinces(false);
      }
    };
    loadProvinces();
  }, []);

  // Load wards when province changes
  React.useEffect(() => {
    const loadWards = async () => {
      if (!formData.provinceCode) {
        setWards([]);
        return;
      }
      setLoadingWards(true);
      try {
        const data = await locationService.getWards(formData.provinceCode);
        setWards(data);
      } catch (error) {
        console.error("Error loading wards:", error);
      } finally {
        setLoadingWards(false);
      }
    };
    loadWards();
  }, [formData.provinceCode]);

  // Handle province change
  const handleProvinceChange = (provinceCode: string) => {
    setFormData({ ...formData, provinceCode, wardCode: "" });
  };

  // Sorting logic
  const sortedCompanies = React.useMemo(() => {
    if (!sortColumn || !sortDirection) return companies;

    return [...companies].sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];

      // Handle null/undefined
      if (aValue == null) aValue = "";
      if (bValue == null) bValue = "";

      // Handle boolean
      if (typeof aValue === "boolean") {
        aValue = aValue ? 1 : 0;
        bValue = bValue ? 1 : 0;
      }

      // Handle dates
      if (sortColumn === "createdAt") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Compare
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [companies, sortColumn, sortDirection]);

  const filteredCompanies = sortedCompanies;

  // Handle column sort
  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      // Cycle: asc -> desc -> null
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

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCompanies.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredCompanies.length);
  const paginatedCompanies = React.useMemo(() => {
    return filteredCompanies.slice(startIndex, endIndex);
  }, [filteredCompanies, startIndex, endIndex]);

  const handleOpenCreate = () => {
    setIsWizardOpen(true);
  };

  const handleWizardSuccess = () => {
    fetchCompanies();
  };

  const handleOpenEdit = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      code: company.code,
      logo: company.logo || "",
      taxCode: company.taxCode || "",
      provinceCode: company.provinceCode || "",
      wardCode: company.wardCode || "",
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      representative: company.representative || "",
    });
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenView = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      code: company.code,
      logo: company.logo || "",
      taxCode: company.taxCode || "",
      provinceCode: company.provinceCode || "",
      wardCode: company.wardCode || "",
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      representative: company.representative || "",
    });
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (selectedCompany) {
        // Update
        await companyService.update(selectedCompany.id, formData);
        toast({
          title: "Thành công",
          description: "Cập nhật công ty thành công",
        });
      } else {
        // Create
        await companyService.create(formData);
        toast({
          title: "Thành công",
          description: "Tạo công ty mới thành công",
        });
      }
      setIsDialogOpen(false);
      fetchCompanies(); // Refresh list
    } catch (error: any) {
      console.error("Error saving company:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể lưu công ty",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (company: Company) => {
    try {
      await companyService.toggleStatus(company.id);
      toast({
        title: "Thành công",
        description: `Đã ${company.isActive ? "tạm dừng" : "kích hoạt"} công ty`,
      });
      fetchCompanies(); // Refresh list
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
          <h2 className="text-2xl font-bold tracking-tight">Quản lý Công ty</h2>
          <p className="text-muted-foreground">
            Quản lý danh sách các công ty trong hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsQuickCreateOpen(true)}>
            <Zap className="mr-2 h-4 w-4 text-yellow-500" />
            Tạo nhanh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Thêm công ty
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Tạo theo wizard (4 bước)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsQuickCreateOpen(true)}>
                <Zap className="mr-2 h-4 w-4 text-yellow-500" />
                Tạo nhanh (1 bước)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Danh sách công ty ({filteredCompanies.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên, mã..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ColumnConfigDialog
                columns={columns}
                onToggle={toggleColumn}
                onReset={resetToDefault}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {isColumnVisible("company") && (
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-8 px-2 -ml-2 hover:bg-transparent"
                      onClick={() => handleSort("name")}
                    >
                      Công ty
                      {renderSortIcon("name")}
                    </Button>
                  </TableHead>
                )}
                {isColumnVisible("taxCode") && (
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-8 px-2 -ml-2 hover:bg-transparent"
                      onClick={() => handleSort("taxCode")}
                    >
                      Mã số thuế
                      {renderSortIcon("taxCode")}
                    </Button>
                  </TableHead>
                )}
                {isColumnVisible("representative") && (
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-8 px-2 -ml-2 hover:bg-transparent"
                      onClick={() => handleSort("representative")}
                    >
                      Người đại diện
                      {renderSortIcon("representative")}
                    </Button>
                  </TableHead>
                )}
                {isColumnVisible("contact") && <TableHead>Liên hệ</TableHead>}
                {isColumnVisible("isActive") && (
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
                )}
                {isColumnVisible("createdAt") && (
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
                )}
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && paginatedCompanies.map((company) => (
                <TableRow key={company.id}>
                  {isColumnVisible("company") && (
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {company.logo ? (
                          <img
                            src={company.logo}
                            alt={company.name}
                            className="h-10 w-10 rounded-lg object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ${company.logo ? 'hidden' : ''}`}>
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {company.code}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("taxCode") && (
                    <TableCell>{company.taxCode || "-"}</TableCell>
                  )}
                  {isColumnVisible("representative") && (
                    <TableCell>{company.representative || "-"}</TableCell>
                  )}
                  {isColumnVisible("contact") && (
                    <TableCell>
                      <div className="text-sm">
                        <p>{company.phone}</p>
                        <p className="text-muted-foreground">{company.email}</p>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("isActive") && (
                    <TableCell>
                      <Badge
                        variant={company.isActive ? "success" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => handleToggleStatus(company)}
                      >
                        {company.isActive ? "Hoạt động" : "Tạm dừng"}
                      </Badge>
                    </TableCell>
                  )}
                  {isColumnVisible("createdAt") && (
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(company.createdAt)}
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
                        <DropdownMenuItem onClick={() => handleOpenView(company)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEdit(company)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => {
                          setCompanyToClone(company);
                          setIsCloneOpen(true);
                        }}>
                          <Files className="mr-2 h-4 w-4 text-blue-500" />
                          Nhân bản
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleStatus(company)}>
                          <Power className="mr-2 h-4 w-4" />
                          {company.isActive ? "Tạm ngưng" : "Kích hoạt"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={columns.filter(c => c.visible).length + 1} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Đang tải...
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredCompanies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.filter(c => c.visible).length + 1} className="h-24 text-center">
                    Không tìm thấy công ty nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {!isLoading && filteredCompanies.length > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Hiển thị {startIndex + 1}-{endIndex} / {filteredCompanies.length} công ty</span>
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
                ? "Chi tiết công ty"
                : selectedCompany
                ? "Chỉnh sửa công ty"
                : "Thêm công ty mới"}
            </DialogTitle>
            <DialogDescription>
              {isViewMode
                ? "Thông tin chi tiết của công ty"
                : selectedCompany
                ? "Cập nhật thông tin công ty"
                : "Nhập thông tin công ty mới"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tên công ty *</Label>
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
                  <Label htmlFor="code">Mã công ty *</Label>
                  <Input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    required
                    disabled={isViewMode || !!selectedCompany}
                  />
                </div>
              </div>
              <ImageUpload
                value={formData.logo}
                onChange={(value) => setFormData((prev) => ({ ...prev, logo: value }))}
                disabled={isViewMode}
                label="Logo công ty"
                folder="companies"
                aspectRatio={1}
                maxWidth={400}
                maxHeight={400}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxCode">Mã số thuế</Label>
                  <Input
                    id="taxCode"
                    name="taxCode"
                    value={formData.taxCode}
                    onChange={handleChange}
                    disabled={isViewMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="representative">Người đại diện</Label>
                  <Input
                    id="representative"
                    name="representative"
                    value={formData.representative}
                    onChange={handleChange}
                    disabled={isViewMode}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provinceCode">Tỉnh/Thành phố</Label>
                  <ProvinceSelect
                    options={provinces}
                    value={formData.provinceCode}
                    onValueChange={handleProvinceChange}
                    loading={loadingProvinces}
                    disabled={isViewMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wardCode">Phường/Xã</Label>
                  <WardSelect
                    options={wards}
                    value={formData.wardCode}
                    onValueChange={(value) => setFormData({ ...formData, wardCode: value })}
                    disabled={isViewMode || !formData.provinceCode}
                    loading={loadingWards}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Địa chỉ chi tiết</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Số nhà, đường..."
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
                    {selectedCompany ? "Cập nhật" : "Thêm mới"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Company Wizard */}
      <CompanyWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSuccess={handleWizardSuccess}
      />

      {/* Quick Create Dialog */}
      <QuickCreateDialog
        open={isQuickCreateOpen}
        onOpenChange={setIsQuickCreateOpen}
        onSuccess={handleWizardSuccess}
      />

      {/* Clone Company Dialog */}
      <CloneCompanyDialog
        open={isCloneOpen}
        onOpenChange={setIsCloneOpen}
        sourceCompany={companyToClone}
        onSuccess={handleWizardSuccess}
      />
    </div>
  );
}
