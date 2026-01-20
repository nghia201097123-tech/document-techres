"use client";

import * as React from "react";
import { Loader2, Search, Check } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { giftItemService, type GiftItem, type UpdateGiftItemDto } from "@/services/gift-item-service";
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

interface GiftItemFormDialogProps {
  open: boolean;
  giftItemId?: string;
  products: Product[];
  existingProductIds: Set<string>;
  onClose: () => void;
  onSuccess: (item: GiftItem) => void;
}

const GiftItemFormDialog = React.memo(function GiftItemFormDialog({
  open,
  giftItemId,
  products,
  existingProductIds,
  onClose,
  onSuccess,
}: GiftItemFormDialogProps) {
  const { toast } = useToast();

  // All form state managed locally
  const [formData, setFormData] = React.useState<UpdateGiftItemDto>({
    productId: "",
    name: "",
    description: "",
    maxQuantity: 1,
    minOrderAmount: 0,
    sortOrder: 0,
  });
  const [saving, setSaving] = React.useState(false);
  const [loadingItem, setLoadingItem] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Load gift item data
  React.useEffect(() => {
    if (!open) return;

    if (giftItemId) {
      loadGiftItemData();
    } else {
      resetForm();
    }
  }, [open, giftItemId]);

  const loadGiftItemData = async () => {
    if (!giftItemId) return;
    setLoadingItem(true);
    try {
      const item = await giftItemService.getById(giftItemId);
      setFormData({
        productId: item.productId || "",
        name: item.name || "",
        description: item.description || "",
        maxQuantity: Number(item.maxQuantity) || 1,
        minOrderAmount: Number(item.minOrderAmount) || 0,
        sortOrder: Number(item.sortOrder) || 0,
      });
      // Set search query to product name if exists
      const product = products.find(p => p.id === item.productId);
      if (product) {
        setSearchQuery(product.name);
      }
    } catch (error) {
      console.error("Error loading gift item:", error);
      toast({ title: "Lỗi", description: "Không thể tải thông tin món tặng", variant: "destructive" });
    } finally {
      setLoadingItem(false);
    }
  };

  const resetForm = () => {
    setFormData({
      productId: "",
      name: "",
      description: "",
      maxQuantity: 1,
      minOrderAmount: 0,
      sortOrder: 0,
    });
    setSearchQuery("");
  };

  // Filter products based on search and exclude already added (except current)
  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const notAlreadyAdded = !existingProductIds.has(p.id) || p.id === formData.productId;
      return matchesSearch && notAlreadyAdded;
    });
  }, [products, searchQuery, existingProductIds, formData.productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftItemId) return;

    try {
      setSaving(true);
      const submitData: UpdateGiftItemDto = {
        ...formData,
        maxQuantity: Number(formData.maxQuantity) || 1,
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        sortOrder: Number(formData.sortOrder) || 0,
      };
      const result = await giftItemService.update(giftItemId, submitData);
      onSuccess(result);
      toast({ title: "Thành công", description: "Đã cập nhật món tặng" });
      handleClose();
    } catch (error: any) {
      console.error("Error updating gift item:", error);
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
    resetForm();
    onClose();
  };

  if (loadingItem) {
    return (
      <Dialog open={open} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-lg">
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa món tặng</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin món tặng
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Select product */}
            <div className="grid gap-2">
              <Label>Món ăn *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm món ăn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-[150px] border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredProducts.map((product) => {
                    const isSelected = formData.productId === product.id;
                    return (
                      <div
                        key={product.id}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
                          isSelected ? "bg-primary/10" : ""
                        }`}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, productId: product.id }));
                          setSearchQuery(product.name);
                        }}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "bg-primary border-primary" : "border-input"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
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
              </ScrollArea>
            </div>

            {/* Custom name override */}
            <div className="grid gap-2">
              <Label htmlFor="name">Tên hiển thị (để trống nếu dùng tên gốc)</Label>
              <Input
                id="name"
                placeholder="Tên món tặng..."
                value={formData.name || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                placeholder="Mô tả món tặng..."
                value={formData.description || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Max quantity and min order amount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="maxQuantity">Số lượng tối đa</Label>
                <Input
                  id="maxQuantity"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={formData.maxQuantity || 1}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxQuantity: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minOrderAmount">Đơn tối thiểu (VNĐ)</Label>
                <Input
                  id="minOrderAmount"
                  type="text"
                  inputMode="numeric"
                  placeholder="500000"
                  value={formData.minOrderAmount ? new Intl.NumberFormat("vi-VN").format(Math.floor(formData.minOrderAmount)) : ""}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\./g, "");
                    const numValue = parseInt(rawValue, 10);
                    setFormData(prev => ({ ...prev, minOrderAmount: isNaN(numValue) ? 0 : numValue }));
                  }}
                />
              </div>
            </div>

            {/* Sort order */}
            <div className="grid gap-2">
              <Label htmlFor="sortOrder">Thứ tự hiển thị</Label>
              <Input
                id="sortOrder"
                type="number"
                min="0"
                placeholder="0"
                value={formData.sortOrder || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={saving || !formData.productId}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cập nhật
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default GiftItemFormDialog;
