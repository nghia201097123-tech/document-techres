"use client";

import * as React from "react";
import { Plus, Search, Loader2, Pencil, Trash2, StickyNote, Power, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { BrandFilter } from "@/components/ui/brand-filter";

type DialogMode = "create" | "edit" | null;

export default function ProductNotesPage() {
  const { toast } = useToast();

  // Filter state
  const [filterBrandId, setFilterBrandId] = React.useState("all");

  // State
  const [notes, setNotes] = React.useState<ProductNote[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [selectedNote, setSelectedNote] = React.useState<ProductNote | null>(null);

  // Form data
  const [formName, setFormName] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [continueCreating, setContinueCreating] = React.useState(false);

  // Assign products state
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [assigningNote, setAssigningNote] = React.useState<ProductNote | null>(null);
  const [allProducts, setAllProducts] = React.useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(false);
  const [savingAssign, setSavingAssign] = React.useState(false);
  const [productSearch, setProductSearch] = React.useState("");

  // Load notes
  const loadNotes = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await productService.getAllNotes();
      setNotes(data);
    } catch (error) {
      console.error("Error loading notes:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách ghi chú", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedNote(null);
    setFormName("");
    setFormDescription("");
    setDialogMode("create");
  };

  // Open edit dialog
  const handleOpenEdit = (note: ProductNote) => {
    setSelectedNote(note);
    setFormName(note.name);
    setFormDescription(note.description || "");
    setDialogMode("edit");
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedNote(null);
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
        setNotes((prev) => [...prev, newNote]);
        toast({ title: "Thành công", description: `Đã tạo ghi chú "${newNote.name}"` });
        if (continueCreating) {
          setFormName("");
          setFormDescription("");
          return;
        }
      } else if (dialogMode === "edit" && selectedNote) {
        const updatedNote = await productService.updateNote(selectedNote.id, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
        });
        setNotes((prev) => prev.map((n) => (n.id === selectedNote.id ? updatedNote : n)));
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
  const handleDelete = async (note: ProductNote) => {
    if (!confirm(`Bạn có chắc muốn xóa ghi chú "${note.name}"?`)) return;

    try {
      await productService.deleteNote(note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      toast({ title: "Thành công", description: "Đã xóa ghi chú" });
    } catch (error: any) {
      console.error("Error deleting note:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    }
  };

  // Handle toggle active
  const handleToggleActive = async (note: ProductNote) => {
    try {
      const updatedNote = await productService.updateNote(note.id, {
        isActive: !note.isActive,
      });
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updatedNote : n)));
      toast({
        title: "Thành công",
        description: `Đã ${updatedNote.isActive ? "kích hoạt" : "tạm ngưng"} ghi chú "${note.name}"`,
      });
    } catch (error: any) {
      console.error("Error toggling note:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    }
  };

  // Open assign products dialog
  const handleOpenAssignProducts = async (note: ProductNote) => {
    setAssigningNote(note);
    setProductSearch("");
    setAssignDialogOpen(true);
    setLoadingProducts(true);

    try {
      // Load all products (excluding toppings)
      const products = await productService.getAll();
      const filteredProducts = products.filter(p => p.type !== ProductType.TOPPING);
      setAllProducts(filteredProducts);

      // Load products that already have this note
      const assignedProducts = await productService.getProductsByNote(note.id);
      setSelectedProductIds(assignedProducts.map(p => p.id));
    } catch (error) {
      console.error("Error loading products:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách món", variant: "destructive" });
    } finally {
      setLoadingProducts(false);
    }
  };

  // Close assign dialog
  const handleCloseAssignDialog = () => {
    setAssignDialogOpen(false);
    setAssigningNote(null);
    setAllProducts([]);
    setSelectedProductIds([]);
    setProductSearch("");
  };

  // Toggle product selection
  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Select all filtered products
  const selectAllFiltered = () => {
    const filteredIds = filteredProducts.map(p => p.id);
    setSelectedProductIds(prev => {
      const newSet = new Set([...prev, ...filteredIds]);
      return Array.from(newSet);
    });
  };

  // Deselect all filtered products
  const deselectAllFiltered = () => {
    const filteredIds = new Set(filteredProducts.map(p => p.id));
    setSelectedProductIds(prev => prev.filter(id => !filteredIds.has(id)));
  };

  // Save product assignments
  const handleSaveAssignments = async () => {
    if (!assigningNote) return;

    setSavingAssign(true);
    try {
      await productService.assignNoteToProducts(assigningNote.id, selectedProductIds);
      toast({
        title: "Thành công",
        description: `Đã gán ghi chú "${assigningNote.name}" cho ${selectedProductIds.length} món`,
      });
      handleCloseAssignDialog();
    } catch (error: any) {
      console.error("Error assigning note to products:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingAssign(false);
    }
  };

  // Filter products by search
  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Filter notes by search and brand
  const filteredNotes = notes.filter((n) => {
    const matchesSearch = n.name.toLowerCase().includes(search.toLowerCase());
    const matchesBrand = filterBrandId === "all" || n.brandId === filterBrandId;
    return matchesSearch && matchesBrand;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý ghi chú món ăn</h1>
          <p className="text-muted-foreground">Tạo các ghi chú để gán cho món ăn (VD: Không hành, Ít đá, Cay vừa)</p>
        </div>
        <div className="flex items-center gap-2">
          <BrandFilter
            selectedBrandId={filterBrandId}
            onBrandChange={setFilterBrandId}
            className="w-[180px]"
          />
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm ghi chú
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách ghi chú</CardTitle>
              <CardDescription>Tổng cộng {filteredNotes.length} ghi chú</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <StickyNote className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có ghi chú nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm ghi chú&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên ghi chú</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[120px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell className="font-medium">{note.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {note.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={note.isActive ? "default" : "secondary"}>
                        {note.isActive ? "Hoạt động" : "Tạm ngưng"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenAssignProducts(note)}
                          title="Gán món"
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(note)}
                          title="Sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(note)}
                          title={note.isActive ? "Tạm ngưng" : "Kích hoạt"}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(note)}
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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

      {/* Assign Products Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={() => handleCloseAssignDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gán ghi chú cho món ăn</DialogTitle>
            <DialogDescription>
              Chọn các món ăn sẽ sử dụng ghi chú &quot;{assigningNote?.name}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and select all buttons */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm món ăn..."
                  className="pl-10"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={selectAllFiltered}>
                Chọn tất cả
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAllFiltered}>
                Bỏ chọn tất cả
              </Button>
            </div>

            {/* Selected count */}
            <div className="text-sm text-muted-foreground">
              Đã chọn: <span className="font-medium text-foreground">{selectedProductIds.length}</span> món
              {productSearch && ` (Hiển thị ${filteredProducts.length}/${allProducts.length} món)`}
            </div>

            {/* Products list */}
            {loadingProducts ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[400px] border rounded-md">
                <div className="p-4 space-y-2">
                  {filteredProducts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Không tìm thấy món ăn</p>
                  ) : (
                    filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedProductIds.includes(product.id)
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => toggleProductSelection(product.id)}
                      >
                        <Checkbox
                          checked={selectedProductIds.includes(product.id)}
                          onCheckedChange={() => toggleProductSelection(product.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.code} • {new Intl.NumberFormat("vi-VN").format(product.price)}đ
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {product.type === ProductType.FOOD && "Món ăn"}
                          {product.type === ProductType.DRINK && "Đồ uống"}
                          {product.type === ProductType.OTHER && "Khác"}
                          {product.type === ProductType.COMBO && "Combo"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseAssignDialog}>
              Hủy
            </Button>
            <Button onClick={handleSaveAssignments} disabled={savingAssign}>
              {savingAssign && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu ({selectedProductIds.length} món)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
