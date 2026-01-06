"use client";

import * as React from "react";
import { Plus, MapPin, Loader2, MoreHorizontal, Pencil, Power, Trash2, X, Table2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { areaService, type Area, type CreateAreaDto, type UpdateAreaDto, type QuickTableDto } from "@/services/area-service";
import { BrandBranchFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";
import { useColumnConfig, type ColumnConfig } from "@/hooks/use-column-config";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";

// Default column configuration
const defaultColumns: ColumnConfig[] = [
  { key: "name", label: "Tên khu vực", visible: true, locked: true },
  { key: "description", label: "Mô tả", visible: true },
  { key: "sortOrder", label: "Thứ tự", visible: false },
  { key: "isActive", label: "Trạng thái", visible: true },
];

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

  // Column configuration
  const {
    columns,
    toggleColumn,
    resetToDefault,
    isColumnVisible,
  } = useColumnConfig({
    storageKey: "areas-table-columns",
    defaultColumns,
  });

  const [areas, setAreas] = React.useState<Area[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [selectedArea, setSelectedArea] = React.useState<Area | null>(null);
  const [deleteArea, setDeleteArea] = React.useState<Area | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [formData, setFormData] = React.useState<CreateAreaDto>({
    name: "",
    description: "",
    sortOrder: 0,
  });
  const [continueCreating, setContinueCreating] = React.useState(false);

  // Track newly created and updated area IDs for badges
  const [newAreaIds, setNewAreaIds] = React.useState<Set<string>>(new Set());
  const [updatedAreaIds, setUpdatedAreaIds] = React.useState<Set<string>>(new Set());

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
    // Remove badges when editing
    setNewAreaIds(prev => { const next = new Set(prev); next.delete(area.id); return next; });
    setUpdatedAreaIds(prev => { const next = new Set(prev); next.delete(area.id); return next; });
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
        setNewAreaIds(prev => new Set([...prev, result.id]));
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
        setUpdatedAreaIds(prev => new Set([...prev, result.id]));
        setNewAreaIds(prev => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
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
  const filteredAreas = React.useMemo(() => {
    return areas.filter((area) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return area.isActive;
      if (statusFilter === "inactive") return !area.isActive;
      return true;
    });
  }, [areas, statusFilter]);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
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
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách khu vực</CardTitle>
              <CardDescription>Tổng cộng {filteredAreas.length} khu vực</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="inactive">Tạm ngưng</SelectItem>
                </SelectContent>
              </Select>
              {statusFilter !== "all" && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setStatusFilter("all")}
                  title="Xóa bộ lọc"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {filteredAreas.length > 0 && (
                <ColumnConfigDialog
                  columns={columns}
                  onToggle={toggleColumn}
                  onReset={resetToDefault}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
            <div className="flex-1 overflow-auto min-h-0">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  {isColumnVisible("name") && <TableHead>Tên khu vực</TableHead>}
                  {isColumnVisible("description") && <TableHead>Mô tả</TableHead>}
                  {isColumnVisible("sortOrder") && <TableHead>Thứ tự</TableHead>}
                  {isColumnVisible("isActive") && <TableHead>Trạng thái</TableHead>}
                  <TableHead className="w-[80px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAreas.map((area) => (
                  <TableRow key={area.id}>
                    {isColumnVisible("name") && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-primary/10">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="font-medium">{area.name}</span>
                          {newAreaIds.has(area.id) && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Mới</Badge>
                          )}
                          {updatedAreaIds.has(area.id) && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">Cập nhật</Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible("description") && (
                      <TableCell className="max-w-[300px] truncate text-muted-foreground">
                        {area.description || "-"}
                      </TableCell>
                    )}
                    {isColumnVisible("sortOrder") && (
                      <TableCell>{area.sortOrder}</TableCell>
                    )}
                    {isColumnVisible("isActive") && (
                      <TableCell>
                        <Badge variant={area.isActive ? "default" : "secondary"}>
                          {area.isActive ? "Hoạt động" : "Tạm ngưng"}
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
