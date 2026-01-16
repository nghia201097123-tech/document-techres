"use client";

import * as React from "react";
import { Plus, ChefHat, Loader2, MoreHorizontal, Pencil, Power, Trash2, UtensilsCrossed, X, Check, CheckSquare, Square, MinusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useBackgroundProgress } from "@/components/ui/background-progress";
import { kitchenService, type Kitchen, type CreateKitchenDto, type UpdateKitchenDto, type KitchenPrintMode, type KitchenType, type PrinterProtocol, KitchenTypeLabels, PrintModeLabels, PrinterProtocolLabels, LABEL_SIZE_OPTIONS, getRecommendedMaxToppings, type ProductWithKitchens } from "@/services/kitchen-service";
import { LabelPreview } from "@/components/kitchen/LabelPreview";
import { Slider } from "@/components/ui/slider";
import { type Product, ProductType } from "@/services/product-service";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandBranchFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";

// Common paper widths for thermal printers
const PAPER_WIDTH_OPTIONS = [
  { value: 58, label: "58mm" },
  { value: 80, label: "80mm" },
  { value: 76, label: "76mm" },
  { value: 110, label: "110mm" },
  { value: 112, label: "112mm" },
];

type DialogMode = "create" | "edit" | "products" | null;

export default function KitchenPage() {
  const { toast } = useToast();
  const { addProgress, updateProgress, completeProgress, errorProgress } = useBackgroundProgress();

  // Global filter state from Redux
  const { brandId: filterBrandId, branchId: filterBranchId, setBrandId: setFilterBrandId, setBranchId: setFilterBranchId } = useGlobalFilters();

  const [kitchens, setKitchens] = React.useState<Kitchen[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [selectedKitchen, setSelectedKitchen] = React.useState<Kitchen | null>(null);
  const [deleteKitchen, setDeleteKitchen] = React.useState<Kitchen | null>(null);
  const [formData, setFormData] = React.useState<CreateKitchenDto>({
    name: "",
    kitchenType: "kitchen" as KitchenType,
    printerName: "",
    printerIp: "",
    printerPort: 9100,
    printerProtocol: "ESC_POS" as PrinterProtocol,
    paperWidth: 80,
    printMode: "TICKET" as KitchenPrintMode,
    description: "",
    // Ticket printing config
    ticketCutAfterPrint: true,
    ticketPrintItemsSeparately: false,
    ticketCopies: 1,
    // Label printing config
    labelPrintPrice: false,
    labelPrintStoreName: false,
    labelPrintOrderNumber: true,
    labelPrintTableName: true,
    labelPrintTime: true,
    labelStoreName: "",
    labelReverse: false,
    // Label size & font config
    labelWidthMm: 72,
    labelHeightMm: 30,
    labelGapMm: 3,
    labelFontScale: 1.0,
    labelMaxToppings: 0, // 0 = auto
  });
  const [continueCreating, setContinueCreating] = React.useState(false);

  // Track newly created and updated kitchen IDs for badges
  const [newKitchenIds, setNewKitchenIds] = React.useState<Set<string>>(new Set());
  const [updatedKitchenIds, setUpdatedKitchenIds] = React.useState<Set<string>>(new Set());

  // Product assignment state
  const [allProducts, setAllProducts] = React.useState<ProductWithKitchens[]>([]);
  const [kitchenProducts, setKitchenProducts] = React.useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(false);
  const [selectedProductIds, setSelectedProductIds] = React.useState<Set<string>>(new Set());
  const [productSearch, setProductSearch] = React.useState("");

  // Load kitchens - only when branch is selected
  const loadKitchens = React.useCallback(async (branchId: string) => {
    if (!branchId) {
      setKitchens([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await kitchenService.getAll(branchId);
      setKitchens(data);
    } catch (error) {
      console.error("Error loading kitchens:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách bếp", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadKitchens(filterBranchId);
  }, [filterBranchId, loadKitchens]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedKitchen(null);
    setFormData({
      name: "",
      kitchenType: "kitchen" as KitchenType,
      printerName: "",
      printerIp: "",
      printerPort: 9100,
      printerProtocol: "ESC_POS" as PrinterProtocol,
      paperWidth: 80,
      printMode: "TICKET" as KitchenPrintMode,
      description: "",
      // Ticket printing config
      ticketCutAfterPrint: true,
      ticketPrintItemsSeparately: false,
      ticketCopies: 1,
      // Label printing config
      labelPrintPrice: false,
      labelPrintStoreName: false,
      labelPrintOrderNumber: true,
      labelPrintTableName: true,
      labelPrintTime: true,
      labelStoreName: "",
      labelReverse: false,
      // Label size & font config
      labelWidthMm: 72,
      labelHeightMm: 30,
      labelGapMm: 3,
      labelFontScale: 1.0,
      labelMaxToppings: 0,
    });
    setDialogMode("create");
  };

  // Open edit dialog
  const handleOpenEdit = (kitchen: Kitchen) => {
    setSelectedKitchen(kitchen);
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
      // Ticket printing config
      ticketCutAfterPrint: kitchen.ticketCutAfterPrint ?? true,
      ticketPrintItemsSeparately: kitchen.ticketPrintItemsSeparately ?? false,
      ticketCopies: kitchen.ticketCopies ?? 1,
      // Label printing config
      labelPrintPrice: kitchen.labelPrintPrice ?? false,
      labelPrintStoreName: kitchen.labelPrintStoreName ?? false,
      labelPrintOrderNumber: kitchen.labelPrintOrderNumber ?? true,
      labelPrintTableName: kitchen.labelPrintTableName ?? true,
      labelPrintTime: kitchen.labelPrintTime ?? true,
      labelStoreName: kitchen.labelStoreName || "",
      labelReverse: kitchen.labelReverse ?? false,
      // Label size & font config
      labelWidthMm: kitchen.labelWidthMm ?? 72,
      labelHeightMm: kitchen.labelHeightMm ?? 30,
      labelGapMm: kitchen.labelGapMm ?? 3,
      labelFontScale: kitchen.labelFontScale ?? 1.0,
      labelMaxToppings: kitchen.labelMaxToppings ?? 0,
    });
    setDialogMode("edit");
    // Remove badges when editing
    setNewKitchenIds(prev => { const next = new Set(prev); next.delete(kitchen.id); return next; });
    setUpdatedKitchenIds(prev => { const next = new Set(prev); next.delete(kitchen.id); return next; });
  };

  // Open products dialog
  const handleOpenProducts = async (kitchen: Kitchen) => {
    setSelectedKitchen(kitchen);
    setDialogMode("products");
    setLoadingProducts(true);
    setProductSearch("");
    try {
      const [products, assigned] = await Promise.all([
        kitchenService.getProductsWithKitchenAssignments(),
        kitchenService.getKitchenProducts(kitchen.id),
      ]);
      // Filter out toppings from the product list
      setAllProducts(products.filter(p => p.type !== ProductType.TOPPING));
      setKitchenProducts(assigned);
      setSelectedProductIds(new Set(assigned.map(p => p.id)));
    } catch (error) {
      console.error("Error loading products:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách món ăn", variant: "destructive" });
    } finally {
      setLoadingProducts(false);
    }
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedKitchen(null);
    setFormData({
      name: "",
      kitchenType: "kitchen" as KitchenType,
      printerName: "",
      printerIp: "",
      printerPort: 9100,
      printerProtocol: "ESC_POS" as PrinterProtocol,
      paperWidth: 80,
      printMode: "TICKET" as KitchenPrintMode,
      description: "",
      // Ticket printing config
      ticketCutAfterPrint: true,
      ticketPrintItemsSeparately: false,
      ticketCopies: 1,
      // Label printing config
      labelPrintPrice: false,
      labelPrintStoreName: false,
      labelPrintOrderNumber: true,
      labelPrintTableName: true,
      labelPrintTime: true,
      labelStoreName: "",
      labelReverse: false,
      // Label size & font config
      labelWidthMm: 72,
      labelHeightMm: 30,
      labelGapMm: 3,
      labelFontScale: 1.0,
      labelMaxToppings: 0,
    });
    setAllProducts([]);
    setKitchenProducts([]);
    setSelectedProductIds(new Set());
    setProductSearch("");
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);

      if (dialogMode === "create") {
        const result = await kitchenService.create(formData);
        setKitchens((prev) => [{ ...result, productCount: 0 }, ...prev]);
        setNewKitchenIds(prev => new Set([...prev, result.id]));
        toast({ title: "Thành công", description: "Đã tạo bếp mới" });
        if (continueCreating) {
          setFormData({
            name: "",
            kitchenType: formData.kitchenType,
            printerName: formData.printerName,
            printerIp: formData.printerIp,
            printerPort: formData.printerPort,
            printerProtocol: formData.printerProtocol,
            paperWidth: formData.paperWidth,
            printMode: formData.printMode,
            description: "",
            // Keep printing config for consecutive creates
            ticketCutAfterPrint: formData.ticketCutAfterPrint,
            ticketPrintItemsSeparately: formData.ticketPrintItemsSeparately,
            ticketCopies: formData.ticketCopies,
            labelPrintPrice: formData.labelPrintPrice,
            labelPrintStoreName: formData.labelPrintStoreName,
            labelPrintOrderNumber: formData.labelPrintOrderNumber,
            labelPrintTableName: formData.labelPrintTableName,
            labelPrintTime: formData.labelPrintTime,
            labelStoreName: formData.labelStoreName,
            labelReverse: formData.labelReverse,
            // Keep label size & font config for consecutive creates
            labelWidthMm: formData.labelWidthMm,
            labelHeightMm: formData.labelHeightMm,
            labelGapMm: formData.labelGapMm,
            labelFontScale: formData.labelFontScale,
            labelMaxToppings: formData.labelMaxToppings,
          });
          return;
        }
      } else if (dialogMode === "edit" && selectedKitchen) {
        const updateData: UpdateKitchenDto = {
          name: formData.name,
          kitchenType: formData.kitchenType,
          printerName: formData.printerName,
          printerIp: formData.printerIp,
          printerPort: formData.printerPort,
          printerProtocol: formData.printerProtocol,
          paperWidth: formData.paperWidth,
          printMode: formData.printMode,
          description: formData.description,
          // Ticket printing config
          ticketCutAfterPrint: formData.ticketCutAfterPrint,
          ticketPrintItemsSeparately: formData.ticketPrintItemsSeparately,
          ticketCopies: formData.ticketCopies,
          // Label printing config
          labelPrintPrice: formData.labelPrintPrice,
          labelPrintStoreName: formData.labelPrintStoreName,
          labelPrintOrderNumber: formData.labelPrintOrderNumber,
          labelPrintTableName: formData.labelPrintTableName,
          labelPrintTime: formData.labelPrintTime,
          labelStoreName: formData.labelStoreName,
          labelReverse: formData.labelReverse,
          // Label size & font config
          labelWidthMm: formData.labelWidthMm,
          labelHeightMm: formData.labelHeightMm,
          labelGapMm: formData.labelGapMm,
          labelFontScale: formData.labelFontScale,
          labelMaxToppings: formData.labelMaxToppings,
        };
        const result = await kitchenService.update(selectedKitchen.id, updateData);
        setKitchens((prev) => prev.map((k) => (k.id === selectedKitchen.id ? { ...result, productCount: k.productCount } : k)));
        setUpdatedKitchenIds(prev => new Set([...prev, result.id]));
        setNewKitchenIds(prev => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
        toast({ title: "Thành công", description: "Đã cập nhật bếp" });
      }

      handleCloseDialog();
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

  // Handle toggle active
  const handleToggleActive = async (kitchen: Kitchen) => {
    try {
      const updated = await kitchenService.toggleActive(kitchen.id);
      setKitchens((prev) => prev.map((k) => (k.id === kitchen.id ? { ...updated, productCount: k.productCount } : k)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} bếp "${kitchen.name}"`,
      });
    } catch (error: any) {
      console.error("Error toggling kitchen:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteKitchen) return;

    try {
      await kitchenService.delete(deleteKitchen.id);
      setKitchens((prev) => prev.filter((k) => k.id !== deleteKitchen.id));
      toast({ title: "Thành công", description: `Đã xóa bếp "${deleteKitchen.name}"` });
    } catch (error: any) {
      console.error("Error deleting kitchen:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi xóa",
        variant: "destructive",
      });
    } finally {
      setDeleteKitchen(null);
    }
  };

  // Toggle product selection
  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Quick selection functions
  const selectAllProducts = () => {
    setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
  };

  const clearAllSelections = () => {
    setSelectedProductIds(new Set());
  };

  const toggleTypeSelection = (type: string) => {
    const typeProducts = productsByType[type] || [];
    const typeProductIds = typeProducts.map(p => p.id);
    const allSelected = typeProductIds.every(id => selectedProductIds.has(id));

    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        // Deselect all in this type
        typeProductIds.forEach(id => next.delete(id));
      } else {
        // Select all in this type
        typeProductIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const getTypeSelectionState = (type: string): "all" | "some" | "none" => {
    const typeProducts = productsByType[type] || [];
    if (typeProducts.length === 0) return "none";
    const selectedCount = typeProducts.filter(p => selectedProductIds.has(p.id)).length;
    if (selectedCount === 0) return "none";
    if (selectedCount === typeProducts.length) return "all";
    return "some";
  };

  // Save product assignments (with background processing for large selections)
  const handleSaveProducts = async () => {
    if (!selectedKitchen) return;

    const productIds = Array.from(selectedProductIds);
    const BATCH_THRESHOLD = 100; // Use background processing for > 100 products

    // For small selections, process directly
    if (productIds.length <= BATCH_THRESHOLD) {
      try {
        setSaving(true);
        await kitchenService.setKitchenProducts(selectedKitchen.id, productIds);

        // Update kitchen product count
        setKitchens(prev => prev.map(k =>
          k.id === selectedKitchen.id
            ? { ...k, productCount: productIds.length }
            : k
        ));

        toast({ title: "Thành công", description: `Đã gán ${productIds.length} món vào bếp "${selectedKitchen.name}"` });
        handleCloseDialog();
      } catch (error: any) {
        console.error("Error saving products:", error);
        toast({
          title: "Lỗi",
          description: error.response?.data?.message || "Có lỗi xảy ra",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
      return;
    }

    // For large selections, process in background
    const operationId = `kitchen-products-${selectedKitchen.id}-${Date.now()}`;
    const kitchenName = selectedKitchen.name;
    const kitchenId = selectedKitchen.id;

    // Close dialog immediately
    handleCloseDialog();

    // Add progress indicator
    addProgress({
      id: operationId,
      title: `Gán ${productIds.length} món vào "${kitchenName}"`,
      current: 0,
      total: productIds.length,
      persistentType: "kitchen-products",
    });

    try {
      // Process in batches
      const BATCH_SIZE = 50;
      const totalBatches = Math.ceil(productIds.length / BATCH_SIZE);

      for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, productIds.length);
        const batchIds = productIds.slice(0, end); // Send cumulative IDs

        // Update progress
        updateProgress(operationId, {
          current: start,
          batchNumber: i + 1,
          totalBatches,
        });

        // Process batch (send all IDs up to current point)
        await kitchenService.setKitchenProducts(kitchenId, batchIds);

        // Small delay between batches to avoid overwhelming the server
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Update kitchen product count
      setKitchens(prev => prev.map(k =>
        k.id === kitchenId
          ? { ...k, productCount: productIds.length }
          : k
      ));

      completeProgress(operationId, `Hoàn thành gán ${productIds.length} món`);
      toast({ title: "Thành công", description: `Đã gán ${productIds.length} món vào bếp "${kitchenName}"` });
    } catch (error: any) {
      console.error("Error saving products:", error);
      errorProgress(operationId, error.response?.data?.message || "Có lỗi xảy ra");
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi gán món",
        variant: "destructive",
      });
    }
  };

  // Filter products by search
  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.code?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Group products by type
  const productsByType = React.useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(p => {
      if (!groups[p.type]) {
        groups[p.type] = [];
      }
      groups[p.type].push(p);
    });
    return groups;
  }, [filteredProducts]);

  const typeLabels: Record<string, string> = {
    food: "Đồ ăn",
    drink: "Đồ uống",
    other: "Khác",
    combo: "Combo",
  };

  // Filter kitchens (already filtered by API for branch)
  const filteredKitchens = kitchens;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý bếp</h1>
          <p className="text-muted-foreground">Cấu hình bếp và gán món vào bếp để in</p>
        </div>
        <div className="flex items-center gap-2">
          <BrandBranchFilter
            selectedBrandId={filterBrandId}
            selectedBranchId={filterBranchId}
            onBrandChange={setFilterBrandId}
            onBranchChange={setFilterBranchId}
            showAllOption={false}
            brandClassName="w-[160px]"
            branchClassName="w-[160px]"
          />
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm bếp
          </Button>
        </div>
      </div>

      {/* Kitchen Stations */}
      {!filterBranchId ? (
        <FilterRequiredPlaceholder
          title="Vui lòng chọn chi nhánh"
          description="Chọn một chi nhánh từ bộ lọc phía trên để xem danh sách bếp"
        />
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>Danh sách bếp</CardTitle>
          <CardDescription>Tổng cộng {filteredKitchens.length} bếp</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredKitchens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ChefHat className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có bếp nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm bếp&quot; để bắt đầu cấu hình
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredKitchens.map((kitchen) => (
                <Card key={kitchen.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${kitchen.isActive ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-500'}`}>
                          <ChefHat className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium">{kitchen.name}</p>
                            {newKitchenIds.has(kitchen.id) && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Mới</Badge>
                            )}
                            {updatedKitchenIds.has(kitchen.id) && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">Cập nhật</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {kitchen.printerName && <p>Máy in: {kitchen.printerName}</p>}
                            {kitchen.printerIp && (
                              <p>IP: {kitchen.printerIp}{kitchen.printerPort ? `:${kitchen.printerPort}` : ""}</p>
                            )}
                            {kitchen.paperWidth && (
                              <p>Giấy: {kitchen.paperWidth}mm | {PrintModeLabels[kitchen.printMode as KitchenPrintMode] || "In phiếu bếp"}</p>
                            )}
                            {kitchen.kitchenType && (
                              <p>Loại: {KitchenTypeLabels[kitchen.kitchenType as KitchenType] || kitchen.kitchenType}</p>
                            )}
                            <p>{kitchen.productCount || 0} món được gán</p>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenProducts(kitchen)}>
                            <UtensilsCrossed className="mr-2 h-4 w-4" />
                            Gán món ăn
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(kitchen)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(kitchen)}>
                            <Power className="mr-2 h-4 w-4" />
                            {kitchen.isActive ? "Tạm ngưng" : "Kích hoạt"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteKitchen(kitchen)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant={kitchen.isActive ? "default" : "secondary"}>
                        {kitchen.isActive ? "Hoạt động" : "Tạm ngưng"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Create/Edit Kitchen Dialog */}
      <Dialog open={dialogMode === "create" || dialogMode === "edit"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{dialogMode === "create" ? "Thêm bếp mới" : "Chỉnh sửa bếp"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Nhập thông tin bếp. Bếp sẽ nhận order in từ món ăn được gán."
                : "Cập nhật thông tin bếp."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="grid gap-4 py-4 overflow-y-auto flex-1 pr-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên bếp *</Label>
                <Input
                  id="name"
                  placeholder="Bếp chính, Bar, Bếp nướng..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="kitchenType">Loại bếp</Label>
                  <Select
                    value={formData.kitchenType}
                    onValueChange={(value: KitchenType) => setFormData({ ...formData, kitchenType: value })}
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
                    onValueChange={(value: KitchenPrintMode) => setFormData({ ...formData, printMode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chế độ in" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PrintModeLabels) as KitchenPrintMode[]).map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {PrintModeLabels[mode]}
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
                    onValueChange={(value: PrinterProtocol) => setFormData({ ...formData, printerProtocol: value })}
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
                    onValueChange={(value) => setFormData({ ...formData, paperWidth: parseInt(value) })}
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
                    onChange={(e) => setFormData({ ...formData, printerName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="printerIp">IP máy in</Label>
                  <Input
                    id="printerIp"
                    placeholder="192.168.1.100"
                    value={formData.printerIp}
                    onChange={(e) => setFormData({ ...formData, printerIp: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, printerPort: e.target.value ? parseInt(e.target.value) : undefined })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="paperWidth">Khổ giấy</Label>
                  <Select
                    value={formData.paperWidth?.toString()}
                    onValueChange={(value) => setFormData({ ...formData, paperWidth: parseInt(value) })}
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
              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả bếp..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Ticket Printing Config - Only show for TICKET and BOTH modes */}
              {(formData.printMode === "TICKET" || formData.printMode === "BOTH") && (
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-medium text-sm">Cấu hình in phiếu bếp</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ticketCutAfterPrint"
                        checked={formData.ticketCutAfterPrint}
                        onCheckedChange={(checked) => setFormData({ ...formData, ticketCutAfterPrint: !!checked })}
                      />
                      <Label htmlFor="ticketCutAfterPrint" className="text-sm cursor-pointer">
                        Cắt giấy sau khi in
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ticketPrintItemsSeparately"
                        checked={formData.ticketPrintItemsSeparately}
                        onCheckedChange={(checked) => setFormData({ ...formData, ticketPrintItemsSeparately: !!checked })}
                      />
                      <Label htmlFor="ticketPrintItemsSeparately" className="text-sm cursor-pointer">
                        In từng món riêng biệt
                      </Label>
                    </div>
                  </div>
                  <div className="grid gap-2 max-w-[200px]">
                    <Label htmlFor="ticketCopies">Số bản in</Label>
                    <Input
                      id="ticketCopies"
                      type="number"
                      min={1}
                      max={5}
                      value={formData.ticketCopies || 1}
                      onChange={(e) => setFormData({ ...formData, ticketCopies: Math.min(5, Math.max(1, parseInt(e.target.value) || 1)) })}
                    />
                  </div>
                </div>
              )}

              {/* Label Printing Config - Always show for configuration */}
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium text-sm">Cấu hình in tem</h4>
                {formData.printMode === "TICKET" && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    Chế độ in hiện tại là "In phiếu bếp". Chuyển sang "In tem" hoặc "In cả hai" để sử dụng cấu hình tem này.
                  </p>
                )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="labelPrintPrice"
                        checked={formData.labelPrintPrice}
                        onCheckedChange={(checked) => setFormData({ ...formData, labelPrintPrice: !!checked })}
                      />
                      <Label htmlFor="labelPrintPrice" className="text-sm cursor-pointer">
                        In giá
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="labelPrintStoreName"
                        checked={formData.labelPrintStoreName}
                        onCheckedChange={(checked) => setFormData({ ...formData, labelPrintStoreName: !!checked })}
                      />
                      <Label htmlFor="labelPrintStoreName" className="text-sm cursor-pointer">
                        In tên cửa hàng
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="labelPrintOrderNumber"
                        checked={formData.labelPrintOrderNumber}
                        onCheckedChange={(checked) => setFormData({ ...formData, labelPrintOrderNumber: !!checked })}
                      />
                      <Label htmlFor="labelPrintOrderNumber" className="text-sm cursor-pointer">
                        In mã đơn hàng
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="labelPrintTableName"
                        checked={formData.labelPrintTableName}
                        onCheckedChange={(checked) => setFormData({ ...formData, labelPrintTableName: !!checked })}
                      />
                      <Label htmlFor="labelPrintTableName" className="text-sm cursor-pointer">
                        In tên bàn
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="labelPrintTime"
                        checked={formData.labelPrintTime}
                        onCheckedChange={(checked) => setFormData({ ...formData, labelPrintTime: !!checked })}
                      />
                      <Label htmlFor="labelPrintTime" className="text-sm cursor-pointer">
                        In thời gian
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="labelReverse"
                        checked={formData.labelReverse}
                        onCheckedChange={(checked) => setFormData({ ...formData, labelReverse: !!checked })}
                      />
                      <Label htmlFor="labelReverse" className="text-sm cursor-pointer">
                        Đảo chiều tem (180°)
                      </Label>
                    </div>
                  </div>
                  {formData.labelPrintStoreName && (
                    <div className="grid gap-2">
                      <Label htmlFor="labelStoreName">Tên cửa hàng hiển thị</Label>
                      <Input
                        id="labelStoreName"
                        placeholder="Tên cửa hàng trên tem..."
                        value={formData.labelStoreName || ""}
                        onChange={(e) => setFormData({ ...formData, labelStoreName: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Label Size & Font Config */}
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium text-sm">Kích thước tem & Font</h4>

                    {/* Label Size Selection */}
                    <div className="grid gap-2">
                      <Label>Kích thước tem</Label>
                      <Select
                        value={`${formData.labelWidthMm}x${formData.labelHeightMm}`}
                        onValueChange={(value) => {
                          const [width, height] = value.split("x").map(Number);
                          const recommendedMax = getRecommendedMaxToppings(width, height);
                          setFormData({
                            ...formData,
                            labelWidthMm: width,
                            labelHeightMm: height,
                            // Reset max toppings to auto when changing size
                            labelMaxToppings: 0,
                          });
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

                    {/* Font Scale Slider */}
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
                        onValueChange={([value]) => setFormData({ ...formData, labelFontScale: value / 100 })}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0.5x</span>
                        <span>1.0x</span>
                        <span>2.0x</span>
                      </div>
                    </div>

                    {/* Max Toppings */}
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
                          onChange={(e) => setFormData({
                            ...formData,
                            labelMaxToppings: e.target.value ? parseInt(e.target.value) : 0
                          })}
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
                          onChange={(e) => setFormData({
                            ...formData,
                            labelGapMm: e.target.value ? parseInt(e.target.value) : 3
                          })}
                        />
                      </div>
                    </div>

                    {/* Label Preview */}
                    <div className="pt-4 border-t">
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-4 flex-shrink-0 pt-4 border-t">
              {dialogMode === "create" && (
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
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Hủy
                </Button>
                <Button type="submit" disabled={saving || !formData.name.trim()}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {dialogMode === "create" ? "Tạo bếp" : "Cập nhật"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Assignment Dialog */}
      <Dialog open={dialogMode === "products"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Gán món ăn - {selectedKitchen?.name}</DialogTitle>
            <DialogDescription>
              Chọn các món ăn sẽ được in vào bếp này. Một món có thể được gán vào nhiều bếp.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col py-4">
            {loadingProducts ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Search and Quick Selection */}
                <div className="space-y-3 mb-4">
                  <Input
                    placeholder="Tìm kiếm món ăn..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllProducts}
                      className="h-8"
                    >
                      <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                      Chọn tất cả ({filteredProducts.length})
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearAllSelections}
                      className="h-8"
                      disabled={selectedProductIds.size === 0}
                    >
                      <Square className="mr-1.5 h-3.5 w-3.5" />
                      Bỏ chọn tất cả
                    </Button>
                  </div>
                </div>

                {/* Product List by Type */}
                <div className="flex-1 overflow-y-auto space-y-4">
                  {Object.entries(productsByType).map(([type, products]) => {
                    const selectionState = getTypeSelectionState(type);
                    return (
                      <div key={type}>
                        <div
                          className="sticky top-0 bg-background py-2 mb-2 flex items-center gap-2 cursor-pointer hover:bg-muted/30 rounded px-1 -mx-1"
                          onClick={() => toggleTypeSelection(type)}
                        >
                          <div className="flex items-center justify-center w-5 h-5">
                            {selectionState === "all" && (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            )}
                            {selectionState === "some" && (
                              <MinusSquare className="h-4 w-4 text-primary" />
                            )}
                            {selectionState === "none" && (
                              <Square className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <h4 className="font-medium text-sm text-muted-foreground flex-1">
                            {typeLabels[type] || type} ({products.length})
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {products.filter(p => selectedProductIds.has(p.id)).length}/{products.length}
                          </span>
                        </div>
                        <div className="grid gap-2">
                          {products.map((product) => {
                            // Count other kitchens (exclude current kitchen)
                            const otherKitchens = product.assignedKitchens?.filter(
                              k => k.id !== selectedKitchen?.id
                            ) || [];
                            return (
                              <div
                                key={product.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${
                                  selectedProductIds.has(product.id) ? 'border-primary bg-primary/5' : ''
                                }`}
                                onClick={() => toggleProductSelection(product.id)}
                              >
                                <Checkbox
                                  checked={selectedProductIds.has(product.id)}
                                  onCheckedChange={() => toggleProductSelection(product.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{product.name}</p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-muted-foreground">{product.code}</span>
                                    {otherKitchens.length > 0 && (
                                      <span
                                        className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded"
                                        title={otherKitchens.map(k => k.name).join(', ')}
                                      >
                                        {otherKitchens.length} bếp khác
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {selectedProductIds.has(product.id) && (
                                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <UtensilsCrossed className="h-10 w-10 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Không tìm thấy món ăn</p>
                    </div>
                  )}
                </div>

                {/* Selection Summary */}
                <div className="pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Đã chọn <span className="font-medium text-foreground">{selectedProductIds.size}</span> món
                    {selectedProductIds.size > 100 && (
                      <span className="text-xs ml-2 text-amber-600">
                        (Sẽ xử lý nền cho {selectedProductIds.size} món)
                      </span>
                    )}
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseDialog}>
              Hủy
            </Button>
            <Button onClick={handleSaveProducts} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu ({selectedProductIds.size} món)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteKitchen !== null} onOpenChange={() => setDeleteKitchen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bếp &quot;{deleteKitchen?.name}&quot;? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
