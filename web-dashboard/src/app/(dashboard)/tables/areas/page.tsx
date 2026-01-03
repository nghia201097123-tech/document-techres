"use client";

import * as React from "react";
import { Plus, MapPin, Loader2, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { areaService, type Area, type CreateAreaDto, type UpdateAreaDto } from "@/services/area-service";

type DialogMode = "create" | "edit" | null;

export default function AreasPage() {
  const { toast } = useToast();
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

  // Load areas
  const loadAreas = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await areaService.getAll();
      setAreas(data);
    } catch (error) {
      console.error("Error loading areas:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách khu vực", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedArea(null);
    setFormData({ name: "", description: "", sortOrder: 0 });
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
    setDialogMode("edit");
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedArea(null);
    setFormData({ name: "", description: "", sortOrder: 0 });
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);

      if (dialogMode === "create") {
        const result = await areaService.create(formData);
        setAreas((prev) => [...prev, result]);
        toast({ title: "Thành công", description: "Đã tạo khu vực mới" });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý khu vực</h1>
          <p className="text-muted-foreground">Phân chia khu vực trong nhà hàng (Tầng 1, Tầng 2, Sân vườn...)</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm khu vực
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách khu vực</CardTitle>
          <CardDescription>Tổng cộng {areas.length} khu vực</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : areas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MapPin className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có khu vực nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm khu vực&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {areas.map((area) => (
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

      {/* Create/Edit Area Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Thêm khu vực mới" : "Chỉnh sửa khu vực"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Nhập thông tin khu vực. Khu vực giúp phân chia không gian nhà hàng."
                : "Cập nhật thông tin khu vực."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
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
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả khu vực..."
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
                {dialogMode === "create" ? "Tạo khu vực" : "Cập nhật"}
              </Button>
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
