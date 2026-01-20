"use client";

import * as React from "react";
import { Loader2, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useBackgroundProgress } from "@/components/ui/background-progress";
import { giftItemService, type GiftItem } from "@/services/gift-item-service";
import { type Product } from "@/services/product-service";

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
};

interface GiftItemCreateDialogProps {
  open: boolean;
  products: Product[];
  loadingProducts: boolean;
  existingProductIds: Set<string>;
  onClose: () => void;
  onSuccess: (items: GiftItem[]) => void;
}

const GiftItemCreateDialog = React.memo(function GiftItemCreateDialog({
  open,
  products,
  loadingProducts,
  existingProductIds,
  onClose,
  onSuccess,
}: GiftItemCreateDialogProps) {
  const { toast } = useToast();
  const { addProgress, updateProgress, completeProgress } = useBackgroundProgress();

  // All form state managed locally
  const [selectedProductIds, setSelectedProductIds] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState("");
  const [maxQuantity, setMaxQuantity] = React.useState(1);
  const [minOrderAmount, setMinOrderAmount] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [createProgress, setCreateProgress] = React.useState<{
    current: number;
    total: number;
    batchNumber: number;
    totalBatches: number;
  } | null>(null);

  // Reset when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedProductIds(new Set());
      setSearchQuery("");
      setMaxQuantity(1);
      setMinOrderAmount(0);
      setCreateProgress(null);
    }
  }, [open]);

  // Filter products based on search and exclude already added
  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const notAlreadyAdded = !existingProductIds.has(p.id);
      return matchesSearch && notAlreadyAdded;
    });
  }, [products, searchQuery, existingProductIds]);

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

  // Select all filtered products
  const selectAllFiltered = () => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      filteredProducts.forEach(p => next.add(p.id));
      return next;
    });
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedProductIds(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedProductIds.size === 0) {
      toast({ title: "Lỗi", description: "Vui lòng chọn ít nhất một món ăn", variant: "destructive" });
      return;
    }

    const productIdArray = Array.from(selectedProductIds);
    const batchSize = 50;
    const totalBatches = Math.ceil(productIdArray.length / batchSize);
    const isLargeList = productIdArray.length > 10;
    const progressId = `gift-items-${Date.now()}`;

    // For large lists, close dialog and use background progress
    if (isLargeList) {
      handleClose();
      addProgress({
        id: progressId,
        title: "Tạo món tặng",
        current: 0,
        total: productIdArray.length,
        batchNumber: 1,
        totalBatches,
      });
    } else {
      setSaving(true);
    }

    try {
      const createdItems: GiftItem[] = [];
      const errors: string[] = [];

      // Create gift items in batches
      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const start = batchNum * batchSize;
        const end = Math.min(start + batchSize, productIdArray.length);
        const batch = productIdArray.slice(start, end);

        if (isLargeList) {
          updateProgress(progressId, {
            current: start,
            batchNumber: batchNum + 1,
            totalBatches,
          });
        } else {
          setCreateProgress({
            current: start,
            total: productIdArray.length,
            batchNumber: batchNum + 1,
            totalBatches,
          });
        }

        // Process each product in batch
        for (let i = 0; i < batch.length; i++) {
          const productId = batch[i];
          try {
            const submitData = {
              productId,
              maxQuantity: Number(maxQuantity) || 1,
              minOrderAmount: Number(minOrderAmount) || 0,
              sortOrder: 0,
            };
            const result = await giftItemService.create(submitData);
            createdItems.push(result);

            if (isLargeList) {
              updateProgress(progressId, {
                current: start + i + 1,
                batchNumber: batchNum + 1,
                totalBatches,
              });
            } else {
              setCreateProgress({
                current: start + i + 1,
                total: productIdArray.length,
                batchNumber: batchNum + 1,
                totalBatches,
              });
            }
          } catch (error: any) {
            const product = products.find(p => p.id === productId);
            errors.push(product?.name || productId);
          }
        }
      }

      if (createdItems.length > 0) {
        onSuccess(createdItems);
      }

      if (isLargeList) {
        if (errors.length > 0) {
          completeProgress(progressId, `Thành công: ${createdItems.length}, Lỗi: ${errors.length}`);
        } else {
          completeProgress(progressId, `Đã tạo ${createdItems.length} món tặng`);
        }
      } else {
        setCreateProgress(null);
        if (createdItems.length > 0) {
          toast({
            title: "Thành công",
            description: `Đã thêm ${createdItems.length} món tặng${errors.length > 0 ? `, ${errors.length} lỗi` : ""}`,
          });
        }
        if (!isLargeList) {
          handleClose();
        }
      }
    } catch (error: any) {
      console.error("Error creating gift items:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedProductIds(new Set());
    setSearchQuery("");
    setMaxQuantity(1);
    setMinOrderAmount(0);
    setCreateProgress(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Thêm món tặng</DialogTitle>
          <DialogDescription>
            Chọn một hoặc nhiều món ăn từ thực đơn để làm món tặng kèm
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm món ăn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Selection info and actions */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Đã chọn: <strong>{selectedProductIds.size}</strong> món
                {filteredProducts.length > 0 && ` / ${filteredProducts.length} món có sẵn`}
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllFiltered}>
                  Chọn tất cả
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={deselectAll}>
                  Bỏ chọn
                </Button>
              </div>
            </div>

            {/* Product list with checkboxes */}
            <ScrollArea className="h-[300px] border rounded-md">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery ? "Không tìm thấy món ăn phù hợp" : "Tất cả món ăn đã được thêm vào danh sách món tặng"}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProductIds.has(product.id);
                    return (
                      <div
                        key={product.id}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
                          isSelected ? "bg-primary/10" : ""
                        }`}
                        onClick={() => toggleProductSelection(product.id)}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                          isSelected ? "bg-primary border-primary" : "border-input"
                        }`}>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(Number(product.price))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Common settings for all selected items */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="maxQuantity">Số lượng tối đa (mỗi món)</Label>
                <Input
                  id="maxQuantity"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={maxQuantity}
                  onChange={(e) => setMaxQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minOrderAmount">Đơn tối thiểu (VNĐ)</Label>
                <Input
                  id="minOrderAmount"
                  type="text"
                  inputMode="numeric"
                  placeholder="500000"
                  value={minOrderAmount ? new Intl.NumberFormat("vi-VN").format(Math.floor(minOrderAmount)) : ""}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\./g, "");
                    const numValue = parseInt(rawValue, 10);
                    setMinOrderAmount(isNaN(numValue) ? 0 : numValue);
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={saving || selectedProductIds.size === 0}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {createProgress
                ? `Đang xử lý... ${createProgress.current}/${createProgress.total} (batch ${createProgress.batchNumber}/${createProgress.totalBatches})`
                : `Thêm ${selectedProductIds.size > 0 ? `${selectedProductIds.size} món` : "món tặng"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default GiftItemCreateDialog;
