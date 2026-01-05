"use client";

import * as React from "react";
import { Plus, Calendar, Loader2, MoreHorizontal, Pencil, Power, Trash2, Percent, DollarSign } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { seasonalPriceService, AdjustmentType, type SeasonalPrice, type CreateSeasonalPriceDto, type UpdateSeasonalPriceDto } from "@/services/seasonal-price-service";
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

// Format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("vi-VN");
};

// Default column configuration
const defaultColumns: ColumnConfig[] = [
  { key: "name", label: "Tên giá thời vụ", visible: true, locked: true },
  { key: "adjustment", label: "Điều chỉnh", visible: true },
  { key: "period", label: "Thời gian áp dụng", visible: true },
  { key: "description", label: "Mô tả", visible: true },
  { key: "sortOrder", label: "Thứ tự", visible: false },
  { key: "isActive", label: "Trạng thái", visible: true },
];

type DialogMode = "create" | "edit" | null;

export default function SeasonalPricesPage() {
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
    storageKey: "seasonal-prices-table-columns",
    defaultColumns,
  });

  const [seasonalPrices, setSeasonalPrices] = React.useState<SeasonalPrice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [selectedPrice, setSelectedPrice] = React.useState<SeasonalPrice | null>(null);
  const [deletePrice, setDeletePrice] = React.useState<SeasonalPrice | null>(null);
  const [formData, setFormData] = React.useState<CreateSeasonalPriceDto>({
    name: "",
    description: "",
    adjustmentType: AdjustmentType.PERCENTAGE,
    adjustmentValue: 0,
    startDate: "",
    endDate: "",
    sortOrder: 0,
  });

  // Track newly created and updated IDs for badges
  const [newPriceIds, setNewPriceIds] = React.useState<Set<string>>(new Set());
  const [updatedPriceIds, setUpdatedPriceIds] = React.useState<Set<string>>(new Set());

  // Load seasonal prices - only when branch is selected
  const loadSeasonalPrices = React.useCallback(async (branchId: string) => {
    if (!branchId) {
      setSeasonalPrices([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await seasonalPriceService.getAll(branchId);
      // Sort by createdAt descending (newest first)
      const sortedData = [...data].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setSeasonalPrices(sortedData);
    } catch (error) {
      console.error("Error loading seasonal prices:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách giá thời vụ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadSeasonalPrices(filterBranchId);
  }, [filterBranchId, loadSeasonalPrices]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedPrice(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      name: "",
      description: "",
      adjustmentType: AdjustmentType.PERCENTAGE,
      adjustmentValue: 0,
      startDate: today,
      endDate: today,
      sortOrder: 0,
    });
    setDialogMode("create");
  };

  // Open edit dialog
  const handleOpenEdit = (price: SeasonalPrice) => {
    setSelectedPrice(price);
    setFormData({
      name: price.name,
      description: price.description || "",
      adjustmentType: price.adjustmentType,
      adjustmentValue: Number(price.adjustmentValue),
      startDate: price.startDate.split('T')[0],
      endDate: price.endDate.split('T')[0],
      sortOrder: price.sortOrder,
    });
    setDialogMode("edit");
    // Remove badges when editing
    setNewPriceIds(prev => { const next = new Set(prev); next.delete(price.id); return next; });
    setUpdatedPriceIds(prev => { const next = new Set(prev); next.delete(price.id); return next; });
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedPrice(null);
    setFormData({
      name: "",
      description: "",
      adjustmentType: AdjustmentType.PERCENTAGE,
      adjustmentValue: 0,
      startDate: "",
      endDate: "",
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
        const result = await seasonalPriceService.create(formData);
        setSeasonalPrices((prev) => [result, ...prev]);
        setNewPriceIds(prev => new Set([...prev, result.id]));
        toast({ title: "Thành công", description: "Đã tạo giá thời vụ mới" });
      } else if (dialogMode === "edit" && selectedPrice) {
        const updateData: UpdateSeasonalPriceDto = {
          name: formData.name,
          description: formData.description,
          adjustmentType: formData.adjustmentType,
          adjustmentValue: formData.adjustmentValue,
          startDate: formData.startDate,
          endDate: formData.endDate,
          sortOrder: formData.sortOrder,
        };
        const result = await seasonalPriceService.update(selectedPrice.id, updateData);
        setSeasonalPrices((prev) => prev.map((p) => (p.id === selectedPrice.id ? result : p)));
        setUpdatedPriceIds(prev => new Set([...prev, result.id]));
        setNewPriceIds(prev => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
        toast({ title: "Thành công", description: "Đã cập nhật giá thời vụ" });
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving seasonal price:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi lưu giá thời vụ",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (price: SeasonalPrice) => {
    try {
      const updated = await seasonalPriceService.toggleActive(price.id);
      setSeasonalPrices((prev) => prev.map((p) => (p.id === price.id ? updated : p)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} giá thời vụ "${price.name}"`,
      });
    } catch (error: any) {
      console.error("Error toggling seasonal price:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletePrice) return;

    try {
      await seasonalPriceService.delete(deletePrice.id);
      setSeasonalPrices((prev) => prev.filter((p) => p.id !== deletePrice.id));
      toast({ title: "Thành công", description: `Đã xóa giá thời vụ "${deletePrice.name}"` });
    } catch (error: any) {
      console.error("Error deleting seasonal price:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi xóa",
        variant: "destructive",
      });
    } finally {
      setDeletePrice(null);
    }
  };

  // Get adjustment display
  const getAdjustmentDisplay = (price: SeasonalPrice) => {
    const value = Number(price.adjustmentValue);
    if (price.adjustmentType === AdjustmentType.PERCENTAGE) {
      return `${value >= 0 ? '+' : ''}${value}%`;
    }
    return formatCurrency(value);
  };

  // Filter seasonal prices by branch (already filtered by API)
  const filteredPrices = seasonalPrices;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý giá thời vụ</h1>
          <p className="text-muted-foreground">Thêm, sửa và quản lý các mức giá theo thời vụ</p>
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
            Thêm giá thời vụ
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách giá thời vụ</CardTitle>
              <CardDescription>Tổng cộng {filteredPrices.length} giá thời vụ</CardDescription>
            </div>
            {filterBranchId && filteredPrices.length > 0 && (
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
              description="Chọn một chi nhánh từ bộ lọc phía trên để xem danh sách giá thời vụ"
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPrices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có giá thời vụ nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm giá thời vụ&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isColumnVisible("name") && <TableHead>Tên giá thời vụ</TableHead>}
                  {isColumnVisible("adjustment") && <TableHead>Điều chỉnh</TableHead>}
                  {isColumnVisible("period") && <TableHead>Thời gian áp dụng</TableHead>}
                  {isColumnVisible("description") && <TableHead>Mô tả</TableHead>}
                  {isColumnVisible("sortOrder") && <TableHead>Thứ tự</TableHead>}
                  {isColumnVisible("isActive") && <TableHead>Trạng thái</TableHead>}
                  <TableHead className="w-[80px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrices.map((price) => (
                  <TableRow key={price.id}>
                    {isColumnVisible("name") && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-purple-100 text-purple-800">
                            <Calendar className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-medium">{price.name}</span>
                          {newPriceIds.has(price.id) && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Mới</Badge>
                          )}
                          {updatedPriceIds.has(price.id) && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">Cập nhật</Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible("adjustment") && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {price.adjustmentType === AdjustmentType.PERCENTAGE ? (
                            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className={Number(price.adjustmentValue) >= 0 ? "text-green-600" : "text-red-600"}>
                            {getAdjustmentDisplay(price)}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible("period") && (
                      <TableCell className="text-muted-foreground">
                        {formatDate(price.startDate)} - {formatDate(price.endDate)}
                      </TableCell>
                    )}
                    {isColumnVisible("description") && (
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {price.description || "-"}
                      </TableCell>
                    )}
                    {isColumnVisible("sortOrder") && (
                      <TableCell>{price.sortOrder}</TableCell>
                    )}
                    {isColumnVisible("isActive") && (
                      <TableCell>
                        <Badge variant={price.isActive ? "default" : "secondary"}>
                          {price.isActive ? "Hoạt động" : "Tạm ngưng"}
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
                          <DropdownMenuItem onClick={() => handleOpenEdit(price)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(price)}>
                            <Power className="mr-2 h-4 w-4" />
                            {price.isActive ? "Tạm ngưng" : "Kích hoạt"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletePrice(price)}
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
            <DialogTitle>{dialogMode === "create" ? "Thêm giá thời vụ mới" : "Chỉnh sửa giá thời vụ"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Nhập thông tin giá thời vụ. Ví dụ: Giá mùa hè, Khuyến mãi Tết..."
                : "Cập nhật thông tin giá thời vụ."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên giá thời vụ *</Label>
                <Input
                  id="name"
                  placeholder="Giá mùa hè, Khuyến mãi Tết..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="adjustmentType">Loại điều chỉnh *</Label>
                  <Select
                    value={formData.adjustmentType}
                    onValueChange={(value: AdjustmentType) => setFormData({ ...formData, adjustmentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AdjustmentType.PERCENTAGE}>Phần trăm (%)</SelectItem>
                      <SelectItem value={AdjustmentType.FIXED}>Số tiền cố định (VNĐ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adjustmentValue">
                    Giá trị {formData.adjustmentType === AdjustmentType.PERCENTAGE ? "(%)" : "(VNĐ)"} *
                  </Label>
                  <Input
                    id="adjustmentValue"
                    type="number"
                    step={formData.adjustmentType === AdjustmentType.PERCENTAGE ? "0.5" : "1000"}
                    placeholder={formData.adjustmentType === AdjustmentType.PERCENTAGE ? "10" : "50000"}
                    value={formData.adjustmentValue || ""}
                    onChange={(e) => setFormData({ ...formData, adjustmentValue: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Số dương để tăng giá, số âm để giảm giá
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Ngày bắt đầu *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">Ngày kết thúc *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả giá thời vụ..."
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
                {dialogMode === "create" ? "Tạo giá thời vụ" : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletePrice !== null} onOpenChange={() => setDeletePrice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa giá thời vụ &quot;{deletePrice?.name}&quot;? Hành động này không thể hoàn tác.
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
