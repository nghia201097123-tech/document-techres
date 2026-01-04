"use client";

import * as React from "react";
import { Plus, Building2, Loader2, ChevronRight, ChevronDown, MoreHorizontal, Pencil, Power, Trash2, FolderTree, Folder, FolderOpen, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { departmentService, type Department, type CreateDepartmentDto, type UpdateDepartmentDto } from "@/services/department-service";
import { permissionService, type Permission } from "@/services/permission-service";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type DialogMode = "create" | "edit" | null;

export default function DepartmentsPage() {
  const { toast } = useToast();
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [selectedDepartment, setSelectedDepartment] = React.useState<Department | null>(null);
  const [deleteDepartment, setDeleteDepartment] = React.useState<Department | null>(null);
  const [continueCreating, setContinueCreating] = React.useState(false);
  const [formData, setFormData] = React.useState<CreateDepartmentDto>({
    name: "",
    parentId: undefined,
    description: "",
  });

  // Permission states
  const [permissionDialogOpen, setPermissionDialogOpen] = React.useState(false);
  const [permissionDepartment, setPermissionDepartment] = React.useState<Department | null>(null);
  const [allPermissions, setAllPermissions] = React.useState<Record<string, Permission[]>>({});
  const [selectedPermissionIds, setSelectedPermissionIds] = React.useState<Set<string>>(new Set());
  const [loadingPermissions, setLoadingPermissions] = React.useState(false);
  const [savingPermissions, setSavingPermissions] = React.useState(false);

  // Load departments
  const loadDepartments = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await departmentService.getAll();
      setDepartments(data);
      // Auto expand all by default
      setExpandedIds(new Set(data.map(d => d.id)));
    } catch (error) {
      console.error("Error loading departments:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách bộ phận", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // Open create dialog
  const handleOpenCreate = (parentId?: string) => {
    setSelectedDepartment(null);
    setFormData({ name: "", parentId: parentId, description: "" });
    setDialogMode("create");
  };

  // Open edit dialog
  const handleOpenEdit = (dept: Department) => {
    setSelectedDepartment(dept);
    setFormData({
      name: dept.name,
      parentId: dept.parentId || undefined,
      description: dept.description || "",
    });
    setDialogMode("edit");
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedDepartment(null);
    setFormData({ name: "", parentId: undefined, description: "" });
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);

      if (dialogMode === "create") {
        const result = await departmentService.create(formData);
        setDepartments((prev) => [...prev, result]);
        setExpandedIds(prev => new Set([...prev, result.id]));
        toast({ title: "Thành công", description: `Đã tạo bộ phận "${result.name}"` });
        if (continueCreating) {
          setFormData({ name: "", parentId: formData.parentId, description: "" });
          return;
        }
      } else if (dialogMode === "edit" && selectedDepartment) {
        const updateData: UpdateDepartmentDto = {
          name: formData.name,
          parentId: formData.parentId,
          description: formData.description,
        };
        const result = await departmentService.update(selectedDepartment.id, updateData);
        setDepartments((prev) => prev.map((d) => (d.id === selectedDepartment.id ? result : d)));
        toast({ title: "Thành công", description: "Đã cập nhật bộ phận" });
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving department:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi lưu bộ phận",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (dept: Department) => {
    try {
      const updated = await departmentService.toggleActive(dept.id);
      setDepartments((prev) => prev.map((d) => (d.id === dept.id ? updated : d)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} bộ phận "${dept.name}"`,
      });
    } catch (error: any) {
      console.error("Error toggling department:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteDepartment) return;

    try {
      await departmentService.delete(deleteDepartment.id);
      setDepartments((prev) => prev.filter((d) => d.id !== deleteDepartment.id));
      toast({ title: "Thành công", description: `Đã xóa bộ phận "${deleteDepartment.name}"` });
    } catch (error: any) {
      console.error("Error deleting department:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi xóa",
        variant: "destructive",
      });
    } finally {
      setDeleteDepartment(null);
    }
  };

  // Open permission dialog
  const handleOpenPermissions = async (dept: Department) => {
    setPermissionDepartment(dept);
    setPermissionDialogOpen(true);
    setLoadingPermissions(true);

    try {
      // Load all permissions grouped by module
      const grouped = await permissionService.getGrouped();
      setAllPermissions(grouped);

      // Load current department permissions
      const deptPermissions = await permissionService.getDepartmentPermissions(dept.id);
      setSelectedPermissionIds(new Set(deptPermissions.map(p => p.id)));
    } catch (error) {
      console.error("Error loading permissions:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách quyền", variant: "destructive" });
    } finally {
      setLoadingPermissions(false);
    }
  };

  // Save department permissions
  const handleSavePermissions = async () => {
    if (!permissionDepartment) return;

    try {
      setSavingPermissions(true);
      await permissionService.assignDepartmentPermissions({
        departmentId: permissionDepartment.id,
        permissionIds: Array.from(selectedPermissionIds),
      });
      toast({ title: "Thành công", description: `Đã cập nhật quyền cho bộ phận "${permissionDepartment.name}"` });
      setPermissionDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving permissions:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi lưu quyền",
        variant: "destructive",
      });
    } finally {
      setSavingPermissions(false);
    }
  };

  // Toggle permission selection
  const togglePermission = (permissionId: string) => {
    setSelectedPermissionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  };

  // Toggle all permissions in a module
  const toggleModule = (modulePermissions: Permission[]) => {
    const allSelected = modulePermissions.every(p => selectedPermissionIds.has(p.id));
    setSelectedPermissionIds(prev => {
      const newSet = new Set(prev);
      modulePermissions.forEach(p => {
        if (allSelected) {
          newSet.delete(p.id);
        } else {
          newSet.add(p.id);
        }
      });
      return newSet;
    });
  };

  // Toggle expand
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Get children of a department
  const getChildren = (parentId: string) => {
    return departments.filter((d) => d.parentId === parentId);
  };

  // Get root departments (no parent)
  const rootDepartments = departments.filter((d) => !d.parentId);

  // Count all descendants
  const countDescendants = (deptId: string): number => {
    const children = getChildren(deptId);
    return children.reduce((sum, child) => sum + 1 + countDescendants(child.id), 0);
  };

  // Level colors for visual hierarchy
  const levelColors = [
    "border-l-blue-500",
    "border-l-green-500",
    "border-l-orange-500",
    "border-l-purple-500",
    "border-l-pink-500",
  ];

  const levelBgColors = [
    "bg-blue-50 dark:bg-blue-950/20",
    "bg-green-50 dark:bg-green-950/20",
    "bg-orange-50 dark:bg-orange-950/20",
    "bg-purple-50 dark:bg-purple-950/20",
    "bg-pink-50 dark:bg-pink-950/20",
  ];

  // Render department item with visual tree hierarchy
  const renderDepartment = (dept: Department, level: number = 0) => {
    const children = getChildren(dept.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(dept.id);
    const descendantCount = countDescendants(dept.id);
    const colorIndex = level % levelColors.length;

    return (
      <div key={dept.id} className="relative">
        {/* Department Card */}
        <div
          className={cn(
            "relative border rounded-lg mb-2 transition-all duration-200",
            "border-l-4",
            levelColors[colorIndex],
            level === 0 ? "bg-card" : levelBgColors[colorIndex],
            "hover:shadow-md"
          )}
          style={{ marginLeft: level * 24 }}
        >
          <div className="flex items-center p-3 gap-3">
            {/* Expand/Collapse Button */}
            <button
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
                hasChildren ? "hover:bg-muted cursor-pointer" : "cursor-default opacity-50"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) toggleExpand(dept.id);
              }}
            >
              {hasChildren ? (
                isExpanded ? (
                  <FolderOpen className="h-5 w-5 text-amber-600" />
                ) : (
                  <Folder className="h-5 w-5 text-amber-500" />
                )
              ) : (
                <Building2 className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            {/* Department Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base">{dept.name}</span>
                {hasChildren && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {descendantCount} cấp dưới
                  </Badge>
                )}
                {level > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Cấp {level + 1}
                  </span>
                )}
              </div>
              {dept.description && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-md">
                  {dept.description}
                </p>
              )}
            </div>

            {/* Status Badge */}
            <Badge
              variant={dept.isActive ? "default" : "secondary"}
              className={cn(
                dept.isActive ? "bg-green-600 hover:bg-green-700" : ""
              )}
            >
              {dept.isActive ? "Hoạt động" : "Tạm ngưng"}
            </Badge>

            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleOpenCreate(dept.id)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm bộ phận con
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenEdit(dept)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenPermissions(dept)}>
                  <Shield className="mr-2 h-4 w-4" />
                  Phân quyền
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleActive(dept)}>
                  <Power className="mr-2 h-4 w-4" />
                  {dept.isActive ? "Tạm ngưng" : "Kích hoạt"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDepartment(dept)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Visual connector line to children */}
          {hasChildren && isExpanded && (
            <div
              className="absolute left-8 top-full w-0.5 bg-border z-10"
              style={{ height: 8 }}
            />
          )}
        </div>

        {/* Children with connecting lines */}
        {isExpanded && hasChildren && (
          <div className="relative">
            {/* Vertical line connecting to children */}
            <div
              className="absolute w-0.5 bg-border"
              style={{
                left: level * 24 + 32,
                top: 0,
                bottom: 8
              }}
            />
            {children.map((child, index) => (
              <div key={child.id} className="relative">
                {/* Horizontal connector line */}
                <div
                  className="absolute h-0.5 bg-border"
                  style={{
                    left: level * 24 + 32,
                    top: 24,
                    width: 16
                  }}
                />
                {renderDepartment(child, level + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Get parent name for display
  const getParentName = (parentId?: string) => {
    if (!parentId) return null;
    const parent = departments.find(d => d.id === parentId);
    return parent?.name;
  };

  // Get available parents (exclude self and descendants when editing)
  const getAvailableParents = () => {
    if (!selectedDepartment) return departments;

    // Get all descendants of the selected department
    const getDescendantIds = (deptId: string): string[] => {
      const children = getChildren(deptId);
      return children.flatMap(child => [child.id, ...getDescendantIds(child.id)]);
    };

    const excludeIds = new Set([selectedDepartment.id, ...getDescendantIds(selectedDepartment.id)]);
    return departments.filter(d => !excludeIds.has(d.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý bộ phận</h1>
          <p className="text-muted-foreground">Cấu trúc bộ phận trong công ty (hỗ trợ cấp bậc cha-con)</p>
        </div>
        <Button onClick={() => handleOpenCreate()}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm bộ phận
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderTree className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Sơ đồ tổ chức</CardTitle>
                <CardDescription>
                  Tổng cộng {departments.length} bộ phận ({rootDepartments.length} bộ phận gốc)
                </CardDescription>
              </div>
            </div>
            {departments.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedIds(new Set(departments.map(d => d.id)))}
                >
                  Mở rộng tất cả
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedIds(new Set())}
                >
                  Thu gọn tất cả
                </Button>
              </div>
            )}
          </div>
          {/* Color legend */}
          {departments.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t text-sm">
              <span className="text-muted-foreground">Màu theo cấp bậc:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>Cấp 1</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Cấp 2</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-orange-500" />
                <span>Cấp 3</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-purple-500" />
                <span>Cấp 4</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-pink-500" />
                <span>Cấp 5+</span>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Chưa có bộ phận nào</p>
              <p className="text-sm text-muted-foreground mt-1">
                Nhấn &quot;Thêm bộ phận&quot; để bắt đầu xây dựng sơ đồ tổ chức
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {rootDepartments.map((dept) => renderDepartment(dept, 0))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Department Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Thêm bộ phận mới" : "Chỉnh sửa bộ phận"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? formData.parentId
                  ? `Thêm bộ phận con cho "${getParentName(formData.parentId)}"`
                  : "Nhập thông tin bộ phận. Có thể chọn bộ phận cha để tạo cấu trúc phân cấp."
                : "Cập nhật thông tin bộ phận."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên bộ phận *</Label>
                <Input
                  id="name"
                  placeholder="Bộ phận bếp, Quản lý, Phục vụ..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parent">Bộ phận cha</Label>
                <Select
                  value={formData.parentId || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, parentId: value === "none" ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn bộ phận cha (nếu có)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không có (Bộ phận gốc)</SelectItem>
                    {getAvailableParents().map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả bộ phận..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-4">
              {dialogMode === "create" && (
                <div className="flex items-center gap-2 mr-auto">
                  <Checkbox
                    id="continueCreating"
                    checked={continueCreating}
                    onCheckedChange={(checked) => setContinueCreating(!!checked)}
                  />
                  <Label htmlFor="continueCreating" className="text-sm cursor-pointer">
                    Tiếp tục tạo
                  </Label>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Hủy
                </Button>
                <Button type="submit" disabled={saving || !formData.name.trim()}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {dialogMode === "create" ? "Tạo bộ phận" : "Cập nhật"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDepartment !== null} onOpenChange={() => setDeleteDepartment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bộ phận &quot;{deleteDepartment?.name}&quot;?
              {getChildren(deleteDepartment?.id || "").length > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Cảnh báo: Bộ phận này có {countDescendants(deleteDepartment?.id || "")} bộ phận con. Tất cả sẽ bị xóa theo.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permission Assignment Dialog */}
      <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Phân quyền cho bộ phận
            </DialogTitle>
            <DialogDescription>
              Gán quyền cho bộ phận &quot;{permissionDepartment?.name}&quot;. Nhân viên thuộc bộ phận này sẽ thừa hưởng các quyền được gán.
            </DialogDescription>
          </DialogHeader>

          {loadingPermissions ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(allPermissions).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Shield className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có quyền nào được định nghĩa trong hệ thống</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {Object.entries(allPermissions).map(([module, permissions]) => {
                  const allSelected = permissions.every(p => selectedPermissionIds.has(p.id));
                  const someSelected = permissions.some(p => selectedPermissionIds.has(p.id));

                  return (
                    <div key={module} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Checkbox
                          id={`module-${module}`}
                          checked={allSelected}
                          className={someSelected && !allSelected ? "data-[state=checked]:bg-primary/50" : ""}
                          onCheckedChange={() => toggleModule(permissions)}
                        />
                        <Label
                          htmlFor={`module-${module}`}
                          className="text-base font-semibold cursor-pointer"
                        >
                          {module}
                        </Label>
                        <Badge variant="outline" className="ml-auto">
                          {permissions.filter(p => selectedPermissionIds.has(p.id)).length}/{permissions.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                        {permissions.map((perm) => (
                          <div key={perm.id} className="flex items-start gap-2">
                            <Checkbox
                              id={perm.id}
                              checked={selectedPermissionIds.has(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                            />
                            <div className="grid gap-0.5">
                              <Label
                                htmlFor={perm.id}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {perm.name}
                              </Label>
                              {perm.description && (
                                <p className="text-xs text-muted-foreground">
                                  {perm.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="mt-4">
            <div className="flex items-center gap-2 mr-auto text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              Đã chọn {selectedPermissionIds.size} quyền
            </div>
            <Button variant="outline" onClick={() => setPermissionDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSavePermissions} disabled={savingPermissions}>
              {savingPermissions && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu quyền
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
