"use client";

import * as React from "react";
import {
  Landmark,
  Pencil,
  QrCode,
  Check,
  CreditCard,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

interface BankAccountFormData {
  bankCode: string;
  bankName: string;
  bankBin: string;
  accountNumber: string;
  accountName: string;
  transferTemplate: string;
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
  // PayOS integration
  paymentPartner: "",
  payosClientId: "",
  payosApiKey: "",
  payosChecksumKey: "",
};

export default function BankAccountsPage() {
  // Chỉ lưu 1 tài khoản mặc định duy nhất
  const [defaultAccount, setDefaultAccount] = React.useState<BankAccount | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<BankAccountFormData>(initialFormData);
  const [qrAmount, setQrAmount] = React.useState<string>("100000");

  // Load default account on mount (in real app, load from API)
  React.useEffect(() => {
    // Mock: load from localStorage or API
    const saved = localStorage.getItem("defaultBankAccount");
    if (saved) {
      try {
        setDefaultAccount(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  // Save to localStorage when changed (in real app, save to API)
  React.useEffect(() => {
    if (defaultAccount) {
      localStorage.setItem("defaultBankAccount", JSON.stringify(defaultAccount));
    } else {
      localStorage.removeItem("defaultBankAccount");
    }
  }, [defaultAccount]);

  const handleOpenSetup = () => {
    if (defaultAccount) {
      // Edit existing
      setFormData({
        bankCode: defaultAccount.bankCode,
        bankName: defaultAccount.bankName,
        bankBin: defaultAccount.bankBin,
        accountNumber: defaultAccount.accountNumber,
        accountName: defaultAccount.accountName,
        transferTemplate: defaultAccount.transferTemplate || "TT {order_code}",
        paymentPartner: defaultAccount.paymentPartner || "",
        payosClientId: defaultAccount.payosClientId || "",
        payosApiKey: defaultAccount.payosApiKey || "",
        payosChecksumKey: defaultAccount.payosChecksumKey || "",
      });
    } else {
      // Create new
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
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

    // Clean up PayOS fields if not using PayOS
    const submitData = {
      ...formData,
      paymentPartner: formData.paymentPartner === "none" ? "" : formData.paymentPartner,
      payosClientId: formData.paymentPartner === "payos" ? formData.payosClientId : "",
      payosApiKey: formData.paymentPartner === "payos" ? formData.payosApiKey : "",
      payosChecksumKey: formData.paymentPartner === "payos" ? formData.payosChecksumKey : "",
    };

    const newAccount: BankAccount = {
      id: defaultAccount?.id || String(Date.now()),
      ...submitData,
      isPrimary: true, // Luôn là tài khoản chính
      isActive: true,
      createdAt: defaultAccount?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDefaultAccount(newAccount);
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    setDefaultAccount(null);
    setIsDeleteDialogOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const generateQRUrl = (account: BankAccount, amount?: string, description?: string) => {
    let url = `https://qr.sepay.vn/img?bank=${account.bankCode}&acc=${account.accountNumber}&template=compact`;
    if (amount) {
      url += `&amount=${amount.replace(/\./g, "").replace(/,/g, "")}`;
    }
    if (description) {
      url += `&des=${encodeURIComponent(description)}`;
    }
    return url;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tài khoản ngân hàng mặc định</h2>
        <p className="text-muted-foreground">
          Thiết lập tài khoản ngân hàng để in mã QR thanh toán trên bill
        </p>
      </div>

      {/* Thông báo quan trọng */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Mã QR thanh toán trên Bill</AlertTitle>
        <AlertDescription>
          Khi in bill, mã QR chuyển khoản sẽ được tự động in kèm theo với số tiền và nội dung chuyển khoản.
          Khách hàng chỉ cần quét mã QR bằng app ngân hàng để thanh toán nhanh chóng.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card hiển thị tài khoản mặc định */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-blue-500" />
              Tài khoản nhận thanh toán
            </CardTitle>
            <CardDescription>
              Tài khoản này sẽ được sử dụng để tạo mã QR trên tất cả bill
            </CardDescription>
          </CardHeader>
          <CardContent>
            {defaultAccount ? (
              <div className="space-y-4">
                {/* Thông tin tài khoản */}
                <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Ngân hàng</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{defaultAccount.bankCode}</span>
                      <Badge variant="success">Đang sử dụng</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Số tài khoản</span>
                    <span className="font-mono font-semibold">{defaultAccount.accountNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Chủ tài khoản</span>
                    <span className="font-semibold">{defaultAccount.accountName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Nội dung CK</span>
                    <span className="text-sm">{defaultAccount.transferTemplate || "TT {order_code}"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Thanh toán tự động</span>
                    {defaultAccount.paymentPartner === "payos" ? (
                      <Badge variant="default" className="bg-blue-500">
                        <CreditCard className="mr-1 h-3 w-3" />
                        PayOS
                      </Badge>
                    ) : (
                      <Badge variant="outline">VietQR thủ công</Badge>
                    )}
                  </div>
                </div>

                {/* Nút chỉnh sửa và xóa */}
                <div className="flex gap-2">
                  <Button onClick={handleOpenSetup} className="flex-1">
                    <Pencil className="mr-2 h-4 w-4" />
                    Chỉnh sửa
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Landmark className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Chưa thiết lập tài khoản</p>
                  <p className="text-sm text-muted-foreground">
                    Thiết lập tài khoản ngân hàng để in mã QR thanh toán trên bill
                  </p>
                </div>
                <Button onClick={handleOpenSetup}>
                  <Landmark className="mr-2 h-4 w-4" />
                  Thiết lập ngay
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card xem trước QR */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-green-500" />
              Xem trước mã QR
            </CardTitle>
            <CardDescription>
              Mã QR sẽ hiển thị trên bill khi in
            </CardDescription>
          </CardHeader>
          <CardContent>
            {defaultAccount ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="previewAmount">Số tiền mẫu (VND)</Label>
                  <Input
                    id="previewAmount"
                    value={qrAmount}
                    onChange={(e) => setQrAmount(e.target.value)}
                    placeholder="VD: 100000"
                    type="number"
                  />
                </div>
                <div className="flex justify-center p-4 bg-white rounded-lg border">
                  <img
                    src={generateQRUrl(defaultAccount, qrAmount, "TT DH001")}
                    alt="VietQR Code Preview"
                    className="w-48 h-48 object-contain"
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Quét bằng app ngân hàng bất kỳ để thanh toán
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto w-32 h-32 rounded-lg bg-muted flex items-center justify-center mb-4">
                  <QrCode className="h-16 w-16 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Thiết lập tài khoản để xem trước mã QR
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Setup Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {defaultAccount ? "Chỉnh sửa tài khoản" : "Thiết lập tài khoản ngân hàng"}
            </DialogTitle>
            <DialogDescription>
              Tài khoản này sẽ được sử dụng để tạo mã QR thanh toán trên tất cả bill
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bankCode">Ngân hàng *</Label>
                <Select
                  value={formData.bankCode}
                  onValueChange={handleBankChange}
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
                  placeholder="VD: TT {order_code}"
                />
                <p className="text-xs text-muted-foreground">
                  Sử dụng {"{order_code}"} để tự động điền mã đơn hàng
                </p>
              </div>

              {/* PayOS Configuration Section */}
              <div className="border-t pt-4 mt-2">
                <div className="space-y-2 mb-4">
                  <Label htmlFor="paymentPartner">Thanh toán tự động (tuỳ chọn)</Label>
                  <Select
                    value={formData.paymentPartner}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, paymentPartner: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn đối tác (không bắt buộc)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không sử dụng - Xác nhận thủ công</SelectItem>
                      <SelectItem value="payos">PayOS - Tự động xác nhận khi nhận tiền</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    PayOS giúp tự động xác nhận đơn hàng khi khách chuyển khoản thành công
                  </p>
                </div>

                {formData.paymentPartner === "payos" && (
                  <div className="space-y-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <CreditCard className="h-4 w-4" />
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
                        placeholder="Nhập Checksum Key từ PayOS"
                        required={formData.paymentPartner === "payos"}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit">
                <Check className="mr-2 h-4 w-4" />
                {defaultAccount ? "Cập nhật" : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa tài khoản ngân hàng mặc định?
              Mã QR thanh toán sẽ không được in trên bill cho đến khi bạn thiết lập lại.
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
              Xóa tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
