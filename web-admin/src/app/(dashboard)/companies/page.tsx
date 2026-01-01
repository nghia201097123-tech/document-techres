"use client";

import * as React from "react";
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
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

// Mock data - replace with API call
const mockCompanies: Company[] = [
  {
    id: "1",
    name: "Công ty TNHH ABC Food",
    code: "ABC001",
    taxCode: "0123456789",
    address: "123 Nguyễn Văn Linh, Quận 7, TP.HCM",
    phone: "028 1234 5678",
    email: "contact@abcfood.vn",
    representative: "Nguyễn Văn A",
    isActive: true,
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    name: "Công ty Cổ phần XYZ Restaurant",
    code: "XYZ002",
    taxCode: "0987654321",
    address: "456 Lê Lợi, Quận 1, TP.HCM",
    phone: "028 8765 4321",
    email: "info@xyzrestaurant.vn",
    representative: "Trần Thị B",
    isActive: true,
    createdAt: "2024-02-20T14:45:00Z",
    updatedAt: "2024-02-20T14:45:00Z",
  },
  {
    id: "3",
    name: "Công ty TNHH DEF Beverages",
    code: "DEF003",
    taxCode: "1122334455",
    address: "789 Trần Hưng Đạo, Quận 5, TP.HCM",
    phone: "028 1122 3344",
    email: "hello@defbeverages.vn",
    representative: "Lê Văn C",
    isActive: false,
    createdAt: "2024-03-10T09:15:00Z",
    updatedAt: "2024-03-10T09:15:00Z",
  },
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
  const [companies, setCompanies] = React.useState<Company[]>(mockCompanies);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null);
  const [formData, setFormData] = React.useState<CompanyFormData>(initialFormData);
  const [isViewMode, setIsViewMode] = React.useState(false);

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenCreate = () => {
    setSelectedCompany(null);
    setFormData(initialFormData);
    setIsViewMode(false);
    setIsDialogOpen(true);
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

  const handleOpenDelete = (company: Company) => {
    setSelectedCompany(company);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCompany) {
      // Update
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === selectedCompany.id
            ? { ...c, ...formData, updatedAt: new Date().toISOString() }
            : c
        )
      );
    } else {
      // Create
      const newCompany: Company = {
        id: String(Date.now()),
        ...formData,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCompanies((prev) => [newCompany, ...prev]);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (selectedCompany) {
      setCompanies((prev) => prev.filter((c) => c.id !== selectedCompany.id));
      setIsDeleteDialogOpen(false);
      setSelectedCompany(null);
    }
  };

  const handleToggleStatus = (company: Company) => {
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === company.id ? { ...c, isActive: !c.isActive } : c
      )
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
              {filteredCompanies.map((company) => (
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
                        <DropdownMenuItem
                          onClick={() => handleOpenDelete(company)}
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
              {filteredCompanies.length === 0 && (
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
                  <Button type="submit">
                    {selectedCompany ? "Cập nhật" : "Thêm mới"}
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
              Bạn có chắc chắn muốn xóa công ty{" "}
              <span className="font-medium">{selectedCompany?.name}</span>? Hành
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
