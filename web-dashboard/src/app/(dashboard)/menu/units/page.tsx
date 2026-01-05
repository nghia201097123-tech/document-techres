"use client";

import * as React from "react";
import { Plus, Scale, Loader2, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { unitService, type Unit, type CreateUnitDto, type UpdateUnitDto } from "@/services/unit-service";
import { BrandFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";
import { useColumnConfig, type ColumnConfig } from "@/hooks/use-column-config";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";

// Default column configuration
const defaultColumns: ColumnConfig[] = [
  { key: "name", label: "Tên đơn vị", visible: true, locked: true },
  { key: "description", label: "Mô tả", visible: true },
  { key: "sortOrder", label: "Thứ tự", visible: false },
  { key: "isActive", label: "Trạng thái", visible: true },
];

type DialogMode = "create" | "edit" | null;

export default function UnitsPage() {
  const { toast } = useToast();

  // Global filter state from Redux
  const { brandId: filterBrandId, setBrandId: setFilterBrandId } = useGlobalFilters();

  // Column configuration
  const {
    columns,
    toggleColumn,
    resetToDefault,
    isColumnVisible,
  } = useColumnConfig({
    storageKey: "units-table-columns",
    defaultColumns,
  });

  const [units, setUnits] = React.useState<Unit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [selectedUnit, setSelectedUnit] = React.useState<Unit | null>(null);
  const [deleteUnit, setDeleteUnit] = React.useState<Unit | null>(null);
  const [formData, setFormData] = React.useState<CreateUnitDto>({
    name: "",
    description: "",
    sortOrder: 0,
  });

  // Track newly created and updated unit IDs for badges
  const [newUnitIds, setNewUnitIds] = React.useState<Set<string>>(new Set());
  const [updatedUnitIds, setUpdatedUnitIds] = React.useState<Set<string>>(new Set());

  // Load units - only when brand is selected
  const loadUnits = React.useCallback(async (brandId: string) => {
    if (!brandId) {
      setUnits([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await unitService.getAll(brandId);
      // Sort by createdAt descending (newest first)
      const sortedData = [...data].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setUnits(sortedData);
    } catch (error) {
      console.error("Error loading units:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách đơn vị tính", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadUnits(filterBrandId);
  }, [filterBrandId, loadUnits]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedUnit(null);
    setFormData({ name: "", description: "", sortOrder: 0 });
    setDialogMode("create");
  };

  // Open edit dialog
  const handleOpenEdit = (unit: Unit) => {
    setSelectedUnit(unit);
    setFormData({
      name: unit.name,
      description: unit.description || "",
      sortOrder: unit.sortOrder,
    });
    setDialogMode("edit");
    // Remove badges when editing
    setNewUnitIds(prev => { const next = new Set(prev); next.delete(unit.id); return next; });
    setUpdatedUnitIds(prev => { const next = new Set(prev); next.delete(unit.id); return next; });
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedUnit(null);
    setFormData({ name: "", description: "", sortOrder: 0 });
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);

      if (dialogMode === "create") {
        const result = await unitService.create(formData);
        setUnits((prev) => [result, ...prev]);
        setNewUnitIds(prev => new Set([...prev, result.id]));
        toast({ title: "Thành công", description: "Đã tạo đơn vị tính mới" });
      } else if (dialogMode === "edit" && selectedUnit) {
        const updateData: UpdateUnitDto = {
          name: formData.name,
          description: formData.description,
          sortOrder: formData.sortOrder,
        };
        const result = await unitService.update(selectedUnit.id, updateData);
        setUnits((prev) => prev.map((u) => (u.id === selectedUnit.id ? result : u)));
        setUpdatedUnitIds(prev => new Set([...prev, result.id]));
        setNewUnitIds(prev => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
        toast({ title: "Thành công", description: "Đã cập nhật đơn vị tính" });
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving unit:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi lưu đơn vị tính",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (unit: Unit) => {
    try {
      const updated = await unitService.toggleActive(unit.id);
      setUnits((prev) => prev.map((u) => (u.id === unit.id ? updated : u)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} đơn vị "${unit.name}"`,
      });
    } catch (error: any) {
      console.error("Error toggling unit:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteUnit) return;

    try {
      await unitService.delete(deleteUnit.id);
      setUnits((prev) => prev.filter((u) => u.id !== deleteUnit.id));
      toast({ title: "Thành công", description: `Đã xóa đơn vị "${deleteUnit.name}"` });
    } catch (error: any) {
      console.error("Error deleting unit:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi xóa",
        variant: "destructive",
      });
    } finally {
      setDeleteUnit(null);
    }
  };

  // Filter units by brand (already filtered by API)
  const filteredUnits = units;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý đơn vị tính</h1>
          <p className="text-muted-foreground">Thêm, sửa và quản lý đơn vị tính cho món ăn</p>
        </div>
        <div className="flex items-center gap-2">
          <BrandFilter
            selectedBrandId={filterBrandId}
            onBrandChange={setFilterBrandId}
            showAllOption={false}
            className="w-[180px]"
          />
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm đơn vị
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách đơn vị tính</CardTitle>
              <CardDescription>Tổng cộng {filteredUnits.length} đơn vị</CardDescription>
            </div>
            {filterBrandId && filteredUnits.length > 0 && (
              <ColumnConfigDialog
                columns={columns}
                onToggle={toggleColumn}
                onReset={resetToDefault}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!filterBrandId ? (
            <FilterRequiredPlaceholder
              title="Vui lòng chọn thương hiệu"
              description="Chọn một thương hiệu từ bộ lọc phía trên để xem danh sách đơn vị tính"
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Scale className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có đơn vị tính nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm đơn vị&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isColumnVisible("name") && <TableHead>Tên đơn vị</TableHead>}
                  {isColumnVisible("description") && <TableHead>Mô tả</TableHead>}
                  {isColumnVisible("sortOrder") && <TableHead>Thứ tự</TableHead>}
                  {isColumnVisible("isActive") && <TableHead>Trạng thái</TableHead>}
                  <TableHead className="w-[80px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnits.map((unit) => (
                  <TableRow key={unit.id}>
                    {isColumnVisible("name") && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-blue-100 text-blue-800">
                            <Scale className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-medium">{unit.name}</span>
                          {newUnitIds.has(unit.id) && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Mới</Badge>
                          )}
                          {updatedUnitIds.has(unit.id) && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">Cập nhật</Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible("description") && (
                      <TableCell className="max-w-[300px] truncate text-muted-foreground">
                        {unit.description || "-"}
                      </TableCell>
                    )}
                    {isColumnVisible("sortOrder") && (
                      <TableCell>{unit.sortOrder}</TableCell>
                    )}
                    {isColumnVisible("isActive") && (
                      <TableCell>
                        <Badge variant={unit.isActive ? "default" : "secondary"}>
                          {unit.isActive ? "Hoạt động" : "Tạm ngưng"}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(unit)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(unit)}>
                            <Power className="mr-2 h-4 w-4" />
                            {unit.isActive ? "Tạm ngưng" : "Kích hoạt"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteUnit(unit)}
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
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Unit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Thêm đơn vị tính mới" : "Chỉnh sửa đơn vị tính"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Nhập thông tin đơn vị tính. Ví dụ: Phần, Ly, Tô, Kg, Gram..."
                : "Cập nhật thông tin đơn vị tính."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên đơn vị *</Label>
                <Input
                  id="name"
                  placeholder="Phần, Ly, Tô, Kg..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả đơn vị tính..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sortOrder">Thứ tự hiển thị</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.sortOrder || 0}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving || !formData.name.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dialogMode === "create" ? "Tạo đơn vị" : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteUnit !== null} onOpenChange={() => setDeleteUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa đơn vị &quot;{deleteUnit?.name}&quot;? Hành động này không thể hoàn tác.
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
