"use client";

import * as React from "react";
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Shield,
  Mail,
  Loader2,
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
import { useToast } from "@/hooks/use-toast";
import {
  adminService,
  type AdminUser,
  type AdminRole,
} from "@/services/admin-service";
import {
  permissionService,
  type PermissionGroup,
} from "@/services/permission-service";
import { formatDateTime } from "@/lib/utils";

const roleLabels: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  support: "Support",
};

const roleColors: Record<AdminRole, "destructive" | "secondary"> = {
  super_admin: "destructive",
  support: "secondary",
};

interface AdminFormData {
  email: string;
  name: string;
  phone: string;
  role: AdminRole;
  permissionGroupId: string;
  password: string;
}

const initialFormData: AdminFormData = {
  email: "",
  name: "",
  phone: "",
  role: "support",
  permissionGroupId: "",
  password: "",
};

export default function AdminsPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = React.useState<AdminUser[]>([]);
  const [permissionGroups, setPermissionGroups] = React.useState<PermissionGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterRole, setFilterRole] = React.useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedAdmin, setSelectedAdmin] = React.useState<AdminUser | null>(null);
  const [formData, setFormData] = React.useState<AdminFormData>(initialFormData);
  const [isViewMode, setIsViewMode] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [adminsRes, groupsRes] = await Promise.all([
        adminService.getAll({ search: searchQuery || undefined }),
        permissionService.getAllGroups({ limit: 100 }),
      ]);
      setAdmins(adminsRes.data);
      setPermissionGroups(groupsRes.data);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAdmins = admins.filter((admin) => {
    const matchesRole = filterRole === "all" || admin.role === filterRole;
    return matchesRole;
  });

  const handleOpenCreate = () => {
    setSelectedAdmin(null);
    setFormData(initialFormData);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setFormData({
      email: admin.email,
      name: admin.name,
      phone: admin.phone || "",
      role: admin.role,
      permissionGroupId: admin.permissionGroup?.id || "",
      password: "",
    });
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenView = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setFormData({
      email: admin.email,
      name: admin.name,
      phone: admin.phone || "",
      role: admin.role,
      permissionGroupId: admin.permissionGroup?.id || "",
      password: "",
    });
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (selectedAdmin) {
        await adminService.update(selectedAdmin.id, {
          fullName: formData.name,
          phone: formData.phone || undefined,
          role: formData.role,
          permissionGroupId: formData.permissionGroupId || undefined,
          password: formData.password || undefined,
        });
        toast({ title: "Thành công", description: "Đã cập nhật quản trị viên" });
      } else {
        await adminService.create({
          email: formData.email,
          password: formData.password,
          fullName: formData.name,
          phone: formData.phone || undefined,
          role: formData.role,
          permissionGroupId: formData.permissionGroupId || undefined,
        });
        toast({ title: "Thành công", description: "Đã thêm quản trị viên mới" });
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAdmin) return;
    setIsSubmitting(true);
    try {
      await adminService.delete(selectedAdmin.id);
      toast({ title: "Thành công", description: "Đã xóa quản trị viên" });
      setIsDeleteDialogOpen(false);
      setSelectedAdmin(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể xóa quản trị viên",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin: AdminUser) => {
    try {
      await adminService.toggleStatus(admin.id);
      toast({
        title: "Thành công",
        description: `Đã ${admin.isActive ? "tạm dừng" : "kích hoạt"} tài khoản`,
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quản trị viên</h2>
          <p className="text-muted-foreground">
            Quản lý các tài khoản quản trị viên hệ thống
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm quản trị viên
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              Danh sách quản trị viên ({filteredAdmins.length})
            </CardTitle>
            <div className="flex gap-2">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Lọc theo vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên, email..."
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
                <TableHead>Quản trị viên</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Nhóm quyền</TableHead>
                <TableHead>Lần đăng nhập cuối</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdmins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <span className="text-sm font-medium">
                          {admin.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{admin.name}</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {admin.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleColors[admin.role]}>
                      {roleLabels[admin.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span>{admin.permissionGroup?.name || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {admin.lastLogin
                      ? formatDateTime(admin.lastLogin)
                      : "Chưa đăng nhập"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={admin.isActive ? "success" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(admin)}
                    >
                      {admin.isActive ? "Hoạt động" : "Tạm dừng"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(admin.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenView(admin)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEdit(admin)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDelete(admin)}
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
              {filteredAdmins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Không tìm thấy quản trị viên nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isViewMode
                ? "Chi tiết quản trị viên"
                : selectedAdmin
                ? "Chỉnh sửa quản trị viên"
                : "Thêm quản trị viên mới"}
            </DialogTitle>
            <DialogDescription>
              {isViewMode
                ? "Thông tin chi tiết của quản trị viên"
                : selectedAdmin
                ? "Cập nhật thông tin quản trị viên"
                : "Nhập thông tin quản trị viên mới"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Họ tên *</Label>
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
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isViewMode || !!selectedAdmin}
                />
              </div>
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
              {!isViewMode && (
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {selectedAdmin ? "Mật khẩu mới" : "Mật khẩu *"}
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required={!selectedAdmin}
                    placeholder={selectedAdmin ? "Để trống nếu không đổi" : "••••••••"}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="role">Vai trò *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: AdminRole) =>
                    setFormData((prev) => ({ ...prev, role: value }))
                  }
                  disabled={isViewMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="permissionGroupId">Nhóm quyền</Label>
                <Select
                  value={formData.permissionGroupId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, permissionGroupId: value }))
                  }
                  disabled={isViewMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nhóm quyền" />
                  </SelectTrigger>
                  <SelectContent>
                    {permissionGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    {selectedAdmin ? "Cập nhật" : "Thêm mới"}
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
              Bạn có chắc chắn muốn xóa quản trị viên{" "}
              <span className="font-medium">{selectedAdmin?.name}</span>? Hành
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
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
