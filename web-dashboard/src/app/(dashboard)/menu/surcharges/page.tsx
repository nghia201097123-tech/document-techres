"use client";

import * as React from "react";
import { Plus, Receipt, Loader2, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
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
import { surchargeService, type Surcharge, type CreateSurchargeDto, type UpdateSurchargeDto } from "@/services/surcharge-service";
import { BrandFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";
import { useColumnConfig, type ColumnConfig } from "@/hooks/use-column-config";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";

// Format currency (no decimals for VND)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
};

// Calculate VAT breakdown (amount is total including VAT)
const calculateVatBreakdown = (amount: number, vatRate: number) => {
  if (vatRate <= 0) {
    return { priceBeforeVat: amount, vatAmount: 0 };
  }
  const priceBeforeVat = amount / (1 + vatRate / 100);
  const vatAmount = amount - priceBeforeVat;
  return { priceBeforeVat, vatAmount };
};

// Default column configuration
const defaultColumns: ColumnConfig[] = [
  { key: "name", label: "Tên phụ thu", visible: true, locked: true },
  { key: "amount", label: "Tổng tiền", visible: true },
  { key: "vatRate", label: "VAT (%)", visible: true },
  { key: "priceBeforeVat", label: "Giá trước VAT", visible: true },
  { key: "vatAmount", label: "Tiền VAT", visible: true },
  { key: "description", label: "Mô tả", visible: true },
  { key: "sortOrder", label: "Thứ tự", visible: false },
  { key: "isActive", label: "Trạng thái", visible: true },
];

type DialogMode = "create" | "edit" | null;

export default function SurchargesPage() {
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
    storageKey: "surcharges-table-columns",
    defaultColumns,
  });

  const [surcharges, setSurcharges] = React.useState<Surcharge[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [selectedSurcharge, setSelectedSurcharge] = React.useState<Surcharge | null>(null);
  const [deleteSurcharge, setDeleteSurcharge] = React.useState<Surcharge | null>(null);
  const [formData, setFormData] = React.useState<CreateSurchargeDto>({
    name: "",
    description: "",
    amount: 0,
    vatRate: 0,
    sortOrder: 0,
  });

  // Track newly created and updated surcharge IDs for badges
  const [newSurchargeIds, setNewSurchargeIds] = React.useState<Set<string>>(new Set());
  const [updatedSurchargeIds, setUpdatedSurchargeIds] = React.useState<Set<string>>(new Set());

  // Separate state for VAT input to allow decimal typing
  const [vatRateInput, setVatRateInput] = React.useState<string>("");

  // Load surcharges - only when brand is selected
  const loadSurcharges = React.useCallback(async (brandId: string) => {
    if (!brandId) {
      setSurcharges([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await surchargeService.getAll(brandId);
      // Sort by createdAt descending (newest first)
      const sortedData = [...data].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setSurcharges(sortedData);
    } catch (error) {
      console.error("Error loading surcharges:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách phụ thu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadSurcharges(filterBrandId);
  }, [filterBrandId, loadSurcharges]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedSurcharge(null);
    setFormData({ name: "", description: "", amount: 0, vatRate: 0, sortOrder: 0 });
    setVatRateInput("");
    setDialogMode("create");
  };

  // Open edit dialog
  const handleOpenEdit = (surcharge: Surcharge) => {
    setSelectedSurcharge(surcharge);
    setFormData({
      name: surcharge.name,
      description: surcharge.description || "",
      amount: surcharge.amount,
      vatRate: surcharge.vatRate,
      sortOrder: surcharge.sortOrder,
    });
    setVatRateInput(surcharge.vatRate ? String(surcharge.vatRate) : "");
    setDialogMode("edit");
    // Remove badges when editing
    setNewSurchargeIds(prev => { const next = new Set(prev); next.delete(surcharge.id); return next; });
    setUpdatedSurchargeIds(prev => { const next = new Set(prev); next.delete(surcharge.id); return next; });
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedSurcharge(null);
    setFormData({ name: "", description: "", amount: 0, vatRate: 0, sortOrder: 0 });
    setVatRateInput("");
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);

      if (dialogMode === "create") {
        const result = await surchargeService.create(formData);
        setSurcharges((prev) => [result, ...prev]);
        setNewSurchargeIds(prev => new Set([...prev, result.id]));
        toast({ title: "Thành công", description: "Đã tạo phụ thu mới" });
      } else if (dialogMode === "edit" && selectedSurcharge) {
        const updateData: UpdateSurchargeDto = {
          name: formData.name,
          description: formData.description,
          amount: formData.amount,
          vatRate: formData.vatRate,
          sortOrder: formData.sortOrder,
        };
        const result = await surchargeService.update(selectedSurcharge.id, updateData);
        setSurcharges((prev) => prev.map((s) => (s.id === selectedSurcharge.id ? result : s)));
        setUpdatedSurchargeIds(prev => new Set([...prev, result.id]));
        setNewSurchargeIds(prev => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
        toast({ title: "Thành công", description: "Đã cập nhật phụ thu" });
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving surcharge:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi lưu phụ thu",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (surcharge: Surcharge) => {
    try {
      const updated = await surchargeService.toggleActive(surcharge.id);
      setSurcharges((prev) => prev.map((s) => (s.id === surcharge.id ? updated : s)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} phụ thu "${surcharge.name}"`,
      });
    } catch (error: any) {
      console.error("Error toggling surcharge:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteSurcharge) return;

    try {
      await surchargeService.delete(deleteSurcharge.id);
      setSurcharges((prev) => prev.filter((s) => s.id !== deleteSurcharge.id));
      toast({ title: "Thành công", description: `Đã xóa phụ thu "${deleteSurcharge.name}"` });
    } catch (error: any) {
      console.error("Error deleting surcharge:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi xóa",
        variant: "destructive",
      });
    } finally {
      setDeleteSurcharge(null);
    }
  };

  // Filter surcharges by brand (already filtered by API)
  const filteredSurcharges = surcharges;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý phụ thu</h1>
          <p className="text-muted-foreground">Thêm, sửa và quản lý các loại phụ thu trong bán hàng</p>
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
            Thêm phụ thu
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách phụ thu</CardTitle>
              <CardDescription>Tổng cộng {filteredSurcharges.length} phụ thu</CardDescription>
            </div>
            {filterBrandId && filteredSurcharges.length > 0 && (
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
              description="Chọn một thương hiệu từ bộ lọc phía trên để xem danh sách phụ thu"
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSurcharges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có phụ thu nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm phụ thu&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isColumnVisible("name") && <TableHead>Tên phụ thu</TableHead>}
                  {isColumnVisible("amount") && <TableHead>Tổng tiền</TableHead>}
                  {isColumnVisible("vatRate") && <TableHead>VAT (%)</TableHead>}
                  {isColumnVisible("priceBeforeVat") && <TableHead>Giá trước VAT</TableHead>}
                  {isColumnVisible("vatAmount") && <TableHead>Tiền VAT</TableHead>}
                  {isColumnVisible("description") && <TableHead>Mô tả</TableHead>}
                  {isColumnVisible("sortOrder") && <TableHead>Thứ tự</TableHead>}
                  {isColumnVisible("isActive") && <TableHead>Trạng thái</TableHead>}
                  <TableHead className="w-[80px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSurcharges.map((surcharge) => (
                  <TableRow key={surcharge.id}>
                    {isColumnVisible("name") && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-orange-100 text-orange-800">
                            <Receipt className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-medium">{surcharge.name}</span>
                          {newSurchargeIds.has(surcharge.id) && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Mới</Badge>
                          )}
                          {updatedSurchargeIds.has(surcharge.id) && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">Cập nhật</Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible("amount") && (
                      <TableCell className="font-medium text-orange-600">
                        {formatCurrency(Number(surcharge.amount))}
                      </TableCell>
                    )}
                    {isColumnVisible("vatRate") && (
                      <TableCell>{Number(surcharge.vatRate)}%</TableCell>
                    )}
                    {isColumnVisible("priceBeforeVat") && (
                      <TableCell className="text-muted-foreground">
                        {formatCurrency(calculateVatBreakdown(Number(surcharge.amount), Number(surcharge.vatRate)).priceBeforeVat)}
                      </TableCell>
                    )}
                    {isColumnVisible("vatAmount") && (
                      <TableCell className="text-blue-600">
                        {formatCurrency(calculateVatBreakdown(Number(surcharge.amount), Number(surcharge.vatRate)).vatAmount)}
                      </TableCell>
                    )}
                    {isColumnVisible("description") && (
                      <TableCell className="max-w-[300px] truncate text-muted-foreground">
                        {surcharge.description || "-"}
                      </TableCell>
                    )}
                    {isColumnVisible("sortOrder") && (
                      <TableCell>{surcharge.sortOrder}</TableCell>
                    )}
                    {isColumnVisible("isActive") && (
                      <TableCell>
                        <Badge variant={surcharge.isActive ? "default" : "secondary"}>
                          {surcharge.isActive ? "Hoạt động" : "Tạm ngưng"}
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
                          <DropdownMenuItem onClick={() => handleOpenEdit(surcharge)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(surcharge)}>
                            <Power className="mr-2 h-4 w-4" />
                            {surcharge.isActive ? "Tạm ngưng" : "Kích hoạt"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteSurcharge(surcharge)}
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

      {/* Create/Edit Surcharge Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Thêm phụ thu mới" : "Chỉnh sửa phụ thu"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Nhập thông tin phụ thu. Ví dụ: Khách mang đồ ăn vào, Phí phục vụ..."
                : "Cập nhật thông tin phụ thu."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên phụ thu *</Label>
                <Input
                  id="name"
                  placeholder="Khách mang đồ ăn vào, Phí phục vụ..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Tổng tiền (VNĐ) *</Label>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="numeric"
                    placeholder="200000"
                    value={formData.amount || ""}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, "");
                      setFormData({ ...formData, amount: parseInt(value) || 0 });
                    }}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vatRate">VAT (%)</Label>
                  <Input
                    id="vatRate"
                    type="text"
                    inputMode="decimal"
                    placeholder="8.5"
                    value={vatRateInput}
                    onChange={(e) => {
                      // Allow digits, dot and comma for decimal
                      let value = e.target.value.replace(",", ".");
                      // Only allow digits and one dot
                      value = value.replace(/[^\d.]/g, "");
                      // Prevent multiple dots
                      const parts = value.split(".");
                      if (parts.length > 2) {
                        value = parts[0] + "." + parts.slice(1).join("");
                      }
                      setVatRateInput(value);
                      setFormData({ ...formData, vatRate: parseFloat(value) || 0 });
                    }}
                  />
                </div>
              </div>
              {/* VAT Breakdown Preview */}
              {formData.amount > 0 && formData.vatRate > 0 && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                  <p className="text-sm font-medium text-muted-foreground">Chi tiết VAT:</p>
                  <div className="flex justify-between text-sm">
                    <span>Giá trước VAT:</span>
                    <span className="font-medium">
                      {formatCurrency(calculateVatBreakdown(formData.amount, formData.vatRate).priceBeforeVat)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tiền VAT ({vatRateInput || formData.vatRate}%):</span>
                    <span className="font-medium text-blue-600">
                      {formatCurrency(calculateVatBreakdown(formData.amount, formData.vatRate).vatAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-1.5">
                    <span className="font-medium">Tổng tiền:</span>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(formData.amount)}
                    </span>
                  </div>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả phụ thu..."
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
                {dialogMode === "create" ? "Tạo phụ thu" : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteSurcharge !== null} onOpenChange={() => setDeleteSurcharge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa phụ thu &quot;{deleteSurcharge?.name}&quot;? Hành động này không thể hoàn tác.
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
