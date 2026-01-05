"use client";

import * as React from "react";
import { Plus, Gift, Loader2, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
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
import { giftItemService, type GiftItem, type CreateGiftItemDto, type UpdateGiftItemDto } from "@/services/gift-item-service";
import { BrandBranchFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";
import { useColumnConfig, type ColumnConfig } from "@/hooks/use-column-config";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

// Default column configuration
const defaultColumns: ColumnConfig[] = [
  { key: "name", label: "Tên món tặng", visible: true, locked: true },
  { key: "maxQuantity", label: "SL tối đa", visible: true },
  { key: "minOrderAmount", label: "Đơn tối thiểu", visible: true },
  { key: "description", label: "Mô tả", visible: true },
  { key: "sortOrder", label: "Thứ tự", visible: false },
  { key: "isActive", label: "Trạng thái", visible: true },
];

type DialogMode = "create" | "edit" | null;

export default function GiftItemsPage() {
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
    storageKey: "gift-items-table-columns",
    defaultColumns,
  });

  const [giftItems, setGiftItems] = React.useState<GiftItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<GiftItem | null>(null);
  const [deleteItem, setDeleteItem] = React.useState<GiftItem | null>(null);
  const [formData, setFormData] = React.useState<CreateGiftItemDto>({
    name: "",
    description: "",
    maxQuantity: 1,
    minOrderAmount: 0,
    sortOrder: 0,
  });

  // Track newly created and updated IDs for badges
  const [newItemIds, setNewItemIds] = React.useState<Set<string>>(new Set());
  const [updatedItemIds, setUpdatedItemIds] = React.useState<Set<string>>(new Set());

  // Load gift items - only when branch is selected
  const loadGiftItems = React.useCallback(async (branchId: string) => {
    if (!branchId) {
      setGiftItems([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await giftItemService.getAll(branchId);
      // Sort by createdAt descending (newest first)
      const sortedData = [...data].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setGiftItems(sortedData);
    } catch (error) {
      console.error("Error loading gift items:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách món tặng", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadGiftItems(filterBranchId);
  }, [filterBranchId, loadGiftItems]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedItem(null);
    setFormData({
      name: "",
      description: "",
      maxQuantity: 1,
      minOrderAmount: 0,
      sortOrder: 0,
    });
    setDialogMode("create");
  };

  // Open edit dialog
  const handleOpenEdit = (item: GiftItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      maxQuantity: item.maxQuantity,
      minOrderAmount: Number(item.minOrderAmount),
      sortOrder: item.sortOrder,
    });
    setDialogMode("edit");
    // Remove badges when editing
    setNewItemIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
    setUpdatedItemIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedItem(null);
    setFormData({
      name: "",
      description: "",
      maxQuantity: 1,
      minOrderAmount: 0,
      sortOrder: 0,
    });
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);

      if (dialogMode === "create") {
        const result = await giftItemService.create(formData);
        setGiftItems((prev) => [result, ...prev]);
        setNewItemIds(prev => new Set([...prev, result.id]));
        toast({ title: "Thành công", description: "Đã tạo món tặng mới" });
      } else if (dialogMode === "edit" && selectedItem) {
        const updateData: UpdateGiftItemDto = {
          name: formData.name,
          description: formData.description,
          maxQuantity: formData.maxQuantity,
          minOrderAmount: formData.minOrderAmount,
          sortOrder: formData.sortOrder,
        };
        const result = await giftItemService.update(selectedItem.id, updateData);
        setGiftItems((prev) => prev.map((item) => (item.id === selectedItem.id ? result : item)));
        setUpdatedItemIds(prev => new Set([...prev, result.id]));
        setNewItemIds(prev => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
        toast({ title: "Thành công", description: "Đã cập nhật món tặng" });
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving gift item:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi lưu món tặng",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (item: GiftItem) => {
    try {
      const updated = await giftItemService.toggleActive(item.id);
      setGiftItems((prev) => prev.map((g) => (g.id === item.id ? updated : g)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} món tặng "${item.name}"`,
      });
    } catch (error: any) {
      console.error("Error toggling gift item:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      await giftItemService.delete(deleteItem.id);
      setGiftItems((prev) => prev.filter((g) => g.id !== deleteItem.id));
      toast({ title: "Thành công", description: `Đã xóa món tặng "${deleteItem.name}"` });
    } catch (error: any) {
      console.error("Error deleting gift item:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi xóa",
        variant: "destructive",
      });
    } finally {
      setDeleteItem(null);
    }
  };

  // Filter gift items by branch (already filtered by API)
  const filteredItems = giftItems;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý món tặng</h1>
          <p className="text-muted-foreground">Thêm, sửa và quản lý các món tặng kèm khi bán hàng</p>
        </div>
        <div className="flex items-center gap-2">
          <BrandBranchFilter
            selectedBrandId={filterBrandId}
            selectedBranchId={filterBranchId}
            onBrandChange={setFilterBrandId}
            onBranchChange={setFilterBranchId}
            showAllBranchOption={false}
            className="w-[360px]"
          />
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm món tặng
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách món tặng</CardTitle>
              <CardDescription>Tổng cộng {filteredItems.length} món tặng</CardDescription>
            </div>
            {filterBranchId && filteredItems.length > 0 && (
              <ColumnConfigDialog
                columns={columns}
                onToggle={toggleColumn}
                onReset={resetToDefault}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!filterBranchId ? (
            <FilterRequiredPlaceholder
              title="Vui lòng chọn chi nhánh"
              description="Chọn một chi nhánh từ bộ lọc phía trên để xem danh sách món tặng"
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Gift className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có món tặng nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm món tặng&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isColumnVisible("name") && <TableHead>Tên món tặng</TableHead>}
                  {isColumnVisible("maxQuantity") && <TableHead>SL tối đa</TableHead>}
                  {isColumnVisible("minOrderAmount") && <TableHead>Đơn tối thiểu</TableHead>}
                  {isColumnVisible("description") && <TableHead>Mô tả</TableHead>}
                  {isColumnVisible("sortOrder") && <TableHead>Thứ tự</TableHead>}
                  {isColumnVisible("isActive") && <TableHead>Trạng thái</TableHead>}
                  <TableHead className="w-[80px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    {isColumnVisible("name") && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-pink-100 text-pink-800">
                            <Gift className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-medium">{item.name}</span>
                          {newItemIds.has(item.id) && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Mới</Badge>
                          )}
                          {updatedItemIds.has(item.id) && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">Cập nhật</Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible("maxQuantity") && (
                      <TableCell>{item.maxQuantity}</TableCell>
                    )}
                    {isColumnVisible("minOrderAmount") && (
                      <TableCell className="text-muted-foreground">
                        {Number(item.minOrderAmount) > 0 ? formatCurrency(Number(item.minOrderAmount)) : "Không giới hạn"}
                      </TableCell>
                    )}
                    {isColumnVisible("description") && (
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {item.description || "-"}
                      </TableCell>
                    )}
                    {isColumnVisible("sortOrder") && (
                      <TableCell>{item.sortOrder}</TableCell>
                    )}
                    {isColumnVisible("isActive") && (
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Hoạt động" : "Tạm ngưng"}
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
                          <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(item)}>
                            <Power className="mr-2 h-4 w-4" />
                            {item.isActive ? "Tạm ngưng" : "Kích hoạt"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteItem(item)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Thêm món tặng mới" : "Chỉnh sửa món tặng"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Nhập thông tin món tặng. Ví dụ: Nước ngọt tặng kèm, Khăn giấy..."
                : "Cập nhật thông tin món tặng."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên món tặng *</Label>
                <Input
                  id="name"
                  placeholder="Nước ngọt tặng kèm, Khăn giấy..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="maxQuantity">Số lượng tối đa</Label>
                  <Input
                    id="maxQuantity"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formData.maxQuantity || 1}
                    onChange={(e) => setFormData({ ...formData, maxQuantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minOrderAmount">Đơn tối thiểu (VNĐ)</Label>
                  <Input
                    id="minOrderAmount"
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="500000"
                    value={formData.minOrderAmount || ""}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Để 0 nếu không giới hạn giá trị đơn hàng
                  </p>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả món tặng..."
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
                {dialogMode === "create" ? "Tạo món tặng" : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteItem !== null} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa món tặng &quot;{deleteItem?.name}&quot;? Hành động này không thể hoàn tác.
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
