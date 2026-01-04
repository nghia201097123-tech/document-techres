"use client";

import * as React from "react";
import { Plus, Search, UtensilsCrossed, Filter, Loader2, MoreHorizontal, Eye, Pencil, Power, Cherry, X, Check, Trash2, ChevronDown, ChevronRight, ChevronsUpDown } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { useToast } from "@/hooks/use-toast";
import { productService, type Product, type CreateProductDto, type UpdateProductDto, ProductType, SellingType, type ToppingGroup, type ComboItem } from "@/services/product-service";
import { ScrollArea } from "@/components/ui/scroll-area";
import { categoryService } from "@/services/category-service";
import { unitService, type Unit } from "@/services/unit-service";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useColumnConfig, type ColumnConfig } from "@/hooks/use-column-config";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";
import { BrandFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";

// Default column configuration for products table
const defaultProductColumns: ColumnConfig[] = [
  { key: "code", label: "Mã món", visible: true },
  { key: "name", label: "Tên món", visible: true, locked: true },
  { key: "type", label: "Loại", visible: true },
  { key: "categoryName", label: "Danh mục", visible: true },
  { key: "price", label: "Giá (đã VAT)", visible: true },
  { key: "vatRate", label: "VAT (%)", visible: false },
  { key: "costPrice", label: "Giá vốn", visible: false },
  { key: "description", label: "Mô tả", visible: false },
  { key: "preparationTime", label: "Thời gian chế biến", visible: false },
  { key: "sellingType", label: "Loại bán", visible: false },
  { key: "unit", label: "Đơn vị", visible: false },
  { key: "printDish", label: "In món", visible: false },
  { key: "printLabel", label: "In tem", visible: false },
  { key: "printSeafood", label: "In hồ hải sản", visible: false },
  { key: "isActive", label: "Trạng thái", visible: true },
];

// Redux imports
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCategories } from "@/store/slices/categoriesSlice";

const typeLabels: Record<ProductType, { label: string; color: string }> = {
  [ProductType.FOOD]: { label: "Đồ ăn", color: "bg-orange-100 text-orange-800" },
  [ProductType.DRINK]: { label: "Đồ uống", color: "bg-blue-100 text-blue-800" },
  [ProductType.OTHER]: { label: "Khác", color: "bg-gray-100 text-gray-800" },
  [ProductType.TOPPING]: { label: "Topping", color: "bg-purple-100 text-purple-800" },
  [ProductType.COMBO]: { label: "Combo", color: "bg-green-100 text-green-800" },
};

const initialFormData: CreateProductDto = {
  name: "",
  type: ProductType.FOOD,
  price: 0,
  vatRate: 10,
  categoryId: "",
  description: "",
  imageUrl: "",
  preparationTime: 0,
  costPrice: 0,
  sellingType: SellingType.PORTION,
  unit: "",
  printDish: true,
  printLabel: false,
  printSeafood: false,
};

type DialogMode = "create" | "edit" | "view" | "toppings" | "combo" | null;

