"use client";

import * as React from "react";
import { Plus, Building2, Loader2, ChevronRight, ChevronDown, MoreHorizontal, Pencil, Power, Trash2, Users } from "lucide-react";
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

  // Render tree lines for indentation
  const renderTreeLine = (isLast: boolean, level: number) => {
    if (level === 0) return null;
    return (
      <div className="flex">
        {Array.from({ length: level }).map((_, i) => (
          <div key={i} className="w-6 flex justify-center">
            {i === level - 1 ? (
              <div className="relative w-6">
                <div className={`absolute left-1/2 top-0 w-px bg-border ${isLast ? 'h-1/2' : 'h-full'}`} />
                <div className="absolute left-1/2 top-1/2 w-3 h-px bg-border" />
              </div>
            ) : (
              <div className="w-px bg-border h-full" />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render department item with tree view
  const renderDepartment = (dept: Department, level: number = 0, isLast: boolean = false, parentLines: boolean[] = []) => {
    const children = getChildren(dept.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(dept.id);
    const descendantCount = countDescendants(dept.id);

    return (
      <div key={dept.id}>
        <div
          className={`flex items-center group hover:bg-muted/50 rounded-lg transition-colors`}
        >
          {/* Tree lines */}
          <div className="flex h-10">
            {parentLines.map((showLine, i) => (
              <div key={i} className="w-6 flex justify-center">
                {showLine && <div className="w-px bg-border h-full" />}
              </div>
            ))}
            {level > 0 && (
              <div className="w-6 flex justify-center relative">
                <div className={`absolute left-1/2 top-0 w-px bg-border ${isLast ? 'h-1/2' : 'h-full'}`} />
                <div className="absolute left-1/2 top-1/2 w-3 h-px bg-border -translate-y-px" />
              </div>
            )}
          </div>

          {/* Expand button */}
          <button
            className={`flex items-center justify-center w-6 h-6 rounded hover:bg-muted ${hasChildren ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleExpand(dept.id);
            }}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <div className="w-4" />
            )}
          </button>

          {/* Department info */}
          <div className="flex items-center gap-3 flex-1 py-2 pr-2">
            <div className={`p-1.5 rounded ${dept.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <Building2 className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{dept.name}</span>
                {hasChildren && (
                  <span className="text-xs text-muted-foreground">
                    ({descendantCount} bộ phận con)
                  </span>
                )}
              </div>
              {dept.description && (
                <p className="text-xs text-muted-foreground truncate">{dept.description}</p>
              )}
            </div>
            <Badge variant={dept.isActive ? "default" : "secondary"}>
              {dept.isActive ? "Hoạt động" : "Tạm ngưng"}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
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
        </div>

        {/* Children */}
        {isExpanded && children.map((child, index) =>
          renderDepartment(
            child,
            level + 1,
            index === children.length - 1,
            [...parentLines, !isLast]
          )
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
            <div>
              <CardTitle>Cấu trúc bộ phận</CardTitle>
              <CardDescription>
                Tổng cộng {departments.length} bộ phận ({rootDepartments.length} bộ phận gốc)
              </CardDescription>
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có bộ phận nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm bộ phận&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {rootDepartments.map((dept, index) => renderDepartment(dept, 0, index === rootDepartments.length - 1, []))}
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
    </div>
  );
}
