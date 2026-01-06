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
import type { Company } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { companyService } from "@/services/company-service";
import { useToast } from "@/hooks/use-toast";
import { CompanyWizard } from "@/components/company-wizard";
import { QuickCreateDialog } from "@/components/quick-create-dialog";
import { CloneCompanyDialog } from "@/components/clone-company-dialog";
import { useColumnConfig, type ColumnConfig } from "@/hooks/use-column-config";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";

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
  taxCode: string;
  address: string;
  phone: string;
  email: string;
  representative: string;
}

const initialFormData: CompanyFormData = {
  name: "",
  code: "",
  taxCode: "",
  address: "",
  phone: "",
  email: "",
  representative: "",
};

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

  const filteredCompanies = companies;

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
      taxCode: company.taxCode || "",
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
      taxCode: company.taxCode || "",
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
                {isColumnVisible("company") && <TableHead>Công ty</TableHead>}
                {isColumnVisible("taxCode") && <TableHead>Mã số thuế</TableHead>}
                {isColumnVisible("representative") && <TableHead>Người đại diện</TableHead>}
                {isColumnVisible("contact") && <TableHead>Liên hệ</TableHead>}
                {isColumnVisible("isActive") && <TableHead>Trạng thái</TableHead>}
                {isColumnVisible("createdAt") && <TableHead>Ngày tạo</TableHead>}
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && filteredCompanies.map((company) => (
                <TableRow key={company.id}>
                  {isColumnVisible("company") && (
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
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