export default function ProductsPage() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  // Column configuration hook
  const {
    columns: productColumns,
    visibleColumns,
    toggleColumn,
    resetToDefault: resetColumns,
    isColumnVisible,
  } = useColumnConfig({
    storageKey: "products-table-columns",
    defaultColumns: defaultProductColumns,
  });

  // Redux selectors
  const { items: categories, byProductType: categoriesByType, loading: loadingCategories } = useAppSelector((state) => state.categories);

  // Global filter state from Redux
  const { brandId: filterBrandId, setBrandId: setFilterBrandId } = useGlobalFilters();

  // Local state
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<CreateProductDto>(initialFormData);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);

  // Topping management state
  const [availableToppings, setAvailableToppings] = React.useState<Product[]>([]);
  const [toppingGroups, setToppingGroups] = React.useState<ToppingGroup[]>([]);
  const [loadingToppings, setLoadingToppings] = React.useState(false);
  const [savingToppings, setSavingToppings] = React.useState(false);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = React.useState("");
  const [newGroupRequired, setNewGroupRequired] = React.useState(false);
  const [newGroupMinSelection, setNewGroupMinSelection] = React.useState(0);
  const [newGroupMaxSelection, setNewGroupMaxSelection] = React.useState(1);
  const [addingToGroupId, setAddingToGroupId] = React.useState<string | null>(null);

  // Category combobox state
  const [categoryComboboxOpen, setCategoryComboboxOpen] = React.useState(false);
  const [categorySearchValue, setCategorySearchValue] = React.useState("");

  // Unit combobox state
  const [units, setUnits] = React.useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = React.useState(false);
  const [unitComboboxOpen, setUnitComboboxOpen] = React.useState(false);
  const [unitSearchValue, setUnitSearchValue] = React.useState("");

  // Continue creating state
  const [continueCreating, setContinueCreating] = React.useState(false);

  // Combo items management state
  const [availableComboProducts, setAvailableComboProducts] = React.useState<Product[]>([]);
  const [comboItems, setComboItems] = React.useState<ComboItem[]>([]);
  const [selectedComboProductIds, setSelectedComboProductIds] = React.useState<Map<string, number>>(new Map());
  const [loadingComboItems, setLoadingComboItems] = React.useState(false);
  const [savingComboItems, setSavingComboItems] = React.useState(false);
  const [comboProductSearch, setComboProductSearch] = React.useState("");

  // Get categories based on selected product type
  const availableCategories = React.useMemo(() => {
    if (!formData.type) return categories.filter(c => c.isActive);
    return categoriesByType[formData.type]?.filter(c => c.isActive) || [];
  }, [formData.type, categories, categoriesByType]);

  // Load products - only when brand is selected
  const loadProducts = React.useCallback(async (brandId: string) => {
    if (!brandId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const filterType = typeFilter === "all" ? undefined : (typeFilter as ProductType);
      const data = await productService.getAll(brandId, filterType);
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách món ăn", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [typeFilter, toast]);

  React.useEffect(() => {
    loadProducts(filterBrandId);
  }, [filterBrandId, loadProducts]);

  // Load categories when dialog opens (using Redux - cached data)
  React.useEffect(() => {
    if (dialogMode === "create" || dialogMode === "edit") {
      dispatch(fetchCategories());
    }
  }, [dialogMode, dispatch]);

  // Load units when dialog opens
  React.useEffect(() => {
    const loadUnits = async () => {
      if (dialogMode === "create" || dialogMode === "edit") {
        setLoadingUnits(true);
        try {
          const data = await unitService.getAll();
          setUnits(data.filter(u => u.isActive));
        } catch (error) {
          console.error("Error loading units:", error);
        } finally {
          setLoadingUnits(false);
        }
      }
    };
    loadUnits();
  }, [dialogMode]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setFormData(initialFormData);
    setCategorySearchValue("");
    setUnitSearchValue("");
    setDialogMode("create");
  };

  // Open view dialog
  const handleOpenView = (product: Product) => {
    setSelectedProduct(product);
    setDialogMode("view");
  };

  // Open edit dialog
  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
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
    // Set category search value
    const category = categories.find(c => c.id === product.categoryId);
    setCategorySearchValue(category?.name || "");
    // Set unit search value
    setUnitSearchValue(product.unit || "");
    setDialogMode("edit");
  };

  // Open toppings management dialog (show assigned groups)
  const handleOpenToppings = async (product: Product) => {
    setSelectedProduct(product);
    setDialogMode("toppings");
    setLoadingToppings(true);
    try {
      const [toppings, assignedGroups, allGroups] = await Promise.all([
        productService.getAvailableToppings(),
        productService.getProductToppingGroups(product.id),
        productService.getAllToppingGroups(),
      ]);
      setAvailableToppings(toppings);
      setToppingGroups(assignedGroups);
      // Store all groups for assignment dialog
      (window as any).__allToppingGroups = allGroups;
      // Expand all groups by default
      setExpandedGroups(new Set(assignedGroups.map(g => g.id)));
    } catch (error) {
      console.error("Error loading toppings:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách topping", variant: "destructive" });
    } finally {
      setLoadingToppings(false);
    }
  };

  // Open combo items management dialog
  const handleOpenCombo = async (product: Product) => {
    if (product.type !== ProductType.COMBO) {
      toast({ title: "Lỗi", description: "Chỉ có thể quản lý món cho combo", variant: "destructive" });
      return;
    }
    setSelectedProduct(product);
    setDialogMode("combo");
    setLoadingComboItems(true);
    setComboProductSearch("");
    try {
      const [availableProducts, existingItems] = await Promise.all([
        productService.getAvailableProductsForCombo(),
        productService.getComboItems(product.id),
      ]);
      setAvailableComboProducts(availableProducts);
      setComboItems(existingItems);
      // Initialize selected products map with existing items
      const selectedMap = new Map<string, number>();
      existingItems.forEach(item => {
        selectedMap.set(item.productId, item.quantity);
      });
      setSelectedComboProductIds(selectedMap);
    } catch (error) {
      console.error("Error loading combo items:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách món", variant: "destructive" });
    } finally {
      setLoadingComboItems(false);
    }
  };

  // Toggle product in combo
  const toggleComboProduct = (productId: string) => {
    setSelectedComboProductIds(prev => {
      const newMap = new Map(prev);
      if (newMap.has(productId)) {
        newMap.delete(productId);
      } else {
        newMap.set(productId, 1);
      }
      return newMap;
    });
  };

  // Update combo product quantity
  const updateComboProductQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedComboProductIds(prev => {
      const newMap = new Map(prev);
      newMap.set(productId, quantity);
      return newMap;
    });
  };

  // Save combo items
  const handleSaveComboItems = async () => {
    if (!selectedProduct) return;
    setSavingComboItems(true);
    try {
      const items = Array.from(selectedComboProductIds.entries()).map(([productId, quantity]) => ({
        productId,
        quantity,
      }));
      const result = await productService.assignComboItems(selectedProduct.id, items);
      setComboItems(result);
      toast({
        title: "Thành công",
        description: `Đã cập nhật combo với ${items.length} món`,
      });
      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving combo items:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingComboItems(false);
    }
  };

  // Filter combo products by search
  const filteredComboProducts = availableComboProducts.filter(p =>
    p.name.toLowerCase().includes(comboProductSearch.toLowerCase()) ||
    p.code.toLowerCase().includes(comboProductSearch.toLowerCase())
  );

  // Create topping group (shared - then assign to product)
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !selectedProduct) return;
    setSavingToppings(true);
    try {
      // Create shared group
      const newGroup = await productService.createToppingGroup({
        name: newGroupName.trim(),
        isRequired: newGroupRequired,
        minSelection: newGroupMinSelection,
        maxSelection: newGroupMaxSelection,
      });
      // Assign to current product
      const result = await productService.addToppingGroupToProduct(selectedProduct.id, newGroup.id);
      setToppingGroups(result);
      setNewGroupName("");
      setNewGroupRequired(false);
      setNewGroupMinSelection(0);
      setNewGroupMaxSelection(1);
      // Expand the new group
      setExpandedGroups(prev => new Set([...prev, newGroup.id]));
      toast({ title: "Thành công", description: `Đã tạo và gán nhóm "${newGroupName}"` });
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingToppings(false);
    }
  };

  // Remove topping group from product (unassign)
  const handleDeleteGroup = async (groupId: string) => {
    if (!selectedProduct) return;
    setSavingToppings(true);
    try {
      const result = await productService.removeToppingGroupFromProduct(selectedProduct.id, groupId);
      setToppingGroups(result);
      toast({ title: "Thành công", description: "Đã gỡ nhóm topping khỏi món" });
    } catch (error: any) {
      console.error("Error removing group:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingToppings(false);
    }
  };

  // Add topping to group (shared group item)
  const handleAddToppingToGroup = async (groupId: string, toppingId: string) => {
    if (!selectedProduct) return;
    setSavingToppings(true);
    try {
      await productService.addToppingItem(groupId, {
        toppingId,
        priceAdjustment: 0,
        maxQuantity: 5,
      });
      // Refresh assigned groups
      const result = await productService.getProductToppingGroups(selectedProduct.id);
      setToppingGroups(result);
      setAddingToGroupId(null);
      const topping = availableToppings.find(t => t.id === toppingId);
      toast({ title: "Thành công", description: `Đã thêm "${topping?.name}" vào nhóm` });
    } catch (error: any) {
      console.error("Error adding topping:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingToppings(false);
    }
  };

  // Remove topping from group (shared group item)
  const handleRemoveToppingFromGroup = async (groupId: string, itemId: string) => {
    if (!selectedProduct) return;
    setSavingToppings(true);
    try {
      await productService.removeToppingItem(groupId, itemId);
      // Refresh assigned groups
      const result = await productService.getProductToppingGroups(selectedProduct.id);
      setToppingGroups(result);
      toast({ title: "Thành công", description: "Đã xóa topping khỏi nhóm" });
    } catch (error: any) {
      console.error("Error removing topping:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingToppings(false);
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

  // Get or create category by name
  const getOrCreateCategory = async (categoryName: string, productType: ProductType): Promise<string> => {
    // Check if category already exists (case-insensitive)
    const existingCategory = categories.find(
      c => c.name.toLowerCase() === categoryName.toLowerCase() && c.productType === productType
    );
    if (existingCategory) {
      return existingCategory.id;
    }

    // Create new category
    const newCategory = await categoryService.create({
      name: categoryName,
      productType: productType,
    });
    // Refresh categories
    dispatch(fetchCategories());
    toast({ title: "Thành công", description: `Đã tạo danh mục "${categoryName}"` });
    return newCategory.id;
  };

  // Filter categories for combobox
  const filteredCategories = availableCategories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearchValue.toLowerCase())
  );

  // Check if search value is a new category
  const isNewCategory = categorySearchValue.trim() &&
    !availableCategories.some(c => c.name.toLowerCase() === categorySearchValue.toLowerCase());

  // Filter units for combobox
  const filteredUnits = units.filter(unit =>
    unit.name.toLowerCase().includes(unitSearchValue.toLowerCase())
  );

  // Check if search value is a new unit
  const isNewUnit = unitSearchValue.trim() &&
    !units.some(u => u.name.toLowerCase() === unitSearchValue.toLowerCase());

  // Get or create unit by name
  const getOrCreateUnit = async (unitName: string): Promise<string> => {
    // Check if unit already exists (case-insensitive)
    const existingUnit = units.find(
      u => u.name.toLowerCase() === unitName.toLowerCase()
    );
    if (existingUnit) {
      return existingUnit.name;
    }

    // Create new unit
    const newUnit = await unitService.create({ name: unitName });
    // Add to local units list
    setUnits(prev => [...prev, newUnit]);
    toast({ title: "Thành công", description: `Đã tạo đơn vị "${unitName}"` });
    return newUnit.name;
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || formData.price < 0) {
      toast({ title: "Lỗi", description: "Vui lòng điền đầy đủ tên món và giá hợp lệ", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      // Get or create category if needed
      let categoryId = formData.categoryId;
      if (!categoryId && categorySearchValue.trim()) {
        categoryId = await getOrCreateCategory(categorySearchValue.trim(), formData.type);
      }

      // Get or create unit if needed
      let unitName = formData.unit;
      if (unitSearchValue.trim()) {
        unitName = await getOrCreateUnit(unitSearchValue.trim());
      }

      // Prepare data with proper number types
      const preparedData = {
        name: formData.name,
        type: formData.type,
        price: Number(formData.price) || 0,
        vatRate: parseFloat(String(formData.vatRate)) || 0,
        categoryId: categoryId || undefined,
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

      if (dialogMode === "create") {
        const result = await productService.create(preparedData);
        setProducts((prev) => [...prev, result]);
        toast({ title: "Thành công", description: `Đã tạo món "${result.name}" với mã ${result.code}` });
        if (continueCreating) {
          // Reset form for next creation
          setFormData(initialFormData);
          setCategorySearchValue("");
          setUnitSearchValue("");
        } else {
          handleCloseDialog();
        }
      } else if (dialogMode === "edit" && selectedProduct) {
        const result = await productService.update(selectedProduct.id, preparedData);
        setProducts((prev) => prev.map((p) => (p.id === selectedProduct.id ? result : p)));
        toast({ title: "Thành công", description: "Đã cập nhật thông tin món ăn" });
        handleCloseDialog();
      }
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (product: Product) => {
    try {
      const updated = await productService.toggleActive(product.id);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} món "${product.name}"`,
      });
    } catch (error: any) {
      console.error("Error toggling product:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    }
  };

  // Close dialog and reset
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedProduct(null);
    setFormData(initialFormData);
    setCategorySearchValue("");
    setUnitSearchValue("");
    setAvailableToppings([]);
    setToppingGroups([]);
    setExpandedGroups(new Set());
    setNewGroupName("");
    setNewGroupRequired(false);
    setNewGroupMinSelection(0);
    setNewGroupMaxSelection(1);
    setAddingToGroupId(null);
  };

  // Handle product type change - reset category when type changes
  const handleTypeChange = (type: ProductType) => {
    setFormData({ ...formData, type, categoryId: "" });
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  // Get category name by ID
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return "-";
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "-";
  };

  // Filter products by search and brand
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase());
    const matchesBrand = filterBrandId === "all" || p.brandId === filterBrandId;
    return matchesSearch && matchesBrand;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý món ăn</h1>
          <p className="text-muted-foreground">Thêm, sửa và quản lý menu món ăn theo thương hiệu</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm món ăn
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách món ăn</CardTitle>
              <CardDescription>Tổng cộng {products.length} món</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <BrandFilter
                selectedBrandId={filterBrandId}
                onBrandChange={setFilterBrandId}
                showAllOption={false}
                className="w-[160px]"
              />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Loại món" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="food">Đồ ăn</SelectItem>
                  <SelectItem value="drink">Đồ uống</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                  <SelectItem value="topping">Topping</SelectItem>
                  <SelectItem value="combo">Combo</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-48">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <ColumnConfigDialog
                columns={productColumns}
                onToggle={toggleColumn}
                onReset={resetColumns}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!filterBrandId ? (
            <FilterRequiredPlaceholder
              title="Vui lòng chọn thương hiệu"
              description="Chọn một thương hiệu từ bộ lọc phía trên để xem danh sách món ăn"
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <UtensilsCrossed className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có món ăn nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm món ăn&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isColumnVisible("code") && <TableHead>Mã</TableHead>}
                  {isColumnVisible("name") && <TableHead>Tên món</TableHead>}
                  {isColumnVisible("type") && <TableHead>Loại</TableHead>}
                  {isColumnVisible("categoryName") && <TableHead>Danh mục</TableHead>}
                  {isColumnVisible("price") && <TableHead className="text-right">Giá (đã VAT)</TableHead>}
                  {isColumnVisible("vatRate") && <TableHead className="text-right">VAT (%)</TableHead>}
                  {isColumnVisible("costPrice") && <TableHead className="text-right">Giá vốn</TableHead>}
                  {isColumnVisible("description") && <TableHead>Mô tả</TableHead>}
                  {isColumnVisible("preparationTime") && <TableHead>Thời gian CB</TableHead>}
                  {isColumnVisible("sellingType") && <TableHead>Loại bán</TableHead>}
                  {isColumnVisible("unit") && <TableHead>Đơn vị</TableHead>}
                  {isColumnVisible("printDish") && <TableHead>In món</TableHead>}
                  {isColumnVisible("printLabel") && <TableHead>In tem</TableHead>}
                  {isColumnVisible("printSeafood") && <TableHead>In hải sản</TableHead>}
                  {isColumnVisible("isActive") && <TableHead>Trạng thái</TableHead>}
                  <TableHead className="w-[80px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    {isColumnVisible("code") && <TableCell className="font-mono text-sm">{product.code}</TableCell>}
                    {isColumnVisible("name") && <TableCell className="font-medium">{product.name}</TableCell>}
                    {isColumnVisible("type") && (
                      <TableCell>
                        <Badge className={typeLabels[product.type]?.color || ""}>
                          {typeLabels[product.type]?.label || product.type}
                        </Badge>
                      </TableCell>
                    )}
                    {isColumnVisible("categoryName") && <TableCell>{getCategoryName(product.categoryId)}</TableCell>}
                    {isColumnVisible("price") && <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>}
                    {isColumnVisible("vatRate") && <TableCell className="text-right">{product.vatRate || 10}%</TableCell>}
                    {isColumnVisible("costPrice") && <TableCell className="text-right">{formatCurrency(product.costPrice || 0)}</TableCell>}
                    {isColumnVisible("description") && <TableCell className="max-w-[200px] truncate">{product.description || "-"}</TableCell>}
                    {isColumnVisible("preparationTime") && <TableCell>{product.preparationTime ? `${product.preparationTime} phút` : "-"}</TableCell>}
                    {isColumnVisible("sellingType") && <TableCell>{product.sellingType === "weight" ? "Theo cân" : "Theo phần"}</TableCell>}
                    {isColumnVisible("unit") && <TableCell>{product.unit || "-"}</TableCell>}
                    {isColumnVisible("printDish") && <TableCell>{product.printDish ? "Có" : "Không"}</TableCell>}
                    {isColumnVisible("printLabel") && <TableCell>{product.printLabel ? "Có" : "Không"}</TableCell>}
                    {isColumnVisible("printSeafood") && <TableCell>{product.printSeafood ? "Có" : "Không"}</TableCell>}
                    {isColumnVisible("isActive") && (
                      <TableCell>
                        <Badge variant={product.isActive ? "default" : "secondary"}>
                          {product.isActive ? "Hoạt động" : "Tạm ngưng"}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenView(product)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(product)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          {product.type !== ProductType.TOPPING && (
                            <DropdownMenuItem onClick={() => handleOpenToppings(product)}>
                              <Cherry className="mr-2 h-4 w-4" />
                              Quản lý Topping
                            </DropdownMenuItem>
                          )}
                          {product.type === ProductType.COMBO && (
                            <DropdownMenuItem onClick={() => handleOpenCombo(product)}>
                              <UtensilsCrossed className="mr-2 h-4 w-4" />
                              Quản lý món Combo
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleActive(product)}>
                            <Power className="mr-2 h-4 w-4" />
                            {product.isActive ? "Tạm ngưng" : "Kích hoạt"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Product Dialog */}
      <Dialog open={dialogMode === "view"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết món ăn</DialogTitle>
            <DialogDescription>Thông tin chi tiết của món ăn</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Mã món</Label>
                  <p className="font-mono font-medium">{selectedProduct.code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Loại món</Label>
                  <Badge className={typeLabels[selectedProduct.type]?.color || ""}>
                    {typeLabels[selectedProduct.type]?.label || selectedProduct.type}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Tên món</Label>
                <p className="font-medium text-lg">{selectedProduct.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Giá bán (đã bao gồm VAT)</Label>
                  <p className="font-medium text-lg text-green-600">{formatCurrency(selectedProduct.price)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">VAT</Label>
                  <p>{selectedProduct.vatRate || 10}%</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Giá chưa bao gồm VAT</Label>
                  <p className="font-medium text-lg text-muted-foreground">
                    {formatCurrency(Math.round(selectedProduct.price / (1 + (selectedProduct.vatRate || 10) / 100)))}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Thuế VAT</Label>
                  <p className="font-medium text-muted-foreground">
                    {formatCurrency(Math.round(selectedProduct.price - selectedProduct.price / (1 + (selectedProduct.vatRate || 10) / 100)))}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Danh mục</Label>
                <p>{getCategoryName(selectedProduct.categoryId)}</p>
              </div>
              {selectedProduct.description && (
                <div>
                  <Label className="text-muted-foreground text-xs">Mô tả</Label>
                  <p className="text-sm">{selectedProduct.description}</p>
                </div>
              )}
              {selectedProduct.imageUrl && (
                <div>
                  <Label className="text-muted-foreground text-xs">Hình ảnh</Label>
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="mt-2 w-full max-w-[200px] rounded-lg object-cover"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Trạng thái</Label>
                  <Badge variant={selectedProduct.isActive ? "default" : "secondary"}>
                    {selectedProduct.isActive ? "Hoạt động" : "Tạm ngưng"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Ngày tạo</Label>
                  <p>{new Date(selectedProduct.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCloseDialog()}>
              Đóng
            </Button>
            <Button onClick={() => selectedProduct && handleOpenEdit(selectedProduct)}>
              <Pencil className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Product Dialog */}
      <Dialog open={dialogMode === "create" || dialogMode === "edit"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Thêm món ăn mới" : "Chỉnh sửa món ăn"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Nhập thông tin món ăn. Mã món sẽ được tự động tạo."
                : "Cập nhật thông tin món ăn"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên món *</Label>
                <Input
                  id="name"
                  placeholder="Phở bò tái"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
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
                            // Clear categoryId if user is typing a new value
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
                            {/* Option to create new category if not exists */}
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
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={formData.price ?? ""}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
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
                    onChange={(e) => setFormData({ ...formData, vatRate: parseFloat(e.target.value) || 0 })}
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
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả món ăn..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, preparationTime: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="costPrice">Giá vốn (VNĐ)</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="30000"
                    value={formData.costPrice || ""}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Loại bán và Đơn vị */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sellingType">Loại bán</Label>
                  <Select
                    value={formData.sellingType || SellingType.PORTION}
                    onValueChange={(value) => setFormData({ ...formData, sellingType: value as SellingType })}
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
                            {/* Option to create new unit if not exists */}
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

              {/* Setup in ấn */}
              <div className="grid gap-2">
                <Label>Cài đặt in ấn</Label>
                <div className="flex flex-wrap gap-6 p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="printDish"
                      checked={formData.printDish ?? true}
                      onCheckedChange={(checked) => setFormData({ ...formData, printDish: !!checked })}
                    />
                    <Label htmlFor="printDish" className="cursor-pointer">In món</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="printLabel"
                      checked={formData.printLabel ?? false}
                      onCheckedChange={(checked) => setFormData({ ...formData, printLabel: !!checked })}
                    />
                    <Label htmlFor="printLabel" className="cursor-pointer">In tem</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="printSeafood"
                      checked={formData.printSeafood ?? false}
                      onCheckedChange={(checked) => setFormData({ ...formData, printSeafood: !!checked })}
                    />
                    <Label htmlFor="printSeafood" className="cursor-pointer">In hồ hải sản</Label>
                  </div>
                </div>
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
                <Button
                  type="submit"
                  disabled={saving || !formData.name.trim() || formData.price < 0}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {dialogMode === "create" ? "Tạo món ăn" : "Cập nhật"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toppings Management Dialog */}
      <Dialog open={dialogMode === "toppings"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quản lý Topping - {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              Tạo nhóm topping (ví dụ: Size, Topping) và thêm các lựa chọn vào từng nhóm
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingToppings ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Create new group */}
                <div className="p-4 border rounded-lg bg-muted/50">
                  <Label className="text-sm font-medium">Tạo nhóm mới</Label>
                  <div className="grid grid-cols-12 gap-2 mt-2">
                    <Input
                      placeholder="Tên nhóm (VD: Size, Topping)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="col-span-4"
                    />
                    <div className="col-span-2 flex items-center gap-2">
                      <Switch
                        checked={newGroupRequired}
                        onCheckedChange={setNewGroupRequired}
                      />
                      <Label className="text-xs">Bắt buộc</Label>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={newGroupMinSelection}
                        onChange={(e) => setNewGroupMinSelection(Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Max"
                        value={newGroupMaxSelection}
                        onChange={(e) => setNewGroupMaxSelection(Number(e.target.value))}
                      />
                    </div>
                    <Button
                      onClick={handleCreateGroup}
                      disabled={!newGroupName.trim() || savingToppings}
                      className="col-span-2"
                    >
                      {savingToppings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Min = số lượng tối thiểu phải chọn, Max = số lượng tối đa được chọn
                  </p>
                </div>

                {/* Existing groups */}
                {toppingGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Cherry className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Chưa có nhóm topping nào</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tạo nhóm mới ở trên để bắt đầu
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {toppingGroups.map((group) => (
                      <div key={group.id} className="border rounded-lg">
                        {/* Group header */}
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
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
                              (chọn {group.minSelection}-{group.maxSelection})
                            </span>
                            <span className="text-xs text-muted-foreground">
                              • {group.items.length} item
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group.id);
                            }}
                            disabled={savingToppings}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        {/* Group items */}
                        {expandedGroups.has(group.id) && (
                          <div className="border-t p-3 space-y-2">
                            {group.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 rounded bg-muted/30"
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
                                    disabled={savingToppings}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}

                            {/* Add topping to group */}
                            {addingToGroupId === group.id ? (
                              <div className="p-2 border rounded">
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
                                Thêm topping vào nhóm
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
                    Chưa có sản phẩm loại "Topping" nào. Hãy tạo sản phẩm loại Topping trước.
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCloseDialog()}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Combo Items Management Dialog */}
      <Dialog open={dialogMode === "combo"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quản lý món trong Combo</DialogTitle>
            <DialogDescription>
              Chọn các món ăn cho combo &quot;{selectedProduct?.name}&quot;. Không thể thêm combo hoặc topping vào combo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm món ăn..."
                className="pl-10"
                value={comboProductSearch}
                onChange={(e) => setComboProductSearch(e.target.value)}
              />
            </div>

            {/* Selected count */}
            <div className="text-sm text-muted-foreground">
              Đã chọn: <span className="font-medium text-foreground">{selectedComboProductIds.size}</span> món
            </div>

            {/* Products list */}
            {loadingComboItems ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[400px] border rounded-md">
                <div className="p-4 space-y-2">
                  {filteredComboProducts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Không tìm thấy món ăn</p>
                  ) : (
                    filteredComboProducts.map((product) => {
                      const isSelected = selectedComboProductIds.has(product.id);
                      const quantity = selectedComboProductIds.get(product.id) || 1;
                      return (
                        <div
                          key={product.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            isSelected
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted"
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleComboProduct(product.id)}
                          />
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => toggleComboProduct(product.id)}
                          >
                            <p className="font-medium truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.code} • {new Intl.NumberFormat("vi-VN").format(product.price)}đ
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {typeLabels[product.type]?.label || product.type}
                          </Badge>
                          {isSelected && (
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateComboProductQuantity(product.id, quantity - 1)}
                                disabled={quantity <= 1}
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => updateComboProductQuantity(product.id, parseInt(e.target.value) || 1)}
                                className="w-14 h-7 text-center"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateComboProductQuantity(product.id, quantity + 1)}
                              >
                                +
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleCloseDialog()}>
              Hủy
            </Button>
            <Button onClick={handleSaveComboItems} disabled={savingComboItems}>
              {savingComboItems && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu ({selectedComboProductIds.size} món)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
