"use client";

import * as React from "react";
import { Plus, Tag, Loader2, MoreHorizontal, Pencil, Power, Trash2, Percent, DollarSign, Copy, Check, ShieldCheck } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { couponService, CouponType, type Coupon, type CreateCouponDto, type UpdateCouponDto } from "@/services/coupon-service";
import { BrandBranchFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";
import { useColumnConfig, type ColumnConfig } from "@/hooks/use-column-config";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
};

// Format date
const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("vi-VN");
};

// Default column configuration
const defaultColumns: ColumnConfig[] = [
  { key: "code", label: "Mã coupon", visible: true, locked: true },
  { key: "name", label: "Tên coupon", visible: true },
  { key: "discount", label: "Giảm giá", visible: true },
  { key: "minOrder", label: "Đơn tối thiểu", visible: true },
  { key: "usage", label: "Đã dùng", visible: true },
  { key: "dailyUsage", label: "Đã dùng hôm nay", visible: false },
  { key: "approval", label: "Phê duyệt", visible: true },
  { key: "period", label: "Thời hạn", visible: true },
  { key: "isActive", label: "Trạng thái", visible: true },
];

type DialogMode = "create" | "edit" | null;

const initialFormData: CreateCouponDto = {
  code: "",
  name: "",
  description: "",
  couponType: CouponType.PERCENTAGE,
  discountValue: 0,
  maxDiscount: undefined,
  minOrderAmount: 0,
  usageLimit: undefined,
  dailyLimit: undefined,
  requiresApproval: false,
  approvalThreshold: undefined,
  startDate: "",
  endDate: "",
  sortOrder: 0,
};

