"use client";

import * as React from "react";
import {
  Landmark,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  QrCode,
  Star,
  Copy,
  Check,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { formatDateTime } from "@/lib/utils";

// Danh sách ngân hàng Việt Nam phổ biến với bank code
const vietnamBanks = [
  { code: "VCB", name: "Vietcombank - Ngân hàng TMCP Ngoại Thương Việt Nam", bin: "970436" },
  { code: "VTB", name: "VietinBank - Ngân hàng TMCP Công Thương Việt Nam", bin: "970415" },
  { code: "BIDV", name: "BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", bin: "970418" },
  { code: "AGR", name: "Agribank - Ngân hàng Nông nghiệp và PTNT Việt Nam", bin: "970405" },
  { code: "TCB", name: "Techcombank - Ngân hàng TMCP Kỹ Thương Việt Nam", bin: "970407" },
  { code: "MBB", name: "MB Bank - Ngân hàng TMCP Quân Đội", bin: "970422" },
  { code: "ACB", name: "ACB - Ngân hàng TMCP Á Châu", bin: "970416" },
  { code: "VPB", name: "VPBank - Ngân hàng TMCP Việt Nam Thịnh Vượng", bin: "970432" },
  { code: "TPB", name: "TPBank - Ngân hàng TMCP Tiên Phong", bin: "970423" },
  { code: "STB", name: "Sacombank - Ngân hàng TMCP Sài Gòn Thương Tín", bin: "970403" },
  { code: "SHB", name: "SHB - Ngân hàng TMCP Sài Gòn - Hà Nội", bin: "970443" },
  { code: "HDB", name: "HDBank - Ngân hàng TMCP Phát triển TP.HCM", bin: "970437" },
  { code: "MSB", name: "MSB - Ngân hàng TMCP Hàng Hải Việt Nam", bin: "970426" },
  { code: "OCB", name: "OCB - Ngân hàng TMCP Phương Đông", bin: "970448" },
  { code: "LPB", name: "LienVietPostBank - Ngân hàng TMCP Bưu điện Liên Việt", bin: "970449" },
  { code: "EIB", name: "Eximbank - Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam", bin: "970431" },
  { code: "NAB", name: "Nam A Bank - Ngân hàng TMCP Nam Á", bin: "970428" },
  { code: "VIB", name: "VIB - Ngân hàng TMCP Quốc Tế Việt Nam", bin: "970441" },
  { code: "VAB", name: "VietABank - Ngân hàng TMCP Việt Á", bin: "970427" },
  { code: "SCB", name: "SCB - Ngân hàng TMCP Sài Gòn", bin: "970429" },
];

interface BankAccount {
  id: string;
  bankCode: string;
  bankName: string;
  bankBin: string;
  accountNumber: string;
  accountName: string;
  branchId?: string;
  transferTemplate?: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // PayOS integration
  paymentPartner?: string;
  payosClientId?: string;
  payosApiKey?: string;
  payosChecksumKey?: string;
}

// Mock data
const mockBankAccounts: BankAccount[] = [
  {
    id: "1",
    bankCode: "VCB",
    bankName: "Vietcombank - Ngân hàng TMCP Ngoại Thương Việt Nam",
    bankBin: "970436",
    accountNumber: "19039164318014",
    accountName: "CONG TY TNHH TECHRES",
    isPrimary: true,
    isActive: true,
    transferTemplate: "TT {order_code}",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    bankCode: "TCB",
    bankName: "Techcombank - Ngân hàng TMCP Kỹ Thương Việt Nam",
    bankBin: "970407",
    accountNumber: "19039988776655",
    accountName: "CONG TY TNHH TECHRES",
    isPrimary: false,
    isActive: true,
    transferTemplate: "TT {order_code}",
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-05T00:00:00Z",
  },
];

interface BankAccountFormData {
  bankCode: string;
  bankName: string;
  bankBin: string;
  accountNumber: string;
  accountName: string;
  transferTemplate: string;
  isPrimary: boolean;
  // PayOS integration
  paymentPartner: string;
  payosClientId: string;
  payosApiKey: string;
  payosChecksumKey: string;
}

const initialFormData: BankAccountFormData = {
  bankCode: "",
  bankName: "",
  bankBin: "",
  accountNumber: "",
  accountName: "",
  transferTemplate: "TT {order_code}",
  isPrimary: false,
  // PayOS integration
  paymentPartner: "",
  payosClientId: "",
  payosApiKey: "",
  payosChecksumKey: "",
};

export default function BankAccountsPage() {
  const [accounts, setAccounts] = React.useState<BankAccount[]>(mockBankAccounts);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = React.useState(false);
  const [selectedAccount, setSelectedAccount] = React.useState<BankAccount | null>(null);
  const [formData, setFormData] = React.useState<BankAccountFormData>(initialFormData);
  const [isViewMode, setIsViewMode] = React.useState(false);
  const [qrAmount, setQrAmount] = React.useState<string>("");
  const [qrDescription, setQrDescription] = React.useState<string>("");
  const [copied, setCopied] = React.useState(false);

  const filteredAccounts = accounts.filter((account) => {
    return (
      account.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.accountNumber.includes(searchQuery) ||
      account.accountName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleOpenCreate = () => {
    setSelectedAccount(null);
    setFormData(initialFormData);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (account: BankAccount) => {
    setSelectedAccount(account);
    setFormData({
      bankCode: account.bankCode,
      bankName: account.bankName,
      bankBin: account.bankBin,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      transferTemplate: account.transferTemplate || "",
      isPrimary: account.isPrimary,
      paymentPartner: account.paymentPartner || "",
      payosClientId: account.payosClientId || "",
      payosApiKey: account.payosApiKey || "",
      payosChecksumKey: account.payosChecksumKey || "",
    });
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenView = (account: BankAccount) => {
    setSelectedAccount(account);
    setFormData({
      bankCode: account.bankCode,
      bankName: account.bankName,
      bankBin: account.bankBin,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      transferTemplate: account.transferTemplate || "",
      isPrimary: account.isPrimary,
      paymentPartner: account.paymentPartner || "",
      payosClientId: account.payosClientId || "",
      payosApiKey: account.payosApiKey || "",
      payosChecksumKey: account.payosChecksumKey || "",
    });
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (account: BankAccount) => {
    setSelectedAccount(account);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenQR = (account: BankAccount) => {
    setSelectedAccount(account);
    setQrAmount("");
    setQrDescription("");
    setIsQRDialogOpen(true);
  };

  const handleBankChange = (bankCode: string) => {
    const bank = vietnamBanks.find((b) => b.code === bankCode);
    if (bank) {
      setFormData((prev) => ({
        ...prev,
        bankCode: bank.code,
        bankName: bank.name,
        bankBin: bank.bin,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // If setting as primary, unset other primary accounts
    let updatedAccounts = [...accounts];
    if (formData.isPrimary) {
      updatedAccounts = updatedAccounts.map((a) => ({ ...a, isPrimary: false }));
    }

    // Clean up PayOS fields if not using PayOS
    const submitData = {
      ...formData,
      paymentPartner: formData.paymentPartner === "none" ? "" : formData.paymentPartner,
      payosClientId: formData.paymentPartner === "payos" ? formData.payosClientId : "",
      payosApiKey: formData.paymentPartner === "payos" ? formData.payosApiKey : "",
      payosChecksumKey: formData.paymentPartner === "payos" ? formData.payosChecksumKey : "",
    };

    if (selectedAccount) {
      setAccounts(
        updatedAccounts.map((a) =>
          a.id === selectedAccount.id
            ? { ...a, ...submitData, updatedAt: new Date().toISOString() }
            : a
        )
      );
    } else {
      const newAccount: BankAccount = {
        id: String(Date.now()),
        ...submitData,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAccounts([newAccount, ...updatedAccounts]);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (selectedAccount) {
      setAccounts((prev) => prev.filter((a) => a.id !== selectedAccount.id));
      setIsDeleteDialogOpen(false);
      setSelectedAccount(null);
    }
  };

  const handleToggleStatus = (account: BankAccount) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === account.id ? { ...a, isActive: !a.isActive } : a))
    );
  };

  const handleSetPrimary = (account: BankAccount) => {
    setAccounts((prev) =>
      prev.map((a) => ({
        ...a,
        isPrimary: a.id === account.id,
      }))
    );
  };

  const generateQRUrl = (account: BankAccount, amount?: string, description?: string) => {
    // Format: https://qr.sepay.vn/img?bank=BANK_CODE&acc=ACCOUNT_NUMBER&template=qronly&amount=AMOUNT&des=DESCRIPTION
    let url = `https://qr.sepay.vn/img?bank=${account.bankCode}&acc=${account.accountNumber}&template=compact`;
    if (amount) {
      url += `&amount=${amount.replace(/\./g, "").replace(/,/g, "")}`;
    }
    if (description) {
      url += `&des=${encodeURIComponent(description)}`;
    }
    return url;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tài khoản ngân hàng</h2>
          <p className="text-muted-foreground">
            Thiết lập tài khoản ngân hàng, tạo mã QR VietQR hoặc tích hợp PayOS để tự động xác nhận thanh toán
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm tài khoản
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng tài khoản
            </CardTitle>
            <Landmark className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Đang hoạt động
            </CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {accounts.filter((a) => a.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              PayOS tự động
            </CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {accounts.filter((a) => a.paymentPartner === "payos").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tài khoản chính
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {accounts.find((a) => a.isPrimary)?.bankCode || "Chưa thiết lập"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              Danh sách tài khoản ({filteredAccounts.length})
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm tài khoản..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngân hàng</TableHead>
                <TableHead>Số tài khoản</TableHead>
                <TableHead>Chủ tài khoản</TableHead>
                <TableHead>Thanh toán</TableHead>
                <TableHead>Mặc định</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <Landmark className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">{account.bankCode}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {account.bankName.split(" - ")[0]}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{account.accountNumber}</TableCell>
                  <TableCell>{account.accountName}</TableCell>
                  <TableCell>
                    {account.paymentPartner === "payos" ? (
                      <Badge variant="default" className="bg-blue-500">
                        PayOS
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        VietQR
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {account.isPrimary ? (
                      <Badge variant="default" className="bg-yellow-500">
                        <Star className="mr-1 h-3 w-3" />
                        Chính
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPrimary(account)}
                        className="text-muted-foreground"
                      >
                        Đặt làm chính
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={account.isActive ? "success" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(account)}
                    >
                      {account.isActive ? "Hoạt động" : "Tạm dừng"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(account.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenQR(account)}>
                          <QrCode className="mr-2 h-4 w-4" />
                          Tạo mã QR
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenView(account)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEdit(account)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDelete(account)}
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
              {filteredAccounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Không tìm thấy tài khoản ngân hàng nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isViewMode
                ? "Chi tiết tài khoản"
                : selectedAccount
                ? "Chỉnh sửa tài khoản"
                : "Thêm tài khoản ngân hàng"}
            </DialogTitle>
            <DialogDescription>
              {isViewMode
                ? "Thông tin chi tiết tài khoản ngân hàng"
                : selectedAccount
                ? "Cập nhật thông tin tài khoản"
                : "Nhập thông tin tài khoản ngân hàng để nhận thanh toán"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bankCode">Ngân hàng *</Label>
                <Select
                  value={formData.bankCode}
                  onValueChange={handleBankChange}
                  disabled={isViewMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn ngân hàng" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {vietnamBanks.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{bank.code}</span>
                          <span className="text-muted-foreground">-</span>
                          <span className="text-sm truncate max-w-[280px]">
                            {bank.name.split(" - ")[0]}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Số tài khoản *</Label>
                <Input
                  id="accountNumber"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  required
                  disabled={isViewMode}
                  placeholder="VD: 19039164318014"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountName">Tên chủ tài khoản *</Label>
                <Input
                  id="accountName"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleChange}
                  required
                  disabled={isViewMode}
                  placeholder="VD: CONG TY TNHH ABC"
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  Nhập đúng tên trên tài khoản ngân hàng (không dấu)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transferTemplate">Mẫu nội dung chuyển khoản</Label>
                <Input
                  id="transferTemplate"
                  name="transferTemplate"
                  value={formData.transferTemplate}
                  onChange={handleChange}
                  disabled={isViewMode}
                  placeholder="VD: TT {order_code}"
                />
                <p className="text-xs text-muted-foreground">
                  Sử dụng {"{order_code}"} để tự động điền mã đơn hàng
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPrimary"
                  checked={formData.isPrimary}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isPrimary: checked }))
                  }
                  disabled={isViewMode}
                />
                <Label htmlFor="isPrimary">Đặt làm tài khoản mặc định</Label>
              </div>

              {/* PayOS Configuration Section */}
              <div className="border-t pt-4 mt-4">
                <div className="space-y-2 mb-4">
                  <Label htmlFor="paymentPartner">Đối tác thanh toán tự động</Label>
                  <Select
                    value={formData.paymentPartner}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, paymentPartner: value }))
                    }
                    disabled={isViewMode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn đối tác (không bắt buộc)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không sử dụng</SelectItem>
                      <SelectItem value="payos">PayOS - Thanh toán tự động xác nhận</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    PayOS giúp tự động xác nhận thanh toán khi khách chuyển khoản
                  </p>
                </div>

                {formData.paymentPartner === "payos" && (
                  <div className="space-y-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Cấu hình PayOS</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Đăng ký tài khoản PayOS tại{" "}
                      <a
                        href="https://payos.vn"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        payos.vn
                      </a>{" "}
                      để lấy thông tin API
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="payosClientId">Client ID *</Label>
                      <Input
                        id="payosClientId"
                        name="payosClientId"
                        value={formData.payosClientId}
                        onChange={handleChange}
                        disabled={isViewMode}
                        placeholder="VD: 12345678"
                        required={formData.paymentPartner === "payos"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payosApiKey">API Key *</Label>
                      <Input
                        id="payosApiKey"
                        name="payosApiKey"
                        type="password"
                        value={formData.payosApiKey}
                        onChange={handleChange}
                        disabled={isViewMode}
                        placeholder="Nhập API Key từ PayOS"
                        required={formData.paymentPartner === "payos"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payosChecksumKey">Checksum Key *</Label>
                      <Input
                        id="payosChecksumKey"
                        name="payosChecksumKey"
                        type="password"
                        value={formData.payosChecksumKey}
                        onChange={handleChange}
                        disabled={isViewMode}
                        placeholder="Nhập Checksum Key từ PayOS"
                        required={formData.paymentPartner === "payos"}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              {isViewMode ? (
                <Button type="button" onClick={() => setIsDialogOpen(false)}>
                  Đóng
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Hủy
                  </Button>
                  <Button type="submit">
                    {selectedAccount ? "Cập nhật" : "Thêm mới"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo mã QR VietQR</DialogTitle>
            <DialogDescription>
              Tạo mã QR để khách hàng quét thanh toán nhanh chóng
            </DialogDescription>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngân hàng:</span>
                  <span className="font-medium">{selectedAccount.bankCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tài khoản:</span>
                  <span className="font-mono">{selectedAccount.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chủ tài khoản:</span>
                  <span className="font-medium">{selectedAccount.accountName}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qrAmount">Số tiền (VND)</Label>
                <Input
                  id="qrAmount"
                  value={qrAmount}
                  onChange={(e) => setQrAmount(e.target.value)}
                  placeholder="VD: 200000"
                  type="number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qrDescription">Nội dung chuyển khoản</Label>
                <Input
                  id="qrDescription"
                  value={qrDescription}
                  onChange={(e) => setQrDescription(e.target.value)}
                  placeholder="VD: Thanh toan don hang 001"
                />
              </div>

              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={generateQRUrl(selectedAccount, qrAmount, qrDescription)}
                  alt="VietQR Code"
                  className="w-64 h-64 object-contain"
                />
              </div>

              <div className="space-y-2">
                <Label>Link QR Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={generateQRUrl(selectedAccount, qrAmount, qrDescription)}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(generateQRUrl(selectedAccount, qrAmount, qrDescription))
                    }
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQRDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa tài khoản{" "}
              <span className="font-medium">{selectedAccount?.accountNumber}</span> tại{" "}
              <span className="font-medium">{selectedAccount?.bankCode}</span>? Hành động
              này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
