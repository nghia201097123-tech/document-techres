"use client";

import * as React from "react";
import { Plus, Loader2, X, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";
import { type CreateProductDto, ProductType, SellingType, type ProductNote } from "@/services/product-service";
import { type Unit } from "@/services/unit-service";

interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

interface ProductFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  formData: CreateProductDto;
  setFormData: React.Dispatch<React.SetStateAction<CreateProductDto>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  // Category props
  categories: Category[];
  loadingCategories: boolean;
  // Unit props
  units: Unit[];
  loadingUnits: boolean;
  // Notes props
  availableNotes: ProductNote[];
  loadingNotes: boolean;
  selectedNoteIds: Set<string>;
  onToggleNote: (noteId: string) => void;
  onCreateNote: (name: string) => void;
  creatingNote: boolean;
  // Continue creating
  continueCreating: boolean;
  setContinueCreating: (value: boolean) => void;
}

// Memoized form dialog component to prevent re-renders of parent
const ProductFormDialog = React.memo(function ProductFormDialog({
  open,
  mode,
  formData,
  setFormData,
  onClose,
  onSubmit,
  saving,
  categories,
  loadingCategories,
  units,
  loadingUnits,
  availableNotes,
  loadingNotes,
  selectedNoteIds,
  onToggleNote,
  onCreateNote,
  creatingNote,
  continueCreating,
  setContinueCreating,
}: ProductFormDialogProps) {
  // Local state for comboboxes
  const [categoryComboboxOpen, setCategoryComboboxOpen] = React.useState(false);
  const [categorySearchValue, setCategorySearchValue] = React.useState("");
  const [unitComboboxOpen, setUnitComboboxOpen] = React.useState(false);
  const [unitSearchValue, setUnitSearchValue] = React.useState("");
  const [notePopoverOpen, setNotePopoverOpen] = React.useState(false);
  const [noteSearchValue, setNoteSearchValue] = React.useState("");

  // Reset search values when dialog opens
  React.useEffect(() => {
    if (open) {
      setCategorySearchValue(
        categories.find(c => c.id === formData.categoryId)?.name || ""
      );
      setUnitSearchValue(formData.unit || "");
    }
  }, [open, formData.categoryId, formData.unit, categories]);

  // Get available categories based on product type
  const availableCategories = React.useMemo(() => {
    return categories.filter(c => c.isActive);
  }, [categories]);

  // Filter categories by search
  const filteredCategories = React.useMemo(() => {
    if (!categorySearchValue.trim()) return availableCategories;
    return availableCategories.filter(c =>
      c.name.toLowerCase().includes(categorySearchValue.toLowerCase())
    );
  }, [availableCategories, categorySearchValue]);

  // Check if creating new category
  const isNewCategory = React.useMemo(() => {
    return categorySearchValue.trim() &&
      !availableCategories.some(c => c.name.toLowerCase() === categorySearchValue.toLowerCase());
  }, [categorySearchValue, availableCategories]);

  // Filter units by search
  const filteredUnits = React.useMemo(() => {
    if (!unitSearchValue.trim()) return units;
    return units.filter(u =>
      u.name.toLowerCase().includes(unitSearchValue.toLowerCase())
    );
  }, [units, unitSearchValue]);

  // Check if creating new unit
  const isNewUnit = React.useMemo(() => {
    return unitSearchValue.trim() &&
      !units.some(u => u.name.toLowerCase() === unitSearchValue.toLowerCase());
  }, [unitSearchValue, units]);

  // Filter notes by search
  const filteredNotes = React.useMemo(() => {
    if (!noteSearchValue.trim()) return availableNotes;
    return availableNotes.filter(n =>
      n.name.toLowerCase().includes(noteSearchValue.toLowerCase())
    );
  }, [availableNotes, noteSearchValue]);

  // Check if creating new note
  const isNewNote = React.useMemo(() => {
    return noteSearchValue.trim() &&
      !availableNotes.some(n => n.name.toLowerCase() === noteSearchValue.toLowerCase());
  }, [noteSearchValue, availableNotes]);

  // Handle type change - reset category
  const handleTypeChange = React.useCallback((type: ProductType) => {
    setFormData(prev => ({ ...prev, type, categoryId: "" }));
    setCategorySearchValue("");
  }, [setFormData]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Thêm món ăn mới" : "Chỉnh sửa món ăn"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Nhập thông tin món ăn. Mã món sẽ được tự động tạo."
              : "Cập nhật thông tin món ăn"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            {/* Image and Name Row */}
            <div className="grid grid-cols-[150px_1fr] gap-4">
              <div className="grid gap-2">
                <Label>Hình ảnh</Label>
                <ImageUpload
                  value={formData.imageUrl}
                  onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                  aspectRatio={1}
                  maxWidth={500}
                  maxHeight={500}
                  folder="products"
                  className="w-[134px] h-[134px]"
                  placeholder="Chọn ảnh"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Tên món *</Label>
                <Input
                  id="name"
                  placeholder="Phở bò tái"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="abbreviation">Tên viết tắt (tìm kiếm nhanh)</Label>
                <Input
                  id="abbreviation"
                  placeholder="VD: pbt (Phở Bò Tái), ccdc (Cơm Chiên Dương Châu)"
                  value={formData.abbreviation || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, abbreviation: e.target.value.toLowerCase() }))}
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  Để trống sẽ tự động tạo từ chữ cái đầu của tên món
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Loại món *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleTypeChange(value as ProductType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">Đồ ăn</SelectItem>
                    <SelectItem value="drink">Đồ uống</SelectItem>
                    <SelectItem value="other">Khác</SelectItem>
                    <SelectItem value="topping">Topping</SelectItem>
                    <SelectItem value="combo">Combo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Danh mục</Label>
                <Popover open={categoryComboboxOpen} onOpenChange={setCategoryComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={categoryComboboxOpen}
                      className="w-full justify-between font-normal"
                      disabled={loadingCategories}
                    >
                      {categorySearchValue || "Chọn hoặc nhập danh mục..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Tìm hoặc tạo danh mục..."
                        value={categorySearchValue}
                        onValueChange={(value) => {
                          setCategorySearchValue(value);
                          if (!availableCategories.some(c => c.name.toLowerCase() === value.toLowerCase())) {
                            setFormData(prev => ({ ...prev, categoryId: "" }));
                          }
                        }}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {categorySearchValue.trim() ? (
                            <div className="py-2 px-4 text-sm">
                              <span className="text-muted-foreground">Nhấn để tạo: </span>
                              <span className="font-medium">&quot;{categorySearchValue}&quot;</span>
                            </div>
                          ) : (
                            <div className="py-2 px-4 text-sm text-muted-foreground">
                              Nhập tên danh mục để tìm hoặc tạo mới
                            </div>
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {isNewCategory && (
                            <CommandItem
                              value={`create-${categorySearchValue}`}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, categoryId: "" }));
                                setCategoryComboboxOpen(false);
                              }}
                              className="text-primary"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Tạo mới: &quot;{categorySearchValue}&quot;
                            </CommandItem>
                          )}
                          {filteredCategories.map((category) => (
                            <CommandItem
                              key={category.id}
                              value={category.name}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, categoryId: category.id }));
                                setCategorySearchValue(category.name);
                                setCategoryComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.categoryId === category.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {category.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {isNewCategory && (
                  <p className="text-xs text-muted-foreground">
                    Danh mục &quot;{categorySearchValue}&quot; sẽ được tạo tự động khi lưu
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Giá đã bao gồm VAT (VNĐ) *</Label>
                <Input
                  id="price"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formData.price ? new Intl.NumberFormat("vi-VN").format(Math.floor(formData.price)) : ""}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\./g, "");
                    const numValue = parseInt(rawValue, 10);
                    setFormData(prev => ({ ...prev, price: isNaN(numValue) ? 0 : numValue }));
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vatRate">VAT (%)</Label>
                <Input
                  id="vatRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="10"
                  value={formData.vatRate ?? ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, vatRate: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {formData.price > 0 && (
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Giá chưa bao gồm VAT</Label>
                <div className="flex items-center h-10 px-3 rounded-md border bg-muted text-muted-foreground">
                  {formatCurrency(Math.round(formData.price / (1 + (formData.vatRate || 10) / 100)))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tính từ giá bán ÷ (1 + {formData.vatRate || 10}%)
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="imageUrl">URL Hình ảnh</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                placeholder="Mô tả món ăn..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Thời gian chế biến và Giá vốn */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="preparationTime">Thời gian chế biến (phút)</Label>
                <Input
                  id="preparationTime"
                  type="number"
                  min="0"
                  placeholder="15"
                  value={formData.preparationTime || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, preparationTime: Number(e.target.value) }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="costPrice">Giá vốn (VNĐ)</Label>
                <Input
                  id="costPrice"
                  type="text"
                  inputMode="numeric"
                  placeholder="30.000"
                  value={formData.costPrice ? new Intl.NumberFormat("vi-VN").format(Math.floor(formData.costPrice)) : ""}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\./g, "");
                    const numValue = parseInt(rawValue, 10);
                    setFormData(prev => ({ ...prev, costPrice: isNaN(numValue) ? 0 : numValue }));
                  }}
                />
              </div>
            </div>

            {/* Loại bán và Đơn vị */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sellingType">Loại bán</Label>
                <Select
                  value={formData.sellingType || SellingType.PORTION}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, sellingType: value as SellingType }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại bán" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portion">Bán theo phần</SelectItem>
                    <SelectItem value="weight">Bán theo ký</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Đơn vị tính</Label>
                <Popover open={unitComboboxOpen} onOpenChange={setUnitComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={unitComboboxOpen}
                      className="w-full justify-between font-normal"
                      disabled={loadingUnits}
                    >
                      {unitSearchValue || (formData.sellingType === SellingType.WEIGHT ? "kg, gram..." : "phần, ly, tô...")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Tìm hoặc tạo đơn vị..."
                        value={unitSearchValue}
                        onValueChange={(value) => {
                          setUnitSearchValue(value);
                          setFormData(prev => ({ ...prev, unit: value }));
                        }}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {unitSearchValue.trim() ? (
                            <div className="py-2 px-4 text-sm">
                              <span className="text-muted-foreground">Nhấn để tạo: </span>
                              <span className="font-medium">&quot;{unitSearchValue}&quot;</span>
                            </div>
                          ) : (
                            <div className="py-2 px-4 text-sm text-muted-foreground">
                              Nhập tên đơn vị để tìm hoặc tạo mới
                            </div>
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {isNewUnit && (
                            <CommandItem
                              value={`create-${unitSearchValue}`}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, unit: unitSearchValue }));
                                setUnitComboboxOpen(false);
                              }}
                              className="text-primary"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Tạo mới: &quot;{unitSearchValue}&quot;
                            </CommandItem>
                          )}
                          {filteredUnits.map((unit) => (
                            <CommandItem
                              key={unit.id}
                              value={unit.name}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, unit: unit.name }));
                                setUnitSearchValue(unit.name);
                                setUnitComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.unit === unit.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {unit.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {isNewUnit && (
                  <p className="text-xs text-muted-foreground">
                    Đơn vị &quot;{unitSearchValue}&quot; sẽ được tạo tự động khi lưu
                  </p>
                )}
              </div>
            </div>

            {/* Ghi chú */}
            <div className="grid gap-2">
              <Label>Ghi chú cho món</Label>
              <Popover open={notePopoverOpen} onOpenChange={setNotePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={notePopoverOpen}
                    className="w-full justify-between font-normal h-auto min-h-10"
                    disabled={loadingNotes}
                  >
                    <div className="flex flex-wrap gap-1">
                      {selectedNoteIds.size === 0 ? (
                        <span className="text-muted-foreground">Chọn hoặc tạo ghi chú...</span>
                      ) : (
                        Array.from(selectedNoteIds).map(noteId => {
                          const note = availableNotes.find(n => n.id === noteId);
                          return note ? (
                            <Badge key={noteId} variant="secondary" className="mr-1">
                              {note.name}
                              <span
                                role="button"
                                tabIndex={0}
                                className="ml-1 hover:text-destructive cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  onToggleNote(noteId);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onToggleNote(noteId);
                                  }
                                }}
                              >
                                <X className="h-3 w-3" />
                              </span>
                            </Badge>
                          ) : null;
                        })
                      )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Tìm hoặc tạo ghi chú..."
                      value={noteSearchValue}
                      onValueChange={setNoteSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {noteSearchValue.trim() ? (
                          <div className="py-2 px-4 text-sm">
                            <span className="text-muted-foreground">Nhấn để tạo: </span>
                            <span className="font-medium">&quot;{noteSearchValue}&quot;</span>
                          </div>
                        ) : (
                          <div className="py-2 px-4 text-sm text-muted-foreground">
                            Chưa có ghi chú nào. Nhập để tạo mới.
                          </div>
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {isNewNote && (
                          <CommandItem
                            value={`create-${noteSearchValue}`}
                            onSelect={() => {
                              onCreateNote(noteSearchValue);
                              setNoteSearchValue("");
                            }}
                            disabled={creatingNote}
                            className="text-primary"
                          >
                            {creatingNote ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="mr-2 h-4 w-4" />
                            )}
                            Tạo mới: &quot;{noteSearchValue}&quot;
                          </CommandItem>
                        )}
                        {filteredNotes.map((note) => (
                          <CommandItem
                            key={note.id}
                            value={note.name}
                            onSelect={() => onToggleNote(note.id)}
                          >
                            <Checkbox
                              checked={selectedNoteIds.has(note.id)}
                              className="mr-2"
                            />
                            {note.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Ghi chú sẽ hiển thị khi order món này (VD: &quot;Không hành&quot;, &quot;Ít đường&quot;...)
              </p>
            </div>

            {/* Setup in ấn */}
            <div className="grid gap-2">
              <Label>Cài đặt in ấn</Label>
              <div className="flex flex-wrap gap-6 p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="printDish"
                    checked={formData.printDish ?? true}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, printDish: !!checked }))}
                  />
                  <Label htmlFor="printDish" className="cursor-pointer">In món</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="printLabel"
                    checked={formData.printLabel ?? false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, printLabel: !!checked }))}
                  />
                  <Label htmlFor="printLabel" className="cursor-pointer">In tem</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="printSeafood"
                    checked={formData.printSeafood ?? false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, printSeafood: !!checked }))}
                  />
                  <Label htmlFor="printSeafood" className="cursor-pointer">In hồ hải sản</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-4">
            {mode === "create" && (
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
              <Button type="button" variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saving || !formData.name.trim() || formData.price < 0}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Tạo món ăn" : "Cập nhật"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default ProductFormDialog;
