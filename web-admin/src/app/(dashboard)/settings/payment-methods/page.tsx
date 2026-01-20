"use client";

import * as React from "react";
import {
  CreditCard,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Banknote,
  Landmark,
  Smartphone,
  QrCode,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { formatDateTime } from "@/lib/utils";

// Payment method types
type PaymentMethodType = "cash" | "bank_transfer" | "credit_card" | "e_wallet" | "qr_code";

const paymentMethodTypes: { value: PaymentMethodType; label: string; icon: React.ElementType; description: string }[] = [
  { value: "cash", label: "Tiền mặt", icon: Banknote, description: "Thanh toán bằng tiền mặt" },
  { value: "bank_transfer", label: "Chuyển khoản", icon: Landmark, description: "Chuyển khoản qua ngân hàng" },
  { value: "credit_card", label: "Cà thẻ", icon: CreditCard, description: "Thanh toán bằng thẻ tín dụng/ghi nợ" },
  { value: "e_wallet", label: "Ví điện tử", icon: Smartphone, description: "Thanh toán qua ví điện tử (MoMo, ZaloPay, VNPay...)" },
  { value: "qr_code", label: "QR Code", icon: QrCode, description: "Thanh toán qua mã QR VietQR" },
];

// E-wallet providers
const eWalletProviders = [
  { code: "momo", name: "MoMo", color: "#a50064" },
  { code: "zalopay", name: "ZaloPay", color: "#0068ff" },
  { code: "vnpay", name: "VNPay", color: "#005baa" },
  { code: "shopeepay", name: "ShopeePay", color: "#ee4d2d" },
  { code: "viettelpay", name: "ViettelPay", color: "#da251d" },
  { code: "other", name: "Khác", color: "#6b7280" },
];

interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  description?: string;
  iconUrl?: string;
  config?: Record<string, any>;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Mock data with all payment types including card and e-wallet
const mockPaymentMethods: PaymentMethod[] = [
  {
    id: "1",
    name: "Tiền mặt",
    type: "cash",
    description: "Thanh toán trực tiếp bằng tiền mặt",
    sortOrder: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Chuyển khoản ngân hàng",
    type: "bank_transfer",
    description: "Chuyển khoản qua tài khoản ngân hàng",
    sortOrder: 2,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "3",
    name: "Cà thẻ",
    type: "credit_card",
    description: "Thanh toán bằng thẻ tín dụng hoặc thẻ ghi nợ",
    config: {
      acceptedCards: ["visa", "mastercard", "jcb"],
      terminal: "POS-001",
    },
    sortOrder: 3,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "4",
    name: "MoMo",
    type: "e_wallet",
    description: "Thanh toán qua ví MoMo",
    config: {
      provider: "momo",
      phone: "0909123456",
    },
    sortOrder: 4,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "5",
    name: "ZaloPay",
    type: "e_wallet",
    description: "Thanh toán qua ví ZaloPay",
    config: {
      provider: "zalopay",
      phone: "0909123456",
    },
    sortOrder: 5,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "6",
    name: "VietQR",
    type: "qr_code",
    description: "Quét mã QR để thanh toán",
    sortOrder: 6,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

interface PaymentMethodFormData {
  name: string;
  type: PaymentMethodType;
  description: string;
  config: Record<string, any>;
}

const initialFormData: PaymentMethodFormData = {
  name: "",
  type: "cash",
  description: "",
  config: {},
};

export default function PaymentMethodsPage() {
  const [methods, setMethods] = React.useState<PaymentMethod[]>(mockPaymentMethods);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethod | null>(null);
  const [formData, setFormData] = React.useState<PaymentMethodFormData>(initialFormData);
  const [isViewMode, setIsViewMode] = React.useState(false);

  const filteredMethods = methods.filter((method) => {
    const matchesSearch = method.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || method.type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: PaymentMethodType) => {
    const typeInfo = paymentMethodTypes.find((t) => t.value === type);
    return typeInfo?.icon || CreditCard;
  };

  const getTypeLabel = (type: PaymentMethodType) => {
    const typeInfo = paymentMethodTypes.find((t) => t.value === type);
    return typeInfo?.label || type;
  };

  const getTypeColor = (type: PaymentMethodType) => {
    switch (type) {
      case "cash":
        return "bg-green-500/10 text-green-500";
      case "bank_transfer":
        return "bg-blue-500/10 text-blue-500";
      case "credit_card":
        return "bg-purple-500/10 text-purple-500";
      case "e_wallet":
        return "bg-pink-500/10 text-pink-500";
      case "qr_code":
        return "bg-orange-500/10 text-orange-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const handleOpenCreate = () => {
    setSelectedMethod(null);
    setFormData(initialFormData);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setFormData({
      name: method.name,
      type: method.type,
      description: method.description || "",
      config: method.config || {},
    });
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenView = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setFormData({
      name: method.name,
      type: method.type,
      description: method.description || "",
      config: method.config || {},
    });
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMethod) {
      setMethods((prev) =>
        prev.map((m) =>
          m.id === selectedMethod.id
            ? { ...m, ...formData, updatedAt: new Date().toISOString() }
            : m
        )
      );
    } else {
      const newMethod: PaymentMethod = {
        id: String(Date.now()),
        ...formData,
        sortOrder: methods.length + 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setMethods((prev) => [...prev, newMethod]);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (selectedMethod) {
      setMethods((prev) => prev.filter((m) => m.id !== selectedMethod.id));
      setIsDeleteDialogOpen(false);
      setSelectedMethod(null);
    }
  };

  const handleToggleStatus = (method: PaymentMethod) => {
    setMethods((prev) =>
      prev.map((m) => (m.id === method.id ? { ...m, isActive: !m.isActive } : m))
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleTypeChange = (type: PaymentMethodType) => {
    const typeInfo = paymentMethodTypes.find((t) => t.value === type);
    setFormData((prev) => ({
      ...prev,
      type,
      name: prev.name || typeInfo?.label || "",
      description: prev.description || typeInfo?.description || "",
      config: {},
    }));
  };

  // Stats
  const stats = {
    total: methods.length,
    active: methods.filter((m) => m.isActive).length,
    cash: methods.filter((m) => m.type === "cash").length,
    card: methods.filter((m) => m.type === "credit_card").length,
    eWallet: methods.filter((m) => m.type === "e_wallet").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Phương thức thanh toán</h2>
          <p className="text-muted-foreground">
            Thiết lập các phương thức thanh toán cho cửa hàng (Tiền mặt, Chuyển khoản, Cà thẻ, Ví điện tử...)
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm phương thức
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng cộng
            </CardTitle>
            <CreditCard className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Đang hoạt động
            </CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tiền mặt
            </CardTitle>
            <Banknote className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cash}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cà thẻ
            </CardTitle>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.card}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ví điện tử
            </CardTitle>
            <Smartphone className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.eWallet}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              Danh sách phương thức ({filteredMethods.length})
            </CardTitle>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Lọc theo loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {paymentMethodTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Phương thức</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMethods.map((method, index) => {
                const Icon = getTypeIcon(method.type);
                return (
                  <TableRow key={method.id}>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                        {index + 1}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${getTypeColor(
                            method.type
                          )}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{method.name}</p>
                          {method.config?.provider && (
                            <p className="text-xs text-muted-foreground">
                              {eWalletProviders.find((p) => p.code === method.config?.provider)
                                ?.name || method.config.provider}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTypeColor(method.type)}>
                        {getTypeLabel(method.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {method.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={method.isActive ? "success" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => handleToggleStatus(method)}
                      >
                        {method.isActive ? "Hoạt động" : "Tạm dừng"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(method.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenView(method)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(method)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenDelete(method)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredMethods.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Không tìm thấy phương thức thanh toán nào
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
                ? "Chi tiết phương thức"
                : selectedMethod
                ? "Chỉnh sửa phương thức"
                : "Thêm phương thức thanh toán"}
            </DialogTitle>
            <DialogDescription>
              {isViewMode
                ? "Thông tin chi tiết phương thức thanh toán"
                : selectedMethod
                ? "Cập nhật thông tin phương thức"
                : "Thêm phương thức thanh toán mới cho cửa hàng"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="type">Loại phương thức *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: PaymentMethodType) => handleTypeChange(value)}
                  disabled={isViewMode || !!selectedMethod}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethodTypes.map((type) => {
                      const TypeIcon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-4 w-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Tên phương thức *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isViewMode}
                  placeholder="VD: Tiền mặt, Visa, MoMo..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={isViewMode}
                  placeholder="Mô tả ngắn về phương thức thanh toán"
                  rows={3}
                />
              </div>

              {/* E-wallet specific config */}
              {formData.type === "e_wallet" && (
                <div className="space-y-2">
                  <Label>Nhà cung cấp ví điện tử</Label>
                  <Select
                    value={formData.config?.provider || ""}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        config: { ...prev.config, provider: value },
                      }))
                    }
                    disabled={isViewMode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn ví điện tử" />
                    </SelectTrigger>
                    <SelectContent>
                      {eWalletProviders.map((provider) => (
                        <SelectItem key={provider.code} value={provider.code}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Credit card specific config */}
              {formData.type === "credit_card" && (
                <div className="space-y-2">
                  <Label>Mã máy POS</Label>
                  <Input
                    value={formData.config?.terminal || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        config: { ...prev.config, terminal: e.target.value },
                      }))
                    }
                    disabled={isViewMode}
                    placeholder="VD: POS-001"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nhập mã máy POS để theo dõi giao dịch
                  </p>
                </div>
              )}
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
                    {selectedMethod ? "Cập nhật" : "Thêm mới"}
                  </Button>
                </>
              )}
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
              Bạn có chắc chắn muốn xóa phương thức{" "}
              <span className="font-medium">{selectedMethod?.name}</span>? Hành động này
              không thể hoàn tác.
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
