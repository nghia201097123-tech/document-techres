"use client";

import * as React from "react";
import { Plus, Search, Loader2, Cherry, X, Trash2, ChevronDown, ChevronRight, UtensilsCrossed, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { productService, type Product, ProductType, type ToppingGroup } from "@/services/product-service";

export default function ToppingOptionsPage() {
  const { toast } = useToast();

  // State
  const [products, setProducts] = React.useState<Product[]>([]);
  const [availableToppings, setAvailableToppings] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");

  // Selected product for management
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [toppingGroups, setToppingGroups] = React.useState<ToppingGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = React.useState(false);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [savingGroups, setSavingGroups] = React.useState(false);

  // New group form
  const [showNewGroupForm, setShowNewGroupForm] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState("");
  const [newGroupRequired, setNewGroupRequired] = React.useState(false);
  const [newGroupMinSelection, setNewGroupMinSelection] = React.useState(0);
  const [newGroupMaxSelection, setNewGroupMaxSelection] = React.useState(1);

  // Adding topping to group
  const [addingToGroupId, setAddingToGroupId] = React.useState<string | null>(null);

  // Edit group dialog
  const [editingGroup, setEditingGroup] = React.useState<ToppingGroup | null>(null);
  const [editGroupName, setEditGroupName] = React.useState("");
  const [editGroupRequired, setEditGroupRequired] = React.useState(false);
  const [editGroupMinSelection, setEditGroupMinSelection] = React.useState(0);
  const [editGroupMaxSelection, setEditGroupMaxSelection] = React.useState(1);

  // Load products
  const loadProducts = React.useCallback(async () => {
    try {
      setLoading(true);
      const [allProducts, toppings] = await Promise.all([
        productService.getAll(),
        productService.getAvailableToppings(),
      ]);
      // Filter out topping type products for the main list
      setProducts(allProducts.filter(p => p.type !== ProductType.TOPPING));
      setAvailableToppings(toppings);
    } catch (error) {
      console.error("Error loading products:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách món", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Load topping groups for selected product
  const loadToppingGroups = async (productId: string) => {
    setLoadingGroups(true);
    try {
      const groups = await productService.getToppingGroups(productId);
      setToppingGroups(groups);
      setExpandedGroups(new Set(groups.map(g => g.id)));
    } catch (error) {
      console.error("Error loading topping groups:", error);
      toast({ title: "Lỗi", description: "Không thể tải nhóm topping", variant: "destructive" });
    } finally {
      setLoadingGroups(false);
    }
  };

  // Select a product
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    loadToppingGroups(product.id);
    setShowNewGroupForm(false);
    setAddingToGroupId(null);
  };

  // Create topping group
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !selectedProduct) return;
    setSavingGroups(true);
    try {
      const result = await productService.createToppingGroup(selectedProduct.id, {
        name: newGroupName.trim(),
        isRequired: newGroupRequired,
        minSelection: newGroupMinSelection,
        maxSelection: newGroupMaxSelection,
      });
      setToppingGroups(result);
      setNewGroupName("");
      setNewGroupRequired(false);
      setNewGroupMinSelection(0);
      setNewGroupMaxSelection(1);
      setShowNewGroupForm(false);
      const newGroup = result.find(g => g.name === newGroupName.trim());
      if (newGroup) {
        setExpandedGroups(prev => new Set([...prev, newGroup.id]));
      }
      toast({ title: "Thành công", description: `Đã tạo nhóm "${newGroupName}"` });
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingGroups(false);
    }
  };

  // Open edit group dialog
  const handleOpenEditGroup = (group: ToppingGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGroup(group);
    setEditGroupName(group.name);
    setEditGroupRequired(group.isRequired);
    setEditGroupMinSelection(group.minSelection);
    setEditGroupMaxSelection(group.maxSelection);
  };

  // Update topping group
  const handleUpdateGroup = async () => {
    if (!editingGroup || !selectedProduct) return;
    setSavingGroups(true);
    try {
      const result = await productService.updateToppingGroup(selectedProduct.id, editingGroup.id, {
        name: editGroupName.trim(),
        isRequired: editGroupRequired,
        minSelection: editGroupMinSelection,
        maxSelection: editGroupMaxSelection,
      });
      setToppingGroups(result);
      setEditingGroup(null);
      toast({ title: "Thành công", description: "Đã cập nhật nhóm topping" });
    } catch (error: any) {
      console.error("Error updating group:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingGroups(false);
    }
  };

  // Delete topping group
  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedProduct) return;
    if (!confirm("Bạn có chắc muốn xóa nhóm này?")) return;
    setSavingGroups(true);
    try {
      const result = await productService.deleteToppingGroup(selectedProduct.id, groupId);
      setToppingGroups(result);
      toast({ title: "Thành công", description: "Đã xóa nhóm topping" });
    } catch (error: any) {
      console.error("Error deleting group:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingGroups(false);
    }
  };

  // Add topping to group
  const handleAddToppingToGroup = async (groupId: string, toppingId: string) => {
    if (!selectedProduct) return;
    setSavingGroups(true);
    try {
      const result = await productService.addToppingItem(selectedProduct.id, groupId, {
        toppingId,
        priceAdjustment: 0,
        maxQuantity: 5,
      });
      setToppingGroups(result);
      setAddingToGroupId(null);
      const topping = availableToppings.find(t => t.id === toppingId);
      toast({ title: "Thành công", description: `Đã thêm "${topping?.name}" vào nhóm` });
    } catch (error: any) {
      console.error("Error adding topping:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingGroups(false);
    }
  };

  // Remove topping from group
  const handleRemoveToppingFromGroup = async (groupId: string, itemId: string) => {
    if (!selectedProduct) return;
    setSavingGroups(true);
    try {
      const result = await productService.removeToppingItem(selectedProduct.id, groupId, itemId);
      setToppingGroups(result);
      toast({ title: "Thành công", description: "Đã xóa topping khỏi nhóm" });
    } catch (error: any) {
      console.error("Error removing topping:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingGroups(false);
    }
  };

  // Toggle group expansion
  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Get toppings not in a specific group
  const getAvailableToppingsForGroup = (groupId: string) => {
    const group = toppingGroups.find(g => g.id === groupId);
    if (!group) return availableToppings;
    const usedIds = new Set(group.items.map(i => i.toppingId));
    return availableToppings.filter(t => !usedIds.has(t.id));
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || p.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quản lý Topping Options</h1>
        <p className="text-muted-foreground">Gán nhóm topping và các lựa chọn cho món ăn</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left panel - Product list */}
        <div className="col-span-5">
          <Card className="h-[calc(100vh-200px)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Danh sách món</CardTitle>
              <CardDescription>Chọn món để quản lý topping</CardDescription>
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="food">Đồ ăn</SelectItem>
                    <SelectItem value="drink">Đồ uống</SelectItem>
                    <SelectItem value="other">Khác</SelectItem>
                    <SelectItem value="combo">Combo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto h-[calc(100%-140px)]">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <UtensilsCrossed className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Không tìm thấy món ăn</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedProduct?.id === product.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => handleSelectProduct(product)}
                    >
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className={`text-xs ${selectedProduct?.id === product.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {product.code}
                        </div>
                      </div>
                      <Badge variant={selectedProduct?.id === product.id ? "secondary" : "outline"} className="text-xs">
                        {product.type === "food" ? "Đồ ăn" :
                         product.type === "drink" ? "Đồ uống" :
                         product.type === "combo" ? "Combo" : "Khác"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right panel - Topping groups */}
        <div className="col-span-7">
          <Card className="h-[calc(100vh-200px)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {selectedProduct ? `Topping - ${selectedProduct.name}` : "Chọn món để quản lý"}
                  </CardTitle>
                  <CardDescription>
                    {selectedProduct ? "Quản lý nhóm topping và lựa chọn" : "Chọn một món ăn từ danh sách bên trái"}
                  </CardDescription>
                </div>
                {selectedProduct && (
                  <Button onClick={() => setShowNewGroupForm(true)} disabled={showNewGroupForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm nhóm
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto h-[calc(100%-100px)]">
              {!selectedProduct ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Cherry className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Chọn một món ăn để bắt đầu quản lý topping</p>
                </div>
              ) : loadingGroups ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* New group form */}
                  {showNewGroupForm && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <Label className="text-sm font-medium">Tạo nhóm mới</Label>
                      <div className="space-y-3 mt-2">
                        <Input
                          placeholder="Tên nhóm (VD: Size, Topping, Độ ngọt)"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                        />
                        <div className="grid grid-cols-3 gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={newGroupRequired}
                              onCheckedChange={setNewGroupRequired}
                            />
                            <Label className="text-sm">Bắt buộc</Label>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Tối thiểu</Label>
                            <Input
                              type="number"
                              min="0"
                              value={newGroupMinSelection}
                              onChange={(e) => setNewGroupMinSelection(Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Tối đa</Label>
                            <Input
                              type="number"
                              min="1"
                              value={newGroupMaxSelection}
                              onChange={(e) => setNewGroupMaxSelection(Number(e.target.value))}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleCreateGroup}
                            disabled={!newGroupName.trim() || savingGroups}
                          >
                            {savingGroups ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Tạo nhóm
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowNewGroupForm(false);
                              setNewGroupName("");
                              setNewGroupRequired(false);
                              setNewGroupMinSelection(0);
                              setNewGroupMaxSelection(1);
                            }}
                          >
                            Hủy
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Existing groups */}
                  {toppingGroups.length === 0 && !showNewGroupForm ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Cherry className="h-10 w-10 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Chưa có nhóm topping nào</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Nhấn "Thêm nhóm" để bắt đầu
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {toppingGroups.map((group) => (
                        <div key={group.id} className="border rounded-lg overflow-hidden">
                          {/* Group header */}
                          <div
                            className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleGroupExpanded(group.id)}
                          >
                            <div className="flex items-center gap-2">
                              {expandedGroups.has(group.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <span className="font-medium">{group.name}</span>
                              <Badge variant={group.isRequired ? "default" : "secondary"} className="text-xs">
                                {group.isRequired ? "Bắt buộc" : "Tùy chọn"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Chọn: {group.minSelection} - {group.maxSelection}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                • {group.items.length} item
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => handleOpenEditGroup(group, e)}
                                disabled={savingGroups}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => handleDeleteGroup(group.id, e)}
                                disabled={savingGroups}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          {/* Group items */}
                          {expandedGroups.has(group.id) && (
                            <div className="p-3 space-y-2 border-t">
                              {group.items.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-2">
                                  Chưa có topping nào trong nhóm
                                </p>
                              ) : (
                                group.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between p-2 rounded bg-muted/20"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Cherry className="h-4 w-4 text-purple-500" />
                                      <span>{item.topping.name}</span>
                                      <span className="text-xs font-mono text-muted-foreground">
                                        {item.topping.code}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-green-600">
                                        {item.priceAdjustment > 0 && "+"}
                                        {formatCurrency(item.priceAdjustment > 0 ? item.priceAdjustment : item.topping.price)}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleRemoveToppingFromGroup(group.id, item.id)}
                                        disabled={savingGroups}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              )}

                              {/* Add topping to group */}
                              {addingToGroupId === group.id ? (
                                <div className="p-2 border rounded bg-background">
                                  <Label className="text-xs">Chọn topping để thêm</Label>
                                  <div className="grid gap-1 mt-1 max-h-40 overflow-y-auto">
                                    {getAvailableToppingsForGroup(group.id).map((topping) => (
                                      <div
                                        key={topping.id}
                                        className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted"
                                        onClick={() => handleAddToppingToGroup(group.id, topping.id)}
                                      >
                                        <span className="text-sm">{topping.name}</span>
                                        <span className="text-sm text-green-600">{formatCurrency(topping.price)}</span>
                                      </div>
                                    ))}
                                    {getAvailableToppingsForGroup(group.id).length === 0 && (
                                      <p className="text-xs text-muted-foreground p-2">
                                        Không còn topping nào để thêm
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full mt-2"
                                    onClick={() => setAddingToGroupId(null)}
                                  >
                                    Hủy
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => setAddingToGroupId(group.id)}
                                  disabled={availableToppings.length === 0}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Thêm topping
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {availableToppings.length === 0 && (
                    <div className="p-4 border rounded-lg bg-yellow-50 text-yellow-800 text-sm">
                      Chưa có sản phẩm loại "Topping" nào. Hãy tạo sản phẩm loại Topping trước trong mục Món ăn.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa nhóm topping</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin nhóm topping
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên nhóm</Label>
              <Input
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editGroupRequired}
                onCheckedChange={setEditGroupRequired}
              />
              <Label>Bắt buộc chọn</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Số lượng tối thiểu</Label>
                <Input
                  type="number"
                  min="0"
                  value={editGroupMinSelection}
                  onChange={(e) => setEditGroupMinSelection(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Số lượng tối đa</Label>
                <Input
                  type="number"
                  min="1"
                  value={editGroupMaxSelection}
                  onChange={(e) => setEditGroupMaxSelection(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateGroup} disabled={savingGroups || !editGroupName.trim()}>
              {savingGroups && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
