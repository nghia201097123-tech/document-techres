"use client";

import * as React from "react";
import { Plus, MapPin, Loader2, MoreHorizontal, Pencil, Power, Trash2, X, Table2 } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { areaService, type Area, type CreateAreaDto, type UpdateAreaDto, type QuickTableDto } from "@/services/area-service";
import { BrandBranchFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";

type DialogMode = "create" | "edit" | null;

interface QuickTable {
  id: string; // temporary id for UI
  name: string;
  capacity: number;
}

export default function AreasPage() {
  const { toast } = useToast();

  // Global filter state from Redux
  const { brandId: filterBrandId, branchId: filterBranchId, setBrandId: setFilterBrandId, setBranchId: setFilterBranchId } = useGlobalFilters();

  const [areas, setAreas] = React.useState<Area[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [selectedArea, setSelectedArea] = React.useState<Area | null>(null);
  const [deleteArea, setDeleteArea] = React.useState<Area | null>(null);
  const [formData, setFormData] = React.useState<CreateAreaDto>({
    name: "",
    description: "",
    sortOrder: 0,
  });
  const [continueCreating, setContinueCreating] = React.useState(false);

  // Quick table creation state
  const [quickTables, setQuickTables] = React.useState<QuickTable[]>([]);
  const [newTableName, setNewTableName] = React.useState("");
  const [newTableCapacity, setNewTableCapacity] = React.useState(4);

  // Load areas - only when branch is selected
  const loadAreas = React.useCallback(async (branchId: string) => {
    if (!branchId) {
      setAreas([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await areaService.getAll(branchId);
      // Sort by createdAt descending (newest first)
      const sortedData = [...data].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAreas(sortedData);
    } catch (error) {
      console.error("Error loading areas:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách khu vực", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadAreas(filterBranchId);
  }, [filterBranchId, loadAreas]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedArea(null);
    setFormData({ name: "", description: "", sortOrder: 0 });
    setQuickTables([]);
    setNewTableName("");
    setNewTableCapacity(4);
    setDialogMode("create");
  };

  // Open edit dialog
  const handleOpenEdit = (area: Area) => {
    setSelectedArea(area);
    setFormData({
      name: area.name,
      description: area.description || "",
      sortOrder: area.sortOrder,
    });
    setQuickTables([]);
    setDialogMode("edit");
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedArea(null);
    setFormData({ name: "", description: "", sortOrder: 0 });
    setQuickTables([]);
    setNewTableName("");
    setNewTableCapacity(4);
  };

  // Add quick table
  const handleAddQuickTable = () => {
    if (!newTableName.trim()) return;

    const newTable: QuickTable = {
      id: `temp-${Date.now()}`,
      name: newTableName.trim(),
      capacity: newTableCapacity,
    };
    setQuickTables([...quickTables, newTable]);
    setNewTableName("");
    setNewTableCapacity(4);
  };

  // Add multiple tables with pattern
  const handleAddMultipleTables = () => {
    const baseName = formData.name || "Bàn";
    const startNum = quickTables.length + 1;
    const count = 5; // Add 5 tables at a time

    const newTables: QuickTable[] = [];
    for (let i = 0; i < count; i++) {
      newTables.push({
        id: `temp-${Date.now()}-${i}`,
        name: `${baseName} ${startNum + i}`,
        capacity: 4,
      });
    }
    setQuickTables([...quickTables, ...newTables]);
  };

  // Remove quick table
  const handleRemoveQuickTable = (id: string) => {
    setQuickTables(quickTables.filter((t) => t.id !== id));
  };

  // Update quick table
  const handleUpdateQuickTable = (id: string, field: "name" | "capacity", value: string | number) => {
    setQuickTables(
      quickTables.map((t) =>
        t.id === id ? { ...t, [field]: field === "capacity" ? Number(value) : value } : t
      )
    );
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);

      if (dialogMode === "create") {
        const createData: CreateAreaDto = {
          ...formData,
          tables: quickTables.length > 0
            ? quickTables.map((t) => ({ name: t.name, capacity: t.capacity }))
            : undefined,
        };
        const result = await areaService.create(createData);
        setAreas((prev) => [result, ...prev]);
        const tableCount = quickTables.length;
        toast({
          title: "Thành công",
          description: tableCount > 0
            ? `Đã tạo khu vực mới với ${tableCount} bàn`
            : "Đã tạo khu vực mới",
        });
        if (continueCreating) {
          setFormData({ name: "", description: "", sortOrder: (formData.sortOrder || 0) + 1 });
          setQuickTables([]);
          return;
        }
      } else if (dialogMode === "edit" && selectedArea) {
        const updateData: UpdateAreaDto = {
          name: formData.name,
          description: formData.description,
          sortOrder: formData.sortOrder,
        };
        const result = await areaService.update(selectedArea.id, updateData);
        setAreas((prev) => prev.map((a) => (a.id === selectedArea.id ? result : a)));
        toast({ title: "Thành công", description: "Đã cập nhật khu vực" });
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving area:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi lưu khu vực",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (area: Area) => {
    try {
      const updated = await areaService.toggleActive(area.id);
      setAreas((prev) => prev.map((a) => (a.id === area.id ? updated : a)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} khu vực ${area.name}`,
      });
    } catch (error: any) {
      console.error("Error toggling area:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteArea) return;

    try {
      await areaService.delete(deleteArea.id);
      setAreas((prev) => prev.filter((a) => a.id !== deleteArea.id));
      toast({ title: "Thành công", description: `Đã xóa khu vực ${deleteArea.name}` });
    } catch (error: any) {
      console.error("Error deleting area:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi xóa",
        variant: "destructive",
      });
    } finally {
      setDeleteArea(null);
    }
  };

  // Filter areas (already filtered by API for branch)
  const filteredAreas = areas;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý khu vực</h1>
          <p className="text-muted-foreground">Phân chia khu vực trong nhà hàng (Tầng 1, Tầng 2, Sân vườn...)</p>
        </div>
        <div className="flex items-center gap-2">
          <BrandBranchFilter
            selectedBrandId={filterBrandId}
            selectedBranchId={filterBranchId}
            onBrandChange={setFilterBrandId}
            onBranchChange={setFilterBranchId}
            showAllOption={false}
            brandClassName="w-[160px]"
            branchClassName="w-[160px]"
          />
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm khu vực
          </Button>
        </div>
      </div>

      {!filterBranchId ? (
        <FilterRequiredPlaceholder
          title="Vui lòng chọn chi nhánh"
          description="Chọn một chi nhánh từ bộ lọc phía trên để xem danh sách khu vực"
        />
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>Danh sách khu vực</CardTitle>
          <CardDescription>Tổng cộng {filteredAreas.length} khu vực</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAreas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MapPin className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có khu vực nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm khu vực&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAreas.map((area) => (
                <Card key={area.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{area.name}</p>
                          {area.description && (
                            <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                              {area.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(area)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(area)}>
                            <Power className="mr-2 h-4 w-4" />
                            {area.isActive ? "Tạm ngưng" : "Kích hoạt"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteArea(area)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant={area.isActive ? "default" : "secondary"}>
                        {area.isActive ? "Hoạt động" : "Tạm ngưng"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Thứ tự: {area.sortOrder}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Create/Edit Area Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Thêm khu vực mới" : "Chỉnh sửa khu vực"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Nhập thông tin khu vực và tạo bàn nhanh cho khu vực này."
                : "Cập nhật thông tin khu vực."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Tên khu vực *</Label>
                  <Input
                    id="name"
                    placeholder="Tầng 1, Sân vườn, Phòng VIP..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
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
              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả khu vực..."
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Quick Table Creation - Only show for create mode */}
              {dialogMode === "create" && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Table2 className="h-4 w-4" />
                      Tạo bàn nhanh
                      {quickTables.length > 0 && (
                        <Badge variant="secondary">{quickTables.length} bàn</Badge>
                      )}
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddMultipleTables}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Thêm 5 bàn
                    </Button>
                  </div>

                  {/* Add new table form */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tên bàn (VD: Bàn 1)"
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddQuickTable();
                        }
                      }}
                    />
                    <Input
                      type="number"
                      min="1"
                      placeholder="Sức chứa"
                      value={newTableCapacity}
                      onChange={(e) => setNewTableCapacity(parseInt(e.target.value) || 4)}
                      className="w-24"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAddQuickTable}
                      disabled={!newTableName.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Quick tables list */}
                  {quickTables.length > 0 && (
                    <ScrollArea className="h-[200px] border rounded-md">
                      <div className="p-3 space-y-2">
                        {quickTables.map((table, index) => (
                          <div
                            key={table.id}
                            className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                          >
                            <span className="text-xs text-muted-foreground w-6">
                              {index + 1}.
                            </span>
                            <Input
                              value={table.name}
                              onChange={(e) => handleUpdateQuickTable(table.id, "name", e.target.value)}
                              className="flex-1 h-8"
                            />
                            <Input
                              type="number"
                              min="1"
                              value={table.capacity}
                              onChange={(e) => handleUpdateQuickTable(table.id, "capacity", e.target.value)}
                              className="w-20 h-8"
                            />
                            <span className="text-xs text-muted-foreground">người</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => handleRemoveQuickTable(table.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
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
                  {dialogMode === "create"
                    ? quickTables.length > 0
                      ? `Tạo khu vực + ${quickTables.length} bàn`
                      : "Tạo khu vực"
                    : "Cập nhật"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteArea !== null} onOpenChange={() => setDeleteArea(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa khu vực &quot;{deleteArea?.name}&quot;? Tất cả bàn trong khu vực này cũng sẽ bị xóa. Hành động này không thể hoàn tác.
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
