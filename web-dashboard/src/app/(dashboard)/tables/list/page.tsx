"use client";

import * as React from "react";
import { Plus, Table2, Loader2, MoreHorizontal, Pencil, Power, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { tableService, type Table, type CreateTableDto, type UpdateTableDto, TableStatus, tableStatusLabels } from "@/services/table-service";
import { areaService, type Area } from "@/services/area-service";

type DialogMode = "create" | "edit" | null;

export default function TablesPage() {
  const { toast } = useToast();
  const [tables, setTables] = React.useState<Table[]>([]);
  const [areas, setAreas] = React.useState<Area[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [selectedTable, setSelectedTable] = React.useState<Table | null>(null);
  const [deleteTable, setDeleteTable] = React.useState<Table | null>(null);
  const [filterAreaId, setFilterAreaId] = React.useState<string>("all");
  const [formData, setFormData] = React.useState<CreateTableDto>({
    areaId: "",
    name: "",
    capacity: 4,
    sortOrder: 0,
  });

  // Load data
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [tablesData, areasData] = await Promise.all([
        tableService.getAll(),
        areaService.getAll(),
      ]);
      setTables(tablesData);
      setAreas(areasData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Lỗi", description: "Không thể tải dữ liệu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter tables by area
  const filteredTables = React.useMemo(() => {
    if (filterAreaId === "all") return tables;
    return tables.filter((t) => t.areaId === filterAreaId);
  }, [tables, filterAreaId]);

  // Group tables by area
  const tablesByArea = React.useMemo(() => {
    const grouped = new Map<string, Table[]>();
    filteredTables.forEach((table) => {
      const areaId = table.areaId;
      if (!grouped.has(areaId)) {
        grouped.set(areaId, []);
      }
      grouped.get(areaId)!.push(table);
    });
    return grouped;
  }, [filteredTables]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedTable(null);
    setFormData({ areaId: areas[0]?.id || "", name: "", capacity: 4, sortOrder: 0 });
    setDialogMode("create");
  };

  // Open edit dialog
  const handleOpenEdit = (table: Table) => {
    setSelectedTable(table);
    setFormData({
      areaId: table.areaId,
      name: table.name,
      capacity: table.capacity,
      sortOrder: table.sortOrder,
    });
    setDialogMode("edit");
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedTable(null);
    setFormData({ areaId: "", name: "", capacity: 4, sortOrder: 0 });
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.areaId) return;

    try {
      setSaving(true);

      if (dialogMode === "create") {
        const result = await tableService.create(formData);
        setTables((prev) => [...prev, result]);
        toast({ title: "Thành công", description: "Đã tạo bàn mới" });
      } else if (dialogMode === "edit" && selectedTable) {
        const updateData: UpdateTableDto = {
          areaId: formData.areaId,
          name: formData.name,
          capacity: formData.capacity,
          sortOrder: formData.sortOrder,
        };
        const result = await tableService.update(selectedTable.id, updateData);
        setTables((prev) => prev.map((t) => (t.id === selectedTable.id ? result : t)));
        toast({ title: "Thành công", description: "Đã cập nhật bàn" });
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving table:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi lưu bàn",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (table: Table) => {
    try {
      const updated = await tableService.toggleActive(table.id);
      setTables((prev) => prev.map((t) => (t.id === table.id ? updated : t)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} bàn ${table.name}`,
      });
    } catch (error: any) {
      console.error("Error toggling table:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Handle update status
  const handleUpdateStatus = async (table: Table, status: TableStatus) => {
    try {
      const updated = await tableService.updateStatus(table.id, status);
      setTables((prev) => prev.map((t) => (t.id === table.id ? updated : t)));
      toast({
        title: "Thành công",
        description: `Đã cập nhật trạng thái bàn ${table.name}`,
      });
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTable) return;

    try {
      await tableService.delete(deleteTable.id);
      setTables((prev) => prev.filter((t) => t.id !== deleteTable.id));
      toast({ title: "Thành công", description: `Đã xóa bàn ${deleteTable.name}` });
    } catch (error: any) {
      console.error("Error deleting table:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi xóa",
        variant: "destructive",
      });
    } finally {
      setDeleteTable(null);
    }
  };

  const getAreaName = (areaId: string) => {
    return areas.find((a) => a.id === areaId)?.name || "Không xác định";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý bàn</h1>
          <p className="text-muted-foreground">Quản lý danh sách bàn trong nhà hàng</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterAreaId} onValueChange={setFilterAreaId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Lọc theo khu vực" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả khu vực</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleOpenCreate} disabled={areas.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm bàn
          </Button>
        </div>
      </div>

      {areas.length === 0 && !loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Table2 className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Chưa có khu vực nào</p>
            <p className="text-xs text-muted-foreground mt-1">
              Vui lòng tạo khu vực trước khi thêm bàn
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : filteredTables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Table2 className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Chưa có bàn nào</p>
            <p className="text-xs text-muted-foreground mt-1">
              Nhấn &quot;Thêm bàn&quot; để bắt đầu
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(tablesByArea.entries()).map(([areaId, areaTables]) => (
            <Card key={areaId}>
              <CardHeader>
                <CardTitle className="text-lg">{getAreaName(areaId)}</CardTitle>
                <CardDescription>{areaTables.length} bàn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {areaTables.map((table) => {
                    const statusInfo = tableStatusLabels[table.status];
                    return (
                      <Card key={table.id} className={`relative ${!table.isActive ? "opacity-60" : ""}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${statusInfo.color}`}>
                                <Table2 className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">{table.name}</p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  <span>{table.capacity} chỗ</span>
                                </div>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEdit(table)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Chỉnh sửa
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {Object.entries(tableStatusLabels).map(([status, info]) => (
                                  <DropdownMenuItem
                                    key={status}
                                    onClick={() => handleUpdateStatus(table, status as TableStatus)}
                                    disabled={table.status === status}
                                  >
                                    <div className={`w-2 h-2 rounded-full mr-2 ${info.color.split(" ")[0]}`} />
                                    {info.label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleToggleActive(table)}>
                                  <Power className="mr-2 h-4 w-4" />
                                  {table.isActive ? "Tạm ngưng" : "Kích hoạt"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteTable(table)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Xóa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                            {!table.isActive && (
                              <Badge variant="secondary">Tạm ngưng</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Table Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Thêm bàn mới" : "Chỉnh sửa bàn"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Nhập thông tin bàn. Mỗi bàn thuộc một khu vực."
                : "Cập nhật thông tin bàn."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="areaId">Khu vực *</Label>
                <Select
                  value={formData.areaId}
                  onValueChange={(value) => setFormData({ ...formData, areaId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn khu vực" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Tên bàn *</Label>
                <Input
                  id="name"
                  placeholder="Bàn 1, Bàn 2, Bàn VIP..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="capacity">Số chỗ ngồi</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  placeholder="4"
                  value={formData.capacity || 4}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 4 })}
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
              <Button type="submit" disabled={saving || !formData.name.trim() || !formData.areaId}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dialogMode === "create" ? "Tạo bàn" : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTable !== null} onOpenChange={() => setDeleteTable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bàn &quot;{deleteTable?.name}&quot;? Hành động này không thể hoàn tác.
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
