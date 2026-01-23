"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BillPreviewPanel } from "@/components/bill-preview-panel";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { BrandFilter, useGlobalFilters } from "@/components/ui/brand-filter";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Star,
  Eye,
} from "lucide-react";
import {
  billTemplateService,
  BillTemplate,
  BillPrinterConfig,
  BillTemplateType,
  ItemDisplayLayout,
  PrinterConnectionType,
  BillTemplateWithPrinterForm,
  BILL_TEMPLATE_TYPE_LABELS,
  BILL_TEMPLATE_TYPE_DESCRIPTIONS,
  ITEM_DISPLAY_LAYOUT_LABELS,
  ITEM_DISPLAY_LAYOUT_DESCRIPTIONS,
  ITEM_DISPLAY_LAYOUT_EXAMPLES,
  PAPER_WIDTH_OPTIONS,
  FONT_SIZE_OPTIONS,
  DATE_FORMAT_OPTIONS,
  QR_CODE_TYPE_LABELS,
  DEFAULT_BILL_TEMPLATE,
  DEFAULT_PRINTER_CONFIG,
} from "@/services/bill-template-service";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBranchesByBrand } from "@/store/slices/branchesSlice";

type DialogMode = "create" | "edit" | null;

export default function BillTemplatePage() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { brandId: filterBrandId, setBrandId: setFilterBrandId } = useGlobalFilters();

  // Get branches from Redux store
  const branches = useAppSelector((state) =>
    filterBrandId ? state.branches.byBrandId[filterBrandId] || [] : []
  );

  // Bill Templates state
  const [templates, setTemplates] = React.useState<BillTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = React.useState(false);
  const [templateDialog, setTemplateDialog] = React.useState<DialogMode>(null);
  const [editingTemplate, setEditingTemplate] = React.useState<BillTemplate | null>(null);
  const [savingTemplate, setSavingTemplate] = React.useState(false);
  const [previewTemplate, setPreviewTemplate] = React.useState<BillTemplate | null>(null);

  // Associated printer config (when editing)
  const [editingPrinterConfig, setEditingPrinterConfig] = React.useState<BillPrinterConfig | null>(null);

  // Form states (combined template + printer for UI)
  const [templateForm, setTemplateForm] = React.useState<BillTemplateWithPrinterForm>({
    name: "",
    storeName: "",
    templateType: BillTemplateType.CLASSIC,
    ...DEFAULT_BILL_TEMPLATE,
    ...DEFAULT_PRINTER_CONFIG,
  });

  // Use React 18 useDeferredValue for smooth preview rendering (like TicketPreview)
  // This is more performant than debounce because React defers updates without blocking UI
  const deferredTemplateForm = React.useDeferredValue(templateForm);

  // Active tab for template form
  const [formTab, setFormTab] = React.useState("header");

  // Load data when brand changes
  React.useEffect(() => {
    if (filterBrandId) {
      loadTemplates();
      // Also fetch branches for this brand
      dispatch(fetchBranchesByBrand(filterBrandId));
    }
  }, [filterBrandId, dispatch]);

  const loadTemplates = async () => {
    if (!filterBrandId) return;
    setLoadingTemplates(true);
    try {
      // Templates được quản lý ở cấp thương hiệu (brand)
      const data = await billTemplateService.getTemplatesByBrand(filterBrandId);
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách mẫu bill", variant: "destructive" });
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Template handlers
  const openTemplateDialog = async (mode: DialogMode, template?: BillTemplate) => {
    if (mode === "edit" && template) {
      setEditingTemplate(template);

      // Load associated printer config
      const printerConfig = await billTemplateService.getPrinterConfigByTemplateId(template.id);
      setEditingPrinterConfig(printerConfig);

      setTemplateForm({
        name: template.name,
        templateType: template.templateType,
        description: template.description,
        showLogo: template.showLogo,
        logoUrl: template.logoUrl,
        storeName: template.storeName,
        storeAddress: template.storeAddress,
        storePhone: template.storePhone,
        taxCode: template.taxCode,
        headerText: template.headerText,
        billTitle: template.billTitle,
        showOrderNumber: template.showOrderNumber,
        showTableName: template.showTableName,
        showStaffName: template.showStaffName,
        showCustomerName: template.showCustomerName,
        showDateTime: template.showDateTime,
        dateFormat: template.dateFormat,
        // Time tracking
        showCheckInTime: template.showCheckInTime ?? false,
        showCheckOutTime: template.showCheckOutTime ?? false,
        checkInLabel: template.checkInLabel || "Giờ vào",
        checkOutLabel: template.checkOutLabel || "Giờ ra",
        // Items
        itemDisplayLayout: template.itemDisplayLayout || ItemDisplayLayout.STANDARD,
        showItemCode: template.showItemCode,
        showItemNote: template.showItemNote,
        showOrderNote: template.showOrderNote ?? true,
        showUnitPrice: template.showUnitPrice,
        showQuantity: template.showQuantity,
        showSubtotal: template.showSubtotal,
        // Discount config (4 loại)
        showItemDiscount: template.showItemDiscount ?? true,
        showTotalItemDiscount: template.showTotalItemDiscount ?? true,
        itemDiscountLabel: template.itemDiscountLabel || "Giảm giá món",
        showBillDiscount: template.showBillDiscount ?? true,
        billDiscountLabel: template.billDiscountLabel || "Giảm giá hóa đơn",
        showCouponDiscount: template.showCouponDiscount ?? true,
        couponDiscountLabel: template.couponDiscountLabel || "Mã giảm giá",
        showVoucherDiscount: template.showVoucherDiscount ?? true,
        voucherDiscountLabel: template.voucherDiscountLabel || "Voucher",
        showTotalDiscount: template.showTotalDiscount ?? true,
        totalDiscountLabel: template.totalDiscountLabel || "Tổng giảm giá",
        // Legacy
        showDiscount: template.showDiscount,
        showDiscountPercent: template.showDiscountPercent,
        showServiceFee: template.showServiceFee,
        showVat: template.showVat,
        showVatDetails: template.showVatDetails,
        showPriceBeforeVat: template.showPriceBeforeVat,
        showPriceAfterVat: template.showPriceAfterVat,
        vatLabel: template.vatLabel,
        priceBeforeVatLabel: template.priceBeforeVatLabel,
        priceAfterVatLabel: template.priceAfterVatLabel,
        showPaymentMethod: template.showPaymentMethod,
        showReceivedAmount: template.showReceivedAmount,
        showChangeAmount: template.showChangeAmount,
        showQrCode: template.showQrCode,
        qrCodeType: template.qrCodeType,
        qrCodeContent: template.qrCodeContent,
        showBarcode: template.showBarcode,
        thankYouMessage: template.thankYouMessage,
        comebackMessage: template.comebackMessage,
        footerText: template.footerText,
        showWifiInfo: template.showWifiInfo,
        wifiName: template.wifiName,
        wifiPassword: template.wifiPassword,
        paperWidth: template.paperWidth,
        fontSize: template.fontSize,
        lineSpacing: template.lineSpacing,
        separatorChar: template.separatorChar,
        doubleSeparatorChar: template.doubleSeparatorChar,
        cutPaper: template.cutPaper,
        openCashDrawer: template.openCashDrawer,
        beepAfterPrint: template.beepAfterPrint,
        numberOfCopies: template.numberOfCopies,
        sortOrder: template.sortOrder,
        // Printer config (from associated printer config or defaults)
        connectionType: printerConfig?.connectionType || PrinterConnectionType.NETWORK,
        printerIp: printerConfig?.printerIp || "",
        printerPort: printerConfig?.printerPort || 9100,
        printerMac: printerConfig?.printerMac || "",
        printerUsbPath: printerConfig?.printerUsbPath || "",
        autoPrintOnPayment: printerConfig?.autoPrintOnPayment ?? true,
        printPreview: printerConfig?.printPreview ?? false,
        retryCount: printerConfig?.retryCount || 3,
        retryDelayMs: printerConfig?.retryDelayMs || 1000,
        connectionTimeoutMs: printerConfig?.connectionTimeoutMs || 5000,
      });
    } else {
      setEditingTemplate(null);
      setEditingPrinterConfig(null);
      setTemplateForm({
        name: "",
        storeName: "",
        templateType: BillTemplateType.CLASSIC,
        ...DEFAULT_BILL_TEMPLATE,
        ...DEFAULT_PRINTER_CONFIG,
      });
    }
    setFormTab("header");
    setTemplateDialog(mode);
  };

  const handleSaveTemplate = async () => {
    if (!filterBrandId || !templateForm.name || !templateForm.storeName) {
      return;
    }

    setSavingTemplate(true);
    try {
      // Template chỉ cần thông tin template, không cần printer config
      // Printer config sẽ được cấu hình riêng ở cấp chi nhánh
      const {
        connectionType,
        printerIp,
        printerPort,
        printerMac,
        printerUsbPath,
        autoPrintOnPayment,
        printPreview,
        retryCount,
        retryDelayMs,
        connectionTimeoutMs,
        ...templateData
      } = templateForm;

      // Template thuộc về thương hiệu (brand), không phải chi nhánh (branch)
      const templateDataWithBrand = {
        ...templateData,
        brandId: filterBrandId,
      };

      let savedTemplate: BillTemplate;

      if (templateDialog === "create") {
        // Tạo template mới cho thương hiệu
        savedTemplate = await billTemplateService.createTemplate(templateDataWithBrand);
        setTemplates((prev) => [...prev, savedTemplate]);
        toast({ title: "Thành công", description: "Đã thêm mẫu bill mới" });
      } else if (editingTemplate) {
        // Cập nhật template
        savedTemplate = await billTemplateService.updateTemplate(editingTemplate.id, templateData);
        setTemplates((prev) => prev.map((t) => (t.id === savedTemplate.id ? savedTemplate : t)));
        toast({ title: "Thành công", description: "Đã cập nhật mẫu bill" });
      }
      setTemplateDialog(null);
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleToggleTemplate = async (id: string) => {
    try {
      const updated = await billTemplateService.toggleTemplate(id);
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể cập nhật trạng thái", variant: "destructive" });
    }
  };

  const handleSetDefaultTemplate = async (id: string) => {
    try {
      const updated = await billTemplateService.setDefaultTemplate(id);
      setTemplates((prev) =>
        prev.map((t) => ({
          ...t,
          isDefault: t.id === updated.id,
        }))
      );
      toast({ title: "Thành công", description: "Đã đặt làm mẫu mặc định" });
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể đặt làm mặc định", variant: "destructive" });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa mẫu bill này?")) return;
    try {
      await billTemplateService.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Thành công", description: "Đã xóa mẫu bill" });
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể xóa", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mẫu in Bill</h1>
          <p className="text-muted-foreground">Quản lý mẫu hóa đơn cho thương hiệu</p>
        </div>
        <BrandFilter
          selectedBrandId={filterBrandId}
          onBrandChange={setFilterBrandId}
          showAllOption={false}
          className="w-[200px]"
        />
      </div>

      {/* Bill Templates Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mẫu in Bill</CardTitle>
              <CardDescription>Quản lý mẫu hóa đơn cho thương hiệu. Cấu hình máy in được quản lý riêng ở mục "Máy in Bill"</CardDescription>
            </div>
            <Button onClick={() => openTemplateDialog("create")} disabled={!filterBrandId}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm mẫu bill
            </Button>
          </div>
        </CardHeader>
        <CardContent>
              {loadingTemplates ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">Chưa có mẫu bill nào</p>
                  <p className="text-xs text-muted-foreground">
                    Tạo mẫu bill đầu tiên để bắt đầu in hóa đơn
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => (
                    <Card key={template.id} className={template.isDefault ? "border-primary" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              {template.isDefault && (
                                <Badge variant="default" className="gap-1">
                                  <Star className="h-3 w-3" />
                                  Mặc định
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="mt-1">
                              {BILL_TEMPLATE_TYPE_LABELS[template.templateType]}
                            </CardDescription>
                          </div>
                          <Switch
                            checked={template.isActive}
                            onCheckedChange={() => handleToggleTemplate(template.id)}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <p className="font-medium">{template.storeName}</p>
                          {template.storeAddress && (
                            <p className="text-muted-foreground truncate">{template.storeAddress}</p>
                          )}
                          <div className="flex flex-wrap gap-1 pt-2">
                            {template.showVat && <Badge variant="outline">VAT</Badge>}
                            {template.showQrCode && <Badge variant="outline">QR</Badge>}
                            {template.showBarcode && <Badge variant="outline">Barcode</Badge>}
                            {template.showWifiInfo && <Badge variant="outline">WiFi</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Giấy: {template.paperWidth}mm • Font: {template.fontSize} • Dòng: {((template.lineSpacing || 0.7) * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div className="flex items-center gap-1 mt-4 pt-4 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewTemplate(template)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Xem
                          </Button>
                          {!template.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefaultTemplate(template.id)}
                            >
                              <Star className="h-4 w-4 mr-1" />
                              Mặc định
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openTemplateDialog("edit", template)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Sửa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
        </CardContent>
      </Card>

      {/* Bill Template Dialog */}
      <Dialog open={templateDialog !== null} onOpenChange={() => setTemplateDialog(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {templateDialog === "create" ? "Thêm mẫu bill mới" : "Sửa mẫu bill"}
            </DialogTitle>
            <DialogDescription>
              Thiết lập các thông tin hiển thị trên hóa đơn bán hàng
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[60vh]">
            {/* Form Section - 2/3 width */}
            <div className="lg:col-span-2 overflow-y-auto pr-2 h-full">
              <div className="space-y-4">
              {/* Basic info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tên mẫu *</Label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="VD: Mẫu bill chính"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Loại mẫu *</Label>
                  <Select
                    value={templateForm.templateType}
                    onValueChange={(value: BillTemplateType) =>
                      setTemplateForm({ ...templateForm, templateType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BILL_TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {BILL_TEMPLATE_TYPE_DESCRIPTIONS[templateForm.templateType || BillTemplateType.CLASSIC]}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Input
                    value={templateForm.description || ""}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    placeholder="Mô tả ngắn..."
                  />
                </div>
              </div>

              <Tabs value={formTab} onValueChange={setFormTab}>
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="header">Header</TabsTrigger>
                  <TabsTrigger value="content">Nội dung</TabsTrigger>
                  <TabsTrigger value="price">Giá & VAT</TabsTrigger>
                  <TabsTrigger value="payment">Thanh toán</TabsTrigger>
                  <TabsTrigger value="footer">Footer</TabsTrigger>
                  <TabsTrigger value="style">Kiểu in</TabsTrigger>
                </TabsList>

                {/* Header Config */}
                <TabsContent value="header" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tên cửa hàng *</Label>
                      <Input
                        value={templateForm.storeName}
                        onChange={(e) => setTemplateForm({ ...templateForm, storeName: e.target.value })}
                        placeholder="VD: NHÀ HÀNG ABC"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mã số thuế</Label>
                      <Input
                        value={templateForm.taxCode || ""}
                        onChange={(e) => setTemplateForm({ ...templateForm, taxCode: e.target.value })}
                        placeholder="VD: 0123456789"
                        className="font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Địa chỉ</Label>
                    <Textarea
                      value={templateForm.storeAddress || ""}
                      onChange={(e) => setTemplateForm({ ...templateForm, storeAddress: e.target.value })}
                      placeholder="Địa chỉ cửa hàng..."
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Số điện thoại</Label>
                      <Input
                        value={templateForm.storePhone || ""}
                        onChange={(e) => setTemplateForm({ ...templateForm, storePhone: e.target.value })}
                        placeholder="VD: 028 1234 5678"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tiêu đề bill</Label>
                      <Input
                        value={templateForm.billTitle || ""}
                        onChange={(e) => setTemplateForm({ ...templateForm, billTitle: e.target.value })}
                        placeholder="VD: HÓA ĐƠN BÁN HÀNG"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Text header tùy chỉnh</Label>
                    <Textarea
                      value={templateForm.headerText || ""}
                      onChange={(e) => setTemplateForm({ ...templateForm, headerText: e.target.value })}
                      placeholder="Thông tin bổ sung hiển thị ở đầu bill..."
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.showLogo || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showLogo: checked })}
                      />
                      <Label>Hiển thị logo</Label>
                    </div>
                  </div>
                  {templateForm.showLogo && (
                    <div className="space-y-2">
                      <Label>URL Logo</Label>
                      <Input
                        value={templateForm.logoUrl || ""}
                        onChange={(e) => setTemplateForm({ ...templateForm, logoUrl: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                </TabsContent>

                {/* Content Config */}
                <TabsContent value="content" className="space-y-4">
                  {/* Item Display Layout Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Kiểu hiển thị danh sách món</Label>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {Object.values(ItemDisplayLayout).map((layout) => (
                        <div
                          key={layout}
                          className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all hover:border-primary/50 ${
                            templateForm.itemDisplayLayout === layout
                              ? "border-primary bg-primary/5"
                              : "border-muted"
                          }`}
                          onClick={() => setTemplateForm({ ...templateForm, itemDisplayLayout: layout })}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`h-3 w-3 rounded-full border-2 ${
                              templateForm.itemDisplayLayout === layout
                                ? "border-primary bg-primary"
                                : "border-muted-foreground"
                            }`} />
                            <span className="font-medium text-sm">{ITEM_DISPLAY_LAYOUT_LABELS[layout]}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {ITEM_DISPLAY_LAYOUT_DESCRIPTIONS[layout]}
                          </p>
                          <div className="bg-muted/50 rounded p-2 font-mono text-xs leading-relaxed">
                            {ITEM_DISPLAY_LAYOUT_EXAMPLES[layout].map((line, i) => (
                              <div key={i} className="whitespace-pre">{line}</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium text-muted-foreground mb-3 block">Thông tin hiển thị</Label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.showOrderNumber || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showOrderNumber: checked })}
                      />
                      <Label>Hiển thị mã đơn</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.showTableName || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showTableName: checked })}
                      />
                      <Label>Hiển thị tên bàn</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.showStaffName || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showStaffName: checked })}
                      />
                      <Label>Hiển thị nhân viên</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.showCustomerName || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showCustomerName: checked })}
                      />
                      <Label>Hiển thị tên khách</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.showDateTime || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showDateTime: checked })}
                      />
                      <Label>Hiển thị ngày giờ</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.showCheckInTime || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showCheckInTime: checked })}
                      />
                      <Label>Hiển thị giờ vào</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.showCheckOutTime || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showCheckOutTime: checked })}
                      />
                      <Label>Hiển thị giờ ra</Label>
                    </div>
                  </div>
                  {(templateForm.showCheckInTime || templateForm.showCheckOutTime) && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nhãn giờ vào</Label>
                        <Input
                          value={templateForm.checkInLabel || "Giờ vào"}
                          onChange={(e) => setTemplateForm({ ...templateForm, checkInLabel: e.target.value })}
                          placeholder="Giờ vào"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nhãn giờ ra</Label>
                        <Input
                          value={templateForm.checkOutLabel || "Giờ ra"}
                          onChange={(e) => setTemplateForm({ ...templateForm, checkOutLabel: e.target.value })}
                          placeholder="Giờ ra"
                        />
                      </div>
                    </div>
                  )}
                  {templateForm.showDateTime && (
                    <div className="space-y-2">
                      <Label>Định dạng ngày giờ</Label>
                      <Select
                        value={templateForm.dateFormat || "dd/MM/yyyy HH:mm"}
                        onValueChange={(value) => setTemplateForm({ ...templateForm, dateFormat: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DATE_FORMAT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Hiển thị món</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={templateForm.showItemCode || false}
                          onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showItemCode: checked })}
                        />
                        <Label>Hiển thị mã món</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={templateForm.showItemNote || false}
                          onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showItemNote: checked })}
                        />
                        <Label>Hiển thị ghi chú món</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={templateForm.showOrderNote || false}
                          onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showOrderNote: checked })}
                        />
                        <Label>Hiển thị ghi chú tổng bill</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={templateForm.showUnitPrice || false}
                          onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showUnitPrice: checked })}
                        />
                        <Label>Hiển thị đơn giá</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={templateForm.showQuantity || false}
                          onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showQuantity: checked })}
                        />
                        <Label>Hiển thị số lượng</Label>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Price & VAT Config */}
                <TabsContent value="price" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.showSubtotal || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showSubtotal: checked })}
                      />
                      <Label>Hiển thị tạm tính</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.showServiceFee || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showServiceFee: checked })}
                      />
                      <Label>Hiển thị phí dịch vụ</Label>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Cấu hình giảm giá (4 loại)</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Có 4 loại giảm giá: Giảm giá món (ưu tiên 1) → Giảm giá hóa đơn (ưu tiên 2) → Coupon (ưu tiên 3) → Voucher (ưu tiên 4)
                    </p>

                    {/* 1. Giảm giá món */}
                    <div className="border rounded-lg p-3 mb-3">
                      <h5 className="text-sm font-medium mb-2 text-orange-600">1. Giảm giá món (Item Discount)</h5>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={templateForm.showItemDiscount ?? true}
                            onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showItemDiscount: checked })}
                          />
                          <Label>Hiển thị giảm giá từng món</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={templateForm.showTotalItemDiscount ?? true}
                            onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showTotalItemDiscount: checked })}
                          />
                          <Label>Hiển thị tổng giảm giá các món</Label>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Nhãn hiển thị</Label>
                        <Input
                          value={templateForm.itemDiscountLabel || "Giảm giá món"}
                          onChange={(e) => setTemplateForm({ ...templateForm, itemDiscountLabel: e.target.value })}
                          placeholder="Giảm giá món"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* 2. Giảm giá hóa đơn */}
                    <div className="border rounded-lg p-3 mb-3">
                      <h5 className="text-sm font-medium mb-2 text-blue-600">2. Giảm giá hóa đơn (Bill Discount)</h5>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={templateForm.showBillDiscount ?? true}
                            onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showBillDiscount: checked })}
                          />
                          <Label>Hiển thị giảm giá hóa đơn</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={templateForm.showDiscountPercent || false}
                            onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showDiscountPercent: checked })}
                          />
                          <Label>Hiển thị % giảm giá</Label>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Nhãn hiển thị</Label>
                        <Input
                          value={templateForm.billDiscountLabel || "Giảm giá hóa đơn"}
                          onChange={(e) => setTemplateForm({ ...templateForm, billDiscountLabel: e.target.value })}
                          placeholder="Giảm giá hóa đơn"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* 3. Coupon */}
                    <div className="border rounded-lg p-3 mb-3">
                      <h5 className="text-sm font-medium mb-2 text-green-600">3. Coupon</h5>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={templateForm.showCouponDiscount ?? true}
                          onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showCouponDiscount: checked })}
                        />
                        <Label>Hiển thị giảm giá coupon</Label>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Nhãn hiển thị</Label>
                        <Input
                          value={templateForm.couponDiscountLabel || "Mã giảm giá"}
                          onChange={(e) => setTemplateForm({ ...templateForm, couponDiscountLabel: e.target.value })}
                          placeholder="Mã giảm giá"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* 4. Voucher */}
                    <div className="border rounded-lg p-3 mb-3">
                      <h5 className="text-sm font-medium mb-2 text-purple-600">4. Voucher</h5>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={templateForm.showVoucherDiscount ?? true}
                          onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showVoucherDiscount: checked })}
                        />
                        <Label>Hiển thị giảm giá voucher</Label>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Nhãn hiển thị</Label>
                        <Input
                          value={templateForm.voucherDiscountLabel || "Voucher"}
                          onChange={(e) => setTemplateForm({ ...templateForm, voucherDiscountLabel: e.target.value })}
                          placeholder="Voucher"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Tổng giảm giá */}
                    <div className="border rounded-lg p-3 bg-muted/30">
                      <h5 className="text-sm font-medium mb-2">Tổng giảm giá</h5>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={templateForm.showTotalDiscount ?? true}
                          onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showTotalDiscount: checked })}
                        />
                        <Label>Hiển thị tổng tất cả giảm giá</Label>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Nhãn hiển thị</Label>
                        <Input
                          value={templateForm.totalDiscountLabel || "Tổng giảm giá"}
                          onChange={(e) => setTemplateForm({ ...templateForm, totalDiscountLabel: e.target.value })}
                          placeholder="Tổng giảm giá"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Cấu hình VAT</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={templateForm.showVat || false}
                          onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showVat: checked })}
                        />
                        <Label>Hiển thị VAT</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={templateForm.showVatDetails || false}
                          onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showVatDetails: checked })}
                        />
                        <Label>Chi tiết VAT từng món</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={templateForm.showPriceBeforeVat || false}
                          onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showPriceBeforeVat: checked })}
                        />
                        <Label>Hiển thị giá trước VAT</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={templateForm.showPriceAfterVat || false}
                          onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showPriceAfterVat: checked })}
                        />
                        <Label>Hiển thị giá sau VAT</Label>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3 mt-4">
                      <div className="space-y-2">
                        <Label>Nhãn VAT</Label>
                        <Input
                          value={templateForm.vatLabel || ""}
                          onChange={(e) => setTemplateForm({ ...templateForm, vatLabel: e.target.value })}
                          placeholder="VAT"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nhãn giá trước VAT</Label>
                        <Input
                          value={templateForm.priceBeforeVatLabel || ""}
                          onChange={(e) => setTemplateForm({ ...templateForm, priceBeforeVatLabel: e.target.value })}
                          placeholder="Giá trước thuế"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nhãn giá sau VAT</Label>
                        <Input
                          value={templateForm.priceAfterVatLabel || ""}
                          onChange={(e) => setTemplateForm({ ...templateForm, priceAfterVatLabel: e.target.value })}
                          placeholder="Giá sau thuế"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Payment Config */}
                <TabsContent value="payment" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.showPaymentMethod || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showPaymentMethod: checked })}
                      />
                      <Label>Hiển thị phương thức thanh toán</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.showReceivedAmount || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showReceivedAmount: checked })}
                      />
                      <Label>Hiển thị tiền khách đưa</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.showChangeAmount || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showChangeAmount: checked })}
                      />
                      <Label>Hiển thị tiền trả lại</Label>
                    </div>
                  </div>
                </TabsContent>

                {/* Footer Config */}
                <TabsContent value="footer" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Lời cảm ơn</Label>
                      <Input
                        value={templateForm.thankYouMessage || ""}
                        onChange={(e) => setTemplateForm({ ...templateForm, thankYouMessage: e.target.value })}
                        placeholder="Cảm ơn quý khách!"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Lời hẹn gặp lại</Label>
                      <Input
                        value={templateForm.comebackMessage || ""}
                        onChange={(e) => setTemplateForm({ ...templateForm, comebackMessage: e.target.value })}
                        placeholder="Hẹn gặp lại!"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Text footer tùy chỉnh</Label>
                    <Textarea
                      value={templateForm.footerText || ""}
                      onChange={(e) => setTemplateForm({ ...templateForm, footerText: e.target.value })}
                      placeholder="Thông tin bổ sung ở cuối bill..."
                      rows={2}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">QR Code & Barcode</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={templateForm.showQrCode || false}
                          onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showQrCode: checked })}
                        />
                        <Label>Hiển thị QR Code</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={templateForm.showBarcode || false}
                          onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showBarcode: checked })}
                        />
                        <Label>Hiển thị Barcode</Label>
                      </div>
                    </div>
                    {templateForm.showQrCode && (
                      <div className="grid gap-4 md:grid-cols-2 mt-4">
                        <div className="space-y-2">
                          <Label>Loại QR Code</Label>
                          <Select
                            value={templateForm.qrCodeType || "order_id"}
                            onValueChange={(value) => setTemplateForm({ ...templateForm, qrCodeType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(QR_CODE_TYPE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {templateForm.qrCodeType === "custom" && (
                          <div className="space-y-2">
                            <Label>Nội dung QR tùy chỉnh</Label>
                            <Input
                              value={templateForm.qrCodeContent || ""}
                              onChange={(e) => setTemplateForm({ ...templateForm, qrCodeContent: e.target.value })}
                              placeholder="URL hoặc nội dung..."
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">WiFi Info</h4>
                    <div className="flex items-center gap-2 mb-4">
                      <Switch
                        checked={templateForm.showWifiInfo || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showWifiInfo: checked })}
                      />
                      <Label>Hiển thị thông tin WiFi</Label>
                    </div>
                    {templateForm.showWifiInfo && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Tên WiFi</Label>
                          <Input
                            value={templateForm.wifiName || ""}
                            onChange={(e) => setTemplateForm({ ...templateForm, wifiName: e.target.value })}
                            placeholder="WiFi name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Mật khẩu WiFi</Label>
                          <Input
                            value={templateForm.wifiPassword || ""}
                            onChange={(e) => setTemplateForm({ ...templateForm, wifiPassword: e.target.value })}
                            placeholder="********"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Style Config */}
                <TabsContent value="style" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Khổ giấy</Label>
                      <Select
                        value={String(templateForm.paperWidth || 80)}
                        onValueChange={(value) => setTemplateForm({ ...templateForm, paperWidth: Number(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAPER_WIDTH_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cỡ chữ</Label>
                      <Select
                        value={templateForm.fontSize || "normal"}
                        onValueChange={(value) => setTemplateForm({ ...templateForm, fontSize: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_SIZE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Số bản in</Label>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        value={templateForm.numberOfCopies || 1}
                        onChange={(e) => setTemplateForm({ ...templateForm, numberOfCopies: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label>Khoảng cách dòng ({((templateForm.lineSpacing || 0.7) * 100).toFixed(0)}%)</Label>
                      <span className="text-xs text-muted-foreground">
                        {(templateForm.lineSpacing || 0.7) <= 0.4 ? "Rất sát" : (templateForm.lineSpacing || 0.7) <= 0.6 ? "Sát" : (templateForm.lineSpacing || 0.7) <= 0.8 ? "Bình thường" : "Rộng"}
                      </span>
                    </div>
                    <Slider
                      value={[(templateForm.lineSpacing || 0.7) * 100]}
                      min={30}
                      max={100}
                      step={5}
                      onValueChange={([value]) => setTemplateForm({ ...templateForm, lineSpacing: value / 100 })}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>30% (rất sát)</span>
                      <span>100% (bình thường)</span>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Ký tự phân cách</Label>
                      <Input
                        value={templateForm.separatorChar || "-"}
                        onChange={(e) => setTemplateForm({ ...templateForm, separatorChar: e.target.value })}
                        maxLength={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ký tự phân cách đôi</Label>
                      <Input
                        value={templateForm.doubleSeparatorChar || "="}
                        onChange={(e) => setTemplateForm({ ...templateForm, doubleSeparatorChar: e.target.value })}
                        maxLength={1}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.cutPaper || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, cutPaper: checked })}
                      />
                      <Label>Cắt giấy tự động</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.openCashDrawer || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, openCashDrawer: checked })}
                      />
                      <Label>Mở ngăn kéo tiền</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.beepAfterPrint || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, beepAfterPrint: checked })}
                      />
                      <Label>Beep sau khi in</Label>
                    </div>
                  </div>
                </TabsContent>

              </Tabs>
              </div>
            </div>

            {/* Live Preview Section - 1/3 width */}
            <div className="hidden lg:block border-l pl-6 overflow-y-auto h-full">
              <h3 className="font-medium text-sm text-muted-foreground mb-3 sticky top-0 bg-background py-1">Xem trước trực tiếp</h3>
              <BillPreviewPanel template={deferredTemplateForm} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialog(null)}>
              Hủy
            </Button>
            <Button onClick={handleSaveTemplate} disabled={savingTemplate || !templateForm.name || !templateForm.storeName}>
              {savingTemplate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {templateDialog === "create" ? "Thêm" : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog - Su dung BillPreviewPanel de dong bo voi live preview */}
      <Dialog open={previewTemplate !== null} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Xem truoc mau bill</DialogTitle>
            <DialogDescription>
              {previewTemplate?.name} - {previewTemplate?.paperWidth}mm - Layout: {previewTemplate?.itemDisplayLayout ? ITEM_DISPLAY_LAYOUT_LABELS[previewTemplate.itemDisplayLayout as ItemDisplayLayout] : "Standard"}
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <ScrollArea className="max-h-[70vh]">
              <BillPreviewPanel template={previewTemplate} />
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
