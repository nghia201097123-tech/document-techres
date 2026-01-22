"use client";

import * as React from "react";
import {
  Printer,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Copy,
  Check,
  FileText,
  ChefHat,
  Star,
  Settings2,
  Receipt,
  Tag,
  Package,
  Wifi,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";

// ================== BILL PRINTER TYPES ==================
type PrinterConnectionType = "network" | "usb" | "bluetooth";

interface BillPrinterConfig {
  id: string;
  name: string;
  connectionType: PrinterConnectionType;
  ipAddress?: string;
  port: number;
  paperWidth: number;
  copies: number;
  autoCut: boolean;
  isDefault: boolean;
  isActive: boolean;
}

// Mock data for bill printer
const defaultBillPrinter: BillPrinterConfig = {
  id: "1",
  name: "Máy in Bill",
  connectionType: "network",
  ipAddress: "192.168.1.100",
  port: 9100,
  paperWidth: 80,
  copies: 1,
  autoCut: true,
  isDefault: true,
  isActive: true,
};

// ================== BILL TEMPLATE TYPES ==================
type BillTemplateType = "classic" | "modern" | "compact" | "detailed" | "premium";

const billTemplateTypes: { value: BillTemplateType; label: string }[] = [
  { value: "classic", label: "Cổ điển" },
  { value: "modern", label: "Hiện đại" },
  { value: "compact", label: "Thu gọn" },
  { value: "detailed", label: "Chi tiết" },
  { value: "premium", label: "Cao cấp" },
];

interface BillTemplate {
  id: string;
  name: string;
  templateType: BillTemplateType;
  description?: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  showLogo: boolean;
  showVat: boolean;
  showQrCode: boolean;
  paperWidth: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

// Mock data for bill templates
const mockBillTemplates: BillTemplate[] = [
  {
    id: "1",
    name: "Mẫu bill mặc định",
    templateType: "classic",
    description: "Mẫu hóa đơn cổ điển tiêu chuẩn",
    storeName: "Nhà hàng TechRes",
    storeAddress: "123 Nguyễn Văn Linh, Q.7, TP.HCM",
    storePhone: "028 1234 5678",
    showLogo: true,
    showVat: true,
    showQrCode: false,
    paperWidth: 80,
    isDefault: true,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Mẫu bill thu gọn",
    templateType: "compact",
    description: "Mẫu hóa đơn ngắn gọn cho quán cafe",
    storeName: "TechRes Cafe",
    storeAddress: "456 Lê Văn Sỹ, Q.3, TP.HCM",
    showLogo: false,
    showVat: false,
    showQrCode: true,
    paperWidth: 58,
    isDefault: false,
    isActive: true,
    createdAt: "2024-01-05T00:00:00Z",
  },
];

// ================== KITCHEN TYPES ==================
type KitchenType = "kitchen" | "bar" | "grill" | "dessert" | "seafood" | "hotpot" | "bakery" | "other";
type PrintMode = "TICKET" | "LABEL";

const kitchenTypes: { value: KitchenType; label: string }[] = [
  { value: "kitchen", label: "Bếp chính" },
  { value: "bar", label: "Quầy bar" },
  { value: "grill", label: "Bếp nướng" },
  { value: "dessert", label: "Tráng miệng" },
  { value: "seafood", label: "Hải sản" },
  { value: "hotpot", label: "Lẩu" },
  { value: "bakery", label: "Bánh" },
  { value: "other", label: "Khác" },
];

interface Kitchen {
  id: string;
  name: string;
  kitchenType: KitchenType;
  description?: string;
  printerName?: string;
  printerIp?: string;
  printerPort: number;
  paperWidth: number;
  printMode: PrintMode;
  ticketCopies: number;
  ticketPrintOrderNumber: boolean;
  ticketPrintTableName: boolean;
  ticketPrintTime: boolean;
  ticketPrintPrice: boolean;
  labelWidthMm: number;
  labelHeightMm: number;
  assignedProducts: number;
  isActive: boolean;
  createdAt: string;
}

// Mock data for kitchens - matching screenshot design
const mockKitchens: Kitchen[] = [
  {
    id: "1",
    name: "Bếp In Tem",
    kitchenType: "kitchen",
    description: "In tem/sticker cho đồ uống",
    printerName: "In tem",
    printerIp: "172.16.0.126",
    printerPort: 9100,
    paperWidth: 80,
    printMode: "LABEL",
    ticketCopies: 1,
    ticketPrintOrderNumber: true,
    ticketPrintTableName: true,
    ticketPrintTime: true,
    ticketPrintPrice: false,
    labelWidthMm: 72,
    labelHeightMm: 30,
    assignedProducts: 90,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Bếp nấu",
    kitchenType: "kitchen",
    description: "Bếp nấu món chính",
    printerName: "",
    printerIp: "172.16.1.140",
    printerPort: 9100,
    paperWidth: 80,
    printMode: "TICKET",
    ticketCopies: 1,
    ticketPrintOrderNumber: true,
    ticketPrintTableName: true,
    ticketPrintTime: true,
    ticketPrintPrice: false,
    labelWidthMm: 72,
    labelHeightMm: 30,
    assignedProducts: 90,
    isActive: true,
    createdAt: "2024-01-02T00:00:00Z",
  },
  {
    id: "3",
    name: "BẾP NẤU 2",
    kitchenType: "grill",
    description: "Bếp nướng",
    printerName: "NGHĨA",
    printerIp: "172.16.1.140",
    printerPort: 9100,
    paperWidth: 80,
    printMode: "TICKET",
    ticketCopies: 1,
    ticketPrintOrderNumber: true,
    ticketPrintTableName: true,
    ticketPrintTime: true,
    ticketPrintPrice: false,
    labelWidthMm: 72,
    labelHeightMm: 30,
    assignedProducts: 5,
    isActive: true,
    createdAt: "2024-01-03T00:00:00Z",
  },
  {
    id: "4",
    name: "BẾP NẤU 3",
    kitchenType: "dessert",
    description: "Tráng miệng",
    printerName: "",
    printerIp: "172.16.1.140",
    printerPort: 9100,
    paperWidth: 80,
    printMode: "TICKET",
    ticketCopies: 1,
    ticketPrintOrderNumber: true,
    ticketPrintTableName: true,
    ticketPrintTime: true,
    ticketPrintPrice: false,
    labelWidthMm: 72,
    labelHeightMm: 30,
    assignedProducts: 4,
    isActive: true,
    createdAt: "2024-01-04T00:00:00Z",
  },
];

// ================== COMPONENT ==================
export default function PrintTemplatesPage() {
  const [activeTab, setActiveTab] = React.useState("kitchen");

  // Bill printer state
  const [billPrinter, setBillPrinter] = React.useState<BillPrinterConfig>(defaultBillPrinter);
  const [isBillPrinterSaving, setIsBillPrinterSaving] = React.useState(false);

  // Bill templates state
  const [billTemplates, setBillTemplates] = React.useState<BillTemplate[]>(mockBillTemplates);
  const [billSearchQuery, setBillSearchQuery] = React.useState("");
  const [isBillDialogOpen, setIsBillDialogOpen] = React.useState(false);
  const [selectedBillTemplate, setSelectedBillTemplate] = React.useState<BillTemplate | null>(null);

  // Kitchen state
  const [kitchens, setKitchens] = React.useState<Kitchen[]>(mockKitchens);
  const [kitchenSearchQuery, setKitchenSearchQuery] = React.useState("");
  const [isKitchenDialogOpen, setIsKitchenDialogOpen] = React.useState(false);
  const [selectedKitchen, setSelectedKitchen] = React.useState<Kitchen | null>(null);

  // Delete dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{ type: "bill" | "kitchen"; item: any } | null>(null);

  // Bill template form
  const [billFormData, setBillFormData] = React.useState({
    name: "",
    templateType: "classic" as BillTemplateType,
    description: "",
    storeName: "",
    storeAddress: "",
    storePhone: "",
    showLogo: true,
    showVat: true,
    showQrCode: false,
    paperWidth: 80,
    isDefault: false,
  });

  // Kitchen form
  const [kitchenFormData, setKitchenFormData] = React.useState({
    name: "",
    kitchenType: "kitchen" as KitchenType,
    description: "",
    printerName: "",
    printerIp: "",
    printerPort: 9100,
    paperWidth: 80,
    printMode: "TICKET" as PrintMode,
    ticketCopies: 1,
    ticketPrintOrderNumber: true,
    ticketPrintTableName: true,
    ticketPrintTime: true,
    ticketPrintPrice: false,
    labelWidthMm: 72,
    labelHeightMm: 30,
    assignedProducts: 0,
  });

  // Filtered data
  const filteredBillTemplates = billTemplates.filter((t) =>
    t.name.toLowerCase().includes(billSearchQuery.toLowerCase())
  );

  const filteredKitchens = kitchens.filter((k) =>
    k.name.toLowerCase().includes(kitchenSearchQuery.toLowerCase())
  );

  // Bill printer handlers
  const handleSaveBillPrinter = () => {
    setIsBillPrinterSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsBillPrinterSaving(false);
      // Show success toast or notification here
    }, 1000);
  };

  // Bill template handlers
  const handleOpenBillCreate = () => {
    setSelectedBillTemplate(null);
    setBillFormData({
      name: "",
      templateType: "classic",
      description: "",
      storeName: "",
      storeAddress: "",
      storePhone: "",
      showLogo: true,
      showVat: true,
      showQrCode: false,
      paperWidth: 80,
      isDefault: false,
    });
    setIsBillDialogOpen(true);
  };

  const handleOpenBillEdit = (template: BillTemplate) => {
    setSelectedBillTemplate(template);
    setBillFormData({
      name: template.name,
      templateType: template.templateType,
      description: template.description || "",
      storeName: template.storeName,
      storeAddress: template.storeAddress || "",
      storePhone: template.storePhone || "",
      showLogo: template.showLogo,
      showVat: template.showVat,
      showQrCode: template.showQrCode,
      paperWidth: template.paperWidth,
      isDefault: template.isDefault,
    });
    setIsBillDialogOpen(true);
  };

  const handleBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBillTemplate) {
      setBillTemplates((prev) =>
        prev.map((t) =>
          t.id === selectedBillTemplate.id ? { ...t, ...billFormData } : t
        )
      );
    } else {
      const newTemplate: BillTemplate = {
        id: String(Date.now()),
        ...billFormData,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setBillTemplates((prev) => [...prev, newTemplate]);
    }
    setIsBillDialogOpen(false);
  };

  // Kitchen handlers
  const handleOpenKitchenCreate = () => {
    setSelectedKitchen(null);
    setKitchenFormData({
      name: "",
      kitchenType: "kitchen",
      description: "",
      printerName: "",
      printerIp: "",
      printerPort: 9100,
      paperWidth: 80,
      printMode: "TICKET",
      ticketCopies: 1,
      ticketPrintOrderNumber: true,
      ticketPrintTableName: true,
      ticketPrintTime: true,
      ticketPrintPrice: false,
      labelWidthMm: 72,
      labelHeightMm: 30,
      assignedProducts: 0,
    });
    setIsKitchenDialogOpen(true);
  };

  const handleOpenKitchenEdit = (kitchen: Kitchen) => {
    setSelectedKitchen(kitchen);
    setKitchenFormData({
      name: kitchen.name,
      kitchenType: kitchen.kitchenType,
      description: kitchen.description || "",
      printerName: kitchen.printerName || "",
      printerIp: kitchen.printerIp || "",
      printerPort: kitchen.printerPort,
      paperWidth: kitchen.paperWidth,
      printMode: kitchen.printMode,
      ticketCopies: kitchen.ticketCopies,
      ticketPrintOrderNumber: kitchen.ticketPrintOrderNumber,
      ticketPrintTableName: kitchen.ticketPrintTableName,
      ticketPrintTime: kitchen.ticketPrintTime,
      ticketPrintPrice: kitchen.ticketPrintPrice,
      labelWidthMm: kitchen.labelWidthMm,
      labelHeightMm: kitchen.labelHeightMm,
      assignedProducts: kitchen.assignedProducts,
    });
    setIsKitchenDialogOpen(true);
  };

  const handleKitchenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedKitchen) {
      setKitchens((prev) =>
        prev.map((k) =>
          k.id === selectedKitchen.id ? { ...k, ...kitchenFormData } : k
        )
      );
    } else {
      const newKitchen: Kitchen = {
        id: String(Date.now()),
        ...kitchenFormData,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setKitchens((prev) => [...prev, newKitchen]);
    }
    setIsKitchenDialogOpen(false);
  };

  // Delete handlers
  const handleOpenDelete = (type: "bill" | "kitchen", item: any) => {
    setDeleteTarget({ type, item });
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "bill") {
      setBillTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.item.id));
    } else {
      setKitchens((prev) => prev.filter((k) => k.id !== deleteTarget.item.id));
    }
    setIsDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  // Toggle handlers
  const handleToggleBillStatus = (template: BillTemplate) => {
    setBillTemplates((prev) =>
      prev.map((t) => (t.id === template.id ? { ...t, isActive: !t.isActive } : t))
    );
  };

  const handleSetDefaultBill = (template: BillTemplate) => {
    setBillTemplates((prev) =>
      prev.map((t) => ({ ...t, isDefault: t.id === template.id }))
    );
  };

  const handleToggleKitchenStatus = (kitchen: Kitchen) => {
    setKitchens((prev) =>
      prev.map((k) => (k.id === kitchen.id ? { ...k, isActive: !k.isActive } : k))
    );
  };

  const getKitchenTypeLabel = (type: KitchenType) => {
    return kitchenTypes.find((t) => t.value === type)?.label || type;
  };

  const getKitchenTypeColor = (type: KitchenType) => {
    switch (type) {
      case "kitchen":
        return "bg-orange-500/10 text-orange-500";
      case "bar":
        return "bg-purple-500/10 text-purple-500";
      case "grill":
        return "bg-red-500/10 text-red-500";
      case "dessert":
        return "bg-pink-500/10 text-pink-500";
      case "seafood":
        return "bg-blue-500/10 text-blue-500";
      case "hotpot":
        return "bg-amber-500/10 text-amber-500";
      case "bakery":
        return "bg-yellow-500/10 text-yellow-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Quản lý bếp & Máy in</h2>
        <p className="text-muted-foreground">
          Cấu hình bếp, gán món vào bếp và thiết lập máy in
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="kitchen" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Bếp & Máy in
          </TabsTrigger>
          <TabsTrigger value="bill" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Mẫu in Bill
          </TabsTrigger>
        </TabsList>

        {/* ================== BILL TEMPLATES TAB ================== */}
        <TabsContent value="bill" className="space-y-6">
          {/* ========== BILL PRINTER CONFIG ========== */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Printer className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Cấu hình máy in Bill</CardTitle>
                  <CardDescription>Thiết lập máy in để in hóa đơn thanh toán</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="billPrinterName">Tên máy in</Label>
                  <Input
                    id="billPrinterName"
                    value={billPrinter.name}
                    onChange={(e) => setBillPrinter((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: Máy in Bill"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billPrinterConnection">Kết nối</Label>
                  <Select
                    value={billPrinter.connectionType}
                    onValueChange={(v: PrinterConnectionType) => setBillPrinter((prev) => ({ ...prev, connectionType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="network">Mạng (Network)</SelectItem>
                      <SelectItem value="usb">USB</SelectItem>
                      <SelectItem value="bluetooth">Bluetooth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {billPrinter.connectionType === "network" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="billPrinterIp">Địa chỉ IP</Label>
                      <Input
                        id="billPrinterIp"
                        value={billPrinter.ipAddress || ""}
                        onChange={(e) => setBillPrinter((prev) => ({ ...prev, ipAddress: e.target.value }))}
                        placeholder="VD: 192.168.1.100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billPrinterPort">Port</Label>
                      <Input
                        id="billPrinterPort"
                        type="number"
                        value={billPrinter.port}
                        onChange={(e) => setBillPrinter((prev) => ({ ...prev, port: Number(e.target.value) }))}
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="billPrinterPaperWidth">Khổ giấy</Label>
                  <Select
                    value={String(billPrinter.paperWidth)}
                    onValueChange={(v) => setBillPrinter((prev) => ({ ...prev, paperWidth: Number(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58">58mm</SelectItem>
                      <SelectItem value="80">80mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billPrinterCopies">Số bản in</Label>
                  <Input
                    id="billPrinterCopies"
                    type="number"
                    min={1}
                    max={5}
                    value={billPrinter.copies}
                    onChange={(e) => setBillPrinter((prev) => ({ ...prev, copies: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="billPrinterAutoCut"
                    checked={billPrinter.autoCut}
                    onCheckedChange={(checked) => setBillPrinter((prev) => ({ ...prev, autoCut: checked }))}
                  />
                  <Label htmlFor="billPrinterAutoCut">Tự động cắt giấy</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="billPrinterActive"
                    checked={billPrinter.isActive}
                    onCheckedChange={(checked) => setBillPrinter((prev) => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="billPrinterActive">Kích hoạt</Label>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveBillPrinter} disabled={isBillPrinterSaving}>
                  {isBillPrinterSaving ? "Đang lưu..." : "Lưu cấu hình"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ========== BILL TEMPLATES ========== */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Receipt className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Mẫu in Bill</h3>
                <p className="text-sm text-muted-foreground">Quản lý các mẫu hóa đơn</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tổng mẫu bill
                  </CardTitle>
                  <FileText className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{billTemplates.length}</div>
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
                    {billTemplates.filter((t) => t.isActive).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Mẫu mặc định
                  </CardTitle>
                  <Star className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-500">
                    {billTemplates.find((t) => t.isDefault)?.name || "Chưa thiết lập"}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bill Templates Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg">
                  Danh sách mẫu bill ({filteredBillTemplates.length})
                </CardTitle>
                <div className="flex gap-2">
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm mẫu..."
                      value={billSearchQuery}
                      onChange={(e) => setBillSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={handleOpenBillCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm mẫu
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên mẫu</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Tên cửa hàng</TableHead>
                    <TableHead>Khổ giấy</TableHead>
                    <TableHead>Mặc định</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBillTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                            <Receipt className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium">{template.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {template.description || "Không có mô tả"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {billTemplateTypes.find((t) => t.value === template.templateType)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{template.storeName}</TableCell>
                      <TableCell>{template.paperWidth}mm</TableCell>
                      <TableCell>
                        {template.isDefault ? (
                          <Badge variant="default" className="bg-yellow-500">
                            <Star className="mr-1 h-3 w-3" />
                            Mặc định
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefaultBill(template)}
                            className="text-muted-foreground"
                          >
                            Đặt mặc định
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={template.isActive ? "success" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => handleToggleBillStatus(template)}
                        >
                          {template.isActive ? "Hoạt động" : "Tạm dừng"}
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
                            <DropdownMenuItem onClick={() => handleOpenBillEdit(template)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Nhân bản
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenDelete("bill", template)}
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
                  {filteredBillTemplates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        Không tìm thấy mẫu bill nào
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================== KITCHEN TAB ================== */}
        <TabsContent value="kitchen" className="space-y-4">
          {/* Header with search and add button */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Danh sách bếp</h3>
              <p className="text-sm text-muted-foreground">Tổng cộng {kitchens.length} bếp</p>
            </div>
            <div className="flex gap-2">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm bếp..."
                  value={kitchenSearchQuery}
                  onChange={(e) => setKitchenSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleOpenKitchenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm bếp
              </Button>
            </div>
          </div>

          {/* Kitchen Cards Grid - matching screenshot design */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredKitchens.map((kitchen) => (
              <Card key={kitchen.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                        kitchen.printMode === "LABEL"
                          ? "bg-red-100 text-red-600"
                          : "bg-amber-100 text-amber-600"
                      }`}>
                        <ChefHat className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{kitchen.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Máy in: {kitchen.printerName || "Chưa đặt tên"}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenKitchenEdit(kitchen)}>
                          <Settings2 className="mr-2 h-4 w-4" />
                          Cấu hình
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenKitchenEdit(kitchen)}>
                          <Package className="mr-2 h-4 w-4" />
                          Gán món
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDelete("kitchen", kitchen)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Printer Info */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Wifi className="h-3.5 w-3.5" />
                      <span>IP: {kitchen.printerIp}:{kitchen.printerPort}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Printer className="h-3.5 w-3.5" />
                      <span>Giấy: {kitchen.paperWidth}mm | {kitchen.printMode === "TICKET" ? "In phiếu bếp" : "In tem/sticker"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ChefHat className="h-3.5 w-3.5" />
                      <span>Loại: {getKitchenTypeLabel(kitchen.kitchenType)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-3.5 w-3.5" />
                      <span>{kitchen.assignedProducts} món được gán</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="pt-2">
                    <Badge
                      variant={kitchen.isActive ? "success" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleKitchenStatus(kitchen)}
                    >
                      {kitchen.isActive ? "Hoạt động" : "Tạm dừng"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredKitchens.length === 0 && (
              <div className="col-span-full flex h-32 items-center justify-center text-muted-foreground">
                Không tìm thấy bếp nào
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ================== BILL TEMPLATE DIALOG ================== */}
      <Dialog open={isBillDialogOpen} onOpenChange={setIsBillDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBillTemplate ? "Chỉnh sửa mẫu bill" : "Thêm mẫu bill mới"}
            </DialogTitle>
            <DialogDescription>
              Cấu hình mẫu in hóa đơn cho cửa hàng
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBillSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billName">Tên mẫu *</Label>
                  <Input
                    id="billName"
                    value={billFormData.name}
                    onChange={(e) => setBillFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="VD: Mẫu bill mặc định"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="templateType">Loại mẫu</Label>
                  <Select
                    value={billFormData.templateType}
                    onValueChange={(v: BillTemplateType) => setBillFormData((prev) => ({ ...prev, templateType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {billTemplateTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billDescription">Mô tả</Label>
                <Textarea
                  id="billDescription"
                  value={billFormData.description}
                  onChange={(e) => setBillFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả ngắn về mẫu bill"
                  rows={2}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Thông tin cửa hàng</h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Tên cửa hàng *</Label>
                    <Input
                      id="storeName"
                      value={billFormData.storeName}
                      onChange={(e) => setBillFormData((prev) => ({ ...prev, storeName: e.target.value }))}
                      required
                      placeholder="VD: Nhà hàng TechRes"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeAddress">Địa chỉ</Label>
                    <Input
                      id="storeAddress"
                      value={billFormData.storeAddress}
                      onChange={(e) => setBillFormData((prev) => ({ ...prev, storeAddress: e.target.value }))}
                      placeholder="VD: 123 Nguyễn Văn Linh, Q.7, TP.HCM"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="storePhone">Số điện thoại</Label>
                      <Input
                        id="storePhone"
                        value={billFormData.storePhone}
                        onChange={(e) => setBillFormData((prev) => ({ ...prev, storePhone: e.target.value }))}
                        placeholder="VD: 028 1234 5678"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paperWidth">Khổ giấy (mm)</Label>
                      <Select
                        value={String(billFormData.paperWidth)}
                        onValueChange={(v) => setBillFormData((prev) => ({ ...prev, paperWidth: Number(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="58">58mm</SelectItem>
                          <SelectItem value="80">80mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Tùy chọn hiển thị</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showLogo">Hiển thị logo</Label>
                    <Switch
                      id="showLogo"
                      checked={billFormData.showLogo}
                      onCheckedChange={(checked) => setBillFormData((prev) => ({ ...prev, showLogo: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showVat">Hiển thị VAT</Label>
                    <Switch
                      id="showVat"
                      checked={billFormData.showVat}
                      onCheckedChange={(checked) => setBillFormData((prev) => ({ ...prev, showVat: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showQrCode">Hiển thị mã QR</Label>
                    <Switch
                      id="showQrCode"
                      checked={billFormData.showQrCode}
                      onCheckedChange={(checked) => setBillFormData((prev) => ({ ...prev, showQrCode: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isDefault">Đặt làm mặc định</Label>
                    <Switch
                      id="isDefault"
                      checked={billFormData.isDefault}
                      onCheckedChange={(checked) => setBillFormData((prev) => ({ ...prev, isDefault: checked }))}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsBillDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit">
                {selectedBillTemplate ? "Cập nhật" : "Thêm mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================== KITCHEN DIALOG ================== */}
      <Dialog open={isKitchenDialogOpen} onOpenChange={setIsKitchenDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedKitchen ? "Cấu hình bếp" : "Thêm bếp mới"}
            </DialogTitle>
            <DialogDescription>
              Cấu hình máy in và thiết lập in bếp/bar
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleKitchenSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kitchenName">Tên bếp *</Label>
                  <Input
                    id="kitchenName"
                    value={kitchenFormData.name}
                    onChange={(e) => setKitchenFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="VD: Bếp chính, Quầy bar"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kitchenType">Loại bếp</Label>
                  <Select
                    value={kitchenFormData.kitchenType}
                    onValueChange={(v: KitchenType) => setKitchenFormData((prev) => ({ ...prev, kitchenType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {kitchenTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kitchenDescription">Mô tả</Label>
                <Textarea
                  id="kitchenDescription"
                  value={kitchenFormData.description}
                  onChange={(e) => setKitchenFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả ngắn về bếp"
                  rows={2}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Cấu hình máy in</h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="printerName">Tên máy in</Label>
                    <Input
                      id="printerName"
                      value={kitchenFormData.printerName}
                      onChange={(e) => setKitchenFormData((prev) => ({ ...prev, printerName: e.target.value }))}
                      placeholder="VD: EPSON TM-T82"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="printerIp">IP máy in</Label>
                      <Input
                        id="printerIp"
                        value={kitchenFormData.printerIp}
                        onChange={(e) => setKitchenFormData((prev) => ({ ...prev, printerIp: e.target.value }))}
                        placeholder="VD: 192.168.1.100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="printerPort">Port</Label>
                      <Input
                        id="printerPort"
                        type="number"
                        value={kitchenFormData.printerPort}
                        onChange={(e) => setKitchenFormData((prev) => ({ ...prev, printerPort: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Chế độ in</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Card
                    className={`cursor-pointer transition-all ${kitchenFormData.printMode === "TICKET" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setKitchenFormData((prev) => ({ ...prev, printMode: "TICKET" }))}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-blue-500" />
                        <CardTitle className="text-base">In Phiếu (Ticket)</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>
                        In nhiều món trên 1 tờ giấy. Phù hợp với bếp nấu.
                      </CardDescription>
                    </CardContent>
                  </Card>
                  <Card
                    className={`cursor-pointer transition-all ${kitchenFormData.printMode === "LABEL" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setKitchenFormData((prev) => ({ ...prev, printMode: "LABEL" }))}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-purple-500" />
                        <CardTitle className="text-base">In Tem (Label)</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>
                        In 1 tem cho mỗi món/ly. Phù hợp với quầy bar, đồ uống.
                      </CardDescription>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {kitchenFormData.printMode === "TICKET" && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Cài đặt in phiếu</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="paperWidth">Khổ giấy (mm)</Label>
                      <Select
                        value={String(kitchenFormData.paperWidth)}
                        onValueChange={(v) => setKitchenFormData((prev) => ({ ...prev, paperWidth: Number(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="58">58mm</SelectItem>
                          <SelectItem value="80">80mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticketCopies">Số bản in</Label>
                      <Input
                        id="ticketCopies"
                        type="number"
                        min={1}
                        max={5}
                        value={kitchenFormData.ticketCopies}
                        onChange={(e) => setKitchenFormData((prev) => ({ ...prev, ticketCopies: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ticketPrintOrderNumber">In số đơn</Label>
                      <Switch
                        id="ticketPrintOrderNumber"
                        checked={kitchenFormData.ticketPrintOrderNumber}
                        onCheckedChange={(checked) => setKitchenFormData((prev) => ({ ...prev, ticketPrintOrderNumber: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ticketPrintTableName">In tên bàn</Label>
                      <Switch
                        id="ticketPrintTableName"
                        checked={kitchenFormData.ticketPrintTableName}
                        onCheckedChange={(checked) => setKitchenFormData((prev) => ({ ...prev, ticketPrintTableName: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ticketPrintTime">In thời gian</Label>
                      <Switch
                        id="ticketPrintTime"
                        checked={kitchenFormData.ticketPrintTime}
                        onCheckedChange={(checked) => setKitchenFormData((prev) => ({ ...prev, ticketPrintTime: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ticketPrintPrice">In giá tiền</Label>
                      <Switch
                        id="ticketPrintPrice"
                        checked={kitchenFormData.ticketPrintPrice}
                        onCheckedChange={(checked) => setKitchenFormData((prev) => ({ ...prev, ticketPrintPrice: checked }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {kitchenFormData.printMode === "LABEL" && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Cài đặt in tem</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="labelWidthMm">Chiều rộng (mm)</Label>
                      <Input
                        id="labelWidthMm"
                        type="number"
                        value={kitchenFormData.labelWidthMm}
                        onChange={(e) => setKitchenFormData((prev) => ({ ...prev, labelWidthMm: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="labelHeightMm">Chiều cao (mm)</Label>
                      <Input
                        id="labelHeightMm"
                        type="number"
                        value={kitchenFormData.labelHeightMm}
                        onChange={(e) => setKitchenFormData((prev) => ({ ...prev, labelHeightMm: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kích thước tem</Label>
                      <p className="text-sm text-muted-foreground mt-2">
                        {kitchenFormData.labelWidthMm}x{kitchenFormData.labelHeightMm}mm
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsKitchenDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit">
                {selectedKitchen ? "Cập nhật" : "Thêm mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================== DELETE DIALOG ================== */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa{" "}
              <span className="font-medium">
                {deleteTarget?.type === "bill"
                  ? deleteTarget?.item?.name
                  : deleteTarget?.item?.name}
              </span>
              ? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
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