export default function CouponsPage() {
  const { toast } = useToast();

  // Global filter state from Redux
  const {
    brandId: filterBrandId,
    branchId: filterBranchId,
    setBrandId: setFilterBrandId,
    setBranchId: setFilterBranchId,
  } = useGlobalFilters();

  // Column configuration
  const {
    columns,
    toggleColumn,
    resetToDefault,
    isColumnVisible,
  } = useColumnConfig({
    storageKey: "coupons-table-columns",
    defaultColumns,
  });

  const [coupons, setCoupons] = React.useState<Coupon[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [selectedCoupon, setSelectedCoupon] = React.useState<Coupon | null>(null);
  const [deleteCoupon, setDeleteCoupon] = React.useState<Coupon | null>(null);
  const [formData, setFormData] = React.useState<CreateCouponDto>(initialFormData);
  const [copied, setCopied] = React.useState<string | null>(null);

  // Track newly created and updated IDs for badges
  const [newCouponIds, setNewCouponIds] = React.useState<Set<string>>(new Set());
  const [updatedCouponIds, setUpdatedCouponIds] = React.useState<Set<string>>(new Set());

  // Load coupons
  const loadCoupons = React.useCallback(async (branchId: string) => {
    if (!branchId) {
      setCoupons([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await couponService.getAll(branchId);
      setCoupons(data);
    } catch (error) {
      console.error("Error loading coupons:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách coupon", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadCoupons(filterBranchId);
  }, [filterBranchId, loadCoupons]);

  // Clear badges after 30 seconds
  React.useEffect(() => {
    if (newCouponIds.size > 0 || updatedCouponIds.size > 0) {
      const timer = setTimeout(() => {
        setNewCouponIds(new Set());
        setUpdatedCouponIds(new Set());
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [newCouponIds, updatedCouponIds]);

  // Handle copy code
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
      toast({ title: "Đã sao chép", description: `Mã "${code}" đã được sao chép` });
    } catch {
      toast({ title: "Lỗi", description: "Không thể sao chép mã", variant: "destructive" });
    }
  };

  // Handle dialog open/close
  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setSelectedCoupon(null);
    setDialogMode("create");
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || "",
      couponType: coupon.couponType,
      discountValue: Number(coupon.discountValue),
      maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : undefined,
      minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0,
      usageLimit: coupon.usageLimit || undefined,
      dailyLimit: coupon.dailyLimit || undefined,
      requiresApproval: coupon.requiresApproval,
      approvalThreshold: coupon.approvalThreshold ? Number(coupon.approvalThreshold) : undefined,
      startDate: coupon.startDate?.split("T")[0] || "",
      endDate: coupon.endDate?.split("T")[0] || "",
      sortOrder: coupon.sortOrder,
    });
    setDialogMode("edit");
  };

  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedCoupon(null);
    setFormData(initialFormData);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập mã coupon", variant: "destructive" });
      return;
    }

    if (!formData.name.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tên coupon", variant: "destructive" });
      return;
    }

    if (formData.discountValue <= 0) {
      toast({ title: "Lỗi", description: "Giá trị giảm phải lớn hơn 0", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      const submitData: CreateCouponDto = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      };

      if (dialogMode === "create") {
        const result = await couponService.create(filterBranchId, submitData);
        setCoupons((prev) => [result, ...prev]);
        setNewCouponIds((prev) => new Set([...prev, result.id]));
        toast({ title: "Thành công", description: "Đã thêm coupon mới" });
      } else if (selectedCoupon) {
        const result = await couponService.update(selectedCoupon.id, submitData);
        setCoupons((prev) => prev.map((c) => (c.id === selectedCoupon.id ? result : c)));
        setUpdatedCouponIds((prev) => new Set([...prev, result.id]));
        setNewCouponIds((prev) => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
        toast({ title: "Thành công", description: "Đã cập nhật coupon" });
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving coupon:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const updated = await couponService.toggleActive(coupon.id);
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? updated : c)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} coupon "${coupon.name}"`,
      });
    } catch (error: any) {
      console.error("Error toggling coupon:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteCoupon) return;

    try {
      await couponService.delete(deleteCoupon.id);
      setCoupons((prev) => prev.filter((c) => c.id !== deleteCoupon.id));
      toast({ title: "Thành công", description: `Đã xóa coupon "${deleteCoupon.name}"` });
    } catch (error: any) {
      console.error("Error deleting coupon:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi xóa",
        variant: "destructive",
      });
    } finally {
      setDeleteCoupon(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupon giảm giá</h1>
          <p className="text-muted-foreground">Quản lý coupon cho thu ngân sử dụng</p>
        </div>
        <div className="flex items-center gap-2">
          <BrandBranchFilter
            selectedBrandId={filterBrandId}
            selectedBranchId={filterBranchId}
            onBrandChange={setFilterBrandId}
            onBranchChange={setFilterBranchId}
            showAllBranchOption={false}
          />
          {filterBranchId && (
            <>
              <ColumnConfigDialog
                columns={columns}
                onToggle={toggleColumn}
                onReset={resetToDefault}
              />
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm coupon
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Danh sách coupon
          </CardTitle>
          <CardDescription>
            Coupon dành cho thu ngân sử dụng để giảm giá đơn hàng
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!filterBranchId ? (
            <FilterRequiredPlaceholder
              icon={<Tag className="h-10 w-10 text-muted-foreground/50" />}
              title="Chọn chi nhánh"
              description="Vui lòng chọn chi nhánh để xem danh sách coupon"
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Tag className="h-10 w-10 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Chưa có coupon nào</p>
              <Button variant="outline" className="mt-4" onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm coupon đầu tiên
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isColumnVisible("code") && <TableHead>Mã coupon</TableHead>}
                  {isColumnVisible("name") && <TableHead>Tên</TableHead>}
                  {isColumnVisible("discount") && <TableHead>Giảm giá</TableHead>}
                  {isColumnVisible("minOrder") && <TableHead className="text-right">Đơn tối thiểu</TableHead>}
                  {isColumnVisible("usage") && <TableHead className="text-center">Đã dùng</TableHead>}
                  {isColumnVisible("dailyUsage") && <TableHead className="text-center">Hôm nay</TableHead>}
                  {isColumnVisible("approval") && <TableHead className="text-center">Phê duyệt</TableHead>}
                  {isColumnVisible("period") && <TableHead>Thời hạn</TableHead>}
                  {isColumnVisible("isActive") && <TableHead>Trạng thái</TableHead>}
                  <TableHead className="w-[80px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    {isColumnVisible("code") && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-primary">{coupon.code}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyCode(coupon.code)}
                          >
                            {copied === coupon.code ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                          {newCouponIds.has(coupon.id) && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">Mới</Badge>
                          )}
                          {updatedCouponIds.has(coupon.id) && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">Cập nhật</Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible("name") && (
                      <TableCell className="font-medium">{coupon.name}</TableCell>
                    )}
                    {isColumnVisible("discount") && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {coupon.couponType === CouponType.PERCENTAGE ? (
                            <>
                              <Percent className="h-4 w-4 text-blue-500" />
                              <span className="font-medium">{Number(coupon.discountValue)}%</span>
                              {coupon.maxDiscount && (
                                <span className="text-xs text-muted-foreground">
                                  (tối đa {formatCurrency(Number(coupon.maxDiscount))})
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-4 w-4 text-green-500" />
                              <span className="font-medium">{formatCurrency(Number(coupon.discountValue))}</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible("minOrder") && (
                      <TableCell className="text-right">
                        {coupon.minOrderAmount ? formatCurrency(Number(coupon.minOrderAmount)) : "-"}
                      </TableCell>
                    )}
                    {isColumnVisible("usage") && (
                      <TableCell className="text-center">
                        <span className="font-mono">
                          {coupon.usageCount}
                          {coupon.usageLimit && `/${coupon.usageLimit}`}
                        </span>
                      </TableCell>
                    )}
                    {isColumnVisible("dailyUsage") && (
                      <TableCell className="text-center">
                        <span className="font-mono">
                          {coupon.dailyUsageCount}
                          {coupon.dailyLimit && `/${coupon.dailyLimit}`}
                        </span>
                      </TableCell>
                    )}
                    {isColumnVisible("approval") && (
                      <TableCell className="text-center">
                        {coupon.requiresApproval ? (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Cần duyệt
                            {coupon.approvalThreshold && (
                              <span className="ml-1">({formatCurrency(Number(coupon.approvalThreshold))}+)</span>
                            )}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    {isColumnVisible("period") && (
                      <TableCell>
                        <div className="text-sm">
                          {coupon.startDate || coupon.endDate ? (
                            <>
                              {formatDate(coupon.startDate)} - {formatDate(coupon.endDate)}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Không giới hạn</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible("isActive") && (
                      <TableCell>
                        <Badge variant={coupon.isActive ? "default" : "secondary"}>
                          {coupon.isActive ? "Hoạt động" : "Tạm ngưng"}
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
                          <DropdownMenuItem onClick={() => handleOpenEdit(coupon)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(coupon)}>
                            <Power className="mr-2 h-4 w-4" />
                            {coupon.isActive ? "Tạm ngưng" : "Kích hoạt"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteCoupon(coupon)}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Thêm coupon mới" : "Chỉnh sửa coupon"}
            </DialogTitle>
            <DialogDescription>
              Coupon dùng cho thu ngân giảm giá đơn hàng
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Mã coupon *</Label>
                  <Input
                    id="code"
                    placeholder="VD: GIAM10"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="uppercase font-mono"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Tên coupon *</Label>
                  <Input
                    id="name"
                    placeholder="VD: Giảm 10% cho VIP"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Loại giảm giá</Label>
                  <Select
                    value={formData.couponType}
                    onValueChange={(v) => setFormData({ ...formData, couponType: v as CouponType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CouponType.PERCENTAGE}>Phần trăm (%)</SelectItem>
                      <SelectItem value={CouponType.FIXED}>Số tiền cố định (VNĐ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="discountValue">
                    Giá trị giảm {formData.couponType === CouponType.PERCENTAGE ? "(%)" : "(VNĐ)"} *
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    min="0"
                    step={formData.couponType === CouponType.PERCENTAGE ? "1" : "1000"}
                    value={formData.discountValue || ""}
                    onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {formData.couponType === CouponType.PERCENTAGE && (
                <div className="grid gap-2">
                  <Label htmlFor="maxDiscount">Giảm tối đa (VNĐ)</Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Không giới hạn"
                    value={formData.maxDiscount || ""}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: parseFloat(e.target.value) || undefined })}
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="minOrderAmount">Đơn tối thiểu (VNĐ)</Label>
                <Input
                  id="minOrderAmount"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={formData.minOrderAmount || ""}
                  onChange={(e) => setFormData({ ...formData, minOrderAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="usageLimit">Giới hạn tổng lượt dùng</Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    min="1"
                    placeholder="Không giới hạn"
                    value={formData.usageLimit || ""}
                    onChange={(e) => setFormData({ ...formData, usageLimit: parseInt(e.target.value) || undefined })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dailyLimit">Giới hạn lượt/ngày</Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    min="1"
                    placeholder="Không giới hạn"
                    value={formData.dailyLimit || ""}
                    onChange={(e) => setFormData({ ...formData, dailyLimit: parseInt(e.target.value) || undefined })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Ngày bắt đầu</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">Ngày kết thúc</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Yêu cầu phê duyệt</Label>
                    <p className="text-sm text-muted-foreground">
                      Thu ngân cần quản lý phê duyệt khi sử dụng coupon này
                    </p>
                  </div>
                  <Switch
                    checked={formData.requiresApproval}
                    onCheckedChange={(checked) => setFormData({ ...formData, requiresApproval: checked })}
                  />
                </div>
                {formData.requiresApproval && (
                  <div className="grid gap-2">
                    <Label htmlFor="approvalThreshold">Ngưỡng cần phê duyệt (VNĐ)</Label>
                    <Input
                      id="approvalThreshold"
                      type="number"
                      min="0"
                      step="10000"
                      placeholder="Luôn cần phê duyệt"
                      value={formData.approvalThreshold || ""}
                      onChange={(e) => setFormData({ ...formData, approvalThreshold: parseFloat(e.target.value) || undefined })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Chỉ yêu cầu phê duyệt khi giảm giá lớn hơn ngưỡng này
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Ghi chú về điều kiện sử dụng..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dialogMode === "create" ? "Thêm" : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteCoupon !== null} onOpenChange={() => setDeleteCoupon(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa coupon <strong>"{deleteCoupon?.name}"</strong>?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
