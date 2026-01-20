"use client";

import * as React from "react";
import { Loader2, Banknote, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import {
  transactionVoucherService,
  transactionCategoryService,
  TransactionType,
  PaymentType,
  type TransactionVoucher,
  type TransactionCategory,
  type CreateTransactionVoucherDto,
} from "@/services/transaction-service";

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

interface VoucherFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  voucherId?: string;
  defaultTransactionType?: TransactionType;
  onClose: () => void;
  onSuccess: () => void;
}

const VoucherFormDialog = React.memo(function VoucherFormDialog({
  open,
  mode,
  voucherId,
  defaultTransactionType,
  onClose,
  onSuccess,
}: VoucherFormDialogProps) {
  const { toast } = useToast();

  // All form state managed locally
  const [formData, setFormData] = React.useState<CreateTransactionVoucherDto>(initialFormData);
  const [saving, setSaving] = React.useState(false);
  const [loadingVoucher, setLoadingVoucher] = React.useState(false);
  const [categories, setCategories] = React.useState<TransactionCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = React.useState(false);

  // Load categories on open
  React.useEffect(() => {
    if (!open) return;

    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const data = await transactionCategoryService.getDropdown();
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [open]);

  // Load voucher data for edit mode or reset for create mode
  React.useEffect(() => {
    if (!open) return;

    if (mode === "edit" && voucherId) {
      loadVoucherData();
    } else if (mode === "create") {
      setFormData({
        ...initialFormData,
        transactionType: defaultTransactionType || TransactionType.EXPENSE,
      });
    }
  }, [open, mode, voucherId, defaultTransactionType]);

  const loadVoucherData = async () => {
    if (!voucherId) return;
    setLoadingVoucher(true);
    try {
      const voucher = await transactionVoucherService.getById(voucherId);
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
    } catch (error) {
      console.error("Error loading voucher:", error);
      toast({ title: "Lỗi", description: "Không thể tải thông tin phiếu", variant: "destructive" });
    } finally {
      setLoadingVoucher(false);
    }
  };

  // Filter categories based on transaction type
  const filteredCategories = React.useMemo(() => {
    return categories.filter((cat) => cat.type === formData.transactionType);
  }, [categories, formData.transactionType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || formData.amount <= 0) {
      toast({ title: "Lỗi", description: "Vui lòng nhập số tiền", variant: "destructive" });
      return;
    }

    if (!formData.reason.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập lý do", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      if (mode === "create") {
        await transactionVoucherService.create(formData);
        toast({ title: "Thành công", description: "Đã tạo phiếu mới" });
      } else if (mode === "edit" && voucherId) {
        await transactionVoucherService.update(voucherId, formData);
        toast({ title: "Thành công", description: "Đã cập nhật phiếu" });
      }

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Error saving voucher:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể lưu phiếu",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    onClose();
  };

  if (loadingVoucher) {
    return (
      <Dialog open={open} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? formData.transactionType === TransactionType.INCOME
                ? "Tạo phiếu thu"
                : "Tạo phiếu chi"
              : "Chỉnh sửa phiếu"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
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
                    <SelectValue placeholder={loadingCategories ? "Đang tải..." : "Chọn danh mục"} />
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
                  value={formData.amount || ""}
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
                value={formData.counterpartyName || ""}
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
                    ? "VD: Thu tiền bán hàng ngày..."
                    : "VD: Chi mua nguyên vật liệu"
                }
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Ghi chú</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Ghi chú bổ sung..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={saving || !formData.amount || !formData.reason.trim()}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Tạo phiếu" : "Cập nhật"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default VoucherFormDialog;
