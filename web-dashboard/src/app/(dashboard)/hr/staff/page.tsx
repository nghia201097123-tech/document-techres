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
import { Badge } from "@/components/ui/badge";
import { staffService, type Staff, type CreateStaffDto } from "@/services/staff-service";

export default function StaffPage() {
  const [search, setSearch] = React.useState("");
  const [staffList, setStaffList] = React.useState<Staff[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<CreateStaffDto>({
    name: "",
    email: "",
    phone: "",
  });
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);
      const result = await staffService.create(formData);
      setTempPassword(result.temporaryPassword);
      setStaffList((prev) => [...prev, result]);
      setFormData({ name: "", email: "", phone: "" });
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
    setFormData({ name: "", email: "", phone: "" });
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
                  <TableHead>Email</TableHead>
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
                    <TableCell>{staff.email || "-"}</TableCell>
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
        <DialogContent>
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
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    placeholder="0909123456"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Hủy
                </Button>
                <Button type="submit" disabled={saving || !formData.name.trim()}>
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
