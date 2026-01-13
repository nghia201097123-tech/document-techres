"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { BrandBranchFilter, useGlobalFilters } from "@/components/ui/brand-filter";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBranchesByBrand } from "@/store/slices/branchesSlice";
import {
  FileText,
  Printer,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Star,
  Power,
  Wifi,
  Settings2,
  Eye,
  TestTube,
  CheckCircle,
  XCircle,
  Copy,
} from "lucide-react";
import {
  billTemplateService,
  BillTemplate,
  BillPrinterConfig,
  BillTemplateType,
  PrinterConnectionType,
  CreateBillTemplateDto,
  CreateBillPrinterConfigDto,
  BILL_TEMPLATE_TYPE_LABELS,
  BILL_TEMPLATE_TYPE_DESCRIPTIONS,
  PRINTER_CONNECTION_TYPE_LABELS,
  PAPER_WIDTH_OPTIONS,
  FONT_SIZE_OPTIONS,
  DATE_FORMAT_OPTIONS,
  QR_CODE_TYPE_LABELS,
  DEFAULT_BILL_TEMPLATE,
  DEFAULT_PRINTER_CONFIG,
} from "@/services/bill-template-service";

type DialogMode = "create" | "edit" | null;

export default function BillTemplatePage() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { brandId: filterBrandId, branchId: filterBranchId, setBrandId: setFilterBrandId, setBranchId: setFilterBranchId } = useGlobalFilters();
  const { byBrandId: branchesByBrand, loading: loadingBranches } = useAppSelector((state) => state.branches);

  // Get branches for the selected brand
  const branches = filterBrandId && filterBrandId !== "all" && filterBrandId !== ""
    ? branchesByBrand[filterBrandId] || []
    : [];

  // Load branches when brand changes
  React.useEffect(() => {
    if (filterBrandId && filterBrandId !== "all" && filterBrandId !== "") {
      dispatch(fetchBranchesByBrand(filterBrandId));
    }
  }, [filterBrandId, dispatch]);

  // Bill Templates state
  const [templates, setTemplates] = React.useState<BillTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = React.useState(false);
  const [templateDialog, setTemplateDialog] = React.useState<DialogMode>(null);
  const [editingTemplate, setEditingTemplate] = React.useState<BillTemplate | null>(null);
  const [savingTemplate, setSavingTemplate] = React.useState(false);
  const [previewTemplate, setPreviewTemplate] = React.useState<BillTemplate | null>(null);

  // Printer Configs state
  const [printerConfigs, setPrinterConfigs] = React.useState<BillPrinterConfig[]>([]);
  const [loadingPrinters, setLoadingPrinters] = React.useState(false);
  const [printerDialog, setPrinterDialog] = React.useState<DialogMode>(null);
  const [editingPrinter, setEditingPrinter] = React.useState<BillPrinterConfig | null>(null);
  const [savingPrinter, setSavingPrinter] = React.useState(false);
  const [testingPrinter, setTestingPrinter] = React.useState<string | null>(null);

  // Form states
  const [templateForm, setTemplateForm] = React.useState<CreateBillTemplateDto>({
    branchId: "",
    name: "",
    storeName: "",
    templateType: BillTemplateType.CLASSIC,
    ...DEFAULT_BILL_TEMPLATE,
  });

  const [printerForm, setPrinterForm] = React.useState<CreateBillPrinterConfigDto>({
    branchId: "",
    name: "",
    connectionType: PrinterConnectionType.NETWORK,
    ...DEFAULT_PRINTER_CONFIG,
  });

  // Active tab for template form
  const [formTab, setFormTab] = React.useState("header");

  // Load data when brand changes
  React.useEffect(() => {
    if (filterBrandId) {
      loadTemplates();
      loadPrinterConfigs();
    }
  }, [filterBrandId]);

  const loadTemplates = async () => {
    if (!filterBrandId) return;
    setLoadingTemplates(true);
    try {
      const data = await billTemplateService.getAllTemplates(filterBrandId);
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách mẫu bill", variant: "destructive" });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadPrinterConfigs = async () => {
    if (!filterBrandId) return;
    setLoadingPrinters(true);
    try {
      const data = await billTemplateService.getAllPrinterConfigs(filterBrandId);
      setPrinterConfigs(data);
    } catch (error) {
      console.error("Error loading printer configs:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách máy in", variant: "destructive" });
    } finally {
      setLoadingPrinters(false);
    }
  };

  // Template handlers
  const openTemplateDialog = (mode: DialogMode, template?: BillTemplate) => {
    if (mode === "edit" && template) {
      setEditingTemplate(template);
      setTemplateForm({
        branchId: template.branchId,
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
        showItemCode: template.showItemCode,
        showItemNote: template.showItemNote,
        showUnitPrice: template.showUnitPrice,
        showQuantity: template.showQuantity,
        showSubtotal: template.showSubtotal,
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
        separatorChar: template.separatorChar,
        doubleSeparatorChar: template.doubleSeparatorChar,
        cutPaper: template.cutPaper,
        openCashDrawer: template.openCashDrawer,
        beepAfterPrint: template.beepAfterPrint,
        numberOfCopies: template.numberOfCopies,
        sortOrder: template.sortOrder,
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        branchId: filterBranchId || "",
        name: "",
        storeName: "",
        templateType: BillTemplateType.CLASSIC,
        ...DEFAULT_BILL_TEMPLATE,
      });
    }
    setFormTab("header");
    setTemplateDialog(mode);
  };

  const handleSaveTemplate = async () => {
    if (!filterBrandId || !templateForm.name || !templateForm.storeName || !templateForm.branchId) {
      if (!templateForm.branchId) {
        toast({ title: "Lỗi", description: "Vui lòng chọn chi nhánh", variant: "destructive" });
      }
      return;
    }
    setSavingTemplate(true);
    try {
      if (templateDialog === "create") {
        const newTemplate = await billTemplateService.createTemplate(filterBrandId, templateForm);
        setTemplates((prev) => [...prev, newTemplate]);
        toast({ title: "Thành công", description: "Đã thêm mẫu bill mới" });
      } else if (editingTemplate) {
        const updated = await billTemplateService.updateTemplate(editingTemplate.id, templateForm);
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
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

  // Printer handlers
  const openPrinterDialog = (mode: DialogMode, printer?: BillPrinterConfig) => {
    if (mode === "edit" && printer) {
      setEditingPrinter(printer);
      setPrinterForm({
        branchId: printer.branchId,
        name: printer.name,
        description: printer.description,
        connectionType: printer.connectionType,
        printerIp: printer.printerIp,
        printerPort: printer.printerPort,
        printerMac: printer.printerMac,
        printerUsbPath: printer.printerUsbPath,
        templateId: printer.templateId,
        paperWidth: printer.paperWidth,
        autoPrintOnPayment: printer.autoPrintOnPayment,
        printPreview: printer.printPreview,
        numberOfCopies: printer.numberOfCopies,
        cutPaper: printer.cutPaper,
        openCashDrawer: printer.openCashDrawer,
        beepAfterPrint: printer.beepAfterPrint,
        retryCount: printer.retryCount,
        retryDelayMs: printer.retryDelayMs,
        connectionTimeoutMs: printer.connectionTimeoutMs,
        sortOrder: printer.sortOrder,
      });
    } else {
      setEditingPrinter(null);
      setPrinterForm({
        branchId: filterBranchId || "",
        name: "",
        connectionType: PrinterConnectionType.NETWORK,
        ...DEFAULT_PRINTER_CONFIG,
      });
    }
    setPrinterDialog(mode);
  };

  const handleSavePrinter = async () => {
    if (!filterBrandId || !printerForm.name || !printerForm.branchId) {
      if (!printerForm.branchId) {
        toast({ title: "Lỗi", description: "Vui lòng chọn chi nhánh", variant: "destructive" });
      }
      return;
    }
    setSavingPrinter(true);
    try {
      if (printerDialog === "create") {
        const newPrinter = await billTemplateService.createPrinterConfig(filterBrandId, printerForm);
        setPrinterConfigs((prev) => [...prev, newPrinter]);
        toast({ title: "Thành công", description: "Đã thêm máy in bill mới" });
      } else if (editingPrinter) {
        const updated = await billTemplateService.updatePrinterConfig(editingPrinter.id, printerForm);
        setPrinterConfigs((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        toast({ title: "Thành công", description: "Đã cập nhật cấu hình máy in" });
      }
      setPrinterDialog(null);
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingPrinter(false);
    }
  };

  const handleTogglePrinter = async (id: string) => {
    try {
      const updated = await billTemplateService.togglePrinterConfig(id);
      setPrinterConfigs((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể cập nhật trạng thái", variant: "destructive" });
    }
  };

  const handleSetDefaultPrinter = async (id: string) => {
    try {
      const updated = await billTemplateService.setDefaultPrinterConfig(id);
      setPrinterConfigs((prev) =>
        prev.map((p) => ({
          ...p,
          isDefault: p.id === updated.id,
        }))
      );
      toast({ title: "Thành công", description: "Đã đặt làm máy in mặc định" });
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể đặt làm mặc định", variant: "destructive" });
    }
  };

  const handleDeletePrinter = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa cấu hình máy in này?")) return;
    try {
      await billTemplateService.deletePrinterConfig(id);
      setPrinterConfigs((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Thành công", description: "Đã xóa cấu hình máy in" });
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể xóa", variant: "destructive" });
    }
  };

  const handleTestPrinter = async (id: string) => {
    setTestingPrinter(id);
    try {
      const result = await billTemplateService.testPrinterConnection(id);
      if (result.success) {
        toast({ title: "Thành công", description: result.message });
      } else {
        toast({ title: "Lỗi kết nối", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.response?.data?.message || "Không thể kiểm tra kết nối", variant: "destructive" });
    } finally {
      setTestingPrinter(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mẫu Bill & Máy in</h1>
          <p className="text-muted-foreground">Quản lý mẫu hóa đơn và cấu hình máy in bill</p>
        </div>
        <BrandBranchFilter
          selectedBrandId={filterBrandId}
          selectedBranchId={filterBranchId}
          onBrandChange={setFilterBrandId}
          onBranchChange={setFilterBranchId}
          showAllBrandOption={false}
          showAllBranchOption={false}
          brandClassName="w-[180px]"
          branchClassName="w-[180px]"
        />
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Mẫu Bill
          </TabsTrigger>
          <TabsTrigger value="printers" className="gap-2">
            <Printer className="h-4 w-4" />
            Máy in Bill
          </TabsTrigger>
        </TabsList>

        {/* Bill Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mẫu Bill</CardTitle>
                  <CardDescription>Thiết kế và quản lý các mẫu hóa đơn bán hàng</CardDescription>
                </div>
                <Button onClick={() => openTemplateDialog("create")} disabled={!filterBrandId || !filterBranchId}>
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
                            Giấy: {template.paperWidth}mm • Font: {template.fontSize}
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
        </TabsContent>

        {/* Printer Configs Tab */}
        <TabsContent value="printers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Máy in Bill</CardTitle>
                  <CardDescription>Cấu hình máy in hóa đơn cho thu ngân</CardDescription>
                </div>
                <Button onClick={() => openPrinterDialog("create")} disabled={!filterBrandId || !filterBranchId}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm máy in
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPrinters ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : printerConfigs.length === 0 ? (
                <div className="text-center py-8">
                  <Printer className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">Chưa có máy in bill nào</p>
                  <p className="text-xs text-muted-foreground">
                    Thêm máy in để in hóa đơn khi thanh toán
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {printerConfigs.map((printer) => (
                    <div
                      key={printer.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        printer.isDefault ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${printer.isDefault ? "bg-primary/10" : "bg-muted"}`}>
                          <Printer className={`h-5 w-5 ${printer.isDefault ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{printer.name}</p>
                            {printer.isDefault && (
                              <Badge variant="default" className="gap-1">
                                <Star className="h-3 w-3" />
                                Mặc định
                              </Badge>
                            )}
                            <Badge variant="outline">
                              {PRINTER_CONNECTION_TYPE_LABELS[printer.connectionType]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            {printer.connectionType === PrinterConnectionType.NETWORK && (
                              <span className="font-mono">
                                {printer.printerIp}:{printer.printerPort}
                              </span>
                            )}
                            {printer.connectionType === PrinterConnectionType.BLUETOOTH && (
                              <span className="font-mono">{printer.printerMac}</span>
                            )}
                            <span>• Giấy {printer.paperWidth}mm</span>
                            {printer.autoPrintOnPayment && (
                              <span>• Tự động in khi thanh toán</span>
                            )}
                          </div>
                          {printer.template && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Mẫu: {printer.template.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestPrinter(printer.id)}
                          disabled={testingPrinter === printer.id}
                        >
                          {testingPrinter === printer.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <TestTube className="h-4 w-4 mr-1" />
                          )}
                          Test
                        </Button>
                        <Switch
                          checked={printer.isActive}
                          onCheckedChange={() => handleTogglePrinter(printer.id)}
                        />
                        {!printer.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSetDefaultPrinter(printer.id)}
                            title="Đặt làm mặc định"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPrinterDialog("edit", printer)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePrinter(printer.id)}
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

      {/* Bill Template Dialog */}
      <Dialog open={templateDialog !== null} onOpenChange={() => setTemplateDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {templateDialog === "create" ? "Thêm mẫu bill mới" : "Sửa mẫu bill"}
            </DialogTitle>
            <DialogDescription>
              Thiết lập các thông tin hiển thị trên hóa đơn bán hàng
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {/* Basic info */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Chi nhánh *</Label>
                  <Select
                    value={templateForm.branchId}
                    onValueChange={(value) => setTemplateForm({ ...templateForm, branchId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chi nhánh" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.filter((b) => b.isActive).map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  </div>
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
                        checked={templateForm.showDiscount || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showDiscount: checked })}
                      />
                      <Label>Hiển thị giảm giá</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.showDiscountPercent || false}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, showDiscountPercent: checked })}
                      />
                      <Label>Hiển thị % giảm giá</Label>
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
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialog(null)}>
              Hủy
            </Button>
            <Button onClick={handleSaveTemplate} disabled={savingTemplate || !templateForm.name || !templateForm.storeName || !templateForm.branchId}>
              {savingTemplate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {templateDialog === "create" ? "Thêm" : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printer Config Dialog */}
      <Dialog open={printerDialog !== null} onOpenChange={() => setPrinterDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {printerDialog === "create" ? "Thêm máy in bill" : "Sửa cấu hình máy in"}
            </DialogTitle>
            <DialogDescription>
              Cấu hình kết nối và tùy chọn in cho máy in bill
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Chi nhánh *</Label>
                  <Select
                    value={printerForm.branchId}
                    onValueChange={(value) => setPrinterForm({ ...printerForm, branchId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chi nhánh" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.filter((b) => b.isActive).map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tên máy in *</Label>
                  <Input
                    value={printerForm.name}
                    onChange={(e) => setPrinterForm({ ...printerForm, name: e.target.value })}
                    placeholder="VD: Máy in thu ngân"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Loại kết nối</Label>
                  <Select
                    value={printerForm.connectionType}
                    onValueChange={(value: PrinterConnectionType) =>
                      setPrinterForm({ ...printerForm, connectionType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRINTER_CONNECTION_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Connection details based on type */}
              {printerForm.connectionType === PrinterConnectionType.NETWORK && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Địa chỉ IP *</Label>
                    <Input
                      value={printerForm.printerIp || ""}
                      onChange={(e) => setPrinterForm({ ...printerForm, printerIp: e.target.value })}
                      placeholder="192.168.1.100"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={printerForm.printerPort || 9100}
                      onChange={(e) => setPrinterForm({ ...printerForm, printerPort: Number(e.target.value) })}
                      placeholder="9100"
                    />
                  </div>
                </div>
              )}

              {printerForm.connectionType === PrinterConnectionType.BLUETOOTH && (
                <div className="space-y-2">
                  <Label>MAC Address</Label>
                  <Input
                    value={printerForm.printerMac || ""}
                    onChange={(e) => setPrinterForm({ ...printerForm, printerMac: e.target.value })}
                    placeholder="00:11:22:33:44:55"
                    className="font-mono"
                  />
                </div>
              )}

              {printerForm.connectionType === PrinterConnectionType.USB && (
                <div className="space-y-2">
                  <Label>USB Path</Label>
                  <Input
                    value={printerForm.printerUsbPath || ""}
                    onChange={(e) => setPrinterForm({ ...printerForm, printerUsbPath: e.target.value })}
                    placeholder="/dev/usb/lp0"
                    className="font-mono"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Mẫu bill</Label>
                <Select
                  value={printerForm.templateId || "__none__"}
                  onValueChange={(value) => setPrinterForm({ ...printerForm, templateId: value === "__none__" ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn mẫu bill..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Không chọn (dùng mẫu mặc định)</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({BILL_TEMPLATE_TYPE_LABELS[template.templateType]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Input
                  value={printerForm.description || ""}
                  onChange={(e) => setPrinterForm({ ...printerForm, description: e.target.value })}
                  placeholder="Mô tả ngắn..."
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Tùy chọn in</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Khổ giấy</Label>
                    <Select
                      value={String(printerForm.paperWidth || 80)}
                      onValueChange={(value) => setPrinterForm({ ...printerForm, paperWidth: Number(value) })}
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
                    <Label>Số bản in</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={printerForm.numberOfCopies || 1}
                      onChange={(e) => setPrinterForm({ ...printerForm, numberOfCopies: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={printerForm.autoPrintOnPayment || false}
                      onCheckedChange={(checked) => setPrinterForm({ ...printerForm, autoPrintOnPayment: checked })}
                    />
                    <Label>Tự động in khi thanh toán</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={printerForm.printPreview || false}
                      onCheckedChange={(checked) => setPrinterForm({ ...printerForm, printPreview: checked })}
                    />
                    <Label>Xem trước khi in</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={printerForm.cutPaper || false}
                      onCheckedChange={(checked) => setPrinterForm({ ...printerForm, cutPaper: checked })}
                    />
                    <Label>Cắt giấy tự động</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={printerForm.openCashDrawer || false}
                      onCheckedChange={(checked) => setPrinterForm({ ...printerForm, openCashDrawer: checked })}
                    />
                    <Label>Mở ngăn kéo tiền</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={printerForm.beepAfterPrint || false}
                      onCheckedChange={(checked) => setPrinterForm({ ...printerForm, beepAfterPrint: checked })}
                    />
                    <Label>Beep sau khi in</Label>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Cấu hình kết nối</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Số lần thử lại</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={printerForm.retryCount || 3}
                      onChange={(e) => setPrinterForm({ ...printerForm, retryCount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Delay giữa lần thử (ms)</Label>
                    <Input
                      type="number"
                      min={100}
                      max={10000}
                      value={printerForm.retryDelayMs || 1000}
                      onChange={(e) => setPrinterForm({ ...printerForm, retryDelayMs: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Timeout kết nối (ms)</Label>
                    <Input
                      type="number"
                      min={1000}
                      max={30000}
                      value={printerForm.connectionTimeoutMs || 5000}
                      onChange={(e) => setPrinterForm({ ...printerForm, connectionTimeoutMs: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrinterDialog(null)}>
              Hủy
            </Button>
            <Button onClick={handleSavePrinter} disabled={savingPrinter || !printerForm.name || !printerForm.branchId}>
              {savingPrinter && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {printerDialog === "create" ? "Thêm" : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={previewTemplate !== null} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xem trước mẫu bill</DialogTitle>
            <DialogDescription>{previewTemplate?.name}</DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="bg-white p-4 border rounded-lg font-mono text-sm" style={{ width: previewTemplate.paperWidth === 58 ? "200px" : "280px" }}>
              {/* Simulated bill preview */}
              <div className="text-center space-y-1">
                {previewTemplate.showLogo && (
                  <div className="text-xs text-muted-foreground">[LOGO]</div>
                )}
                <p className="font-bold">{previewTemplate.storeName}</p>
                {previewTemplate.storeAddress && (
                  <p className="text-xs">{previewTemplate.storeAddress}</p>
                )}
                {previewTemplate.storePhone && (
                  <p className="text-xs">ĐT: {previewTemplate.storePhone}</p>
                )}
                {previewTemplate.taxCode && (
                  <p className="text-xs">MST: {previewTemplate.taxCode}</p>
                )}
              </div>
              <div className="my-2 border-t border-dashed" style={{ borderTopWidth: "1px" }} />
              <p className="text-center font-bold">{previewTemplate.billTitle}</p>
              <div className="my-2 border-t border-dashed" />
              {previewTemplate.showOrderNumber && <p>Mã đơn: #123456</p>}
              {previewTemplate.showTableName && <p>Bàn: A01</p>}
              {previewTemplate.showStaffName && <p>NV: Nguyễn Văn A</p>}
              {previewTemplate.showDateTime && <p>Giờ: 15:30 01/01/2024</p>}
              <div className="my-2 border-t border-dashed" />
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Phở bò</span>
                  <span>50,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Trà đá</span>
                  <span>5,000</span>
                </div>
              </div>
              <div className="my-2 border-t border-dashed" />
              {previewTemplate.showSubtotal && (
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span>55,000</span>
                </div>
              )}
              {previewTemplate.showPriceBeforeVat && (
                <div className="flex justify-between">
                  <span>{previewTemplate.priceBeforeVatLabel}:</span>
                  <span>50,000</span>
                </div>
              )}
              {previewTemplate.showVat && (
                <div className="flex justify-between">
                  <span>{previewTemplate.vatLabel} (10%):</span>
                  <span>5,000</span>
                </div>
              )}
              {previewTemplate.showPriceAfterVat && (
                <div className="flex justify-between font-bold">
                  <span>{previewTemplate.priceAfterVatLabel}:</span>
                  <span>55,000</span>
                </div>
              )}
              <div className="my-2 border-t border-double" style={{ borderTopWidth: "3px" }} />
              <div className="flex justify-between font-bold text-lg">
                <span>TỔNG:</span>
                <span>55,000đ</span>
              </div>
              {previewTemplate.showPaymentMethod && <p className="text-xs">Thanh toán: Tiền mặt</p>}
              <div className="my-2 border-t border-dashed" />
              {previewTemplate.showQrCode && (
                <div className="text-center text-xs text-muted-foreground my-2">[QR CODE]</div>
              )}
              {previewTemplate.showWifiInfo && previewTemplate.wifiName && (
                <p className="text-xs text-center">
                  WiFi: {previewTemplate.wifiName} / {previewTemplate.wifiPassword}
                </p>
              )}
              <p className="text-center mt-2">{previewTemplate.thankYouMessage}</p>
              <p className="text-center text-xs">{previewTemplate.comebackMessage}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
