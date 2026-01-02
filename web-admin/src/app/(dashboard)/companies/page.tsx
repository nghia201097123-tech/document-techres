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
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Company } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { companyService } from "@/services/company-service";
import { useToast } from "@/hooks/use-toast";
import { CompanyWizard } from "@/components/company-wizard";

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
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null);
  const [formData, setFormData] = React.useState<CompanyFormData>(initialFormData);
  const [isViewMode, setIsViewMode] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

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
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm công ty
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Danh sách công ty ({filteredCompanies.length})
            </CardTitle>
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Công ty</TableHead>
                <TableHead>Mã số thuế</TableHead>
                <TableHead>Người đại diện</TableHead>
                <TableHead>Liên hệ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && filteredCompanies.map((company) => (
                <TableRow key={company.id}>
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
                  <TableCell>{company.taxCode || "-"}</TableCell>
                  <TableCell>{company.representative || "-"}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{company.phone}</p>
                      <p className="text-muted-foreground">{company.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={company.isActive ? "success" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(company)}
                    >
                      {company.isActive ? "Hoạt động" : "Tạm dừng"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(company.createdAt)}
                  </TableCell>
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
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Đang tải...
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredCompanies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
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
    </div>
  );
}
