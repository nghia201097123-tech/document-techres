"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { kitchenService, type Kitchen, type CreateKitchenDto, type KitchenPrintMode, type KitchenType, type PrinterProtocol, type TicketFontSize, KitchenTypeLabels, PrintModeLabels, PrinterProtocolLabels, TicketFontSizeLabels, LABEL_SIZE_OPTIONS, getRecommendedMaxToppings } from "@/services/kitchen-service";
import { LabelPreview } from "@/components/kitchen/LabelPreview";
import { TicketPreview } from "@/components/kitchen/TicketPreview";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Common paper widths for thermal printers
const PAPER_WIDTH_OPTIONS = [
  { value: 58, label: "58mm" },
  { value: 80, label: "80mm" },
  { value: 76, label: "76mm" },
  { value: 110, label: "110mm" },
  { value: 112, label: "112mm" },
];

// Initial form data
const getInitialFormData = (): CreateKitchenDto => ({
  name: "",
  kitchenType: "kitchen" as KitchenType,
  printerName: "",
  printerIp: "",
  printerPort: 9100,
  printerProtocol: "ESC_POS" as PrinterProtocol,
  paperWidth: 80,
  printMode: "TICKET" as KitchenPrintMode,
  description: "",
  ticketCutAfterPrint: true,
  ticketPrintItemsSeparately: false,
  ticketCopies: 1,
  ticketPrintOrderNumber: true,
  ticketPrintTableName: true,
  ticketPrintTime: true,
  ticketPrintStoreName: false,
  ticketStoreName: "",
  ticketPrintNotes: true,
  ticketFontSize: "medium" as TicketFontSize,
  ticketPrintPrice: false,
  labelPrintPrice: false,
  labelPrintStoreName: false,
  labelPrintOrderNumber: true,
  labelPrintTableName: true,
  labelPrintTime: true,
  labelStoreName: "",
  labelReverse: false,
  labelWidthMm: 72,
  labelHeightMm: 30,
  labelGapMm: 3,
  labelFontScale: 1.0,
  labelMaxToppings: 0,
  ticketLineSpacing: 0.4,
  labelLineSpacing: 1.0,
});

interface KitchenFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  kitchenId?: string;
  onClose: () => void;
  onSuccess: (kitchen: Kitchen, isNew: boolean) => void;
  continueCreating: boolean;
  setContinueCreating: (value: boolean) => void;
}

