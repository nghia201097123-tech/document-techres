"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useToast } from "@/hooks/use-toast";
import { BrandFilter, useGlobalFilters } from "@/components/ui/brand-filter";
import {
  Printer,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Star,
  Wifi,
  Bluetooth,
  Usb,
  TestTube,
} from "lucide-react";
import {
  billTemplateService,
  BillTemplate,
  BillPrinterConfig,
  PrinterConnectionType,
  PRINTER_CONNECTION_TYPE_LABELS,
  PAPER_WIDTH_OPTIONS,
  FONT_SIZE_OPTIONS,
  DEFAULT_PRINTER_CONFIG,
} from "@/services/bill-template-service";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBranchesByBrand } from "@/store/slices/branchesSlice";

type DialogMode = "create" | "edit" | null;

interface PrinterConfigForm {
  name: string;
  description?: string;
  connectionType: PrinterConnectionType;
  printerIp?: string;
  printerPort?: number;
  printerMac?: string;
  printerUsbPath?: string;
  templateId?: string;
  paperWidth?: number;
  fontSize?: string;
  lineSpacing?: number;
  autoPrintOnPayment?: boolean;
  printPreview?: boolean;
  numberOfCopies?: number;
  cutPaper?: boolean;
  openCashDrawer?: boolean;
  beepAfterPrint?: boolean;
  retryCount?: number;
  retryDelayMs?: number;
  connectionTimeoutMs?: number;
  isDefault?: boolean;
}

