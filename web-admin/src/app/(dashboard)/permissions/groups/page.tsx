"use client";

import * as React from "react";
import {
  Shield,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Users,
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
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  permissionService,
  type Permission,
  type PermissionGroup,
} from "@/services/permission-service";
import { formatDateTime } from "@/lib/utils";

const moduleLabels: Record<string, string> = {
  company: "Công ty",
  brand: "Thương hiệu",
  branch: "Chi nhánh",
  package: "Gói App Food",
  category: "Danh mục",
  permission: "Phân quyền",
  admin: "Quản trị viên",
  report: "Báo cáo",
};

interface GroupFormData {
  name: string;
  code: string;
  description: string;
  permissionIds: string[];
}

const initialFormData: GroupFormData = {
  name: "",
  code: "",
  description: "",
  permissionIds: [],
};

export default function PermissionGroupsPage() {
  const { toast } = useToast();
  const [groups, setGroups] = React.useState<PermissionGroup[]>([]);
  const [permissions, setPermissions] = React.useState<Permission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedGroup, setSelectedGroup] = React.useState<PermissionGroup | null>(null);
  const [formData, setFormData] = React.useState<GroupFormData>(initialFormData);
  const [isViewMode, setIsViewMode] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [groupsRes, permissionsRes] = await Promise.all([
        permissionService.getAllGroups({ search: searchQuery || undefined, limit: 100 }),
        permissionService.getAllPermissions({ limit: 100 }),
      ]);
      setGroups(groupsRes.data);
      setPermissions(permissionsRes.data);
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

  const permissionsByModule = React.useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach((p) => {
      if (!grouped[p.module]) {
        grouped[p.module] = [];
      }
      grouped[p.module].push(p);
    });
    return grouped;
  }, [permissions]);

  const handleOpenCreate = () => {
    setSelectedGroup(null);
    setFormData(initialFormData);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (group: PermissionGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      code: group.code,
      description: group.description || "",
      permissionIds: group.permissions.map((p) => p.id),
    });
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenView = (group: PermissionGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      code: group.code,
      description: group.description || "",
      permissionIds: group.permissions.map((p) => p.id),
    });
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (group: PermissionGroup) => {
    setSelectedGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (selectedGroup) {
        await permissionService.updateGroup(selectedGroup.id, {
          name: formData.name,
          description: formData.description || undefined,
          permissionIds: formData.permissionIds,
        });
        toast({ title: "Thành công", description: "Đã cập nhật nhóm quyền" });
      } else {
        await permissionService.createGroup({
          name: formData.name,
          code: formData.code,
          description: formData.description || undefined,
          permissionIds: formData.permissionIds,
        });
        toast({ title: "Thành công", description: "Đã thêm nhóm quyền mới" });
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
    if (!selectedGroup) return;
    setIsSubmitting(true);
    try {
      await permissionService.deleteGroup(selectedGroup.id);
      toast({ title: "Thành công", description: "Đã xóa nhóm quyền" });
      setIsDeleteDialogOpen(false);
      setSelectedGroup(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể xóa nhóm quyền",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (group: PermissionGroup) => {
    try {
      await permissionService.toggleGroupStatus(group.id);
      toast({
        title: "Thành công",
        description: `Đã ${group.isActive ? "tạm dừng" : "kích hoạt"} nhóm quyền`,
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

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissionIds: checked
        ? [...prev.permissionIds, permissionId]
        : prev.permissionIds.filter((id) => id !== permissionId),
    }));
  };

  const handleModuleToggleAll = (module: string, checked: boolean) => {
    const modulePermissionIds = permissionsByModule[module]?.map((p) => p.id) || [];
    setFormData((prev) => ({
      ...prev,
      permissionIds: checked
        ? [...new Set([...prev.permissionIds, ...modulePermissionIds])]
        : prev.permissionIds.filter((id) => !modulePermissionIds.includes(id)),
    }));
  };

  const isModuleAllSelected = (module: string) => {
    const modulePermissionIds = permissionsByModule[module]?.map((p) => p.id) || [];
    return modulePermissionIds.length > 0 && modulePermissionIds.every((id) => formData.permissionIds.includes(id));
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
          <h2 className="text-2xl font-bold tracking-tight">Nhóm quyền</h2>
          <p className="text-muted-foreground">
            Quản lý các nhóm quyền trong hệ thống
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm nhóm quyền
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Danh sách nhóm quyền ({groups.length})
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
                <TableHead>Nhóm quyền</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Số quyền</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                        <Shield className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium">{group.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {group.code}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {group.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {group.permissions.length} quyền
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={group.isActive ? "success" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(group)}
                    >
                      {group.isActive ? "Hoạt động" : "Tạm dừng"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(group.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenView(group)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEdit(group)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDelete(group)}
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
              {groups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Không tìm thấy nhóm quyền nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isViewMode
                ? "Chi tiết nhóm quyền"
                : selectedGroup
                ? "Chỉnh sửa nhóm quyền"
                : "Thêm nhóm quyền mới"}
            </DialogTitle>
            <DialogDescription>
              {isViewMode
                ? "Thông tin chi tiết của nhóm quyền"
                : selectedGroup
                ? "Cập nhật thông tin nhóm quyền"
                : "Nhập thông tin nhóm quyền mới"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tên nhóm quyền *</Label>
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
                  <Label htmlFor="code">Mã nhóm quyền *</Label>
                  <Input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    required
                    disabled={isViewMode || !!selectedGroup}
                  />
                </div>
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
              <div className="space-y-3">
                <Label>Danh sách quyền</Label>
                <div className="space-y-4">
                  {Object.entries(permissionsByModule).map(([module, perms]) => (
                    <div key={module} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium">{moduleLabels[module] || module}</h4>
                        {!isViewMode && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              Chọn tất cả
                            </span>
                            <Switch
                              checked={isModuleAllSelected(module)}
                              onCheckedChange={(checked) =>
                                handleModuleToggleAll(module, checked)
                              }
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {perms.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-center justify-between rounded border p-2"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {permission.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {permission.code}
                              </p>
                            </div>
                            {isViewMode ? (
                              formData.permissionIds.includes(permission.id) ? (
                                <Badge variant="success">Có</Badge>
                              ) : (
                                <Badge variant="secondary">Không</Badge>
                              )
                            ) : (
                              <Switch
                                checked={formData.permissionIds.includes(permission.id)}
                                onCheckedChange={(checked) =>
                                  handlePermissionToggle(permission.id, checked)
                                }
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
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
                    {selectedGroup ? "Cập nhật" : "Thêm mới"}
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
              Bạn có chắc chắn muốn xóa nhóm quyền{" "}
              <span className="font-medium">{selectedGroup?.name}</span>? Hành
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
