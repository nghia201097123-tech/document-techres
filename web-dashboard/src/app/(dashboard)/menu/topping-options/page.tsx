"use client";

import * as React from "react";
import { Plus, Search, Loader2, Cherry, X, Trash2, ChevronDown, ChevronRight, UtensilsCrossed, Pencil, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { productService, type Product, ProductType, type ToppingGroup } from "@/services/product-service";
import { BrandFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";

export default function ToppingOptionsPage() {
  const { toast } = useToast();

  // Global filter state from Redux
  const { brandId: filterBrandId, setBrandId: setFilterBrandId } = useGlobalFilters();

  // State
  const [toppingGroups, setToppingGroups] = React.useState<ToppingGroup[]>([]);
  const [availableToppings, setAvailableToppings] = React.useState<Product[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  // Selected group for management
  const [selectedGroup, setSelectedGroup] = React.useState<ToppingGroup | null>(null);
  const [expandedItems, setExpandedItems] = React.useState(true);
  const [savingGroups, setSavingGroups] = React.useState(false);

  // New group form
  const [showNewGroupForm, setShowNewGroupForm] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState("");
  const [newGroupRequired, setNewGroupRequired] = React.useState(false);
  const [newGroupMinSelection, setNewGroupMinSelection] = React.useState(0);
  const [newGroupMaxSelection, setNewGroupMaxSelection] = React.useState(1);

  // Adding topping to group
  const [showAddToppingDialog, setShowAddToppingDialog] = React.useState(false);
  const [showQuickCreateForm, setShowQuickCreateForm] = React.useState(false);
  const [quickCreateName, setQuickCreateName] = React.useState("");
  const [quickCreatePrice, setQuickCreatePrice] = React.useState<number>(0);
  const [quickCreateVat, setQuickCreateVat] = React.useState<number>(0);
  const [creatingTopping, setCreatingTopping] = React.useState(false);

  // Edit group dialog
  const [editingGroup, setEditingGroup] = React.useState<ToppingGroup | null>(null);
  const [editGroupName, setEditGroupName] = React.useState("");
  const [editGroupRequired, setEditGroupRequired] = React.useState(false);
  const [editGroupMinSelection, setEditGroupMinSelection] = React.useState(0);
  const [editGroupMaxSelection, setEditGroupMaxSelection] = React.useState(1);

  // Assign to product dialog
  const [showAssignDialog, setShowAssignDialog] = React.useState(false);
  const [selectedProductForAssign, setSelectedProductForAssign] = React.useState<Product | null>(null);
  const [assignedGroupIds, setAssignedGroupIds] = React.useState<string[]>([]);
  const [loadingAssignments, setLoadingAssignments] = React.useState(false);

  // Load data - only when brand is selected
  const loadData = React.useCallback(async (brandId: string) => {
    if (!brandId) {
      setToppingGroups([]);
      setAvailableToppings([]);
      setProducts([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [groups, toppings, allProducts] = await Promise.all([
        productService.getAllToppingGroups(brandId),
        productService.getAvailableToppings(brandId),
        productService.getAll(brandId),
      ]);
      // Sort by createdAt descending (newest first)
      const sortedGroups = [...groups].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const sortedToppings = [...toppings].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const sortedProducts = [...allProducts].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setToppingGroups(sortedGroups);
      setAvailableToppings(sortedToppings);
      // Filter out topping type products
      setProducts(sortedProducts.filter(p => p.type !== ProductType.TOPPING));
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Lỗi", description: "Không thể tải dữ liệu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadData(filterBrandId);
  }, [filterBrandId, loadData]);

  // Select a group
  const handleSelectGroup = (group: ToppingGroup) => {
    setSelectedGroup(group);
    setShowNewGroupForm(false);
  };

  // Create topping group
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setSavingGroups(true);
    try {
      const newGroup = await productService.createToppingGroup({
        name: newGroupName.trim(),
        isRequired: newGroupRequired,
        minSelection: newGroupMinSelection,
        maxSelection: newGroupMaxSelection,
      });
      const groups = await productService.getAllToppingGroups();
      setToppingGroups(groups);
      setSelectedGroup(newGroup);
      setNewGroupName("");
      setNewGroupRequired(false);
      setNewGroupMinSelection(0);
      setNewGroupMaxSelection(1);
      setShowNewGroupForm(false);
      toast({ title: "Thành công", description: `Đã tạo nhóm "${newGroupName}"` });
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingGroups(false);
    }
  };

  // Open edit group dialog
  const handleOpenEditGroup = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedGroup) return;
    setEditingGroup(selectedGroup);
    setEditGroupName(selectedGroup.name);
    setEditGroupRequired(selectedGroup.isRequired);
    setEditGroupMinSelection(selectedGroup.minSelection);
    setEditGroupMaxSelection(selectedGroup.maxSelection);
  };

  // Update topping group
  const handleUpdateGroup = async () => {
    if (!editingGroup) return;
    setSavingGroups(true);
    try {
      const updated = await productService.updateToppingGroup(editingGroup.id, {
        name: editGroupName.trim(),
        isRequired: editGroupRequired,
        minSelection: editGroupMinSelection,
        maxSelection: editGroupMaxSelection,
      });
      const groups = await productService.getAllToppingGroups();
      setToppingGroups(groups);
      setSelectedGroup(updated);
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
  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    if (!confirm("Bạn có chắc muốn xóa nhóm này? Nhóm sẽ bị xóa khỏi tất cả các món đã gán.")) return;
    setSavingGroups(true);
    try {
      await productService.deleteToppingGroup(selectedGroup.id);
      const groups = await productService.getAllToppingGroups();
      setToppingGroups(groups);
      setSelectedGroup(null);
      toast({ title: "Thành công", description: "Đã xóa nhóm topping" });
    } catch (error: any) {
      console.error("Error deleting group:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingGroups(false);
    }
  };

  // Toggle group active
  const handleToggleActive = async () => {
    if (!selectedGroup) return;
    setSavingGroups(true);
    try {
      const updated = await productService.toggleToppingGroupActive(selectedGroup.id);
      const groups = await productService.getAllToppingGroups();
      setToppingGroups(groups);
      setSelectedGroup(updated);
      toast({ title: "Thành công", description: updated.isActive ? "Đã kích hoạt nhóm" : "Đã tạm ngưng nhóm" });
    } catch (error: any) {
      console.error("Error toggling group:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingGroups(false);
    }
  };

  // Add topping to group
  const handleAddToppingToGroup = async (toppingId: string) => {
    if (!selectedGroup) return;
    setSavingGroups(true);
    try {
      const updated = await productService.addToppingItem(selectedGroup.id, {
        toppingId,
        priceAdjustment: 0,
        maxQuantity: 5,
      });
      const groups = await productService.getAllToppingGroups();
      setToppingGroups(groups);
      setSelectedGroup(updated);
      setShowAddToppingDialog(false);
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
  const handleRemoveToppingFromGroup = async (itemId: string) => {
    if (!selectedGroup) return;
    setSavingGroups(true);
    try {
      const updated = await productService.removeToppingItem(selectedGroup.id, itemId);
      const groups = await productService.getAllToppingGroups();
      setToppingGroups(groups);
      setSelectedGroup(updated);
      toast({ title: "Thành công", description: "Đã xóa topping khỏi nhóm" });
    } catch (error: any) {
      console.error("Error removing topping:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingGroups(false);
    }
  };

  // Open assign to product dialog
  const handleOpenAssignDialog = async (product: Product) => {
    setSelectedProductForAssign(product);
    setLoadingAssignments(true);
    try {
      const groups = await productService.getProductToppingGroups(product.id);
      setAssignedGroupIds(groups.map(g => g.id));
    } catch (error) {
      console.error("Error loading assignments:", error);
      setAssignedGroupIds([]);
    } finally {
      setLoadingAssignments(false);
    }
    setShowAssignDialog(true);
  };

  // Save assignments
  const handleSaveAssignments = async () => {
    if (!selectedProductForAssign) return;
    setSavingGroups(true);
    try {
      await productService.assignToppingGroupsToProduct(selectedProductForAssign.id, assignedGroupIds);
      setShowAssignDialog(false);
      setSelectedProductForAssign(null);
      toast({ title: "Thành công", description: "Đã cập nhật nhóm topping cho món" });
    } catch (error: any) {
      console.error("Error saving assignments:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingGroups(false);
    }
  };

  // Get toppings not in selected group
  const getAvailableToppingsForGroup = () => {
    if (!selectedGroup) return availableToppings;
    const usedIds = new Set(selectedGroup.items.map(i => i.toppingId));
    return availableToppings.filter(t => !usedIds.has(t.id));
  };

  // Quick create topping and add to group
  const handleQuickCreateTopping = async () => {
    if (!quickCreateName.trim() || !selectedGroup) return;
    setCreatingTopping(true);
    try {
      // Create topping product
      const newTopping = await productService.create({
        name: quickCreateName.trim(),
        type: ProductType.TOPPING,
        price: quickCreatePrice || 0,
        vatRate: quickCreateVat || 0,
      });

      // Refresh available toppings
      const toppings = await productService.getAvailableToppings();
      setAvailableToppings(toppings);

      // Add to group
      const updated = await productService.addToppingItem(selectedGroup.id, {
        toppingId: newTopping.id,
        priceAdjustment: quickCreatePrice || 0,
        maxQuantity: 5,
      });
      const groups = await productService.getAllToppingGroups();
      setToppingGroups(groups);
      setSelectedGroup(updated);

      // Reset form
      setQuickCreateName("");
      setQuickCreatePrice(0);
      setQuickCreateVat(0);
      setShowQuickCreateForm(false);
      toast({ title: "Thành công", description: `Đã tạo và thêm "${newTopping.name}" vào nhóm` });
    } catch (error: any) {
      console.error("Error creating topping:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setCreatingTopping(false);
    }
  };

  // Reset quick create form when dialog closes
  const handleCloseAddToppingDialog = () => {
    setShowAddToppingDialog(false);
    setShowQuickCreateForm(false);
    setQuickCreateName("");
    setQuickCreatePrice(0);
    setQuickCreateVat(0);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  // Filter groups by search (already filtered by API for brand)
  const filteredGroups = toppingGroups.filter(g => {
    return g.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Topping Options</h1>
          <p className="text-muted-foreground">Tạo nhóm topping dùng chung và gán vào các món ăn</p>
        </div>
        <BrandFilter
          selectedBrandId={filterBrandId}
          onBrandChange={setFilterBrandId}
          showAllOption={false}
          className="w-[180px]"
        />
      </div>

      {!filterBrandId ? (
        <FilterRequiredPlaceholder
          title="Vui lòng chọn thương hiệu"
          description="Chọn một thương hiệu từ bộ lọc phía trên để quản lý topping"
        />
      ) : (
      <Tabs defaultValue="groups" className="w-full">
        <TabsList>
          <TabsTrigger value="groups">Nhóm Topping</TabsTrigger>
          <TabsTrigger value="assign">Gán vào món</TabsTrigger>
        </TabsList>

        {/* Tab: Topping Groups */}
        <TabsContent value="groups" className="mt-4">
          <div className="grid grid-cols-12 gap-6">
            {/* Left panel - Group list */}
            <div className="col-span-4">
              <Card className="h-[calc(100vh-280px)]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Nhóm Topping</CardTitle>
                    <Button size="sm" onClick={() => setShowNewGroupForm(true)} disabled={showNewGroupForm}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm..."
                      className="pl-10"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="overflow-y-auto h-[calc(100%-140px)]">
                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {/* New group form */}
                      {showNewGroupForm && (
                        <div className="p-3 border rounded-lg bg-muted/50 mb-3">
                          <div className="space-y-3">
                            <Input
                              placeholder="Tên nhóm (VD: Size, Topping)"
                              value={newGroupName}
                              onChange={(e) => setNewGroupName(e.target.value)}
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={newGroupRequired}
                                onCheckedChange={setNewGroupRequired}
                              />
                              <Label className="text-sm">Bắt buộc</Label>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Min</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={newGroupMinSelection}
                                  onChange={(e) => setNewGroupMinSelection(Number(e.target.value))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Max</Label>
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
                                size="sm"
                                onClick={handleCreateGroup}
                                disabled={!newGroupName.trim() || savingGroups}
                              >
                                {savingGroups ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tạo"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setShowNewGroupForm(false);
                                  setNewGroupName("");
                                }}
                              >
                                Hủy
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {filteredGroups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <Cherry className="h-10 w-10 text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">Chưa có nhóm topping</p>
                        </div>
                      ) : (
                        filteredGroups.map((group) => (
                          <div
                            key={group.id}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedGroup?.id === group.id
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            }`}
                            onClick={() => handleSelectGroup(group)}
                          >
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {group.name}
                                {!group.isActive && (
                                  <Badge variant="secondary" className="text-xs">Tạm ngưng</Badge>
                                )}
                              </div>
                              <div className={`text-xs ${selectedGroup?.id === group.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {group.items.length} topping • {group.isRequired ? "Bắt buộc" : "Tùy chọn"}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right panel - Group details */}
            <div className="col-span-8">
              <Card className="h-[calc(100vh-280px)]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedGroup ? selectedGroup.name : "Chi tiết nhóm"}
                      </CardTitle>
                      <CardDescription>
                        {selectedGroup
                          ? `${selectedGroup.isRequired ? "Bắt buộc" : "Tùy chọn"} • Chọn ${selectedGroup.minSelection}-${selectedGroup.maxSelection}`
                          : "Chọn một nhóm từ danh sách bên trái"}
                      </CardDescription>
                    </div>
                    {selectedGroup && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleToggleActive} disabled={savingGroups}>
                          {selectedGroup.isActive ? "Tạm ngưng" : "Kích hoạt"}
                        </Button>
                        <Button variant="outline" size="icon" onClick={handleOpenEditGroup} disabled={savingGroups}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={handleDeleteGroup} disabled={savingGroups}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="overflow-y-auto h-[calc(100%-100px)]">
                  {!selectedGroup ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <Cherry className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Chọn một nhóm để xem chi tiết</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Topping items */}
                      <div className="border rounded-lg">
                        <div
                          className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer"
                          onClick={() => setExpandedItems(!expandedItems)}
                        >
                          <div className="flex items-center gap-2">
                            {expandedItems ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="font-medium">Danh sách Topping</span>
                            <Badge variant="secondary">{selectedGroup.items.length}</Badge>
                          </div>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAddToppingDialog(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Thêm
                          </Button>
                        </div>

                        {expandedItems && (
                          <div className="p-3 space-y-2 border-t">
                            {selectedGroup.items.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                Chưa có topping nào trong nhóm
                              </p>
                            ) : (
                              selectedGroup.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between p-3 rounded bg-muted/20"
                                >
                                  <div className="flex items-center gap-3">
                                    <Cherry className="h-5 w-5 text-purple-500" />
                                    <div>
                                      <div className="font-medium">{item.topping.name}</div>
                                      <div className="text-xs text-muted-foreground">{item.topping.code}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <div className="text-sm font-medium text-green-600">
                                        {item.priceAdjustment > 0 ? "+" : ""}{formatCurrency(item.priceAdjustment || item.topping.price)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Tối đa: {item.maxQuantity}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleRemoveToppingFromGroup(item.id)}
                                      disabled={savingGroups}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {availableToppings.length === 0 && (
                        <div className="p-4 border rounded-lg bg-yellow-50 text-yellow-800 text-sm">
                          Chưa có sản phẩm loại "Topping". Hãy tạo sản phẩm loại Topping trong mục Món ăn.
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Assign to Products */}
        <TabsContent value="assign" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gán nhóm Topping vào món</CardTitle>
              <CardDescription>Chọn món để gán các nhóm topping</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <UtensilsCrossed className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Chưa có món ăn nào</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleOpenAssignDialog(product)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <UtensilsCrossed className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground">{product.code}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Package className="h-4 w-4 mr-1" />
                        Gán
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

      {/* Add Topping Dialog */}
      <Dialog open={showAddToppingDialog} onOpenChange={handleCloseAddToppingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Topping vào nhóm</DialogTitle>
            <DialogDescription>
              Chọn topping để thêm vào nhóm &quot;{selectedGroup?.name}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* Quick create form */}
            {showQuickCreateForm ? (
              <div className="border rounded-lg p-4 mb-4 bg-muted/30">
                <h4 className="font-medium mb-3">Tạo topping mới</h4>
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="quickCreateName">Tên topping *</Label>
                    <Input
                      id="quickCreateName"
                      placeholder="VD: Trân châu đen, Size L..."
                      value={quickCreateName}
                      onChange={(e) => setQuickCreateName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="quickCreatePrice">Giá (VND)</Label>
                      <Input
                        id="quickCreatePrice"
                        type="number"
                        placeholder="0"
                        value={quickCreatePrice || ""}
                        onChange={(e) => setQuickCreatePrice(Number(e.target.value))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="quickCreateVat">VAT (%)</Label>
                      <Input
                        id="quickCreateVat"
                        type="number"
                        placeholder="0"
                        min="0"
                        max="100"
                        value={quickCreateVat || ""}
                        onChange={(e) => setQuickCreateVat(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleQuickCreateTopping}
                      disabled={!quickCreateName.trim() || creatingTopping}
                    >
                      {creatingTopping && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Tạo & thêm vào nhóm
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowQuickCreateForm(false);
                        setQuickCreateName("");
                        setQuickCreatePrice(0);
                        setQuickCreateVat(0);
                      }}
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full mb-4"
                onClick={() => setShowQuickCreateForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Tạo topping mới
              </Button>
            )}

            {/* Available toppings list */}
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {getAvailableToppingsForGroup().length > 0 && (
                <p className="text-sm text-muted-foreground mb-2">Hoặc chọn từ danh sách:</p>
              )}
              {getAvailableToppingsForGroup().map((topping) => (
                <div
                  key={topping.id}
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-muted"
                  onClick={() => handleAddToppingToGroup(topping.id)}
                >
                  <div className="flex items-center gap-3">
                    <Cherry className="h-5 w-5 text-purple-500" />
                    <div>
                      <div className="font-medium">{topping.name}</div>
                      <div className="text-xs text-muted-foreground">{topping.code}</div>
                    </div>
                  </div>
                  <span className="text-sm text-green-600">{formatCurrency(topping.price)}</span>
                </div>
              ))}
              {getAvailableToppingsForGroup().length === 0 && !showQuickCreateForm && (
                <p className="text-center text-muted-foreground py-4">
                  Không còn topping nào. Hãy tạo mới bằng nút phía trên.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Assign to Product Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gán nhóm Topping</DialogTitle>
            <DialogDescription>
              Chọn các nhóm topping để gán cho "{selectedProductForAssign?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingAssignments ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : toppingGroups.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Chưa có nhóm topping nào. Hãy tạo nhóm trong tab "Nhóm Topping".
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {toppingGroups.filter(g => g.isActive).map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={assignedGroupIds.includes(group.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAssignedGroupIds([...assignedGroupIds, group.id]);
                        } else {
                          setAssignedGroupIds(assignedGroupIds.filter(id => id !== group.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{group.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {group.items.length} topping • {group.isRequired ? "Bắt buộc" : "Tùy chọn"}
                      </div>
                    </div>
                    {assignedGroupIds.includes(group.id) && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveAssignments} disabled={savingGroups}>
              {savingGroups && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Lưu ({assignedGroupIds.length} nhóm)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
