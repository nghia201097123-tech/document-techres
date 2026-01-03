"use client";

import * as React from "react";
import { Plus, Search, Loader2, Pencil, Trash2, StickyNote, Power } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { productService, type ProductNote, type CreateProductNoteDto, type UpdateProductNoteDto } from "@/services/product-service";

type DialogMode = "create" | "edit" | null;

export default function ProductNotesPage() {
  const { toast } = useToast();

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

  // Filter notes
  const filteredNotes = notes.filter(
    (n) => n.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý ghi chú món ăn</h1>
          <p className="text-muted-foreground">Tạo các ghi chú để gán cho món ăn (VD: Không hành, Ít đá, Cay vừa)</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm ghi chú
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách ghi chú</CardTitle>
              <CardDescription>Tổng cộng {notes.length} ghi chú</CardDescription>
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
                          onClick={() => handleOpenEdit(note)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(note)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(note)}
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
    </div>
  );
}
