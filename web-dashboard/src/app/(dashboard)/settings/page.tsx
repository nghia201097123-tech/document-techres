"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useAuthStore } from "@/stores/auth-store";
import { BrandFilter, useGlobalFilters } from "@/components/ui/brand-filter";
import {
  Building2,
  CreditCard,
  FileText,
  Landmark,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  QrCode,
  Power,
  Star,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  settingsService,
  PaymentMethod,
  BankAccount,
  EInvoiceConfig,
  PaymentMethodType,
  EInvoiceProvider,
  VIETNAM_BANKS,
  EINVOICE_PROVIDER_LABELS,
  PAYMENT_METHOD_TYPE_LABELS,
  CreatePaymentMethodDto,
  CreateBankAccountDto,
  CreateEInvoiceConfigDto,
} from "@/services/settings-service";

type DialogMode = "create" | "edit" | null;

export default function SettingsPage() {
  const { toast } = useToast();
  const { company } = useAuthStore();
  const { brandId: filterBrandId, setBrandId: setFilterBrandId } = useGlobalFilters();

  // Payment Methods state
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethod[]>([]);
  const [loadingPayments, setLoadingPayments] = React.useState(false);
  const [paymentDialog, setPaymentDialog] = React.useState<DialogMode>(null);
  const [editingPayment, setEditingPayment] = React.useState<PaymentMethod | null>(null);
  const [savingPayment, setSavingPayment] = React.useState(false);

  // Bank Accounts state
  const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([]);
  const [loadingBanks, setLoadingBanks] = React.useState(false);
  const [bankDialog, setBankDialog] = React.useState<DialogMode>(null);
  const [editingBank, setEditingBank] = React.useState<BankAccount | null>(null);
  const [savingBank, setSavingBank] = React.useState(false);
  const [qrDialog, setQrDialog] = React.useState<BankAccount | null>(null);
  const [qrAmount, setQrAmount] = React.useState("");
  const [qrDescription, setQrDescription] = React.useState("");
  const [qrUrl, setQrUrl] = React.useState("");
  const [loadingQr, setLoadingQr] = React.useState(false);

  // E-Invoice state
  const [einvoiceConfigs, setEinvoiceConfigs] = React.useState<EInvoiceConfig[]>([]);
  const [loadingInvoice, setLoadingInvoice] = React.useState(false);
  const [invoiceDialog, setInvoiceDialog] = React.useState<DialogMode>(null);
  const [editingInvoice, setEditingInvoice] = React.useState<EInvoiceConfig | null>(null);
  const [savingInvoice, setSavingInvoice] = React.useState(false);

  // Form states
  const [paymentForm, setPaymentForm] = React.useState<CreatePaymentMethodDto>({
    name: "",
    type: PaymentMethodType.CASH,
  });

  const [bankForm, setBankForm] = React.useState<CreateBankAccountDto>({
    bankCode: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  const [invoiceForm, setInvoiceForm] = React.useState<CreateEInvoiceConfigDto>({
    provider: EInvoiceProvider.FPT,
    taxCode: "",
    companyName: "",
  });

  // Load data when brand changes
  React.useEffect(() => {
    if (filterBrandId) {
      loadPaymentMethods();
      loadBankAccounts();
      loadEInvoiceConfigs();
    }
  }, [filterBrandId]);

  const loadPaymentMethods = async () => {
    if (!filterBrandId) return;
    setLoadingPayments(true);
    try {
      const data = await settingsService.getAllPaymentMethods(filterBrandId);
      setPaymentMethods(data);
    } catch (error) {
      console.error("Error loading payment methods:", error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const loadBankAccounts = async () => {
    if (!filterBrandId) return;
    setLoadingBanks(true);
    try {
      const data = await settingsService.getAllBankAccounts(filterBrandId);
      setBankAccounts(data);
    } catch (error) {
      console.error("Error loading bank accounts:", error);
    } finally {
      setLoadingBanks(false);
    }
  };

  const loadEInvoiceConfigs = async () => {
    if (!filterBrandId) return;
    setLoadingInvoice(true);
    try {
      const data = await settingsService.getAllEInvoiceConfigs(filterBrandId);
      setEinvoiceConfigs(data);
    } catch (error) {
      console.error("Error loading e-invoice configs:", error);
    } finally {
      setLoadingInvoice(false);
    }
  };

  // Payment Methods handlers
  const openPaymentDialog = (mode: DialogMode, payment?: PaymentMethod) => {
    if (mode === "edit" && payment) {
      setEditingPayment(payment);
      setPaymentForm({
        name: payment.name,
        type: payment.type,
        description: payment.description,
        sortOrder: payment.sortOrder,
      });
    } else {
      setEditingPayment(null);
      setPaymentForm({ name: "", type: PaymentMethodType.CASH });
    }
    setPaymentDialog(mode);
  };

  const handleSavePayment = async () => {
    if (!filterBrandId || !paymentForm.name) return;
    setSavingPayment(true);
    try {
      if (paymentDialog === "create") {
        const newPayment = await settingsService.createPaymentMethod(filterBrandId, paymentForm);
        setPaymentMethods((prev) => [...prev, newPayment]);
        toast({ title: "Thành công", description: "Đã thêm phương thức thanh toán" });
      } else if (editingPayment) {
        const updated = await settingsService.updatePaymentMethod(editingPayment.id, paymentForm);
        setPaymentMethods((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        toast({ title: "Thành công", description: "Đã cập nhật phương thức thanh toán" });
      }
      setPaymentDialog(null);
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleTogglePayment = async (id: string) => {
    try {
      const updated = await settingsService.togglePaymentMethod(id);
      setPaymentMethods((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể cập nhật trạng thái", variant: "destructive" });
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa phương thức thanh toán này?")) return;
    try {
      await settingsService.deletePaymentMethod(id);
      setPaymentMethods((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Thành công", description: "Đã xóa phương thức thanh toán" });
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể xóa", variant: "destructive" });
    }
  };

  // Bank Account handlers
  const openBankDialog = (mode: DialogMode, bank?: BankAccount) => {
    if (mode === "edit" && bank) {
      setEditingBank(bank);
      setBankForm({
        bankCode: bank.bankCode,
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        accountName: bank.accountName,
        bankBin: bank.bankBin,
        transferTemplate: bank.transferTemplate,
        isPrimary: bank.isPrimary,
      });
    } else {
      setEditingBank(null);
      setBankForm({ bankCode: "", bankName: "", accountNumber: "", accountName: "" });
    }
    setBankDialog(mode);
  };

  const handleSaveBank = async () => {
    if (!filterBrandId || !bankForm.bankCode || !bankForm.accountNumber) return;
    setSavingBank(true);
    try {
      if (bankDialog === "create") {
        const newBank = await settingsService.createBankAccount(filterBrandId, bankForm);
        setBankAccounts((prev) => [...prev, newBank]);
        toast({ title: "Thành công", description: "Đã thêm tài khoản ngân hàng" });
      } else if (editingBank) {
        const updated = await settingsService.updateBankAccount(editingBank.id, bankForm);
        setBankAccounts((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        toast({ title: "Thành công", description: "Đã cập nhật tài khoản ngân hàng" });
      }
      setBankDialog(null);
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingBank(false);
    }
  };

  const handleToggleBank = async (id: string) => {
    try {
      const updated = await settingsService.toggleBankAccount(id);
      setBankAccounts((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể cập nhật trạng thái", variant: "destructive" });
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa tài khoản ngân hàng này?")) return;
    try {
      await settingsService.deleteBankAccount(id);
      setBankAccounts((prev) => prev.filter((b) => b.id !== id));
      toast({ title: "Thành công", description: "Đã xóa tài khoản ngân hàng" });
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể xóa", variant: "destructive" });
    }
  };

  const openQrDialog = async (bank: BankAccount) => {
    setQrDialog(bank);
    setQrAmount("");
    setQrDescription("");
    setQrUrl("");
    generateQR(bank.id);
  };

  const generateQR = async (bankId: string, amount?: number, description?: string) => {
    setLoadingQr(true);
    try {
      const result = await settingsService.generateVietQR(bankId, amount, description);
      setQrUrl(result.qrUrl);
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể tạo mã QR", variant: "destructive" });
    } finally {
      setLoadingQr(false);
    }
  };

  // E-Invoice handlers
  const openInvoiceDialog = (mode: DialogMode, config?: EInvoiceConfig) => {
    if (mode === "edit" && config) {
      setEditingInvoice(config);
      setInvoiceForm({
        provider: config.provider,
        taxCode: config.taxCode,
        companyName: config.companyName,
        companyAddress: config.companyAddress,
        invoiceTemplate: config.invoiceTemplate,
        invoiceSeries: config.invoiceSeries,
        apiUrl: config.apiUrl,
        apiUsername: config.apiUsername,
        apiPassword: config.apiPassword,
        autoIssue: config.autoIssue,
      });
    } else {
      setEditingInvoice(null);
      setInvoiceForm({ provider: EInvoiceProvider.FPT, taxCode: "", companyName: "" });
    }
    setInvoiceDialog(mode);
  };

  const handleSaveInvoice = async () => {
    if (!filterBrandId || !invoiceForm.taxCode || !invoiceForm.companyName) return;
    setSavingInvoice(true);
    try {
      if (invoiceDialog === "create") {
        const newConfig = await settingsService.createEInvoiceConfig(filterBrandId, invoiceForm);
        setEinvoiceConfigs((prev) => [...prev, newConfig]);
        toast({ title: "Thành công", description: "Đã thêm cấu hình hóa đơn điện tử" });
      } else if (editingInvoice) {
        const updated = await settingsService.updateEInvoiceConfig(editingInvoice.id, invoiceForm);
        setEinvoiceConfigs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast({ title: "Thành công", description: "Đã cập nhật cấu hình hóa đơn điện tử" });
      }
      setInvoiceDialog(null);
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleToggleInvoice = async (id: string) => {
    try {
      const updated = await settingsService.toggleEInvoiceConfig(id);
      setEinvoiceConfigs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể cập nhật trạng thái", variant: "destructive" });
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa cấu hình hóa đơn điện tử này?")) return;
    try {
      await settingsService.deleteEInvoiceConfig(id);
      setEinvoiceConfigs((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Thành công", description: "Đã xóa cấu hình hóa đơn điện tử" });
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể xóa", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Đã sao chép", description: text });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Thiết lập</h1>
          <p className="text-muted-foreground">Cấu hình thanh toán, tài khoản ngân hàng và hóa đơn điện tử</p>
        </div>
        <BrandFilter
          selectedBrandId={filterBrandId}
          onBrandChange={setFilterBrandId}
          showAllOption={false}
          className="w-[200px]"
        />
      </div>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Thông tin công ty</CardTitle>
          </div>
          <CardDescription>Thông tin chung của công ty</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Tên công ty</Label>
              <Input value={company?.name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Mã công ty</Label>
              <Input value={company?.code || ""} disabled className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input defaultValue={company?.email || ""} placeholder="contact@company.vn" />
            </div>
            <div className="space-y-2">
              <Label>Số điện thoại</Label>
              <Input defaultValue={company?.phone || ""} placeholder="028 1234 5678" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Settings Tabs */}
      <Tabs defaultValue="payment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Phương thức thanh toán
          </TabsTrigger>
          <TabsTrigger value="bank" className="gap-2">
            <Landmark className="h-4 w-4" />
            Tài khoản ngân hàng
          </TabsTrigger>
          <TabsTrigger value="invoice" className="gap-2">
            <FileText className="h-4 w-4" />
            Hóa đơn điện tử
          </TabsTrigger>
        </TabsList>

        {/* Payment Methods Tab */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Phương thức thanh toán</CardTitle>
                  <CardDescription>Quản lý các phương thức thanh toán cho chi nhánh</CardDescription>
                </div>
                <Button onClick={() => openPaymentDialog("create")} disabled={!filterBrandId}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm phương thức
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : paymentMethods.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có phương thức thanh toán nào
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {PAYMENT_METHOD_TYPE_LABELS[method.type]}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={method.isActive}
                          onCheckedChange={() => handleTogglePayment(method.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPaymentDialog("edit", method)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePayment(method.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Accounts Tab */}
        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tài khoản ngân hàng</CardTitle>
                  <CardDescription>
                    Quản lý tài khoản ngân hàng để tạo mã QR thanh toán và nhận webhook
                  </CardDescription>
                </div>
                <Button onClick={() => openBankDialog("create")} disabled={!filterBrandId}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm tài khoản
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingBanks ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : bankAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có tài khoản ngân hàng nào
                </div>
              ) : (
                <div className="space-y-3">
                  {bankAccounts.map((bank) => (
                    <div
                      key={bank.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Landmark className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{bank.bankName}</p>
                            {bank.isPrimary && (
                              <Badge variant="secondary" className="gap-1">
                                <Star className="h-3 w-3" />
                                Chính
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-mono">{bank.accountNumber}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => copyToClipboard(bank.accountNumber)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">{bank.accountName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openQrDialog(bank)}
                        >
                          <QrCode className="mr-2 h-4 w-4" />
                          Tạo QR
                        </Button>
                        <Switch
                          checked={bank.isActive}
                          onCheckedChange={() => handleToggleBank(bank.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openBankDialog("edit", bank)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteBank(bank.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* E-Invoice Tab */}
        <TabsContent value="invoice">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Hóa đơn điện tử</CardTitle>
                  <CardDescription>Liên kết với đối tác phát hành hóa đơn điện tử</CardDescription>
                </div>
                <Button onClick={() => openInvoiceDialog("create")} disabled={!filterBrandId}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm liên kết
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingInvoice ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : einvoiceConfigs.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">Chưa liên kết đối tác HĐĐT</p>
                  <p className="text-xs text-muted-foreground">
                    Hỗ trợ: FPT, VNPT, MISA, Viettel, MIFI, Invoice.vn, Hilo
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {einvoiceConfigs.map((config) => (
                    <div
                      key={config.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <FileText className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{EINVOICE_PROVIDER_LABELS[config.provider]}</p>
                            {config.autoIssue && (
                              <Badge variant="secondary">Tự động</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{config.companyName}</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            MST: {config.taxCode}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.isActive}
                          onCheckedChange={() => handleToggleInvoice(config.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openInvoiceDialog("edit", config)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteInvoice(config.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Method Dialog */}
      <Dialog open={paymentDialog !== null} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {paymentDialog === "create" ? "Thêm phương thức thanh toán" : "Sửa phương thức thanh toán"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên phương thức *</Label>
              <Input
                value={paymentForm.name}
                onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })}
                placeholder="VD: Tiền mặt, Chuyển khoản..."
              />
            </div>
            <div className="space-y-2">
              <Label>Loại *</Label>
              <Select
                value={paymentForm.type}
                onValueChange={(value: PaymentMethodType) =>
                  setPaymentForm({ ...paymentForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Input
                value={paymentForm.description || ""}
                onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                placeholder="Mô tả ngắn..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(null)}>
              Hủy
            </Button>
            <Button onClick={handleSavePayment} disabled={savingPayment || !paymentForm.name}>
              {savingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {paymentDialog === "create" ? "Thêm" : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Account Dialog */}
      <Dialog open={bankDialog !== null} onOpenChange={() => setBankDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {bankDialog === "create" ? "Thêm tài khoản ngân hàng" : "Sửa tài khoản ngân hàng"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ngân hàng *</Label>
              <Select
                value={bankForm.bankCode}
                onValueChange={(value) => {
                  const bank = VIETNAM_BANKS.find((b) => b.code === value);
                  setBankForm({
                    ...bankForm,
                    bankCode: value,
                    bankName: bank?.name || "",
                    bankBin: bank?.bin,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn ngân hàng" />
                </SelectTrigger>
                <SelectContent>
                  {VIETNAM_BANKS.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name} ({bank.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Số tài khoản *</Label>
              <Input
                value={bankForm.accountNumber}
                onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                placeholder="VD: 1234567890"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Tên chủ tài khoản *</Label>
              <Input
                value={bankForm.accountName}
                onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                placeholder="VD: NGUYEN VAN A"
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label>Mẫu nội dung chuyển khoản</Label>
              <Input
                value={bankForm.transferTemplate || ""}
                onChange={(e) => setBankForm({ ...bankForm, transferTemplate: e.target.value })}
                placeholder="VD: TT {order_code}"
              />
              <p className="text-xs text-muted-foreground">
                Sử dụng {"{order_code}"} để thay thế mã đơn hàng
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={bankForm.isPrimary || false}
                onCheckedChange={(checked) => setBankForm({ ...bankForm, isPrimary: checked })}
              />
              <Label>Đặt làm tài khoản chính</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBankDialog(null)}>
              Hủy
            </Button>
            <Button
              onClick={handleSaveBank}
              disabled={savingBank || !bankForm.bankCode || !bankForm.accountNumber}
            >
              {savingBank && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bankDialog === "create" ? "Thêm" : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialog !== null} onOpenChange={() => setQrDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mã QR Thanh toán</DialogTitle>
            <DialogDescription>
              {qrDialog?.bankName} - {qrDialog?.accountNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Số tiền</Label>
                <Input
                  type="number"
                  value={qrAmount}
                  onChange={(e) => setQrAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Nội dung</Label>
                <Input
                  value={qrDescription}
                  onChange={(e) => setQrDescription(e.target.value)}
                  placeholder="Nội dung CK"
                />
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                generateQR(
                  qrDialog!.id,
                  qrAmount ? Number(qrAmount) : undefined,
                  qrDescription || undefined
                )
              }
              disabled={loadingQr}
            >
              {loadingQr ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="mr-2 h-4 w-4" />
              )}
              Tạo mã QR
            </Button>
            {qrUrl && (
              <div className="flex flex-col items-center gap-4">
                <img src={qrUrl} alt="VietQR" className="w-64 h-64 border rounded-lg" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(qrUrl)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Sao chép URL
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={qrUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Mở trong tab mới
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* E-Invoice Config Dialog */}
      <Dialog open={invoiceDialog !== null} onOpenChange={() => setInvoiceDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {invoiceDialog === "create"
                ? "Thêm liên kết hóa đơn điện tử"
                : "Sửa cấu hình hóa đơn điện tử"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Đối tác HĐĐT *</Label>
              <Select
                value={invoiceForm.provider}
                onValueChange={(value: EInvoiceProvider) =>
                  setInvoiceForm({ ...invoiceForm, provider: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EINVOICE_PROVIDER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mã số thuế *</Label>
              <Input
                value={invoiceForm.taxCode}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, taxCode: e.target.value })}
                placeholder="VD: 0123456789"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Tên công ty *</Label>
              <Input
                value={invoiceForm.companyName}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, companyName: e.target.value })}
                placeholder="Tên đầy đủ theo đăng ký thuế"
              />
            </div>
            <div className="space-y-2">
              <Label>Địa chỉ công ty</Label>
              <Input
                value={invoiceForm.companyAddress || ""}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, companyAddress: e.target.value })}
                placeholder="Địa chỉ theo đăng ký thuế"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mẫu hóa đơn</Label>
                <Input
                  value={invoiceForm.invoiceTemplate || ""}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, invoiceTemplate: e.target.value })
                  }
                  placeholder="VD: 01GTKT0/001"
                />
              </div>
              <div className="space-y-2">
                <Label>Ký hiệu</Label>
                <Input
                  value={invoiceForm.invoiceSeries || ""}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceSeries: e.target.value })}
                  placeholder="VD: AA/24E"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>API URL</Label>
              <Input
                value={invoiceForm.apiUrl || ""}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, apiUrl: e.target.value })}
                placeholder="https://api.einvoice.vn"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={invoiceForm.apiUsername || ""}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, apiUsername: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={invoiceForm.apiPassword || ""}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, apiPassword: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={invoiceForm.autoIssue || false}
                onCheckedChange={(checked) => setInvoiceForm({ ...invoiceForm, autoIssue: checked })}
              />
              <Label>Tự động phát hành hóa đơn khi thanh toán</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialog(null)}>
              Hủy
            </Button>
            <Button
              onClick={handleSaveInvoice}
              disabled={savingInvoice || !invoiceForm.taxCode || !invoiceForm.companyName}
            >
              {savingInvoice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {invoiceDialog === "create" ? "Thêm" : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
