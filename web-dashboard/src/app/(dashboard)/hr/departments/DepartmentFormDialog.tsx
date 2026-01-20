"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import { departmentService, type Department, type CreateDepartmentDto, type UpdateDepartmentDto } from "@/services/department-service";

const OWNER_DEPARTMENT_NAME = "Chủ nhà hàng";

const isOwnerDepartment = (dept: Department) => {
  return dept.name === OWNER_DEPARTMENT_NAME && !dept.parentId;
};

interface DepartmentFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  departmentId?: string;
  defaultParentId?: string;
  departments: Department[];
  onClose: () => void;
  onSuccess: (department: Department, isNew: boolean) => void;
  continueCreating: boolean;
  setContinueCreating: (value: boolean) => void;
}

const DepartmentFormDialog = React.memo(function DepartmentFormDialog({
  open,
  mode,
  departmentId,
  defaultParentId,
  departments,
  onClose,
  onSuccess,
  continueCreating,
  setContinueCreating,
}: DepartmentFormDialogProps) {
  const { toast } = useToast();

  // All form state managed locally
  const [formData, setFormData] = React.useState<CreateDepartmentDto>({
    name: "",
    parentId: undefined,
    description: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [loadingDept, setLoadingDept] = React.useState(false);

  // Owner department
  const ownerDepartment = React.useMemo(() => {
    return departments.find(isOwnerDepartment);
  }, [departments]);

  // Check if editing owner department
  const isEditingOwner = React.useMemo(() => {
    if (mode !== "edit" || !departmentId) return false;
    const dept = departments.find(d => d.id === departmentId);
    return dept ? isOwnerDepartment(dept) : false;
  }, [mode, departmentId, departments]);

  // Can be root only if no owner exists, or editing the owner itself
  const canBeRootDepartment = React.useMemo(() => {
    if (!ownerDepartment) return true;
    if (mode === "edit" && isEditingOwner) return true;
    return false;
  }, [ownerDepartment, mode, isEditingOwner]);

  // Get available parents (excluding self and descendants)
  const availableParents = React.useMemo(() => {
    if (mode !== "edit" || !departmentId) {
      return departments.filter(d => d.isActive);
    }

    // Get all descendant IDs to exclude
    const getDescendantIds = (id: string): string[] => {
      const children = departments.filter(d => d.parentId === id);
      return [id, ...children.flatMap(child => getDescendantIds(child.id))];
    };
    const excludeIds = new Set(getDescendantIds(departmentId));

    return departments.filter(d => d.isActive && !excludeIds.has(d.id));
  }, [departments, mode, departmentId]);

  // Get parent name
  const getParentName = (parentId?: string) => {
    if (!parentId) return "";
    const parent = departments.find(d => d.id === parentId);
    return parent?.name || "";
  };

  // Load department data for edit mode
  React.useEffect(() => {
    if (!open) return;

    if (mode === "edit" && departmentId) {
      loadDepartmentData();
    } else if (mode === "create") {
      const parentId = defaultParentId || ownerDepartment?.id;
      setFormData({ name: "", parentId, description: "" });
    }
  }, [open, mode, departmentId, defaultParentId, ownerDepartment?.id]);

  const loadDepartmentData = async () => {
    if (!departmentId) return;
    setLoadingDept(true);
    try {
      const dept = departments.find(d => d.id === departmentId);
      if (dept) {
        setFormData({
          name: dept.name,
          parentId: dept.parentId || undefined,
          description: dept.description || "",
        });
      }
    } catch (error) {
      console.error("Error loading department:", error);
      toast({ title: "Lỗi", description: "Không thể tải thông tin bộ phận", variant: "destructive" });
    } finally {
      setLoadingDept(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    // Validate parent is required when owner exists (except when editing owner)
    if (!canBeRootDepartment && !formData.parentId) {
      toast({
        title: "Lỗi",
        description: `Phải chọn bộ phận cha. Tất cả bộ phận phải nằm dưới "${OWNER_DEPARTMENT_NAME}"`,
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      if (mode === "create") {
        const result = await departmentService.create(formData);
        onSuccess(result, true);
        toast({ title: "Thành công", description: `Đã tạo bộ phận "${result.name}"` });

        if (continueCreating) {
          setFormData(prev => ({ name: "", parentId: prev.parentId, description: "" }));
          return;
        }
      } else if (mode === "edit" && departmentId) {
        const updateData: UpdateDepartmentDto = {
          name: formData.name,
          parentId: formData.parentId,
          description: formData.description,
        };
        const result = await departmentService.update(departmentId, updateData);
        onSuccess(result, false);
        toast({ title: "Thành công", description: "Đã cập nhật bộ phận" });
      }

      handleClose();
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

  const handleClose = () => {
    setFormData({ name: "", parentId: undefined, description: "" });
    setContinueCreating(false);
    onClose();
  };

  if (loadingDept) {
    return (
      <Dialog open={open} onOpenChange={() => handleClose()}>
        <DialogContent>
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Thêm bộ phận mới" : "Chỉnh sửa bộ phận"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
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
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="parent">
                Bộ phận cha {!canBeRootDepartment && <span className="text-destructive">*</span>}
              </Label>
              <Select
                value={formData.parentId || "none"}
                onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, parentId: value === "none" ? undefined : value }))
                }
                disabled={isEditingOwner}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bộ phận cha" />
                </SelectTrigger>
                <SelectContent>
                  {canBeRootDepartment && (
                    <SelectItem value="none">Không có (Bộ phận gốc)</SelectItem>
                  )}
                  {availableParents.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!canBeRootDepartment && (
                <p className="text-xs text-muted-foreground">
                  Tất cả bộ phận phải nằm dưới bộ phận "{OWNER_DEPARTMENT_NAME}"
                </p>
              )}
              {isEditingOwner && (
                <p className="text-xs text-amber-600">
                  Bộ phận "{OWNER_DEPARTMENT_NAME}" luôn là bộ phận gốc, không thể thay đổi
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                placeholder="Mô tả bộ phận..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-4">
            {mode === "create" && (
              <div className="flex items-center gap-2 mr-auto">
                <Checkbox
                  id="continueCreatingDept"
                  checked={continueCreating}
                  onCheckedChange={(checked) => setContinueCreating(!!checked)}
                />
                <Label htmlFor="continueCreatingDept" className="text-sm cursor-pointer">
                  Tiếp tục tạo
                </Label>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving || !formData.name.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Tạo bộ phận" : "Cập nhật"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default DepartmentFormDialog;
