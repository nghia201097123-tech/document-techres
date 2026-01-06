"use client";

import * as React from "react";
import { Plus, Ticket, Loader2, MoreHorizontal, Pencil, Power, Trash2, Percent, DollarSign, Copy, Check, X } from "lucide-react";
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
import { voucherService, VoucherType, type Voucher, type CreateVoucherDto, type UpdateVoucherDto } from "@/services/voucher-service";
import { BrandFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";
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
const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("vi-VN");
};

// Default column configuration
const defaultColumns: ColumnConfig[] = [
  { key: "code", label: "Mã voucher", visible: true, locked: true },
  { key: "name", label: "Tên voucher", visible: true },
  { key: "discount", label: "Giảm giá", visible: true },
  { key: "minOrder", label: "Đơn tối thiểu", visible: true },
  { key: "usage", label: "Đã dùng", visible: true },
  { key: "period", label: "Thời hạn", visible: true },
  { key: "isActive", label: "Trạng thái", visible: true },
];

type DialogMode = "create" | "edit" | null;

export default function VouchersPage() {
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
    storageKey: "vouchers-table-columns",
    defaultColumns,
  });

  const [vouchers, setVouchers] = React.useState<Voucher[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [selectedVoucher, setSelectedVoucher] = React.useState<Voucher | null>(null);
  const [deleteVoucher, setDeleteVoucher] = React.useState<Voucher | null>(null);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [formData, setFormData] = React.useState<CreateVoucherDto>({
    code: "",
    name: "",
    description: "",
    voucherType: VoucherType.PERCENTAGE,
    discountValue: 0,
    maxDiscount: undefined,
    minOrderAmount: 0,
    usageLimit: undefined,
    startDate: "",
    endDate: "",
    sortOrder: 0,
  });

  // Track newly created and updated IDs for badges
  const [newVoucherIds, setNewVoucherIds] = React.useState<Set<string>>(new Set());
  const [updatedVoucherIds, setUpdatedVoucherIds] = React.useState<Set<string>>(new Set());

  // Load vouchers - only when brand is selected
  const loadVouchers = React.useCallback(async (brandId: string) => {
    if (!brandId) {
      setVouchers([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await voucherService.getAll(brandId);
      // Sort by createdAt descending (newest first)
      const sortedData = [...data].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setVouchers(sortedData);
    } catch (error) {
      console.error("Error loading vouchers:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách voucher", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadVouchers(filterBrandId);
  }, [filterBrandId, loadVouchers]);

  // Generate random code
  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  // Copy code to clipboard
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({ title: "Đã sao chép", description: `Mã "${code}" đã được sao chép` });
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedVoucher(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      code: "",
      name: "",
      description: "",
      voucherType: VoucherType.PERCENTAGE,
      discountValue: 0,
      maxDiscount: undefined,
      minOrderAmount: 0,
      usageLimit: undefined,
      startDate: today,
      endDate: "",
      sortOrder: 0,
    });
    setDialogMode("create");
  };

  // Open edit dialog
  const handleOpenEdit = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setFormData({
      code: voucher.code,
      name: voucher.name,
      description: voucher.description || "",
      voucherType: voucher.voucherType,
      discountValue: Number(voucher.discountValue),
      maxDiscount: voucher.maxDiscount ? Number(voucher.maxDiscount) : undefined,
      minOrderAmount: Number(voucher.minOrderAmount),
      usageLimit: voucher.usageLimit,
      startDate: voucher.startDate?.split('T')[0] || "",
      endDate: voucher.endDate?.split('T')[0] || "",
      sortOrder: voucher.sortOrder,
    });
    setDialogMode("edit");
    // Remove badges when editing
    setNewVoucherIds(prev => { const next = new Set(prev); next.delete(voucher.id); return next; });
    setUpdatedVoucherIds(prev => { const next = new Set(prev); next.delete(voucher.id); return next; });
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedVoucher(null);
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) return;

    try {
      setSaving(true);

      if (dialogMode === "create") {
        const result = await voucherService.create(formData);
        setVouchers((prev) => [result, ...prev]);
        setNewVoucherIds(prev => new Set([...prev, result.id]));
        toast({ title: "Thành công", description: "Đã tạo voucher mới" });
      } else if (dialogMode === "edit" && selectedVoucher) {
        const updateData: UpdateVoucherDto = {
          name: formData.name,
          description: formData.description,
          voucherType: formData.voucherType,
          discountValue: formData.discountValue,
          maxDiscount: formData.maxDiscount,
          minOrderAmount: formData.minOrderAmount,
          usageLimit: formData.usageLimit,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          sortOrder: formData.sortOrder,
        };
        const result = await voucherService.update(selectedVoucher.id, updateData);
        setVouchers((prev) => prev.map((v) => (v.id === selectedVoucher.id ? result : v)));
        setUpdatedVoucherIds(prev => new Set([...prev, result.id]));
        setNewVoucherIds(prev => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
        toast({ title: "Thành công", description: "Đã cập nhật voucher" });
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving voucher:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi lưu voucher",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (voucher: Voucher) => {
    try {
      const updated = await voucherService.toggleActive(voucher.id);
      setVouchers((prev) => prev.map((v) => (v.id === voucher.id ? updated : v)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} voucher "${voucher.code}"`,
      });
    } catch (error: any) {
      console.error("Error toggling voucher:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteVoucher) return;

    try {
      await voucherService.delete(deleteVoucher.id);
      setVouchers((prev) => prev.filter((v) => v.id !== deleteVoucher.id));
      toast({ title: "Thành công", description: `Đã xóa voucher "${deleteVoucher.code}"` });
    } catch (error: any) {
      console.error("Error deleting voucher:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi xóa",
        variant: "destructive",
      });
    } finally {
      setDeleteVoucher(null);
    }
  };

  // Get discount display
  const getDiscountDisplay = (voucher: Voucher) => {
    const value = Number(voucher.discountValue);
    if (voucher.voucherType === VoucherType.PERCENTAGE) {
      const maxDiscount = voucher.maxDiscount ? ` (tối đa ${formatCurrency(Number(voucher.maxDiscount))})` : "";
      return `${value}%${maxDiscount}`;
    }
    return formatCurrency(value);
  };

  // Filter vouchers by brand and status
  const filteredVouchers = React.useMemo(() => {
    let filtered = vouchers;

    // Filter by status
    if (statusFilter !== "all") {
      const isActive = statusFilter === "true";
      filtered = filtered.filter((voucher) => voucher.isActive === isActive);
    }

    return filtered;
  }, [vouchers, statusFilter]);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Voucher / Coupon</h1>
          <p className="text-muted-foreground">Thêm, sửa và quản lý các mã giảm giá</p>
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
            Thêm voucher
          </Button>
        </div>
      </div>

      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách voucher</CardTitle>
              <CardDescription>Tổng cộng {filteredVouchers.length} voucher</CardDescription>
            </div>
            {filterBrandId && vouchers.length > 0 && (
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Lọc trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="true">Hoạt động</SelectItem>
                    <SelectItem value="false">Tạm ngưng</SelectItem>
                  </SelectContent>
                </Select>
                {statusFilter !== "all" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setStatusFilter("all")}
                    className="h-9 w-9"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <ColumnConfigDialog
                  columns={columns}
                  onToggle={toggleColumn}
                  onReset={resetToDefault}
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {!filterBrandId ? (
            <FilterRequiredPlaceholder
              title="Vui lòng chọn thương hiệu"
              description="Chọn một thương hiệu từ bộ lọc phía trên để xem danh sách voucher"
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Ticket className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có voucher nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm voucher&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto min-h-0">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  {isColumnVisible("code") && <TableHead>Mã voucher</TableHead>}
                  {isColumnVisible("name") && <TableHead>Tên voucher</TableHead>}
                  {isColumnVisible("discount") && <TableHead>Giảm giá</TableHead>}
                  {isColumnVisible("minOrder") && <TableHead>Đơn tối thiểu</TableHead>}
                  {isColumnVisible("usage") && <TableHead>Đã dùng</TableHead>}
                  {isColumnVisible("period") && <TableHead>Thời hạn</TableHead>}
                  {isColumnVisible("isActive") && <TableHead>Trạng thái</TableHead>}
                  <TableHead className="w-[80px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    {isColumnVisible("code") && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-emerald-100 text-emerald-800">
                            <Ticket className="h-3.5 w-3.5" />
                          </div>
                          <code className="font-mono font-bold text-emerald-700">{voucher.code}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyCode(voucher.code)}
                          >
                            {copiedCode === voucher.code ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </Button>
                          {newVoucherIds.has(voucher.id) && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Mới</Badge>
                          )}
                          {updatedVoucherIds.has(voucher.id) && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">Cập nhật</Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible("name") && (
                      <TableCell className="font-medium">{voucher.name}</TableCell>
                    )}
                    {isColumnVisible("discount") && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {voucher.voucherType === VoucherType.PERCENTAGE ? (
                            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="text-green-600 font-medium">
                            {getDiscountDisplay(voucher)}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible("minOrder") && (
                      <TableCell className="text-muted-foreground">
                        {Number(voucher.minOrderAmount) > 0 ? formatCurrency(Number(voucher.minOrderAmount)) : "Không giới hạn"}
                      </TableCell>
                    )}
                    {isColumnVisible("usage") && (
                      <TableCell>
                        <span className="text-muted-foreground">
                          {voucher.usageCount}{voucher.usageLimit ? `/${voucher.usageLimit}` : ""}
                        </span>
                      </TableCell>
                    )}
                    {isColumnVisible("period") && (
                      <TableCell className="text-muted-foreground text-sm">
                        {voucher.startDate || voucher.endDate ? (
                          <>
                            {formatDate(voucher.startDate)} - {formatDate(voucher.endDate)}
                          </>
                        ) : (
                          "Không giới hạn"
                        )}
                      </TableCell>
                    )}
                    {isColumnVisible("isActive") && (
                      <TableCell>
                        <Badge variant={voucher.isActive ? "default" : "secondary"}>
                          {voucher.isActive ? "Hoạt động" : "Tạm ngưng"}
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
                          <DropdownMenuItem onClick={() => handleOpenEdit(voucher)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(voucher)}>
                            <Power className="mr-2 h-4 w-4" />
                            {voucher.isActive ? "Tạm ngưng" : "Kích hoạt"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteVoucher(voucher)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Thêm voucher mới" : "Chỉnh sửa voucher"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Tạo mã giảm giá mới cho khách hàng."
                : "Cập nhật thông tin voucher."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid gap-2">
                <Label htmlFor="code">Mã voucher *</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    placeholder="SALE20, NEWYEAR2025..."
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="font-mono"
                    disabled={dialogMode === "edit"}
                    required
                  />
                  {dialogMode === "create" && (
                    <Button type="button" variant="outline" onClick={generateCode}>
                      Tự động
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Chỉ sử dụng chữ in hoa, số, dấu gạch ngang và gạch dưới
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Tên voucher *</Label>
                <Input
                  id="name"
                  placeholder="Giảm 20% đơn hàng, Khuyến mãi Tết..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="voucherType">Loại giảm giá *</Label>
                  <Select
                    value={formData.voucherType}
                    onValueChange={(value: VoucherType) => setFormData({ ...formData, voucherType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={VoucherType.PERCENTAGE}>Phần trăm (%)</SelectItem>
                      <SelectItem value={VoucherType.FIXED}>Số tiền cố định (VNĐ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="discountValue">
                    Giá trị {formData.voucherType === VoucherType.PERCENTAGE ? "(%)" : "(VNĐ)"} *
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    min="0"
                    max={formData.voucherType === VoucherType.PERCENTAGE ? "100" : undefined}
                    step={formData.voucherType === VoucherType.PERCENTAGE ? "1" : "1000"}
                    placeholder={formData.voucherType === VoucherType.PERCENTAGE ? "20" : "50000"}
                    value={formData.discountValue || ""}
                    onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>
              {formData.voucherType === VoucherType.PERCENTAGE && (
                <div className="grid gap-2">
                  <Label htmlFor="maxDiscount">Giảm tối đa (VNĐ)</Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="100000"
                    value={formData.maxDiscount || ""}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: parseFloat(e.target.value) || undefined })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Để trống nếu không giới hạn số tiền giảm
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="minOrderAmount">Đơn tối thiểu (VNĐ)</Label>
                  <Input
                    id="minOrderAmount"
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="200000"
                    value={formData.minOrderAmount || ""}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="usageLimit">Số lượt sử dụng</Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    min="1"
                    placeholder="100"
                    value={formData.usageLimit || ""}
                    onChange={(e) => setFormData({ ...formData, usageLimit: parseInt(e.target.value) || undefined })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Ngày bắt đầu</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate || ""}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">Ngày kết thúc</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate || ""}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả voucher..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving || !formData.code.trim() || !formData.name.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dialogMode === "create" ? "Tạo voucher" : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteVoucher !== null} onOpenChange={() => setDeleteVoucher(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa voucher &quot;{deleteVoucher?.code}&quot;? Hành động này không thể hoàn tác.
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
