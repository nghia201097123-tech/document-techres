"use client";

import * as React from "react";
import { Plus, Search, Loader2, Pencil, Trash2, StickyNote, Power, Check, X, ChevronRight, UtensilsCrossed } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { productService, type ProductNote, type Product, ProductType } from "@/services/product-service";
import { BrandFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";
import { cn } from "@/lib/utils";

type DialogMode = "create" | "edit" | null;

// Product type labels for display
const typeLabels: Record<string, { label: string; color: string }> = {
  food: { label: "Đồ ăn", color: "bg-orange-100 text-orange-800" },
  drink: { label: "Đồ uống", color: "bg-blue-100 text-blue-800" },
  other: { label: "Khác", color: "bg-gray-100 text-gray-800" },
  combo: { label: "Combo", color: "bg-green-100 text-green-800" },
};

export default function ProductNotesPage() {
  const { toast } = useToast();

  // Global filter state from Redux
  const { brandId: filterBrandId, setBrandId: setFilterBrandId } = useGlobalFilters();

  // State
  const [notes, setNotes] = React.useState<ProductNote[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [editingNote, setEditingNote] = React.useState<ProductNote | null>(null);

  // Form data
  const [formName, setFormName] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [continueCreating, setContinueCreating] = React.useState(false);

  // Selected note for product assignment (inline)
  const [selectedNote, setSelectedNote] = React.useState<ProductNote | null>(null);
  const [allProducts, setAllProducts] = React.useState<Product[]>([]);
  const [assignedProductIds, setAssignedProductIds] = React.useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(false);
  const [savingAssign, setSavingAssign] = React.useState(false);
  const [productSearch, setProductSearch] = React.useState("");
  const [hasChanges, setHasChanges] = React.useState(false);
  const [originalProductIds, setOriginalProductIds] = React.useState<string[]>([]);

  // Track newly created and updated note IDs for badges
  const [newNoteIds, setNewNoteIds] = React.useState<Set<string>>(new Set());
  const [updatedNoteIds, setUpdatedNoteIds] = React.useState<Set<string>>(new Set());

  // Load notes - only when brand is selected
  const loadNotes = React.useCallback(async (brandId: string) => {
    if (!brandId) {
      setNotes([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await productService.getAllNotes(brandId);
      // Sort by createdAt descending (newest first)
      const sortedData = [...data].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setNotes(sortedData);
    } catch (error) {
      console.error("Error loading notes:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách ghi chú", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadNotes(filterBrandId);
  }, [filterBrandId, loadNotes]);

  // Load products when a note is selected
  const handleSelectNote = async (note: ProductNote) => {
    // Don't reload if same note is selected
    if (selectedNote?.id === note.id) return;

    // Check for unsaved changes
    if (hasChanges) {
      if (!confirm("Bạn có thay đổi chưa lưu. Bạn có muốn tiếp tục không?")) {
        return;
      }
    }

    setSelectedNote(note);
    setProductSearch("");
    setLoadingProducts(true);
    setHasChanges(false);

    try {
      // Load all products (excluding toppings)
      const products = await productService.getAll();
      const filteredProducts = products.filter(p => p.type !== ProductType.TOPPING);
      setAllProducts(filteredProducts);

      // Load products that already have this note
      const assignedProducts = await productService.getProductsByNote(note.id);
      const ids = assignedProducts.map(p => p.id);
      setAssignedProductIds(ids);
      setOriginalProductIds(ids);
    } catch (error) {
      console.error("Error loading products:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách món", variant: "destructive" });
    } finally {
      setLoadingProducts(false);
    }
  };

  // Open create dialog
  const handleOpenCreate = () => {
    setEditingNote(null);
    setFormName("");
    setFormDescription("");
    setDialogMode("create");
  };

  // Open edit dialog
  const handleOpenEdit = (note: ProductNote, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNote(note);
    setFormName(note.name);
    setFormDescription(note.description || "");
    setDialogMode("edit");
    // Remove badges when editing
    setNewNoteIds(prev => { const next = new Set(prev); next.delete(note.id); return next; });
    setUpdatedNoteIds(prev => { const next = new Set(prev); next.delete(note.id); return next; });
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setEditingNote(null);
    setFormName("");
    setFormDescription("");
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tên ghi chú", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (dialogMode === "create") {
        const newNote = await productService.createNote({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
        });
        setNotes((prev) => [newNote, ...prev]);
        setNewNoteIds(prev => new Set([...prev, newNote.id]));
        toast({ title: "Thành công", description: `Đã tạo ghi chú "${newNote.name}"` });
        if (continueCreating) {
          setFormName("");
          setFormDescription("");
          return;
        }
      } else if (dialogMode === "edit" && editingNote) {
        const updatedNote = await productService.updateNote(editingNote.id, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
        });
        setNotes((prev) => prev.map((n) => (n.id === editingNote.id ? updatedNote : n)));
        // Update selected note if it's the one being edited
        if (selectedNote?.id === editingNote.id) {
          setSelectedNote(updatedNote);
        }
        setUpdatedNoteIds(prev => new Set([...prev, updatedNote.id]));
        setNewNoteIds(prev => {
          const next = new Set(prev);
          next.delete(updatedNote.id);
          return next;
        });
        toast({ title: "Thành công", description: "Đã cập nhật ghi chú" });
      }
      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving note:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (note: ProductNote, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Bạn có chắc muốn xóa ghi chú "${note.name}"?`)) return;

    try {
      await productService.deleteNote(note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      if (selectedNote?.id === note.id) {
        setSelectedNote(null);
        setAllProducts([]);
        setAssignedProductIds([]);
      }
      toast({ title: "Thành công", description: "Đã xóa ghi chú" });
    } catch (error: any) {
      console.error("Error deleting note:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    }
  };

  // Handle toggle active
  const handleToggleActive = async (note: ProductNote, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updatedNote = await productService.updateNote(note.id, {
        isActive: !note.isActive,
      });
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updatedNote : n)));
      if (selectedNote?.id === note.id) {
        setSelectedNote(updatedNote);
      }
      toast({
        title: "Thành công",
        description: `Đã ${updatedNote.isActive ? "kích hoạt" : "tạm ngưng"} ghi chú "${note.name}"`,
      });
    } catch (error: any) {
      console.error("Error toggling note:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    }
  };

  // Toggle product selection
  const toggleProductSelection = (productId: string) => {
    setAssignedProductIds(prev => {
      const newIds = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];

      // Check if there are changes
      const hasChange = JSON.stringify(newIds.sort()) !== JSON.stringify(originalProductIds.sort());
      setHasChanges(hasChange);

      return newIds;
    });
  };

  // Select all filtered products
  const selectAllFiltered = () => {
    const filteredIds = filteredProducts.map(p => p.id);
    setAssignedProductIds(prev => {
      const newSet = new Set([...prev, ...filteredIds]);
      const newIds = Array.from(newSet);
      setHasChanges(JSON.stringify(newIds.sort()) !== JSON.stringify(originalProductIds.sort()));
      return newIds;
    });
  };

  // Deselect all filtered products
  const deselectAllFiltered = () => {
    const filteredIds = new Set(filteredProducts.map(p => p.id));
    setAssignedProductIds(prev => {
      const newIds = prev.filter(id => !filteredIds.has(id));
      setHasChanges(JSON.stringify(newIds.sort()) !== JSON.stringify(originalProductIds.sort()));
      return newIds;
    });
  };

  // Save product assignments
  const handleSaveAssignments = async () => {
    if (!selectedNote) return;

    setSavingAssign(true);
    try {
      await productService.assignNoteToProducts(selectedNote.id, assignedProductIds);
      setOriginalProductIds([...assignedProductIds]);
      setHasChanges(false);
      toast({
        title: "Thành công",
        description: `Đã lưu ${assignedProductIds.length} món cho ghi chú "${selectedNote.name}"`,
      });
    } catch (error: any) {
      console.error("Error assigning note to products:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingAssign(false);
    }
  };

  // Cancel changes
  const handleCancelChanges = () => {
    setAssignedProductIds([...originalProductIds]);
    setHasChanges(false);
  };

  // Filter products by search
  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Filter notes by search (already filtered by API for brand)
  const filteredNotes = notes.filter((n) => {
    return n.name.toLowerCase().includes(search.toLowerCase());
  });

  // Count selected in filtered
  const selectedInFiltered = filteredProducts.filter(p => assignedProductIds.includes(p.id)).length;
  const allFilteredSelected = filteredProducts.length > 0 && selectedInFiltered === filteredProducts.length;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý ghi chú món ăn</h1>
          <p className="text-muted-foreground">Tạo các ghi chú để gán cho món ăn (VD: Không hành, Ít đá, Cay vừa)</p>
        </div>
        <div className="flex items-center gap-2">
          <BrandFilter
            selectedBrandId={filterBrandId}
            onBrandChange={setFilterBrandId}
            showAllOption={false}
            className="w-[180px]"
          />
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm ghi chú
          </Button>
        </div>
      </div>

      {!filterBrandId ? (
        <FilterRequiredPlaceholder
          title="Vui lòng chọn thương hiệu"
          description="Chọn một thương hiệu từ bộ lọc phía trên để quản lý ghi chú"
        />
      ) : (
      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left panel - Notes list */}
        <div className="col-span-5">
          <Card className="flex flex-col h-full overflow-hidden">
            <CardHeader className="flex-shrink-0 border-b pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Danh sách ghi chú</CardTitle>
                  <CardDescription>{filteredNotes.length} ghi chú</CardDescription>
                </div>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm ghi chú..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <StickyNote className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Chưa có ghi chú nào</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Nhấn &quot;Thêm ghi chú&quot; để bắt đầu
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredNotes.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => handleSelectNote(note)}
                        className={cn(
                          "flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                          selectedNote?.id === note.id && "bg-primary/5 border-l-2 border-l-primary"
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn(
                            "p-2 rounded-lg",
                            note.isActive ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-500"
                          )}>
                            <StickyNote className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{note.name}</p>
                              {newNoteIds.has(note.id) && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0 shrink-0">Mới</Badge>
                              )}
                              {updatedNoteIds.has(note.id) && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0 shrink-0">Cập nhật</Badge>
                              )}
                            </div>
                            {note.description && (
                              <p className="text-xs text-muted-foreground truncate">{note.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Badge variant={note.isActive ? "default" : "secondary"} className="text-xs">
                            {note.isActive ? "Hoạt động" : "Ngưng"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => handleOpenEdit(note, e)}
                            title="Sửa"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => handleToggleActive(note, e)}
                            title={note.isActive ? "Tạm ngưng" : "Kích hoạt"}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => handleDelete(note, e)}
                            title="Xóa"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right panel - Product assignment */}
        <div className="col-span-7">
          <Card className="flex flex-col h-full overflow-hidden">
            {!selectedNote ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <ChevronRight className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Chọn một ghi chú</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Chọn ghi chú từ danh sách bên trái để gán món ăn
                </p>
              </div>
            ) : (
              <>
                <CardHeader className="flex-shrink-0 border-b pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <StickyNote className="h-5 w-5 text-yellow-600" />
                        {selectedNote.name}
                      </CardTitle>
                      <CardDescription>
                        Đã chọn {assignedProductIds.length} món
                        {hasChanges && <span className="text-orange-500 ml-2">• Có thay đổi chưa lưu</span>}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasChanges && (
                        <>
                          <Button variant="outline" size="sm" onClick={handleCancelChanges}>
                            <X className="mr-1 h-4 w-4" />
                            Hủy
                          </Button>
                          <Button size="sm" onClick={handleSaveAssignments} disabled={savingAssign}>
                            {savingAssign ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="mr-1 h-4 w-4" />
                            )}
                            Lưu thay đổi
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Tìm món ăn..."
                        className="pl-10"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={allFilteredSelected ? deselectAllFiltered : selectAllFiltered}
                      disabled={filteredProducts.length === 0}
                    >
                      {allFilteredSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                    </Button>
                  </div>
                  {filteredProducts.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Đang hiển thị {filteredProducts.length} món • Đã chọn {selectedInFiltered} trong số này
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full">
                    {loadingProducts ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                        <UtensilsCrossed className="h-10 w-10 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Không tìm thấy món ăn</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredProducts.map((product) => {
                          const isSelected = assignedProductIds.includes(product.id);
                          return (
                            <div
                              key={product.id}
                              onClick={() => toggleProductSelection(product.id)}
                              className={cn(
                                "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                                isSelected && "bg-primary/5"
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleProductSelection(product.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{product.name}</span>
                                  <span className="text-xs text-muted-foreground font-mono">{product.code}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge className={cn("text-xs", typeLabels[product.type]?.color)}>
                                    {typeLabels[product.type]?.label || product.type}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(product.price)}
                                  </span>
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Thêm ghi chú mới" : "Chỉnh sửa ghi chú"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Nhập thông tin ghi chú mới"
                : "Cập nhật thông tin ghi chú"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên ghi chú *</Label>
                <Input
                  id="name"
                  placeholder="VD: Không hành, Ít đá, Cay vừa"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả chi tiết ghi chú..."
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-4">
              {dialogMode === "create" && (
                <div className="flex items-center gap-2 mr-auto">
                  <Checkbox
                    id="continueCreating"
                    checked={continueCreating}
                    onCheckedChange={(checked) => setContinueCreating(!!checked)}
                  />
                  <Label htmlFor="continueCreating" className="text-sm cursor-pointer">
                    Tiếp tục tạo
                  </Label>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Hủy
                </Button>
                <Button type="submit" disabled={saving || !formName.trim()}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {dialogMode === "create" ? "Tạo ghi chú" : "Cập nhật"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
