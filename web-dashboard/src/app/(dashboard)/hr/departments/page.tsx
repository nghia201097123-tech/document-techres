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
import { departmentService, type Department, type CreateDepartmentDto, type UpdateDepartmentDto, type DepartmentStaffCount } from "@/services/department-service";
import { permissionService, type Permission } from "@/services/permission-service";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Users, ArrowRight } from "lucide-react";

type DialogMode = "create" | "edit" | null;

// Owner department identifier - the root department that all others must be under
const OWNER_DEPARTMENT_NAME = "Chủ nhà hàng";

// Check if a department is the owner department
const isOwnerDepartment = (dept: Department) => {
  return dept.name === OWNER_DEPARTMENT_NAME && !dept.parentId;
};

export default function DepartmentsPage() {
  const { toast } = useToast();
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [selectedDepartment, setSelectedDepartment] = React.useState<Department | null>(null);
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

  // Cascade toggle states
  const [toggleDepartment, setToggleDepartment] = React.useState<Department | null>(null);
  const [toggleStaffCount, setToggleStaffCount] = React.useState<DepartmentStaffCount | null>(null);
  const [loadingToggleInfo, setLoadingToggleInfo] = React.useState(false);
  const [togglingCascade, setTogglingCascade] = React.useState(false);

  // Staff transfer states (for delete)
  const [transferDialogOpen, setTransferDialogOpen] = React.useState(false);
  const [transferDepartment, setTransferDepartment] = React.useState<Department | null>(null);
  const [transferStaffCount, setTransferStaffCount] = React.useState<DepartmentStaffCount | null>(null);
  const [targetDepartmentId, setTargetDepartmentId] = React.useState<string>("");
  const [loadingTransferInfo, setLoadingTransferInfo] = React.useState(false);
  const [transferring, setTransferring] = React.useState(false);

  // Load departments
  const loadDepartments = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await departmentService.getAll();
      // Sort by createdAt descending (newest first)
      const sortedData = [...data].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setDepartments(sortedData);
      // Auto expand all by default
      setExpandedIds(new Set(sortedData.map(d => d.id)));
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
    // If no parentId provided and owner exists, default to owner as parent
    // This ensures no department can be created at the same level as owner
    const defaultParentId = parentId || ownerDepartment?.id;
    setFormData({ name: "", parentId: defaultParentId, description: "" });
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

    // Validate parent is required when owner exists (except when editing owner)
    if (!canBeRootDepartment() && !formData.parentId) {
      toast({
        title: "Lỗi",
        description: `Phải chọn bộ phận cha. Tất cả bộ phận phải nằm dưới "${OWNER_DEPARTMENT_NAME}"`,
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      if (dialogMode === "create") {
        const result = await departmentService.create(formData);
        setDepartments((prev) => [result, ...prev]);
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

  // Open toggle confirmation dialog
  const handleOpenToggle = async (dept: Department) => {
    setToggleDepartment(dept);
    setLoadingToggleInfo(true);
    setToggleStaffCount(null);

    try {
      // Get staff count for department and children
      const staffCount = await departmentService.getStaffCount(dept.id);
      setToggleStaffCount(staffCount);
    } catch (error) {
      console.error("Error loading staff count:", error);
      // Still allow toggle even if we can't get staff count
    } finally {
      setLoadingToggleInfo(false);
    }
  };

  // Handle toggle active with cascade
  const handleToggleActiveCascade = async () => {
    if (!toggleDepartment) return;

    try {
      setTogglingCascade(true);
      const result = await departmentService.toggleActiveCascade(toggleDepartment.id);

      // Update all affected departments in state
      setDepartments((prev) => {
        const updatedIds = new Set([
          result.department.id,
          ...result.affectedDepartments.map(d => d.id)
        ]);
        return prev.map((d) => {
          if (d.id === result.department.id) return result.department;
          const affected = result.affectedDepartments.find(ad => ad.id === d.id);
          return affected || d;
        });
      });

      const action = result.department.isActive ? "kích hoạt" : "tạm ngưng";
      toast({
        title: "Thành công",
        description: `Đã ${action} bộ phận "${toggleDepartment.name}"${
          result.affectedDepartments.length > 0
            ? ` và ${result.affectedDepartments.length} bộ phận con`
            : ""
        }${result.affectedStaffCount > 0 ? `, ${result.affectedStaffCount} nhân viên` : ""}`,
      });
    } catch (error: any) {
      console.error("Error toggling department:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setTogglingCascade(false);
      setToggleDepartment(null);
      setToggleStaffCount(null);
    }
  };

  // Open transfer dialog before delete
  const handleOpenDelete = async (dept: Department) => {
    setTransferDepartment(dept);
    setTransferDialogOpen(true);
    setLoadingTransferInfo(true);
    setTargetDepartmentId("");
    setTransferStaffCount(null);

    try {
      // Get staff count for department and children
      const staffCount = await departmentService.getStaffCount(dept.id);
      setTransferStaffCount(staffCount);
    } catch (error) {
      console.error("Error loading staff count:", error);
    } finally {
      setLoadingTransferInfo(false);
    }
  };

  // Get all descendant IDs for a department
  const getAllDescendantIds = (deptId: string): string[] => {
    const children = getChildren(deptId);
    return children.flatMap(child => [child.id, ...getAllDescendantIds(child.id)]);
  };

  // Get available departments for staff transfer (exclude self and descendants)
  const getTransferTargetDepartments = () => {
    if (!transferDepartment) return [];
    const excludeIds = new Set([transferDepartment.id, ...getAllDescendantIds(transferDepartment.id)]);
    return departments.filter(d => !excludeIds.has(d.id) && d.isActive);
  };

  // Handle transfer staff and delete
  const handleTransferAndDelete = async () => {
    if (!transferDepartment) return;

    // Check if there are staff to transfer
    const hasStaff = transferStaffCount && transferStaffCount.totalStaffCount > 0;

    if (hasStaff && !targetDepartmentId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn bộ phận để chuyển nhân viên",
        variant: "destructive",
      });
      return;
    }

    try {
      setTransferring(true);

      if (hasStaff) {
        // Transfer staff then delete
        const result = await departmentService.transferStaffAndDelete(transferDepartment.id, targetDepartmentId);
        toast({
          title: "Thành công",
          description: `Đã chuyển ${result.transferredCount} nhân viên và xóa bộ phận "${transferDepartment.name}"`,
        });
      } else {
        // No staff to transfer, just delete
        await departmentService.delete(transferDepartment.id);
        toast({ title: "Thành công", description: `Đã xóa bộ phận "${transferDepartment.name}"` });
      }

      // Remove department and all descendants from state
      const removeIds = new Set([transferDepartment.id, ...getAllDescendantIds(transferDepartment.id)]);
      setDepartments((prev) => prev.filter((d) => !removeIds.has(d.id)));

    } catch (error: any) {
      console.error("Error deleting department:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi xóa",
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
      setTransferDialogOpen(false);
      setTransferDepartment(null);
      setTransferStaffCount(null);
      setTargetDepartmentId("");
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

  // Find the owner department
  const ownerDepartment = React.useMemo(() => {
    return departments.find(isOwnerDepartment);
  }, [departments]);

  // Get root departments - only owner should be at root level
  // If owner exists, only show owner. Other root departments should be shown as orphans needing attention.
  const rootDepartments = React.useMemo(() => {
    const roots = departments.filter((d) => !d.parentId);
    if (!ownerDepartment) return roots;
    // Owner department should be first
    const owner = roots.find(isOwnerDepartment);
    const others = roots.filter(d => !isOwnerDepartment(d));
    return owner ? [owner, ...others] : roots;
  }, [departments, ownerDepartment]);

  // Count all descendants
  const countDescendants = (deptId: string): number => {
    const children = getChildren(deptId);
    return children.reduce((sum, child) => sum + 1 + countDescendants(child.id), 0);
  };

  // Level colors for OKR-style cards
  const levelColors = [
    { badge: "bg-amber-500", border: "border-l-amber-500", bar: "bg-amber-500", label: "C", labelFull: "Chủ" },
    { badge: "bg-blue-500", border: "border-l-blue-500", bar: "bg-blue-500", label: "L1", labelFull: "Cấp 1" },
    { badge: "bg-emerald-500", border: "border-l-emerald-500", bar: "bg-emerald-500", label: "L2", labelFull: "Cấp 2" },
    { badge: "bg-purple-500", border: "border-l-purple-500", bar: "bg-purple-500", label: "L3", labelFull: "Cấp 3" },
    { badge: "bg-pink-500", border: "border-l-pink-500", bar: "bg-pink-500", label: "L4", labelFull: "Cấp 4" },
    { badge: "bg-orange-500", border: "border-l-orange-500", bar: "bg-orange-500", label: "L5", labelFull: "Cấp 5+" },
  ];

  // Render OKR-style card node
  const renderMindmapNode = (dept: Department, level: number = 0) => {
    const children = getChildren(dept.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(dept.id);
    const colorIndex = Math.min(level, levelColors.length - 1);
    const colors = levelColors[colorIndex];
    const isOwner = isOwnerDepartment(dept);
    const descendantCount = countDescendants(dept.id);

    return (
      <div key={dept.id} className="flex items-start">
        {/* OKR Card Node */}
        <div className="relative group">
          <div
            className={cn(
              "relative w-56 bg-card border rounded-lg shadow-sm transition-all duration-200",
              "hover:shadow-md border-l-4",
              colors.border,
              !dept.isActive && "opacity-60"
            )}
          >
            {/* Card Header */}
            <div className="p-3 pb-2">
              <div className="flex items-start justify-between gap-2">
                {/* Badge and Code */}
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center justify-center w-7 h-7 rounded text-white text-xs font-bold",
                      colors.badge
                    )}
                  >
                    {isOwner ? "C" : colors.label}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    BP-{dept.id.slice(0, 6).toUpperCase()}
                  </span>
                </div>

                {/* Action Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
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
                    {!isOwner && (
                      <DropdownMenuItem onClick={() => handleOpenToggle(dept)}>
                        <Power className="mr-2 h-4 w-4" />
                        {dept.isActive ? "Tạm ngưng" : "Kích hoạt"}
                      </DropdownMenuItem>
                    )}
                    {!isOwner && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleOpenDelete(dept)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Department Name */}
              <h4 className="font-semibold text-sm mt-2 line-clamp-2">{dept.name}</h4>

              {/* Description if exists */}
              {dept.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {dept.description}
                </p>
              )}
            </div>

            {/* Card Footer with Status */}
            <div className="px-3 pb-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {hasChildren && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-xs"
                      onClick={() => toggleExpand(dept.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 mr-0.5" />
                      ) : (
                        <ChevronRight className="h-3 w-3 mr-0.5" />
                      )}
                      {children.length} con
                    </Button>
                  )}
                </div>
                <Badge
                  variant={dept.isActive ? "default" : "secondary"}
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    dept.isActive ? colors.badge : ""
                  )}
                >
                  {dept.isActive ? "Hoạt động" : "Tạm ngưng"}
                </Badge>
              </div>

              {/* Progress-like status bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    dept.isActive ? colors.bar : "bg-muted-foreground/30"
                  )}
                  style={{
                    width: dept.isActive ? "100%" : "30%"
                  }}
                />
              </div>

              {/* Descendants info */}
              {descendantCount > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
                  Tổng: {descendantCount} bộ phận trực thuộc
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Children branch - horizontal connector to vertical stack */}
        {hasChildren && isExpanded && (
          <div className="flex items-center">
            {/* Horizontal connector line */}
            <div className="w-8 h-0.5 bg-border self-center" style={{ marginTop: '40px' }} />

            {/* Children container with vertical connector */}
            <div className="relative flex flex-col gap-4 py-2">
              {/* Vertical connector line */}
              {children.length > 1 && (
                <div
                  className="absolute left-0 w-0.5 bg-border"
                  style={{
                    top: `calc(40px + 8px)`,
                    height: `calc(100% - 80px - 16px)`
                  }}
                />
              )}

              {children.map((child, index) => (
                <div key={child.id} className="flex items-start relative">
                  {/* Horizontal branch connector to each child */}
                  <div
                    className="absolute w-6 h-0.5 bg-border"
                    style={{ left: 0, top: '40px' }}
                  />
                  <div className="ml-6">
                    {renderMindmapNode(child, level + 1)}
                  </div>
                </div>
              ))}
            </div>
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
    // Get all descendants of the selected department (if editing)
    const getDescendantIds = (deptId: string): string[] => {
      const children = getChildren(deptId);
      return children.flatMap(child => [child.id, ...getDescendantIds(child.id)]);
    };

    let availableParents = departments;

    if (selectedDepartment) {
      const excludeIds = new Set([selectedDepartment.id, ...getDescendantIds(selectedDepartment.id)]);
      availableParents = departments.filter(d => !excludeIds.has(d.id));
    }

    return availableParents;
  };

  // Check if "no parent" option should be available
  // Only allow if: 1) No owner exists, OR 2) Editing the owner department itself
  const canBeRootDepartment = () => {
    if (!ownerDepartment) return true; // No owner yet, allow creating root
    if (selectedDepartment && isOwnerDepartment(selectedDepartment)) return true; // Editing owner
    return false; // All other cases, must have a parent
  };

  // Check if the selected department is the owner (for UI restrictions)
  const isEditingOwner = selectedDepartment && isOwnerDepartment(selectedDepartment);

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
          {/* Color legend - OKR style */}
          {departments.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t text-sm">
              <span className="text-muted-foreground">Cấp bậc:</span>
              {levelColors.map((color, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div className={cn("w-5 h-5 rounded text-white text-[10px] font-bold flex items-center justify-center", color.badge)}>
                    {color.label}
                  </div>
                  <span className="text-xs">{color.labelFull}</span>
                </div>
              ))}
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
            <div className="overflow-x-auto pb-4">
              <div className="inline-flex min-w-full p-6">
                {rootDepartments.map((dept) => renderMindmapNode(dept, 0))}
              </div>
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
                <Label htmlFor="parent">
                  Bộ phận cha {!canBeRootDepartment() && <span className="text-destructive">*</span>}
                </Label>
                <Select
                  value={formData.parentId || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, parentId: value === "none" ? undefined : value })
                  }
                  disabled={isEditingOwner}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn bộ phận cha" />
                  </SelectTrigger>
                  <SelectContent>
                    {canBeRootDepartment() && (
                      <SelectItem value="none">Không có (Bộ phận gốc)</SelectItem>
                    )}
                    {getAvailableParents().map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!canBeRootDepartment() && (
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

      {/* Cascade Toggle Confirmation Dialog */}
      <AlertDialog open={toggleDepartment !== null} onOpenChange={() => {
        if (!togglingCascade) {
          setToggleDepartment(null);
          setToggleStaffCount(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {toggleDepartment?.isActive ? "Tạm ngưng bộ phận" : "Kích hoạt bộ phận"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Bạn có chắc chắn muốn {toggleDepartment?.isActive ? "tạm ngưng" : "kích hoạt"} bộ phận &quot;{toggleDepartment?.name}&quot;?
                </p>

                {loadingToggleInfo ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : toggleStaffCount && (toggleStaffCount.totalStaffCount > 0 || getChildren(toggleDepartment?.id || "").length > 0) ? (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2">
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      {toggleDepartment?.isActive ? "Các đối tượng sẽ bị tạm ngưng:" : "Các đối tượng sẽ được kích hoạt:"}
                    </p>
                    <ul className="text-sm space-y-1 text-amber-700 dark:text-amber-300">
                      {getChildren(toggleDepartment?.id || "").length > 0 && (
                        <li className="flex items-center gap-2">
                          <FolderTree className="h-4 w-4" />
                          {countDescendants(toggleDepartment?.id || "")} bộ phận con
                        </li>
                      )}
                      {toggleStaffCount.totalStaffCount > 0 && (
                        <li className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {toggleStaffCount.totalStaffCount} nhân viên
                        </li>
                      )}
                    </ul>
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={togglingCascade}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActiveCascade}
              disabled={togglingCascade || loadingToggleInfo}
              className={toggleDepartment?.isActive ? "bg-amber-600 hover:bg-amber-700" : ""}
            >
              {togglingCascade && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {toggleDepartment?.isActive ? "Tạm ngưng" : "Kích hoạt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Staff Transfer Dialog (before delete) */}
      <Dialog open={transferDialogOpen} onOpenChange={(open) => {
        if (!transferring && !open) {
          setTransferDialogOpen(false);
          setTransferDepartment(null);
          setTransferStaffCount(null);
          setTargetDepartmentId("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Xóa bộ phận
            </DialogTitle>
            <DialogDescription>
              Xóa bộ phận &quot;{transferDepartment?.name}&quot;
              {getChildren(transferDepartment?.id || "").length > 0 && (
                <span className="block mt-1 text-destructive">
                  và {countDescendants(transferDepartment?.id || "")} bộ phận con
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingTransferInfo ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {transferStaffCount && transferStaffCount.totalStaffCount > 0 ? (
                <>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-amber-600" />
                      <span className="font-medium text-amber-800 dark:text-amber-200">
                        {transferStaffCount.totalStaffCount} nhân viên cần chuyển
                      </span>
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Trước khi xóa bộ phận, bạn cần chọn bộ phận để chuyển nhân viên sang.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetDept" className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Chuyển nhân viên đến bộ phận *
                    </Label>
                    <Select value={targetDepartmentId} onValueChange={setTargetDepartmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn bộ phận đích" />
                      </SelectTrigger>
                      <SelectContent>
                        {getTransferTargetDepartments().map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-muted-foreground">
                    Không có nhân viên nào thuộc bộ phận này hoặc các bộ phận con.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTransferDialogOpen(false);
                setTransferDepartment(null);
                setTransferStaffCount(null);
                setTargetDepartmentId("");
              }}
              disabled={transferring}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleTransferAndDelete}
              disabled={
                transferring ||
                loadingTransferInfo ||
                (transferStaffCount && transferStaffCount.totalStaffCount > 0 && !targetDepartmentId)
              }
            >
              {transferring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {transferStaffCount && transferStaffCount.totalStaffCount > 0
                ? "Chuyển & Xóa"
                : "Xóa bộ phận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