const KitchenFormDialog = React.memo(function KitchenFormDialog({
  open,
  mode,
  kitchenId,
  onClose,
  onSuccess,
  continueCreating,
  setContinueCreating,
}: KitchenFormDialogProps) {
  const { toast } = useToast();

  // All form state managed locally
  const [formData, setFormData] = React.useState<CreateKitchenDto>(getInitialFormData);
  const [saving, setSaving] = React.useState(false);
  const [loadingKitchen, setLoadingKitchen] = React.useState(false);

  // Load kitchen data for edit mode
  React.useEffect(() => {
    if (!open) return;

    if (mode === "edit" && kitchenId) {
      loadKitchenData();
    } else if (mode === "create") {
      setFormData(getInitialFormData());
    }
  }, [open, mode, kitchenId]);

  const loadKitchenData = async () => {
    if (!kitchenId) return;
    setLoadingKitchen(true);
    try {
      const kitchen = await kitchenService.getById(kitchenId);
      setFormData({
        name: kitchen.name,
        kitchenType: (kitchen.kitchenType || "kitchen") as KitchenType,
        printerName: kitchen.printerName || "",
        printerIp: kitchen.printerIp || "",
        printerPort: kitchen.printerPort || 9100,
        printerProtocol: (kitchen.printerProtocol || "ESC_POS") as PrinterProtocol,
        paperWidth: kitchen.paperWidth || 80,
        printMode: (kitchen.printMode || "TICKET") as KitchenPrintMode,
        description: kitchen.description || "",
        ticketCutAfterPrint: kitchen.ticketCutAfterPrint ?? true,
        ticketPrintItemsSeparately: kitchen.ticketPrintItemsSeparately ?? false,
        ticketCopies: kitchen.ticketCopies ?? 1,
        ticketPrintOrderNumber: kitchen.ticketPrintOrderNumber ?? true,
        ticketPrintTableName: kitchen.ticketPrintTableName ?? true,
        ticketPrintTime: kitchen.ticketPrintTime ?? true,
        ticketPrintStoreName: kitchen.ticketPrintStoreName ?? false,
        ticketStoreName: kitchen.ticketStoreName || "",
        ticketPrintNotes: kitchen.ticketPrintNotes ?? true,
        ticketFontSize: (kitchen.ticketFontSize || "medium") as TicketFontSize,
        ticketPrintPrice: kitchen.ticketPrintPrice ?? false,
        labelPrintPrice: kitchen.labelPrintPrice ?? false,
        labelPrintStoreName: kitchen.labelPrintStoreName ?? false,
        labelPrintOrderNumber: kitchen.labelPrintOrderNumber ?? true,
        labelPrintTableName: kitchen.labelPrintTableName ?? true,
        labelPrintTime: kitchen.labelPrintTime ?? true,
        labelStoreName: kitchen.labelStoreName || "",
        labelReverse: kitchen.labelReverse ?? false,
        labelWidthMm: kitchen.labelWidthMm ?? 72,
        labelHeightMm: kitchen.labelHeightMm ?? 30,
        labelGapMm: kitchen.labelGapMm ?? 3,
        labelFontScale: kitchen.labelFontScale ?? 1.0,
        labelMaxToppings: kitchen.labelMaxToppings ?? 0,
        ticketLineSpacing: kitchen.ticketLineSpacing ?? 0.4,
        labelLineSpacing: kitchen.labelLineSpacing ?? 1.0,
      });
    } catch (error) {
      console.error("Error loading kitchen:", error);
      toast({ title: "Lỗi", description: "Không thể tải thông tin bếp", variant: "destructive" });
    } finally {
      setLoadingKitchen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);

      if (mode === "create") {
        const result = await kitchenService.create(formData);
        onSuccess({ ...result, productCount: 0 }, true);
        toast({ title: "Thành công", description: "Đã tạo bếp mới" });

        if (continueCreating) {
          // Keep settings, just clear name and description
          setFormData(prev => ({
            ...prev,
            name: "",
            description: "",
          }));
          return;
        }
      } else if (mode === "edit" && kitchenId) {
        const result = await kitchenService.update(kitchenId, formData);
        onSuccess(result, false);
        toast({ title: "Thành công", description: "Đã cập nhật bếp" });
      }

      handleClose();
    } catch (error: any) {
      console.error("Error saving kitchen:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi lưu bếp",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData(getInitialFormData());
    setContinueCreating(false);
    onClose();
  };

  if (loadingKitchen) {
    return (
      <Dialog open={open} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>Đang tải...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Thêm bếp mới" : "Chỉnh sửa bếp"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Nhập thông tin bếp. Bếp sẽ nhận order in từ món ăn được gán."
              : "Cập nhật thông tin bếp."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col h-[70vh]">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0">
            {/* Form Section - 3/5 width */}
            <div className="lg:col-span-3 overflow-y-auto pr-2">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Tên bếp *</Label>
                  <Input
                    id="name"
                    placeholder="Bếp chính, Bar, Bếp nướng..."
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="kitchenType">Loại bếp</Label>
                    <Select
                      value={formData.kitchenType}
                      onValueChange={(value: KitchenType) => setFormData(prev => ({ ...prev, kitchenType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại bếp" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(KitchenTypeLabels) as KitchenType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            {KitchenTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="printMode">Chế độ in</Label>
                    <Select
                      value={formData.printMode}
                      onValueChange={(value: KitchenPrintMode) => setFormData(prev => ({ ...prev, printMode: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn chế độ in" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PrintModeLabels) as KitchenPrintMode[]).map((m) => (
                          <SelectItem key={m} value={m}>
                            {PrintModeLabels[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="printerProtocol">Loại máy in</Label>
                    <Select
                      value={formData.printerProtocol}
                      onValueChange={(value: PrinterProtocol) => setFormData(prev => ({ ...prev, printerProtocol: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại máy in" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PrinterProtocolLabels) as PrinterProtocol[]).map((protocol) => (
                          <SelectItem key={protocol} value={protocol}>
                            {PrinterProtocolLabels[protocol]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="paperWidth">Khổ giấy</Label>
                    <Select
                      value={formData.paperWidth?.toString()}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, paperWidth: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn khổ giấy" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAPER_WIDTH_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="printerName">Tên máy in</Label>
                    <Input
                      id="printerName"
                      placeholder="Kitchen Printer 1"
                      value={formData.printerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, printerName: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="printerIp">IP máy in</Label>
                    <Input
                      id="printerIp"
                      placeholder="192.168.1.100"
                      value={formData.printerIp}
                      onChange={(e) => setFormData(prev => ({ ...prev, printerIp: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="printerPort">Cổng máy in</Label>
                    <Input
                      id="printerPort"
                      type="number"
                      placeholder="9100"
                      value={formData.printerPort || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, printerPort: e.target.value ? parseInt(e.target.value) : undefined }))}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea
                    id="description"
                    placeholder="Mô tả bếp..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                {/* Ticket Printing Config */}
                {formData.printMode === "TICKET" && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-medium text-sm">Cấu hình in phiếu bếp</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ticketPrintOrderNumber"
                          checked={formData.ticketPrintOrderNumber}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ticketPrintOrderNumber: !!checked }))}
                        />
                        <Label htmlFor="ticketPrintOrderNumber" className="text-sm cursor-pointer">In mã đơn hàng</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ticketPrintTableName"
                          checked={formData.ticketPrintTableName}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ticketPrintTableName: !!checked }))}
                        />
                        <Label htmlFor="ticketPrintTableName" className="text-sm cursor-pointer">In tên bàn</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ticketPrintTime"
                          checked={formData.ticketPrintTime}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ticketPrintTime: !!checked }))}
                        />
                        <Label htmlFor="ticketPrintTime" className="text-sm cursor-pointer">In thời gian</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ticketPrintNotes"
                          checked={formData.ticketPrintNotes}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ticketPrintNotes: !!checked }))}
                        />
                        <Label htmlFor="ticketPrintNotes" className="text-sm cursor-pointer">In ghi chú</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ticketPrintPrice"
                          checked={formData.ticketPrintPrice}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ticketPrintPrice: !!checked }))}
                        />
                        <Label htmlFor="ticketPrintPrice" className="text-sm cursor-pointer">In giá món</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ticketPrintStoreName"
                          checked={formData.ticketPrintStoreName}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ticketPrintStoreName: !!checked }))}
                        />
                        <Label htmlFor="ticketPrintStoreName" className="text-sm cursor-pointer">In tên cửa hàng</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ticketCutAfterPrint"
                          checked={formData.ticketCutAfterPrint}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ticketCutAfterPrint: !!checked }))}
                        />
                        <Label htmlFor="ticketCutAfterPrint" className="text-sm cursor-pointer">Cắt giấy sau khi in</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ticketPrintItemsSeparately"
                          checked={formData.ticketPrintItemsSeparately}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ticketPrintItemsSeparately: !!checked }))}
                        />
                        <Label htmlFor="ticketPrintItemsSeparately" className="text-sm cursor-pointer">In từng món riêng biệt</Label>
                      </div>
                    </div>

                    {formData.ticketPrintStoreName && (
                      <div className="grid gap-2">
                        <Label htmlFor="ticketStoreName">Tên cửa hàng hiển thị</Label>
                        <Input
                          id="ticketStoreName"
                          placeholder="Tên cửa hàng trên phiếu..."
                          value={formData.ticketStoreName || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, ticketStoreName: e.target.value }))}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="ticketFontSize">Cỡ chữ</Label>
                        <Select
                          value={formData.ticketFontSize || "medium"}
                          onValueChange={(value: TicketFontSize) => setFormData(prev => ({ ...prev, ticketFontSize: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn cỡ chữ" />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(TicketFontSizeLabels) as TicketFontSize[]).map((size) => (
                              <SelectItem key={size} value={size}>
                                {TicketFontSizeLabels[size]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ticketCopies">Số bản in</Label>
                        <Input
                          id="ticketCopies"
                          type="number"
                          min={1}
                          max={5}
                          value={formData.ticketCopies || 1}
                          onChange={(e) => setFormData(prev => ({ ...prev, ticketCopies: Math.min(5, Math.max(1, parseInt(e.target.value) || 1)) }))}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <Label>Khoảng cách dòng ({((formData.ticketLineSpacing || 0.4) * 100).toFixed(0)}%)</Label>
                        <span className="text-xs text-muted-foreground">
                          {(formData.ticketLineSpacing || 0.4) <= 0.4 ? "Rất sát" : (formData.ticketLineSpacing || 0.4) <= 0.6 ? "Sát" : "Bình thường"}
                        </span>
                      </div>
                      <Slider
                        value={[(formData.ticketLineSpacing || 0.4) * 100]}
                        min={30}
                        max={100}
                        step={5}
                        onValueChange={([value]) => setFormData(prev => ({ ...prev, ticketLineSpacing: value / 100 }))}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>30% (rất sát)</span>
                        <span>100% (bình thường)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Label Printing Config */}
                {formData.printMode === "LABEL" && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-medium text-sm">Cấu hình in tem</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="labelPrintPrice"
                          checked={formData.labelPrintPrice}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, labelPrintPrice: !!checked }))}
                        />
                        <Label htmlFor="labelPrintPrice" className="text-sm cursor-pointer">In giá</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="labelPrintStoreName"
                          checked={formData.labelPrintStoreName}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, labelPrintStoreName: !!checked }))}
                        />
                        <Label htmlFor="labelPrintStoreName" className="text-sm cursor-pointer">In tên cửa hàng</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="labelPrintOrderNumber"
                          checked={formData.labelPrintOrderNumber}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, labelPrintOrderNumber: !!checked }))}
                        />
                        <Label htmlFor="labelPrintOrderNumber" className="text-sm cursor-pointer">In mã đơn hàng</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="labelPrintTableName"
                          checked={formData.labelPrintTableName}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, labelPrintTableName: !!checked }))}
                        />
                        <Label htmlFor="labelPrintTableName" className="text-sm cursor-pointer">In tên bàn</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="labelPrintTime"
                          checked={formData.labelPrintTime}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, labelPrintTime: !!checked }))}
                        />
                        <Label htmlFor="labelPrintTime" className="text-sm cursor-pointer">In thời gian</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="labelReverse"
                          checked={formData.labelReverse}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, labelReverse: !!checked }))}
                        />
                        <Label htmlFor="labelReverse" className="text-sm cursor-pointer">Đảo chiều tem (180°)</Label>
                      </div>
                    </div>

                    {formData.labelPrintStoreName && (
                      <div className="grid gap-2">
                        <Label htmlFor="labelStoreName">Tên cửa hàng hiển thị</Label>
                        <Input
                          id="labelStoreName"
                          placeholder="Tên cửa hàng trên tem..."
                          value={formData.labelStoreName || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, labelStoreName: e.target.value }))}
                        />
                      </div>
                    )}

                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-medium text-sm">Kích thước tem & Font</h4>

                      <div className="grid gap-2">
                        <Label>Kích thước tem</Label>
                        <Select
                          value={`${formData.labelWidthMm}x${formData.labelHeightMm}`}
                          onValueChange={(value) => {
                            const [width, height] = value.split("x").map(Number);
                            setFormData(prev => ({
                              ...prev,
                              labelWidthMm: width,
                              labelHeightMm: height,
                              labelMaxToppings: 0,
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn kích thước tem" />
                          </SelectTrigger>
                          <SelectContent>
                            {LABEL_SIZE_OPTIONS.map((size) => (
                              <SelectItem key={`${size.width}x${size.height}`} value={`${size.width}x${size.height}`}>
                                {size.label} - Max {size.maxToppings} topping
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <div className="flex justify-between">
                          <Label>Cỡ chữ (Scale: {(formData.labelFontScale || 1.0).toFixed(1)}x)</Label>
                          <span className="text-xs text-muted-foreground">
                            {(formData.labelFontScale || 1.0) < 1 ? "Thu nhỏ" : (formData.labelFontScale || 1.0) > 1 ? "Phóng to" : "Mặc định"}
                          </span>
                        </div>
                        <Slider
                          value={[(formData.labelFontScale || 1.0) * 100]}
                          min={50}
                          max={200}
                          step={10}
                          onValueChange={([value]) => setFormData(prev => ({ ...prev, labelFontScale: value / 100 }))}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0.5x</span>
                          <span>1.0x</span>
                          <span>2.0x</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="labelMaxToppings">Số topping tối đa / tem</Label>
                          <Input
                            id="labelMaxToppings"
                            type="number"
                            min={0}
                            max={20}
                            placeholder="0 = Tự động"
                            value={formData.labelMaxToppings || ""}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              labelMaxToppings: e.target.value ? parseInt(e.target.value) : 0
                            }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            0 = Tự động ({getRecommendedMaxToppings(formData.labelWidthMm || 72, formData.labelHeightMm || 30)} topping)
                          </p>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="labelGapMm">Khoảng cách tem (mm)</Label>
                          <Input
                            id="labelGapMm"
                            type="number"
                            min={0}
                            max={10}
                            value={formData.labelGapMm || 3}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              labelGapMm: e.target.value ? parseInt(e.target.value) : 3
                            }))}
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <div className="flex justify-between">
                          <Label>Khoảng cách dòng ({((formData.labelLineSpacing || 1.0) * 100).toFixed(0)}%)</Label>
                          <span className="text-xs text-muted-foreground">
                            {(formData.labelLineSpacing || 1.0) <= 0.9 ? "Sát" : (formData.labelLineSpacing || 1.0) <= 1.0 ? "Bình thường" : "Rộng"}
                          </span>
                        </div>
                        <Slider
                          value={[(formData.labelLineSpacing || 1.0) * 100]}
                          min={80}
                          max={150}
                          step={5}
                          onValueChange={([value]) => setFormData(prev => ({ ...prev, labelLineSpacing: value / 100 }))}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>80% (sát)</span>
                          <span>150% (rộng)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Preview Section - 2/5 width */}
            <div className="hidden lg:col-span-2 lg:flex lg:flex-col border-l pl-6 overflow-hidden">
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Xem trước trực tiếp</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Kích thước tem {formData.labelWidthMm || 72}x{formData.labelHeightMm || 30}mm (scale: {formData.labelFontScale || 1.0}x, max {(formData.labelMaxToppings || 0) > 0 ? formData.labelMaxToppings : getRecommendedMaxToppings(formData.labelWidthMm || 72, formData.labelHeightMm || 30)} topping)
              </p>
              <div className="flex-1 overflow-y-auto">
                {formData.printMode === "TICKET" && (
                  <TicketPreview
                    paperWidth={formData.paperWidth || 80}
                    fontSize={formData.ticketFontSize || "medium"}
                    showStoreName={formData.ticketPrintStoreName}
                    showOrderNumber={formData.ticketPrintOrderNumber}
                    showTableName={formData.ticketPrintTableName}
                    showTime={formData.ticketPrintTime}
                    showNotes={formData.ticketPrintNotes}
                    showPrice={formData.ticketPrintPrice}
                    storeName={formData.ticketStoreName || "Coffee House"}
                    printItemsSeparately={formData.ticketPrintItemsSeparately}
                  />
                )}
                {formData.printMode === "LABEL" && (
                  <LabelPreview
                    widthMm={formData.labelWidthMm || 72}
                    heightMm={formData.labelHeightMm || 30}
                    fontScale={formData.labelFontScale || 1.0}
                    maxToppings={(formData.labelMaxToppings || 0) > 0 ? formData.labelMaxToppings! : getRecommendedMaxToppings(formData.labelWidthMm || 72, formData.labelHeightMm || 30)}
                    showStoreName={formData.labelPrintStoreName}
                    showOrderNumber={formData.labelPrintOrderNumber}
                    showTableName={formData.labelPrintTableName}
                    showTime={formData.labelPrintTime}
                    showPrice={formData.labelPrintPrice}
                    storeName={formData.labelStoreName || "Coffee House"}
                  />
                )}
                {formData.printMode !== "TICKET" && formData.printMode !== "LABEL" && (
                  <p className="text-sm text-muted-foreground">
                    Chọn chế độ in "In phiếu bếp" hoặc "In tem" để xem trước.
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            {mode === "create" && (
              <div className="flex items-center gap-2 mr-auto">
                <Checkbox
                  id="continueCreatingKitchen"
                  checked={continueCreating}
                  onCheckedChange={(checked) => setContinueCreating(!!checked)}
                />
                <Label htmlFor="continueCreatingKitchen" className="text-sm cursor-pointer">
                  Tiếp tục tạo
                </Label>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving || !formData.name.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Tạo bếp" : "Cập nhật"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default KitchenFormDialog;
