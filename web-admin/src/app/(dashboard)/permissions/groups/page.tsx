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
import type { PermissionGroup, Permission } from "@/types";
import { formatDateTime } from "@/lib/utils";

// Mock permissions
const mockPermissions: Permission[] = [
  { id: "1", code: "company.view", name: "Xem công ty", module: "company", description: "Xem danh sách công ty" },
  { id: "2", code: "company.create", name: "Tạo công ty", module: "company", description: "Thêm công ty mới" },
  { id: "3", code: "company.edit", name: "Sửa công ty", module: "company", description: "Chỉnh sửa công ty" },
  { id: "4", code: "company.delete", name: "Xóa công ty", module: "company", description: "Xóa công ty" },
  { id: "5", code: "brand.view", name: "Xem thương hiệu", module: "brand", description: "Xem danh sách thương hiệu" },
  { id: "6", code: "brand.create", name: "Tạo thương hiệu", module: "brand", description: "Thêm thương hiệu mới" },
  { id: "7", code: "brand.edit", name: "Sửa thương hiệu", module: "brand", description: "Chỉnh sửa thương hiệu" },
  { id: "8", code: "brand.delete", name: "Xóa thương hiệu", module: "brand", description: "Xóa thương hiệu" },
  { id: "9", code: "branch.view", name: "Xem chi nhánh", module: "branch", description: "Xem danh sách chi nhánh" },
  { id: "10", code: "branch.create", name: "Tạo chi nhánh", module: "branch", description: "Thêm chi nhánh mới" },
  { id: "11", code: "branch.edit", name: "Sửa chi nhánh", module: "branch", description: "Chỉnh sửa chi nhánh" },
  { id: "12", code: "branch.delete", name: "Xóa chi nhánh", module: "branch", description: "Xóa chi nhánh" },
];

// Mock data
const mockGroups: PermissionGroup[] = [
  {
    id: "1",
    name: "Super Admin",
    code: "super_admin",
    description: "Toàn quyền quản trị hệ thống",
    permissions: mockPermissions.map((p) => p.id),
    userCount: 2,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Support",
    code: "support",
    description: "Nhân viên hỗ trợ khách hàng",
    permissions: ["1", "5", "9"],
    userCount: 5,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "3",
    name: "Viewer",
    code: "viewer",
    description: "Chỉ xem, không chỉnh sửa",
    permissions: ["1", "5", "9"],
    userCount: 10,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

const moduleLabels: Record<string, string> = {
  company: "Công ty",
  brand: "Thương hiệu",
  branch: "Chi nhánh",
};

interface GroupFormData {
  name: string;
  code: string;
  description: string;
  permissions: string[];
}

const initialFormData: GroupFormData = {
  name: "",
  code: "",
  description: "",
  permissions: [],
};

export default function PermissionGroupsPage() {
  const [groups, setGroups] = React.useState<PermissionGroup[]>(mockGroups);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedGroup, setSelectedGroup] = React.useState<PermissionGroup | null>(null);
  const [formData, setFormData] = React.useState<GroupFormData>(initialFormData);
  const [isViewMode, setIsViewMode] = React.useState(false);

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group permissions by module
  const permissionsByModule = React.useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    mockPermissions.forEach((p) => {
      if (!grouped[p.module]) {
        grouped[p.module] = [];
      }
      grouped[p.module].push(p);
    });
    return grouped;
  }, []);

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
      permissions: [...group.permissions],
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
      permissions: [...group.permissions],
    });
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (group: PermissionGroup) => {
    setSelectedGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroup) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === selectedGroup.id
            ? { ...g, ...formData, updatedAt: new Date().toISOString() }
            : g
        )
      );
    } else {
      const newGroup: PermissionGroup = {
        id: String(Date.now()),
        ...formData,
        userCount: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setGroups((prev) => [newGroup, ...prev]);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (selectedGroup) {
      setGroups((prev) => prev.filter((g) => g.id !== selectedGroup.id));
      setIsDeleteDialogOpen(false);
      setSelectedGroup(null);
    }
  };

  const handleToggleStatus = (group: PermissionGroup) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === group.id ? { ...g, isActive: !g.isActive } : g))
    );
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
      permissions: checked
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter((id) => id !== permissionId),
    }));
  };

  const handleModuleToggleAll = (module: string, checked: boolean) => {
    const modulePermissionIds = permissionsByModule[module].map((p) => p.id);
    setFormData((prev) => ({
      ...prev,
      permissions: checked
        ? [...new Set([...prev.permissions, ...modulePermissionIds])]
        : prev.permissions.filter((id) => !modulePermissionIds.includes(id)),
    }));
  };

  const isModuleAllSelected = (module: string) => {
    const modulePermissionIds = permissionsByModule[module].map((p) => p.id);
    return modulePermissionIds.every((id) => formData.permissions.includes(id));
  };

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
              Danh sách nhóm quyền ({filteredGroups.length})
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
                <TableHead>Người dùng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.map((group) => (
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
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{group.userCount}</span>
                    </div>
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
              {filteredGroups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
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
                  {Object.entries(permissionsByModule).map(([module, permissions]) => (
                    <div key={module} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium">{moduleLabels[module]}</h4>
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
                        {permissions.map((permission) => (
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
                              formData.permissions.includes(permission.id) ? (
                                <Badge variant="success">Có</Badge>
                              ) : (
                                <Badge variant="secondary">Không</Badge>
                              )
                            ) : (
                              <Switch
                                checked={formData.permissions.includes(permission.id)}
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
                  <Button type="submit">
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
            <Button variant="destructive" onClick={handleDelete}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
