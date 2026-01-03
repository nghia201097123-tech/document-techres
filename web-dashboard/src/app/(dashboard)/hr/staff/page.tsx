"use client";

import * as React from "react";
import { Search, UserPlus, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { staffService, type Staff, type CreateStaffDto, type Gender } from "@/services/staff-service";
import { departmentService, type Department } from "@/services/department-service";
import { brandService, type Brand } from "@/services/brand-service";
import { branchService, type Branch } from "@/services/branch-service";
import { locationService, type Province, type Ward } from "@/services/location-service";

const initialFormData: CreateStaffDto = {
  name: "",
  email: "",
  phone: "",
  birthDate: "",
  gender: "male",
  idNumber: "",
  address: "",
  provinceCode: "",
  wardCode: "",
  departmentId: "",
  brandId: "",
  branchId: "",
  usernamePrefix: "tr",
};

export default function StaffPage() {
  const [search, setSearch] = React.useState("");
  const [staffList, setStaffList] = React.useState<Staff[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<CreateStaffDto>(initialFormData);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);

  // Dropdown data
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [provinces, setProvinces] = React.useState<Province[]>([]);
  const [wards, setWards] = React.useState<Ward[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = React.useState(false);

  // Load staff list
  const loadStaff = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await staffService.getAll();
      setStaffList(data);
    } catch (error) {
      console.error("Error loading staff:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load dropdown data
  const loadDropdowns = React.useCallback(async () => {
    try {
      setLoadingDropdowns(true);
      const [deptData, brandData, provinceData] = await Promise.all([
        departmentService.getAll(),
        brandService.getAll(),
        locationService.getProvinces(),
      ]);
      setDepartments(deptData);
      setBrands(brandData);
      setProvinces(provinceData);
    } catch (error) {
      console.error("Error loading dropdowns:", error);
    } finally {
      setLoadingDropdowns(false);
    }
  }, []);

  React.useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // Load branches when brand changes
  React.useEffect(() => {
    if (formData.brandId) {
      branchService.getAll(formData.brandId).then(setBranches).catch(console.error);
    } else {
      setBranches([]);
    }
  }, [formData.brandId]);

  // Load wards when province changes
  React.useEffect(() => {
    if (formData.provinceCode) {
      locationService.getWards(formData.provinceCode).then(setWards).catch(console.error);
    } else {
      setWards([]);
    }
  }, [formData.provinceCode]);

  // Load dropdowns when dialog opens
  React.useEffect(() => {
    if (dialogOpen) {
      loadDropdowns();
    }
  }, [dialogOpen, loadDropdowns]);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name.trim() || !formData.birthDate || !formData.gender ||
        !formData.address.trim() || !formData.departmentId ||
        !formData.brandId || !formData.branchId) {
      alert("Vui lòng điền đầy đủ các trường bắt buộc");
      return;
    }

    try {
      setSaving(true);
      const result = await staffService.create(formData);
      setTempPassword(result.temporaryPassword);
      setStaffList((prev) => [...prev, result]);
      setFormData(initialFormData);
    } catch (error) {
      console.error("Error creating staff:", error);
      alert("Có lỗi xảy ra khi tạo nhân viên");
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (id: string) => {
    try {
      const updated = await staffService.toggleActive(id);
      setStaffList((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (error) {
      console.error("Error toggling staff:", error);
    }
  };

  // Close dialog and reset
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setTempPassword(null);
    setFormData(initialFormData);
    setBranches([]);
    setWards([]);
  };

  // Handle province change
  const handleProvinceChange = (provinceCode: string) => {
    setFormData({ ...formData, provinceCode, wardCode: "" });
  };

  // Handle brand change
  const handleBrandChange = (brandId: string) => {
    setFormData({ ...formData, brandId, branchId: "" });
  };

  // Filter staff by search
  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.username?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý nhân viên</h1>
          <p className="text-muted-foreground">Thêm, sửa và quản lý nhân viên trong chi nhánh</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Thêm nhân viên
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách nhân viên</CardTitle>
              <CardDescription>Tổng cộng {staffList.length} nhân viên</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm nhân viên..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có nhân viên nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm nhân viên&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên nhân viên</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead>Chi nhánh</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[100px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">{staff.name}</TableCell>
                    <TableCell>{staff.username}</TableCell>
                    <TableCell>{staff.phone || "-"}</TableCell>
                    <TableCell>{staff.branchName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={staff.isActive ? "default" : "secondary"}>
                        {staff.isActive ? "Hoạt động" : "Tạm ngưng"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(staff.id)}
                      >
                        {staff.isActive ? "Tạm ngưng" : "Kích hoạt"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Staff Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thêm nhân viên mới</DialogTitle>
            <DialogDescription>
              Nhập thông tin nhân viên. Hệ thống sẽ tự động tạo tài khoản và mật khẩu tạm thời.
            </DialogDescription>
          </DialogHeader>
          {tempPassword ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                <p className="text-sm font-medium text-green-800">Tạo nhân viên thành công!</p>
                <p className="text-sm text-green-700 mt-2">
                  Mật khẩu tạm thời: <strong className="font-mono">{tempPassword}</strong>
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Vui lòng ghi lại mật khẩu này và yêu cầu nhân viên đổi mật khẩu khi đăng nhập lần đầu.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseDialog}>Đóng</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                {/* Row 1: Name and Username Prefix */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Tên nhân viên *</Label>
                    <Input
                      id="name"
                      placeholder="Nguyễn Văn A"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="usernamePrefix">Mã đăng nhập</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="usernamePrefix"
                        placeholder="tr"
                        maxLength={2}
                        className="w-20 text-center font-mono uppercase"
                        value={formData.usernamePrefix}
                        onChange={(e) => setFormData({ ...formData, usernamePrefix: e.target.value.toLowerCase().replace(/[^a-z]/g, '').substring(0, 2) })}
                      />
                      <span className="text-muted-foreground font-mono">000001</span>
                      <span className="text-xs text-muted-foreground">(tự động)</span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Birth Date and Gender */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="birthDate">Ngày sinh *</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gender">Giới tính *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value: Gender) => setFormData({ ...formData, gender: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn giới tính" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Nam</SelectItem>
                        <SelectItem value="female">Nữ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 3: Province and Ward */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="provinceCode">Tỉnh/Thành phố</Label>
                    <Select
                      value={formData.provinceCode || ""}
                      onValueChange={handleProvinceChange}
                      disabled={loadingDropdowns}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn tỉnh/thành phố" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.map((province) => (
                          <SelectItem key={province.code} value={province.code}>
                            {province.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="wardCode">Phường/Xã</Label>
                    <Select
                      value={formData.wardCode || ""}
                      onValueChange={(value) => setFormData({ ...formData, wardCode: value })}
                      disabled={!formData.provinceCode || wards.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn phường/xã" />
                      </SelectTrigger>
                      <SelectContent>
                        {wards.map((ward) => (
                          <SelectItem key={ward.code} value={ward.code}>
                            {ward.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 4: Address */}
                <div className="grid gap-2">
                  <Label htmlFor="address">Địa chỉ chi tiết *</Label>
                  <Input
                    id="address"
                    placeholder="123 Nguyễn Văn Linh"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>

                {/* Row 5: Brand and Branch */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="brandId">Thương hiệu *</Label>
                    <Select
                      value={formData.brandId}
                      onValueChange={handleBrandChange}
                      disabled={loadingDropdowns}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn thương hiệu" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="branchId">Chi nhánh *</Label>
                    <Select
                      value={formData.branchId}
                      onValueChange={(value) => setFormData({ ...formData, branchId: value })}
                      disabled={!formData.brandId || branches.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn chi nhánh" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 6: Department */}
                <div className="grid gap-2">
                  <Label htmlFor="departmentId">Bộ phận *</Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                    disabled={loadingDropdowns}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn bộ phận" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Row 7: ID Number and Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="idNumber">Căn cước công dân</Label>
                    <Input
                      id="idNumber"
                      placeholder="001234567890"
                      value={formData.idNumber}
                      onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Row 8: Phone */}
                <div className="grid gap-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    placeholder="0909123456"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !formData.name.trim() || !formData.birthDate || !formData.address.trim() || !formData.departmentId || !formData.brandId || !formData.branchId}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Tạo nhân viên
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
