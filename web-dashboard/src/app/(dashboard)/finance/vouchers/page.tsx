"use client";

import * as React from "react";
import {
  Plus,
  Receipt,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Search,
  Eye,
  Send,
  Check,
  X,
  Banknote,
  CreditCard,
  Calendar,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  transactionVoucherService,
  transactionCategoryService,
  TransactionType,
  PaymentType,
  VoucherStatus,
  transactionTypeLabels,
  paymentTypeLabels,
  voucherStatusLabels,
  voucherStatusColors,
  type TransactionVoucher,
  type TransactionCategory,
  type CreateTransactionVoucherDto,
} from "@/services/transaction-service";

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

type DialogMode = "create" | "edit" | "view" | null;

const initialFormData: CreateTransactionVoucherDto = {
  transactionType: TransactionType.EXPENSE,
  voucherDate: new Date().toISOString().split("T")[0],
  categoryId: "",
  amount: 0,
  paymentType: PaymentType.CASH,
  counterpartyName: "",
  reason: "",
  notes: "",
};

export default function TransactionVouchersPage() {
  const { toast } = useToast();

  // State
  const [vouchers, setVouchers] = React.useState<TransactionVoucher[]>([]);
  const [categories, setCategories] = React.useState<TransactionCategory[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [selectedVoucher, setSelectedVoucher] =
    React.useState<TransactionVoucher | null>(null);
  const [formData, setFormData] =
    React.useState<CreateTransactionVoucherDto>(initialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [cancelVoucher, setCancelVoucher] =
    React.useState<TransactionVoucher | null>(null);
  const [cancelReason, setCancelReason] = React.useState("");

  // Filters
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterType, setFilterType] = React.useState<TransactionType | "all">(
    "all"
  );
  const [filterPaymentType, setFilterPaymentType] = React.useState<
    PaymentType | "all"
  >("all");
  const [filterStatus, setFilterStatus] = React.useState<VoucherStatus | "all">(
    "all"
  );
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");

  // Summary
  const [summary, setSummary] = React.useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });

  // Pagination
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const limit = 20;

  // Fetch categories for dropdown
  const fetchCategories = React.useCallback(async () => {
    try {
      const data = await transactionCategoryService.getDropdown();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  // Fetch vouchers
  const fetchVouchers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await transactionVoucherService.getList({
        transactionType: filterType === "all" ? undefined : filterType,
        paymentType: filterPaymentType === "all" ? undefined : filterPaymentType,
        status: filterStatus === "all" ? undefined : filterStatus,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: searchTerm || undefined,
        page,
        limit,
      });
      setVouchers(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      setSummary(response.summary);
    } catch (error) {
      console.error("Error fetching vouchers:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể tải danh sách phiếu thu chi",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    filterType,
    filterPaymentType,
    filterStatus,
    fromDate,
    toDate,
    searchTerm,
    page,
    toast,
  ]);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  React.useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // Open dialogs
  const openCreateDialog = (type: TransactionType) => {
    setSelectedVoucher(null);
    setFormData({
      ...initialFormData,
      transactionType: type,
    });
    setDialogMode("create");
  };

  const openEditDialog = (voucher: TransactionVoucher) => {
    setSelectedVoucher(voucher);
    setFormData({
      transactionType: voucher.transactionType,
      voucherDate: voucher.voucherDate.split("T")[0],
      categoryId: voucher.categoryId || "",
      amount: parseFloat(voucher.amount as any),
      paymentType: voucher.paymentType,
      counterpartyName: voucher.counterpartyName || "",
      counterpartyAddress: voucher.counterpartyAddress || "",
      counterpartyTaxCode: voucher.counterpartyTaxCode || "",
      reason: voucher.reason,
      notes: voucher.notes || "",
    });
    setDialogMode("edit");
  };

  const openViewDialog = (voucher: TransactionVoucher) => {
    setSelectedVoucher(voucher);
    setDialogMode("view");
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (dialogMode === "create") {
        await transactionVoucherService.create(formData);
        toast({
          title: "Thành công",
          description: "Đã tạo phiếu mới",
        });
      } else if (selectedVoucher) {
        await transactionVoucherService.update(selectedVoucher.id, formData);
        toast({
          title: "Thành công",
          description: "Đã cập nhật phiếu",
        });
      }
      setDialogMode(null);
      fetchVouchers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể lưu phiếu",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle actions
  const handleSubmitForApproval = async (voucher: TransactionVoucher) => {
    try {
      await transactionVoucherService.submit(voucher.id);
      toast({
        title: "Thành công",
        description: "Đã gửi phiếu đi duyệt",
      });
      fetchVouchers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể gửi duyệt",
      });
    }
  };

  const handleApprove = async (voucher: TransactionVoucher) => {
    try {
      await transactionVoucherService.approve(voucher.id);
      toast({
        title: "Thành công",
        description: "Đã duyệt phiếu",
      });
      fetchVouchers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể duyệt phiếu",
      });
    }
  };

  const handleCancel = async () => {
    if (!cancelVoucher || !cancelReason) return;

    try {
      await transactionVoucherService.cancel(cancelVoucher.id, cancelReason);
      toast({
        title: "Thành công",
        description: "Đã hủy phiếu",
      });
      setCancelVoucher(null);
      setCancelReason("");
      fetchVouchers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể hủy phiếu",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await transactionVoucherService.delete(deleteId);
      toast({
        title: "Thành công",
        description: "Đã xóa phiếu",
      });
      setDeleteId(null);
      fetchVouchers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể xóa phiếu",
      });
    }
  };

  // Get filtered categories based on transaction type
  const filteredCategories = categories.filter(
    (c) => c.type === formData.transactionType
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Phiếu thu chi</h1>
          <p className="text-muted-foreground">
            Quản lý phiếu thu chi - Sổ quỹ tiền mặt & Sổ ngân hàng
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-green-500 text-green-600 hover:bg-green-50"
            onClick={() => openCreateDialog(TransactionType.INCOME)}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Phiếu thu
          </Button>
          <Button
            variant="outline"
            className="border-red-500 text-red-600 hover:bg-red-50"
            onClick={() => openCreateDialog(TransactionType.EXPENSE)}
          >
            <TrendingDown className="mr-2 h-4 w-4" />
            Phiếu chi
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số phiếu</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng thu</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalIncome)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng chi</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalExpense)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Số dư</CardTitle>
            <Banknote className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summary.balance >= 0 ? "text-blue-600" : "text-red-600"
              }`}
            >
              {formatCurrency(summary.balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo số phiếu, người nộp/nhận..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filterType}
                onValueChange={(v) =>
                  setFilterType(v as TransactionType | "all")
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value={TransactionType.INCOME}>Thu</SelectItem>
                  <SelectItem value={TransactionType.EXPENSE}>Chi</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filterPaymentType}
                onValueChange={(v) =>
                  setFilterPaymentType(v as PaymentType | "all")
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Phương thức" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value={PaymentType.CASH}>Tiền mặt</SelectItem>
                  <SelectItem value={PaymentType.BANK}>Chuyển khoản</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filterStatus}
                onValueChange={(v) =>
                  setFilterStatus(v as VoucherStatus | "all")
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value={VoucherStatus.DRAFT}>Nháp</SelectItem>
                  <SelectItem value={VoucherStatus.PENDING}>
                    Chờ duyệt
                  </SelectItem>
                  <SelectItem value={VoucherStatus.APPROVED}>
                    Đã duyệt
                  </SelectItem>
                  <SelectItem value={VoucherStatus.CANCELLED}>
                    Đã hủy
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-[150px]"
                placeholder="Từ ngày"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-[150px]"
                placeholder="Đến ngày"
              />
              {(fromDate || toDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số phiếu</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Người nộp/nhận</TableHead>
                  <TableHead>Lý do</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Phương thức</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : vouchers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Chưa có phiếu thu chi nào
                    </TableCell>
                  </TableRow>
                ) : (
                  vouchers.map((voucher) => (
                    <TableRow key={voucher.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {voucher.voucherNumber}
                      </TableCell>
                      <TableCell>{formatDate(voucher.voucherDate)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            voucher.transactionType === TransactionType.INCOME
                              ? "border-green-500 text-green-600"
                              : "border-red-500 text-red-600"
                          }
                        >
                          {voucher.transactionType === TransactionType.INCOME ? (
                            <TrendingUp className="mr-1 h-3 w-3" />
                          ) : (
                            <TrendingDown className="mr-1 h-3 w-3" />
                          )}
                          {transactionTypeLabels[voucher.transactionType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate">
                        {voucher.category?.name || "-"}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate">
                        {voucher.counterpartyName || "-"}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {voucher.reason}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          voucher.transactionType === TransactionType.INCOME
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {voucher.transactionType === TransactionType.INCOME
                          ? "+"
                          : "-"}
                        {formatCurrency(parseFloat(voucher.amount as any))}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {voucher.paymentType === PaymentType.CASH ? (
                            <Banknote className="h-4 w-4 text-green-600" />
                          ) : (
                            <CreditCard className="h-4 w-4 text-blue-600" />
                          )}
                          <span className="text-xs">
                            {paymentTypeLabels[voucher.paymentType]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={voucherStatusColors[voucher.status]}>
                          {voucherStatusLabels[voucher.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openViewDialog(voucher)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Xem chi tiết
                            </DropdownMenuItem>
                            {voucher.status === VoucherStatus.DRAFT && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => openEditDialog(voucher)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Chỉnh sửa
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleSubmitForApproval(voucher)
                                  }
                                >
                                  <Send className="mr-2 h-4 w-4" />
                                  Gửi duyệt
                                </DropdownMenuItem>
                              </>
                            )}
                            {voucher.status === VoucherStatus.PENDING && (
                              <DropdownMenuItem
                                onClick={() => handleApprove(voucher)}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Duyệt phiếu
                              </DropdownMenuItem>
                            )}
                            {voucher.status !== VoucherStatus.CANCELLED && (
                              <DropdownMenuItem
                                onClick={() => setCancelVoucher(voucher)}
                              >
                                <X className="mr-2 h-4 w-4" />
                                Hủy phiếu
                              </DropdownMenuItem>
                            )}
                            {voucher.status !== VoucherStatus.APPROVED && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleteId(voucher.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Xóa
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-4">
              <div className="text-sm text-muted-foreground">
                Hiển thị {(page - 1) * limit + 1} -{" "}
                {Math.min(page * limit, total)} / {total} phiếu
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogMode === "create" || dialogMode === "edit"}
        onOpenChange={(open) => !open && setDialogMode(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create"
                ? formData.transactionType === TransactionType.INCOME
                  ? "Tạo phiếu thu"
                  : "Tạo phiếu chi"
                : "Chỉnh sửa phiếu"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Tạo phiếu thu chi mới"
                : "Cập nhật thông tin phiếu"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="voucherDate">Ngày lập phiếu *</Label>
                  <Input
                    id="voucherDate"
                    type="date"
                    value={formData.voucherDate}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, voucherDate: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="categoryId">Danh mục</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(v) =>
                      setFormData(prev => ({ ...prev, categoryId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Số tiền (VNĐ) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        amount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    min={0}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="paymentType">Phương thức *</Label>
                  <Select
                    value={formData.paymentType}
                    onValueChange={(v) =>
                      setFormData(prev => ({ ...prev, paymentType: v as PaymentType }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PaymentType.CASH}>
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          Tiền mặt
                        </div>
                      </SelectItem>
                      <SelectItem value={PaymentType.BANK}>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Chuyển khoản
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="counterpartyName">
                  {formData.transactionType === TransactionType.INCOME
                    ? "Người nộp tiền"
                    : "Người nhận tiền"}
                </Label>
                <Input
                  id="counterpartyName"
                  value={formData.counterpartyName}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, counterpartyName: e.target.value }))
                  }
                  placeholder="Họ tên người nộp/nhận"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reason">Lý do *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder={
                    formData.transactionType === TransactionType.INCOME
                      ? "VD: Thu tiền bán hàng ngày 07/01/2026"
                      : "VD: Chi mua nguyên vật liệu"
                  }
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Ghi chú</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Ghi chú bổ sung..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogMode(null)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : dialogMode === "create" ? (
                  "Tạo phiếu"
                ) : (
                  "Cập nhật"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={dialogMode === "view"}
        onOpenChange={(open) => !open && setDialogMode(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết phiếu {selectedVoucher?.voucherNumber}</DialogTitle>
          </DialogHeader>
          {selectedVoucher && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Số phiếu</Label>
                  <p className="font-mono font-medium">
                    {selectedVoucher.voucherNumber}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Ngày lập</Label>
                  <p>{formatDate(selectedVoucher.voucherDate)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Loại phiếu</Label>
                  <Badge
                    className={
                      selectedVoucher.transactionType === TransactionType.INCOME
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {transactionTypeLabels[selectedVoucher.transactionType]}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Trạng thái</Label>
                  <Badge className={voucherStatusColors[selectedVoucher.status]}>
                    {voucherStatusLabels[selectedVoucher.status]}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Danh mục</Label>
                  <p>{selectedVoucher.category?.name || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phương thức</Label>
                  <p>{paymentTypeLabels[selectedVoucher.paymentType]}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Số tiền</Label>
                <p
                  className={`text-xl font-bold ${
                    selectedVoucher.transactionType === TransactionType.INCOME
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(parseFloat(selectedVoucher.amount as any))}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  {selectedVoucher.transactionType === TransactionType.INCOME
                    ? "Người nộp tiền"
                    : "Người nhận tiền"}
                </Label>
                <p>{selectedVoucher.counterpartyName || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Lý do</Label>
                <p>{selectedVoucher.reason}</p>
              </div>
              {selectedVoucher.notes && (
                <div>
                  <Label className="text-muted-foreground">Ghi chú</Label>
                  <p>{selectedVoucher.notes}</p>
                </div>
              )}
              {selectedVoucher.cancelledReason && (
                <div>
                  <Label className="text-muted-foreground text-red-600">
                    Lý do hủy
                  </Label>
                  <p className="text-red-600">
                    {selectedVoucher.cancelledReason}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog
        open={!!cancelVoucher}
        onOpenChange={(open) => !open && setCancelVoucher(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy phiếu</DialogTitle>
            <DialogDescription>
              Bạn đang hủy phiếu {cancelVoucher?.voucherNumber}. Vui lòng nhập lý
              do hủy.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cancelReason">Lý do hủy *</Label>
              <Textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy phiếu..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelVoucher(null)}>
              Đóng
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={!cancelReason}
            >
              Hủy phiếu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa phiếu này? Hành động này không thể hoàn
              tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