export default function BillPrinterPage() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { brandId: filterBrandId, setBrandId: setFilterBrandId } = useGlobalFilters();

  // Branch selection for printer configs
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("");

  // Get branches from Redux store
  const branches = useAppSelector((state) =>
    filterBrandId ? state.branches.byBrandId[filterBrandId] || [] : []
  );

  // Printer configs state
  const [printerConfigs, setPrinterConfigs] = React.useState<BillPrinterConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = React.useState(false);
  const [configDialog, setConfigDialog] = React.useState<DialogMode>(null);
  const [editingConfig, setEditingConfig] = React.useState<BillPrinterConfig | null>(null);
  const [savingConfig, setSavingConfig] = React.useState(false);

  // Templates for selection (from brand level)
  const [templates, setTemplates] = React.useState<BillTemplate[]>([]);

  // Form state
  const [configForm, setConfigForm] = React.useState<PrinterConfigForm>({
    name: "",
    connectionType: PrinterConnectionType.NETWORK,
    ...DEFAULT_PRINTER_CONFIG,
  });

  // Load branches when brand changes
  React.useEffect(() => {
    if (filterBrandId) {
      dispatch(fetchBranchesByBrand(filterBrandId));
      loadTemplates();
    }
  }, [filterBrandId, dispatch]);

  // Load printer configs when branch changes
  React.useEffect(() => {
    if (selectedBranchId) {
      loadPrinterConfigs();
    } else {
      setPrinterConfigs([]);
    }
  }, [selectedBranchId]);

  // Auto-select first branch when branches are loaded
  React.useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  const loadTemplates = async () => {
    if (!filterBrandId) return;
    try {
      const data = await billTemplateService.getTemplatesByBrand(filterBrandId);
      setTemplates(data.filter(t => t.isActive));
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const loadPrinterConfigs = async () => {
    if (!selectedBranchId) return;
    setLoadingConfigs(true);
    try {
      const data = await billTemplateService.getPrinterConfigsByBranch(selectedBranchId);
      setPrinterConfigs(data);
    } catch (error) {
      console.error("Error loading printer configs:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách máy in", variant: "destructive" });
    } finally {
      setLoadingConfigs(false);
    }
  };

  const openConfigDialog = (mode: DialogMode, config?: BillPrinterConfig) => {
    if (mode === "edit" && config) {
      setEditingConfig(config);
      setConfigForm({
        name: config.name,
        description: config.description,
        connectionType: config.connectionType,
        printerIp: config.printerIp,
        printerPort: config.printerPort,
        printerMac: config.printerMac,
        printerUsbPath: config.printerUsbPath,
        templateId: config.templateId,
        paperWidth: config.paperWidth,
        fontSize: config.fontSize,
        lineSpacing: config.lineSpacing,
        autoPrintOnPayment: config.autoPrintOnPayment,
        printPreview: config.printPreview,
        numberOfCopies: config.numberOfCopies,
        cutPaper: config.cutPaper,
        openCashDrawer: config.openCashDrawer,
        beepAfterPrint: config.beepAfterPrint,
        retryCount: config.retryCount,
        retryDelayMs: config.retryDelayMs,
        connectionTimeoutMs: config.connectionTimeoutMs,
        isDefault: config.isDefault,
      });
    } else {
      setEditingConfig(null);
      setConfigForm({
        name: "",
        connectionType: PrinterConnectionType.NETWORK,
        ...DEFAULT_PRINTER_CONFIG,
      });
    }
    setConfigDialog(mode);
  };

  const handleSaveConfig = async () => {
    if (!selectedBranchId || !configForm.name) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tên máy in", variant: "destructive" });
      return;
    }

    setSavingConfig(true);
    try {
      const configData = {
        ...configForm,
        branchId: selectedBranchId,
      };

      let savedConfig: BillPrinterConfig;

      if (configDialog === "create") {
        savedConfig = await billTemplateService.createPrinterConfig(configData);
        setPrinterConfigs((prev) => [...prev, savedConfig]);
        toast({ title: "Thành công", description: "Đã thêm máy in mới" });
      } else if (editingConfig) {
        savedConfig = await billTemplateService.updatePrinterConfig(editingConfig.id, configData);
        setPrinterConfigs((prev) => prev.map((c) => (c.id === savedConfig.id ? savedConfig : c)));
        toast({ title: "Thành công", description: "Đã cập nhật máy in" });
      }
      setConfigDialog(null);
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleConfig = async (id: string) => {
    try {
      const updated = await billTemplateService.togglePrinterConfig(id);
      setPrinterConfigs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể cập nhật trạng thái", variant: "destructive" });
    }
  };

  const handleSetDefaultConfig = async (id: string) => {
    try {
      const updated = await billTemplateService.setDefaultPrinterConfig(id);
      setPrinterConfigs((prev) =>
        prev.map((c) => ({
          ...c,
          isDefault: c.id === updated.id,
        }))
      );
      toast({ title: "Thành công", description: "Đã đặt làm máy in mặc định" });
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể đặt làm mặc định", variant: "destructive" });
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa máy in này?")) return;
    try {
      await billTemplateService.deletePrinterConfig(id);
      setPrinterConfigs((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Thành công", description: "Đã xóa máy in" });
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể xóa", variant: "destructive" });
    }
  };

  const handleTestPrint = async (config: BillPrinterConfig) => {
    toast({ title: "Thông báo", description: "Đang gửi lệnh in test..." });
    // TODO: Implement test print via API
  };

  const getConnectionIcon = (type: PrinterConnectionType) => {
    switch (type) {
      case PrinterConnectionType.NETWORK:
        return <Wifi className="h-4 w-4" />;
      case PrinterConnectionType.BLUETOOTH:
        return <Bluetooth className="h-4 w-4" />;
      case PrinterConnectionType.USB:
        return <Usb className="h-4 w-4" />;
      default:
        return <Printer className="h-4 w-4" />;
    }
  };

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Máy in Bill</h1>
          <p className="text-muted-foreground">Quản lý cấu hình máy in bill cho từng chi nhánh</p>
        </div>
        <BrandFilter
          selectedBrandId={filterBrandId}
          onBrandChange={(brandId) => {
            setFilterBrandId(brandId);
            setSelectedBranchId("");
          }}
          showAllOption={false}
          className="w-[200px]"
        />
      </div>

      {/* Branch Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Chọn chi nhánh</CardTitle>
          <CardDescription>Máy in bill được cấu hình riêng cho từng chi nhánh</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {branches.map((branch) => (
              <Button
                key={branch.id}
                variant={selectedBranchId === branch.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedBranchId(branch.id)}
              >
                {branch.name}
              </Button>
            ))}
          </div>
          {branches.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có chi nhánh nào</p>
          )}
        </CardContent>
      </Card>

      {/* Printer Configs Section */}
      {selectedBranchId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Máy in Bill - {selectedBranch?.name}</CardTitle>
                <CardDescription>Quản lý danh sách máy in bill cho chi nhánh này</CardDescription>
              </div>
              <Button onClick={() => openConfigDialog("create")}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm máy in
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingConfigs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : printerConfigs.length === 0 ? (
              <div className="text-center py-8">
                <Printer className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">Chưa có máy in nào</p>
                <p className="text-xs text-muted-foreground">
                  Thêm máy in bill đầu tiên cho chi nhánh này
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {printerConfigs.map((config) => {
                  const template = templates.find((t) => t.id === config.templateId);
                  return (
                    <Card key={config.id} className={config.isDefault ? "border-primary" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              {getConnectionIcon(config.connectionType)}
                              <CardTitle className="text-base">{config.name}</CardTitle>
                              {config.isDefault && (
                                <Badge variant="default" className="gap-1">
                                  <Star className="h-3 w-3" />
                                  Mặc định
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="mt-1">
                              {PRINTER_CONNECTION_TYPE_LABELS[config.connectionType]}
                            </CardDescription>
                          </div>
                          <Switch
                            checked={config.isActive}
                            onCheckedChange={() => handleToggleConfig(config.id)}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          {config.connectionType === PrinterConnectionType.NETWORK && (
                            <p className="font-mono text-xs">
                              {config.printerIp}:{config.printerPort || 9100}
                            </p>
                          )}
                          {config.connectionType === PrinterConnectionType.BLUETOOTH && (
                            <p className="font-mono text-xs">{config.printerMac}</p>
                          )}
                          {config.connectionType === PrinterConnectionType.USB && (
                            <p className="font-mono text-xs">{config.printerUsbPath}</p>
                          )}
                          {template && (
                            <p className="text-muted-foreground">
                              Mẫu: <span className="font-medium">{template.name}</span>
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 pt-2">
                            {config.autoPrintOnPayment && <Badge variant="outline">Tự động in</Badge>}
                            {config.cutPaper && <Badge variant="outline">Cắt giấy</Badge>}
                            {config.openCashDrawer && <Badge variant="outline">Mở két</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Giấy: {config.paperWidth || 80}mm • Font: {config.fontSize || "normal"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 mt-4 pt-4 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTestPrint(config)}
                          >
                            <TestTube className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                          {!config.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefaultConfig(config.id)}
                            >
                              <Star className="h-4 w-4 mr-1" />
                              Mặc định
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openConfigDialog("edit", config)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Sửa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteConfig(config.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Printer Config Dialog */}
      <Dialog open={configDialog !== null} onOpenChange={() => setConfigDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {configDialog === "create" ? "Thêm máy in mới" : "Sửa máy in"}
            </DialogTitle>
            <DialogDescription>
              Cấu hình kết nối và tùy chọn in cho máy in bill
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tên máy in *</Label>
                <Input
                  value={configForm.name}
                  onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                  placeholder="VD: Máy in quầy thu ngân"
                />
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Input
                  value={configForm.description || ""}
                  onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                  placeholder="Mô tả ngắn..."
                />
              </div>
            </div>

            {/* Template selection */}
            <div className="space-y-2">
              <Label>Mẫu bill sử dụng</Label>
              <Select
                value={configForm.templateId || ""}
                onValueChange={(value) => setConfigForm({ ...configForm, templateId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn mẫu bill..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.paperWidth}mm)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Mẫu bill được quản lý ở cấp thương hiệu, tại đây chỉ chọn mẫu để sử dụng
              </p>
            </div>

            {/* Connection type */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Kết nối máy in</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Loại kết nối</Label>
                  <Select
                    value={configForm.connectionType}
                    onValueChange={(value: PrinterConnectionType) =>
                      setConfigForm({ ...configForm, connectionType: value })
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

              {/* Network connection */}
              {configForm.connectionType === PrinterConnectionType.NETWORK && (
                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div className="space-y-2">
                    <Label>Địa chỉ IP</Label>
                    <Input
                      value={configForm.printerIp || ""}
                      onChange={(e) => setConfigForm({ ...configForm, printerIp: e.target.value })}
                      placeholder="192.168.1.100"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={configForm.printerPort || 9100}
                      onChange={(e) => setConfigForm({ ...configForm, printerPort: Number(e.target.value) })}
                      placeholder="9100"
                    />
                  </div>
                </div>
              )}

              {/* Bluetooth connection */}
              {configForm.connectionType === PrinterConnectionType.BLUETOOTH && (
                <div className="space-y-2 mt-4">
                  <Label>MAC Address</Label>
                  <Input
                    value={configForm.printerMac || ""}
                    onChange={(e) => setConfigForm({ ...configForm, printerMac: e.target.value })}
                    placeholder="00:11:22:33:44:55"
                    className="font-mono"
                  />
                </div>
              )}

              {/* USB connection */}
              {configForm.connectionType === PrinterConnectionType.USB && (
                <div className="space-y-2 mt-4">
                  <Label>USB Path</Label>
                  <Input
                    value={configForm.printerUsbPath || ""}
                    onChange={(e) => setConfigForm({ ...configForm, printerUsbPath: e.target.value })}
                    placeholder="/dev/usb/lp0"
                    className="font-mono"
                  />
                </div>
              )}
            </div>

            {/* Print settings */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Cài đặt in</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Khổ giấy</Label>
                  <Select
                    value={String(configForm.paperWidth || 80)}
                    onValueChange={(value) => setConfigForm({ ...configForm, paperWidth: Number(value) })}
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
                    value={configForm.fontSize || "normal"}
                    onValueChange={(value) => setConfigForm({ ...configForm, fontSize: value })}
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
                    value={configForm.numberOfCopies || 1}
                    onChange={(e) => setConfigForm({ ...configForm, numberOfCopies: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3 mt-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={configForm.cutPaper ?? true}
                    onCheckedChange={(checked) => setConfigForm({ ...configForm, cutPaper: checked })}
                  />
                  <Label>Cắt giấy tự động</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={configForm.openCashDrawer ?? true}
                    onCheckedChange={(checked) => setConfigForm({ ...configForm, openCashDrawer: checked })}
                  />
                  <Label>Mở ngăn kéo tiền</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={configForm.beepAfterPrint ?? true}
                    onCheckedChange={(checked) => setConfigForm({ ...configForm, beepAfterPrint: checked })}
                  />
                  <Label>Beep sau khi in</Label>
                </div>
              </div>
            </div>

            {/* Auto print settings */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Tùy chọn in tự động</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={configForm.autoPrintOnPayment ?? true}
                    onCheckedChange={(checked) => setConfigForm({ ...configForm, autoPrintOnPayment: checked })}
                  />
                  <Label>Tự động in khi thanh toán</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={configForm.printPreview ?? false}
                    onCheckedChange={(checked) => setConfigForm({ ...configForm, printPreview: checked })}
                  />
                  <Label>Xem trước khi in</Label>
                </div>
              </div>
            </div>

            {/* Connection settings */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Cấu hình kết nối</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Số lần thử lại</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={configForm.retryCount || 3}
                    onChange={(e) => setConfigForm({ ...configForm, retryCount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Delay giữa lần thử (ms)</Label>
                  <Input
                    type="number"
                    min={100}
                    max={10000}
                    value={configForm.retryDelayMs || 1000}
                    onChange={(e) => setConfigForm({ ...configForm, retryDelayMs: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timeout kết nối (ms)</Label>
                  <Input
                    type="number"
                    min={1000}
                    max={30000}
                    value={configForm.connectionTimeoutMs || 5000}
                    onChange={(e) => setConfigForm({ ...configForm, connectionTimeoutMs: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog(null)}>
              Hủy
            </Button>
            <Button onClick={handleSaveConfig} disabled={savingConfig || !configForm.name}>
              {savingConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {configDialog === "create" ? "Thêm" : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
