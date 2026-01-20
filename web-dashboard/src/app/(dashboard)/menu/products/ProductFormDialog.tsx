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
import { useToast } from "@/hooks/use-toast";
import { useGlobalFilters } from "@/components/ui/brand-filter";
import { productService, type CreateProductDto, ProductType, SellingType, type ProductNote, type Product } from "@/services/product-service";
import { categoryService } from "@/services/category-service";
import { unitService, type Unit } from "@/services/unit-service";

interface Category {
  id: string;
  name: string;
  isActive: boolean;
  productType?: ProductType;
}

// Initial form data
const getInitialFormData = (): CreateProductDto => ({
  name: "",
  abbreviation: "",
  type: ProductType.FOOD,
  categoryId: "",
  price: 0,
  vatRate: 10,
  unit: "",
  description: "",
  imageUrl: "",
  preparationTime: 0,
  costPrice: 0,
  sellingType: SellingType.PORTION,
  printDish: true,
  printLabel: false,
  printSeafood: false,
  noteIds: [],
});

interface ProductFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  productId?: string; // For edit mode - we'll fetch the product data
  onClose: () => void;
  onSuccess: (product: Product) => void;
  continueCreating: boolean;
  setContinueCreating: (value: boolean) => void;
}

const ProductFormDialog = React.memo(function ProductFormDialog({
  open,
  mode,
  productId,
  onClose,
  onSuccess,
  continueCreating,
  setContinueCreating,
}: ProductFormDialogProps) {
  const { toast } = useToast();
  const { brandId } = useGlobalFilters();

  // ============ ALL STATE IS LOCAL TO THIS COMPONENT ============
  const [formData, setFormData] = React.useState<CreateProductDto>(getInitialFormData);
  const [saving, setSaving] = React.useState(false);
  const [loadingProduct, setLoadingProduct] = React.useState(false);

  // Data loaded internally
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = React.useState(false);
  const [units, setUnits] = React.useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = React.useState(false);
  const [availableNotes, setAvailableNotes] = React.useState<ProductNote[]>([]);
  const [loadingNotes, setLoadingNotes] = React.useState(false);

  // Selected notes
  const [selectedNoteIds, setSelectedNoteIds] = React.useState<Set<string>>(new Set());
  const [creatingNote, setCreatingNote] = React.useState(false);

  // Combobox states
  const [categoryComboboxOpen, setCategoryComboboxOpen] = React.useState(false);
  const [categorySearchValue, setCategorySearchValue] = React.useState("");
  const [unitComboboxOpen, setUnitComboboxOpen] = React.useState(false);
  const [unitSearchValue, setUnitSearchValue] = React.useState("");
  const [notePopoverOpen, setNotePopoverOpen] = React.useState(false);
  const [noteSearchValue, setNoteSearchValue] = React.useState("");

  // Load data when dialog opens
  React.useEffect(() => {
    if (!open || !brandId) return;

    const loadData = async () => {
      // Load categories
      setLoadingCategories(true);
      try {
        const cats = await categoryService.getAll(brandId);
        setCategories(cats.filter(c => c.isActive));
      } catch (error) {
        console.error("Error loading categories:", error);
      } finally {
        setLoadingCategories(false);
      }

      // Load units
      setLoadingUnits(true);
      try {
        const unitsData = await unitService.getAll(brandId);
        setUnits(unitsData);
      } catch (error) {
        console.error("Error loading units:", error);
      } finally {
        setLoadingUnits(false);
      }

      // Load notes
      setLoadingNotes(true);
      try {
        const notes = await productService.getAllNotes(brandId);
        setAvailableNotes(notes);
      } catch (error) {
        console.error("Error loading notes:", error);
      } finally {
        setLoadingNotes(false);
      }
    };

    loadData();
  }, [open, brandId]);

  // Load product data for edit mode
  React.useEffect(() => {
    if (!open) return;

    if (mode === "edit" && productId) {
      setLoadingProduct(true);
      const loadProduct = async () => {
        try {
          const product = await productService.getById(productId);
          setFormData({
            name: product.name,
            abbreviation: product.abbreviation || "",
            type: product.type,
            price: product.price,
            vatRate: product.vatRate || 10,
            categoryId: product.categoryId || "",
            description: product.description || "",
            imageUrl: product.imageUrl || "",
            preparationTime: product.preparationTime || 0,
            costPrice: product.costPrice || 0,
            sellingType: product.sellingType || SellingType.PORTION,
            unit: product.unit || "",
            printDish: product.printDish ?? true,
            printLabel: product.printLabel ?? false,
            printSeafood: product.printSeafood ?? false,
          });
          setUnitSearchValue(product.unit || "");

          // Load product notes
          const productNotes = await productService.getProductNotes(productId);
          setSelectedNoteIds(new Set(productNotes.map(pn => pn.noteId)));
        } catch (error) {
          console.error("Error loading product:", error);
          toast({ title: "Lỗi", description: "Không thể tải thông tin món ăn", variant: "destructive" });
        } finally {
          setLoadingProduct(false);
        }
      };
      loadProduct();
    } else {
      // Create mode - reset form
      setFormData(getInitialFormData());
      setCategorySearchValue("");
      setUnitSearchValue("");
      setSelectedNoteIds(new Set());
    }
    setNoteSearchValue("");
  }, [open, mode, productId, toast]);

  // Update category search value when formData.categoryId changes (for edit mode)
  React.useEffect(() => {
    if (formData.categoryId && categories.length > 0) {
      const cat = categories.find(c => c.id === formData.categoryId);
      if (cat) {
        setCategorySearchValue(cat.name);
      }
    }
  }, [formData.categoryId, categories]);

  // Get available categories based on product type
  const availableCategories = React.useMemo(() => {
    if (!formData.type) return categories;
    return categories.filter(c => c.productType === formData.type);
  }, [categories, formData.type]);

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
  const handleTypeChange = (type: ProductType) => {
    setFormData(prev => ({ ...prev, type, categoryId: "" }));
    setCategorySearchValue("");
  };

  // Toggle note selection
  const handleToggleNote = (noteId: string) => {
    setSelectedNoteIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  // Create new note
  const handleCreateNote = async (name: string) => {
    if (!name.trim() || creatingNote || !brandId) return;
    setCreatingNote(true);
    try {
      const newNote = await productService.createNote({ name: name.trim() });
      setAvailableNotes(prev => [...prev, newNote]);
      setSelectedNoteIds(prev => new Set([...prev, newNote.id]));
      setNoteSearchValue("");
      toast({ title: "Thành công", description: `Đã tạo ghi chú "${name}"` });
    } catch (error: any) {
      console.error("Error creating note:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setCreatingNote(false);
    }
  };

  // Get or create category
  const getOrCreateCategory = async (categoryName: string, productType: ProductType): Promise<string> => {
    const existingCategory = categories.find(
      c => c.name.toLowerCase() === categoryName.toLowerCase() && c.productType === productType
    );
    if (existingCategory) {
      return existingCategory.id;
    }

    const newCategory = await categoryService.create({
      name: categoryName,
      productType: productType,
    });
    setCategories(prev => [...prev, newCategory]);
    toast({ title: "Thành công", description: `Đã tạo danh mục "${categoryName}"` });
    return newCategory.id;
  };

  // Get or create unit
  const getOrCreateUnit = async (unitName: string): Promise<string> => {
    const existingUnit = units.find(u => u.name.toLowerCase() === unitName.toLowerCase());
    if (existingUnit) {
      return existingUnit.name;
    }

    const newUnit = await unitService.create({ name: unitName });
    setUnits(prev => [...prev, newUnit]);
    toast({ title: "Thành công", description: `Đã tạo đơn vị "${unitName}"` });
    return newUnit.name;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!formData.name.trim() || formData.price < 0) {
      toast({ title: "Lỗi", description: "Vui lòng điền đầy đủ tên món và giá hợp lệ", variant: "destructive" });
      return;
    }

    if (!formData.categoryId && !categorySearchValue.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng chọn hoặc nhập danh mục cho món", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Get or create category if needed
      let categoryId = formData.categoryId;
      if (!categoryId && categorySearchValue.trim()) {
        categoryId = await getOrCreateCategory(categorySearchValue.trim(), formData.type);
      }

      // Get or create unit if needed
      let unitName = formData.unit;
      if (unitSearchValue.trim() && !units.some(u => u.name.toLowerCase() === unitSearchValue.toLowerCase())) {
        unitName = await getOrCreateUnit(unitSearchValue.trim());
      } else if (unitSearchValue.trim()) {
        unitName = unitSearchValue;
      }

      // Prepare data
      const preparedData = {
        name: formData.name,
        abbreviation: formData.abbreviation?.trim() || undefined,
        type: formData.type,
        price: Number(formData.price) || 0,
        vatRate: parseFloat(String(formData.vatRate)) || 0,
        categoryId: categoryId,
        description: formData.description || undefined,
        imageUrl: formData.imageUrl || undefined,
        preparationTime: Number(formData.preparationTime) || 0,
        costPrice: Number(formData.costPrice) || 0,
        sellingType: formData.sellingType,
        unit: unitName || undefined,
        printDish: formData.printDish ?? true,
        printLabel: formData.printLabel ?? false,
        printSeafood: formData.printSeafood ?? false,
      };

      let result: Product;
      if (mode === "create") {
        result = await productService.create(preparedData);
        // Assign notes
        if (selectedNoteIds.size > 0) {
          try {
            await productService.assignNotesToProduct(result.id, Array.from(selectedNoteIds));
          } catch (error) {
            console.error("Error assigning notes:", error);
          }
        }
        toast({ title: "Thành công", description: `Đã tạo món "${result.name}" với mã ${result.code}` });

        if (continueCreating) {
          // Reset form for next creation
          setFormData(getInitialFormData());
          setCategorySearchValue("");
          setUnitSearchValue("");
          setSelectedNoteIds(new Set());
          onSuccess(result);
        } else {
          onSuccess(result);
          onClose();
        }
      } else if (mode === "edit" && productId) {
        result = await productService.update(productId, preparedData);
        // Update notes
        try {
          await productService.assignNotesToProduct(productId, Array.from(selectedNoteIds));
        } catch (error) {
          console.error("Error assigning notes:", error);
        }
        toast({ title: "Thành công", description: "Đã cập nhật thông tin món ăn" });
        onSuccess(result);
        onClose();
      }
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const isLoading = loadingProduct || loadingCategories || loadingUnits || loadingNotes;

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

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
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
                    autoComplete="off"
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
                    autoComplete="off"
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
                    autoComplete="off"
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
                    autoComplete="off"
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
                  autoComplete="off"
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
                    autoComplete="off"
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
                    autoComplete="off"
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
                                    handleToggleNote(noteId);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleToggleNote(noteId);
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
                              onSelect={() => handleCreateNote(noteSearchValue)}
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
                              onSelect={() => handleToggleNote(note.id)}
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
        )}
      </DialogContent>
    </Dialog>
  );
});

export default ProductFormDialog;
