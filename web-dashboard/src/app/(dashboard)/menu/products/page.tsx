"use client";

import * as React from "react";
import { Plus, Search, UtensilsCrossed, Filter, Loader2, MoreHorizontal, Eye, Pencil, Power, Cherry, X, Check, Trash2, ChevronDown, ChevronRight, ChevronsUpDown, Download, Upload, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown, DollarSign, Percent, Printer, Clock, Scale, Tag } from "lucide-react";
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
import { productService, bulkProductService, type Product, type CreateProductDto, type UpdateProductDto, ProductType, SellingType, type ToppingGroup, type ComboItem, type BulkProductItem, type ProductNote, type ProductNoteAssignment, type ProductBulkOperationResult } from "@/services/product-service";
import { exportToExcel, readExcelFile, downloadTemplateWithRealDropdowns, type TemplateColumnWithDropdown } from "@/lib/excel-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { categoryService } from "@/services/category-service";
import { unitService, type Unit } from "@/services/unit-service";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useColumnConfig, type ColumnConfig } from "@/hooks/use-column-config";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";
import { BrandFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";
import { ImageUpload } from "@/components/ui/image-upload";

// Default column configuration for products table
const defaultProductColumns: ColumnConfig[] = [
  { key: "image", label: "Ảnh", visible: true },
  { key: "code", label: "Mã món", visible: true },
  { key: "name", label: "Tên món", visible: true, locked: true },
  { key: "type", label: "Loại", visible: true },
  { key: "categoryName", label: "Danh mục", visible: true },
  { key: "price", label: "Giá (đã VAT)", visible: true },
  { key: "priceBeforeVat", label: "Giá trước VAT", visible: true },
  { key: "vatAmount", label: "Tiền thuế VAT", visible: true },
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
import { fetchCategories, invalidateCategoriesCache } from "@/store/slices/categoriesSlice";

// Excel column configuration for export
const excelColumns = [
  { key: "id" as keyof Product, header: "ID", width: 40 },
  { key: "code" as keyof Product, header: "Mã món", width: 15 },
  { key: "name" as keyof Product, header: "Tên món", width: 30 },
  { key: "type" as keyof Product, header: "Loại", width: 12 },
  { key: "categoryName" as keyof Product, header: "Danh mục", width: 20 },
  { key: "price" as keyof Product, header: "Giá (VNĐ)", width: 15 },
  { key: "vatRate" as keyof Product, header: "VAT (%)", width: 10 },
  { key: "costPrice" as keyof Product, header: "Giá vốn", width: 15 },
  { key: "unit" as keyof Product, header: "Đơn vị", width: 12 },
  { key: "description" as keyof Product, header: "Mô tả", width: 30 },
  { key: "preparationTime" as keyof Product, header: "Thời gian CB (phút)", width: 18 },
  { key: "sellingType" as keyof Product, header: "Loại bán", width: 12 },
  { key: "printDish" as keyof Product, header: "In món", width: 10 },
  { key: "printLabel" as keyof Product, header: "In tem", width: 10 },
  { key: "printSeafood" as keyof Product, header: "In hải sản", width: 12 },
  { key: "isActive" as keyof Product, header: "Hoạt động", width: 10 },
];

// Extended import data with name fields for lookup
interface ImportDataWithNames extends Partial<BulkProductItem> {
  typeName?: string; // For converting "Đồ ăn" -> "food"
}

// Excel column mapping for import
const importColumnMapping: { excelHeader: string; key: keyof ImportDataWithNames }[] = [
  { excelHeader: "ID", key: "id" },
  { excelHeader: "Mã món", key: "code" },
  { excelHeader: "Tên món", key: "name" },
  { excelHeader: "Loại", key: "typeName" },
  { excelHeader: "Danh mục", key: "categoryName" },
  { excelHeader: "Giá (VNĐ)", key: "price" },
  { excelHeader: "VAT (%)", key: "vatRate" },
  { excelHeader: "Giá vốn", key: "costPrice" },
  { excelHeader: "Đơn vị", key: "unit" },
  { excelHeader: "Mô tả", key: "description" },
  { excelHeader: "Thời gian CB (phút)", key: "preparationTime" },
  { excelHeader: "Loại bán", key: "sellingType" },
  { excelHeader: "URL Hình ảnh", key: "imageUrl" },
];

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

type DialogMode = "create" | "edit" | "view" | "toppings" | "combo" | "import" | null;

export default function ProductsPage() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
  const { brandId: filterBrandId, branchId: filterBranchId, setBrandId: setFilterBrandId } = useGlobalFilters();

  // Local state
  const [search, setSearch] = React.useState("");
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<CreateProductDto>(initialFormData);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);

  // Sorting state
  type SortKey = "code" | "name" | "type" | "categoryName" | "price" | "vatRate" | "costPrice" | "unit" | "sellingType" | "isActive" | "createdAt";
  type SortDirection = "asc" | "desc";
  const [sortKey, setSortKey] = React.useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");

  // Filter state
  const [filterPopoverOpen, setFilterPopoverOpen] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<Set<string>>(new Set()); // Multi-select
  const [categoryFilter, setCategoryFilter] = React.useState<Set<string>>(new Set()); // Multi-select
  const [vatFilter, setVatFilter] = React.useState<string>("all"); // "all" | "has_vat" | "no_vat"
  const [unitFilter, setUnitFilter] = React.useState<string>("all");
  const [printDishFilter, setPrintDishFilter] = React.useState<string>("all"); // "all" | "yes" | "no"
  const [printLabelFilter, setPrintLabelFilter] = React.useState<string>("all");
  const [printSeafoodFilter, setPrintSeafoodFilter] = React.useState<string>("all");
  const [sellingTypeFilter, setSellingTypeFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Check if any filter is active
  const hasActiveFilters = typeFilter.size > 0 || categoryFilter.size > 0 || vatFilter !== "all" ||
    unitFilter !== "all" || printDishFilter !== "all" || printLabelFilter !== "all" ||
    printSeafoodFilter !== "all" || sellingTypeFilter !== "all" || statusFilter !== "all";

  // Clear all filters
  const clearAllFilters = () => {
    setTypeFilter(new Set());
    setCategoryFilter(new Set());
    setVatFilter("all");
    setUnitFilter("all");
    setPrintDishFilter("all");
    setPrintLabelFilter("all");
    setPrintSeafoodFilter("all");
    setSellingTypeFilter("all");
    setStatusFilter("all");
  };

  // Handle sort click
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // Get sort icon
  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortDirection === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  // Toggle type filter (multi-select)
  const toggleTypeFilter = (type: string) => {
    setTypeFilter(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Toggle category filter (multi-select)
  const toggleCategoryFilter = (categoryId: string) => {
    setCategoryFilter(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Get unique units from products for filter
  const uniqueUnits = React.useMemo(() => {
    const units = new Set<string>();
    products.forEach(p => {
      if (p.unit) units.add(p.unit);
    });
    return Array.from(units).sort();
  }, [products]);

  // Bulk operations state
  type BulkOperation = "category" | "activate" | "deactivate" | "delete" | "vat" | "price" | "print-label" | "print-seafood" | "print-dish" | "unit" | "selling-type" | "preparation-time" | null;
  const [selectedProductIds, setSelectedProductIds] = React.useState<Set<string>>(new Set());
  const [bulkOperation, setBulkOperation] = React.useState<BulkOperation>(null);
  const [bulkCategoryId, setBulkCategoryId] = React.useState("");
  const [bulkVatRate, setBulkVatRate] = React.useState<number>(10);
  const [bulkPrice, setBulkPrice] = React.useState<number>(0);
  const [bulkPrintValue, setBulkPrintValue] = React.useState<boolean>(true);
  const [bulkUnit, setBulkUnit] = React.useState("");
  const [bulkUnitComboboxOpen, setBulkUnitComboboxOpen] = React.useState(false);
  const [bulkSellingType, setBulkSellingType] = React.useState<SellingType>(SellingType.PORTION);
  const [bulkPreparationTime, setBulkPreparationTime] = React.useState<number>(0);
  const [processingBulk, setProcessingBulk] = React.useState(false);
  const [bulkResult, setBulkResult] = React.useState<ProductBulkOperationResult | null>(null);

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

  // Notes state
  const [availableNotes, setAvailableNotes] = React.useState<ProductNote[]>([]);
  const [loadingNotes, setLoadingNotes] = React.useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = React.useState<Set<string>>(new Set());
  const [noteSearchValue, setNoteSearchValue] = React.useState("");
  const [notePopoverOpen, setNotePopoverOpen] = React.useState(false);
  const [creatingNote, setCreatingNote] = React.useState(false);

  // All topping groups for assignment
  const [allToppingGroups, setAllToppingGroups] = React.useState<ToppingGroup[]>([]);
  const [assignedGroupIds, setAssignedGroupIds] = React.useState<Set<string>>(new Set());

  // Quick create topping state
  const [showQuickCreateTopping, setShowQuickCreateTopping] = React.useState(false);
  const [quickToppingName, setQuickToppingName] = React.useState("");
  const [quickToppingPrice, setQuickToppingPrice] = React.useState<number>(0);
  const [quickToppingVat, setQuickToppingVat] = React.useState<number>(0);
  const [creatingQuickTopping, setCreatingQuickTopping] = React.useState(false);
  const [addingToppingToGroupId, setAddingToppingToGroupId] = React.useState<string | null>(null);

  // Continue creating state
  const [continueCreating, setContinueCreating] = React.useState(false);

  // Combo items management state
  const [availableComboProducts, setAvailableComboProducts] = React.useState<Product[]>([]);
  const [comboItems, setComboItems] = React.useState<ComboItem[]>([]);
  const [selectedComboProductIds, setSelectedComboProductIds] = React.useState<Map<string, number>>(new Map());
  const [loadingComboItems, setLoadingComboItems] = React.useState(false);
  const [savingComboItems, setSavingComboItems] = React.useState(false);
  const [comboProductSearch, setComboProductSearch] = React.useState("");

  // Import state
  const [importData, setImportData] = React.useState<Partial<BulkProductItem>[]>([]);
  const [importErrors, setImportErrors] = React.useState<string[]>([]);
  const [importing, setImporting] = React.useState(false);

  // Track newly created and updated product IDs for badges
  const [newProductIds, setNewProductIds] = React.useState<Set<string>>(new Set());
  const [updatedProductIds, setUpdatedProductIds] = React.useState<Set<string>>(new Set());

  // Get categories based on selected product type
  const availableCategories = React.useMemo(() => {
    if (!formData.type) return categories.filter(c => c.isActive);
    return categoriesByType[formData.type]?.filter(c => c.isActive) || [];
  }, [formData.type, categories, categoriesByType]);

  // Load products - only when brand is selected
  const loadProducts = React.useCallback(async (brandId: string, branchId?: string) => {
    if (!brandId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Load all products, filtering will happen in filteredProducts
      const data = branchId
        ? await productService.getAllWithSeasonalPrices(brandId, branchId)
        : await productService.getAll(brandId);
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách món ăn", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadProducts(filterBrandId, filterBranchId);
  }, [filterBrandId, filterBranchId, loadProducts]);

  // Load categories when brand is selected (for displaying category names in table)
  React.useEffect(() => {
    if (filterBrandId) {
      // Invalidate cache and fetch fresh categories when brand changes
      dispatch(invalidateCategoriesCache());
      dispatch(fetchCategories(filterBrandId));
    }
  }, [filterBrandId, dispatch]);

  // Load units when dialog opens or bulk unit operation
  React.useEffect(() => {
    const loadUnits = async () => {
      if (dialogMode === "create" || dialogMode === "edit" || bulkOperation === "unit") {
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
  }, [dialogMode, bulkOperation]);

  // Load notes when dialog opens
  React.useEffect(() => {
    const loadNotes = async () => {
      if ((dialogMode === "create" || dialogMode === "edit") && filterBrandId) {
        setLoadingNotes(true);
        try {
          const data = await productService.getAllNotes(filterBrandId);
          setAvailableNotes(data.filter(n => n.isActive));
        } catch (error) {
          console.error("Error loading notes:", error);
        } finally {
          setLoadingNotes(false);
        }
      }
    };
    loadNotes();
  }, [dialogMode, filterBrandId]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setFormData(initialFormData);
    setCategorySearchValue("");
    setUnitSearchValue("");
    setSelectedNoteIds(new Set());
    setNoteSearchValue("");
    setDialogMode("create");
  };

  // Open view dialog
  const handleOpenView = (product: Product) => {
    setSelectedProduct(product);
    setDialogMode("view");
    // Remove "new" badge when viewing
    if (newProductIds.has(product.id)) {
      setNewProductIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  };

  // Open edit dialog
  const handleOpenEdit = async (product: Product) => {
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
    // Load product notes
    try {
      const productNotes = await productService.getProductNotes(product.id);
      setSelectedNoteIds(new Set(productNotes.map(pn => pn.noteId)));
    } catch (error) {
      console.error("Error loading product notes:", error);
      setSelectedNoteIds(new Set());
    }
    setNoteSearchValue("");
    setDialogMode("edit");
    // Remove badges when editing
    setNewProductIds(prev => { const next = new Set(prev); next.delete(product.id); return next; });
    setUpdatedProductIds(prev => { const next = new Set(prev); next.delete(product.id); return next; });
  };

  // Open toppings management dialog (show assigned groups)
  const handleOpenToppings = async (product: Product) => {
    setSelectedProduct(product);
    setDialogMode("toppings");
    setLoadingToppings(true);
    setNewGroupName("");
    setNewGroupRequired(false);
    setNewGroupMinSelection(0);
    setNewGroupMaxSelection(1);
    setAddingToppingToGroupId(null);
    setShowQuickCreateTopping(false);
    try {
      const [toppings, assignedGroups, allGroups] = await Promise.all([
        productService.getAvailableToppings(filterBrandId),
        productService.getProductToppingGroups(product.id),
        productService.getAllToppingGroups(filterBrandId),
      ]);
      setAvailableToppings(toppings);
      setToppingGroups(assignedGroups);
      setAllToppingGroups(allGroups);
      // Set assigned group IDs
      setAssignedGroupIds(new Set(assignedGroups.map(g => g.id)));
      // Expand all assigned groups by default
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
      // Add to all groups list
      setAllToppingGroups(prev => [newGroup, ...prev]);
      // Mark as assigned
      setAssignedGroupIds(prev => new Set([...prev, newGroup.id]));
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

  // Toggle topping group assignment to product
  const handleToggleGroupAssignment = async (groupId: string, isAssigned: boolean) => {
    if (!selectedProduct) return;
    setSavingToppings(true);
    try {
      let result: ToppingGroup[];
      if (isAssigned) {
        // Unassign group from product
        result = await productService.removeToppingGroupFromProduct(selectedProduct.id, groupId);
        setAssignedGroupIds(prev => {
          const next = new Set(prev);
          next.delete(groupId);
          return next;
        });
      } else {
        // Assign group to product
        result = await productService.addToppingGroupToProduct(selectedProduct.id, groupId);
        setAssignedGroupIds(prev => new Set([...prev, groupId]));
        // Expand the newly assigned group
        setExpandedGroups(prev => new Set([...prev, groupId]));
      }
      setToppingGroups(result);
      toast({
        title: "Thành công",
        description: isAssigned ? "Đã gỡ nhóm topping khỏi món" : "Đã gán nhóm topping vào món"
      });
    } catch (error: any) {
      console.error("Error toggling group assignment:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setSavingToppings(false);
    }
  };

  // Quick create topping and add to group
  const handleQuickCreateTopping = async (groupId: string) => {
    if (!quickToppingName.trim()) return;
    setCreatingQuickTopping(true);
    try {
      // Create new topping product (categoryId will be auto-assigned by backend)
      const newTopping = await productService.create({
        name: quickToppingName.trim(),
        type: ProductType.TOPPING,
        price: quickToppingPrice || 0,
        vatRate: quickToppingVat || 0,
      });
      // Add to group
      await productService.addToppingItem(groupId, {
        toppingId: newTopping.id,
        priceAdjustment: 0,
        maxQuantity: 5,
      });
      // Refresh data
      const [toppings, assignedGroups] = await Promise.all([
        productService.getAvailableToppings(filterBrandId),
        selectedProduct ? productService.getProductToppingGroups(selectedProduct.id) : Promise.resolve([]),
      ]);
      setAvailableToppings(toppings);
      setToppingGroups(assignedGroups);
      // Reset quick create form
      setQuickToppingName("");
      setQuickToppingPrice(0);
      setQuickToppingVat(0);
      setShowQuickCreateTopping(false);
      setAddingToppingToGroupId(null);
      toast({ title: "Thành công", description: `Đã tạo và thêm "${quickToppingName}" vào nhóm` });
    } catch (error: any) {
      console.error("Error creating topping:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setCreatingQuickTopping(false);
    }
  };

  // Create note and add to selection
  const handleCreateNote = async (noteName: string) => {
    if (!noteName.trim()) return;
    setCreatingNote(true);
    try {
      const newNote = await productService.createNote({ name: noteName.trim() });
      setAvailableNotes(prev => [...prev, newNote]);
      setSelectedNoteIds(prev => new Set([...prev, newNote.id]));
      setNoteSearchValue("");
      toast({ title: "Thành công", description: `Đã tạo ghi chú "${noteName}"` });
    } catch (error: any) {
      console.error("Error creating note:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setCreatingNote(false);
    }
  };

  // Toggle note selection
  const handleToggleNote = (noteId: string) => {
    setSelectedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  // Filter notes for selection
  const filteredNotes = availableNotes.filter(note =>
    note.name.toLowerCase().includes(noteSearchValue.toLowerCase())
  );

  // Check if search value is a new note
  const isNewNote = noteSearchValue.trim() &&
    !availableNotes.some(n => n.name.toLowerCase() === noteSearchValue.toLowerCase());

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
    dispatch(invalidateCategoriesCache());
    dispatch(fetchCategories(filterBrandId));
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

  // Filter units for bulk operation combobox
  const filteredBulkUnits = units.filter(unit =>
    unit.name.toLowerCase().includes(bulkUnit.toLowerCase())
  );

  // Check if bulk unit is a new unit
  const isBulkNewUnit = bulkUnit.trim() &&
    !units.some(u => u.name.toLowerCase() === bulkUnit.toLowerCase());

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

    // Check if category is provided (either selected or will be created)
    if (!formData.categoryId && !categorySearchValue.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng chọn hoặc nhập danh mục cho món", variant: "destructive" });
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

      if (dialogMode === "create") {
        const result = await productService.create(preparedData);
        // Assign notes to the new product
        if (selectedNoteIds.size > 0) {
          try {
            await productService.assignNotesToProduct(result.id, Array.from(selectedNoteIds));
          } catch (error) {
            console.error("Error assigning notes:", error);
          }
        }
        setProducts((prev) => [result, ...prev]);
        // Mark as new product
        setNewProductIds((prev) => new Set(prev).add(result.id));
        toast({ title: "Thành công", description: `Đã tạo món "${result.name}" với mã ${result.code}` });
        if (continueCreating) {
          // Reset form for next creation
          setFormData(initialFormData);
          setCategorySearchValue("");
          setUnitSearchValue("");
          setSelectedNoteIds(new Set());
          setNoteSearchValue("");
        } else {
          handleCloseDialog();
        }
      } else if (dialogMode === "edit" && selectedProduct) {
        const result = await productService.update(selectedProduct.id, preparedData);
        // Update notes assignment
        try {
          await productService.assignNotesToProduct(selectedProduct.id, Array.from(selectedNoteIds));
        } catch (error) {
          console.error("Error assigning notes:", error);
        }
        setProducts((prev) => prev.map((p) => (p.id === selectedProduct.id ? result : p)));
        setUpdatedProductIds(prev => new Set([...prev, result.id]));
        setNewProductIds(prev => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
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
    setSelectedNoteIds(new Set());
    setNoteSearchValue("");
    setAvailableToppings([]);
    setToppingGroups([]);
    setAllToppingGroups([]);
    setAssignedGroupIds(new Set());
    setExpandedGroups(new Set());
    setNewGroupName("");
    setNewGroupRequired(false);
    setNewGroupMinSelection(0);
    setNewGroupMaxSelection(1);
    setAddingToGroupId(null);
    setAddingToppingToGroupId(null);
    setShowQuickCreateTopping(false);
    setQuickToppingName("");
    setQuickToppingPrice(0);
    setQuickToppingVat(0);
    // Reset import state
    setImportData([]);
    setImportErrors([]);
  };

  // Export to Excel
  const handleExport = () => {
    if (products.length === 0) {
      toast({ title: "Thông báo", description: "Không có dữ liệu để xuất", variant: "destructive" });
      return;
    }

    // Transform data for export
    const exportData = products.map((product) => ({
      ...product,
      type: typeLabels[product.type]?.label || product.type,
      sellingType: product.sellingType === "weight" ? "Theo cân" : "Theo phần",
      printDish: product.printDish ? "Có" : "Không",
      printLabel: product.printLabel ? "Có" : "Không",
      printSeafood: product.printSeafood ? "Có" : "Không",
      isActive: product.isActive ? "Có" : "Không",
    }));

    exportToExcel(exportData, excelColumns, `danh_sach_mon_an_${new Date().toISOString().split("T")[0]}`);
    toast({ title: "Thành công", description: "Đã xuất file Excel" });
  };

  // Download template with dropdowns
  const handleDownloadTemplate = async () => {
    try {
      // Load categories and units
      await dispatch(fetchCategories(filterBrandId));
      const unitsData = await unitService.getAll(filterBrandId);

      // Wait for Redux state to update
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Build columns with dropdown options
      const columnsWithDropdowns: TemplateColumnWithDropdown[] = [
        { header: "ID", example: "(để trống nếu tạo mới)", required: false },
        { header: "Mã món", example: "(tự động tạo nếu mới)", required: false },
        { header: "Tên món", example: "Phở bò tái", required: true },
        {
          header: "Loại",
          example: "Đồ ăn",
          required: true,
          dropdown: [
            { value: "food", label: "Đồ ăn" },
            { value: "drink", label: "Đồ uống" },
            { value: "other", label: "Khác" },
            { value: "topping", label: "Topping" },
            { value: "combo", label: "Combo" },
          ],
          dropdownSheetName: "LoaiMon",
        },
        {
          header: "Danh mục",
          example: categories[0]?.name || "Món chính",
          required: false,
          dropdown: categories.map((c) => ({ value: c.id, label: c.name })),
          dropdownSheetName: "DanhMuc",
          allowCustomValue: true, // Cho phép nhập danh mục mới
        },
        { header: "Giá (VNĐ)", example: "50000", required: true },
        { header: "VAT (%)", example: "10", required: false },
        { header: "Giá vốn", example: "30000", required: false },
        {
          header: "Đơn vị",
          example: unitsData[0]?.name || "phần",
          required: false,
          dropdown: unitsData.map((u) => ({ value: u.name, label: u.name })),
          dropdownSheetName: "DonVi",
          allowCustomValue: true, // Cho phép nhập đơn vị mới
        },
        { header: "Mô tả", example: "Phở bò tái thơm ngon", required: false },
        { header: "Thời gian CB (phút)", example: "15", required: false },
        {
          header: "Loại bán",
          example: "Theo phần",
          required: false,
          dropdown: [
            { value: "portion", label: "Theo phần" },
            { value: "weight", label: "Theo cân" },
          ],
          dropdownSheetName: "LoaiBan",
        },
        { header: "URL Hình ảnh", example: "https://example.com/image.jpg", required: false },
      ];

      await downloadTemplateWithRealDropdowns(columnsWithDropdowns, "mau_import_mon_an", 100);
      toast({ title: "Thành công", description: "Đã tải file mẫu với dropdown chọn sẵn" });
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể tải file mẫu", variant: "destructive" });
    }
  };

  // Handle file input change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await readExcelFile<ImportDataWithNames>(file, importColumnMapping);

      // Load categories if not available
      await dispatch(fetchCategories(filterBrandId));

      // Wait for Redux state to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Transform data: convert names to IDs
      const transformedData: Partial<BulkProductItem>[] = [];
      const lookupErrors: string[] = [...result.errors];

      for (let i = 0; i < result.data.length; i++) {
        const item = result.data[i];
        const rowNumber = i + 2; // Excel row (1-indexed + header)

        // Convert type string from Excel
        const typeStr = String(item.typeName || "").toLowerCase();
        let productType: ProductType | undefined;
        if (typeStr === "đồ ăn" || typeStr === "food") productType = ProductType.FOOD;
        else if (typeStr === "đồ uống" || typeStr === "drink") productType = ProductType.DRINK;
        else if (typeStr === "khác" || typeStr === "other") productType = ProductType.OTHER;
        else if (typeStr === "topping") productType = ProductType.TOPPING;
        else if (typeStr === "combo") productType = ProductType.COMBO;
        else if (typeStr) {
          lookupErrors.push(`Dòng ${rowNumber}: Loại món không hợp lệ "${item.typeName}"`);
        }

        // Convert selling type string
        const sellingTypeStr = String(item.sellingType || "").toLowerCase();
        let sellingType: SellingType | undefined;
        if (sellingTypeStr === "theo phần" || sellingTypeStr === "portion") sellingType = SellingType.PORTION;
        else if (sellingTypeStr === "theo cân" || sellingTypeStr === "weight") sellingType = SellingType.WEIGHT;

        const transformedItem: Partial<BulkProductItem> = {
          id: item.id,
          code: item.code,
          name: item.name,
          type: productType,
          price: item.price ? Number(item.price) : undefined,
          vatRate: item.vatRate ? Number(item.vatRate) : undefined,
          costPrice: item.costPrice ? Number(item.costPrice) : undefined,
          unit: item.unit,
          description: item.description,
          imageUrl: item.imageUrl,
          preparationTime: item.preparationTime ? Number(item.preparationTime) : undefined,
          sellingType,
        };

        // Lookup category ID from name
        if (item.categoryName) {
          const category = categories.find(
            (c) => c.name?.toLowerCase() === item.categoryName?.toLowerCase()
          );
          if (category) {
            transformedItem.categoryId = category.id;
          } else {
            // Will create new category if doesn't exist
            transformedItem.categoryName = item.categoryName;
          }
        }

        transformedData.push(transformedItem);
      }

      setImportData(transformedData);
      setImportErrors(lookupErrors);
      setDialogMode("import");
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message || "Không thể đọc file Excel", variant: "destructive" });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle import
  const handleImport = async () => {
    if (importData.length === 0) {
      toast({ title: "Lỗi", description: "Không có dữ liệu để import", variant: "destructive" });
      return;
    }

    if (!filterBrandId) {
      toast({ title: "Lỗi", description: "Vui lòng chọn thương hiệu trước khi import", variant: "destructive" });
      return;
    }

    // Validate required fields for new products
    const newProducts = importData.filter((d) => !d.id);
    const invalidProducts = newProducts.filter((d) => !d.name || !d.type || d.price === undefined);
    if (invalidProducts.length > 0) {
      toast({
        title: "Lỗi",
        description: `Có ${invalidProducts.length} sản phẩm mới thiếu thông tin bắt buộc (tên, loại, giá)`,
        variant: "destructive"
      });
      return;
    }

    try {
      setImporting(true);
      const result = await productService.bulkImport(importData as BulkProductItem[], filterBrandId);

      if (result.errors.length > 0) {
        toast({
          title: "Hoàn thành với lỗi",
          description: `Tạo mới: ${result.created}, Cập nhật: ${result.updated}, Lỗi: ${result.errors.length}`,
          variant: "destructive",
        });
        setImportErrors(result.errors.map((e) => `Dòng ${e.row}: ${e.message}`));
      } else {
        toast({
          title: "Thành công",
          description: `Đã tạo mới ${result.created} và cập nhật ${result.updated} món ăn`,
        });
        handleCloseDialog();
        loadProducts(filterBrandId);
      }
    } catch (error: any) {
      console.error("Error importing:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra khi import", variant: "destructive" });
    } finally {
      setImporting(false);
    }
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

  // Filter and sort products
  const filteredProducts = React.useMemo(() => {
    // First filter
    let result = products.filter((p) => {
      // Search filter
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code?.toLowerCase().includes(search.toLowerCase());

      // Brand filter
      const matchesBrand = filterBrandId === "all" || p.brandId === filterBrandId;

      // Type filter (multi-select)
      const matchesType = typeFilter.size === 0 || typeFilter.has(p.type);

      // Category filter (multi-select)
      const matchesCategory = categoryFilter.size === 0 || categoryFilter.has(p.categoryId || "");

      // VAT filter
      const matchesVat = vatFilter === "all" ||
        (vatFilter === "has_vat" && (p.vatRate || 0) > 0) ||
        (vatFilter === "no_vat" && (p.vatRate || 0) === 0);

      // Unit filter
      const matchesUnit = unitFilter === "all" || p.unit === unitFilter;

      // Print Dish filter
      const matchesPrintDish = printDishFilter === "all" ||
        (printDishFilter === "yes" && p.printDish) ||
        (printDishFilter === "no" && !p.printDish);

      // Print Label filter
      const matchesPrintLabel = printLabelFilter === "all" ||
        (printLabelFilter === "yes" && p.printLabel) ||
        (printLabelFilter === "no" && !p.printLabel);

      // Print Seafood filter
      const matchesPrintSeafood = printSeafoodFilter === "all" ||
        (printSeafoodFilter === "yes" && p.printSeafood) ||
        (printSeafoodFilter === "no" && !p.printSeafood);

      // Selling Type filter
      const matchesSellingType = sellingTypeFilter === "all" || p.sellingType === sellingTypeFilter;

      // Status filter
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && p.isActive) ||
        (statusFilter === "inactive" && !p.isActive);

      return matchesSearch && matchesBrand && matchesType && matchesCategory &&
        matchesVat && matchesUnit && matchesPrintDish && matchesPrintLabel &&
        matchesPrintSeafood && matchesSellingType && matchesStatus;
    });

    // Then sort
    result.sort((a, b) => {
      let aValue: any = a[sortKey as keyof Product];
      let bValue: any = b[sortKey as keyof Product];

      // Handle special cases
      if (sortKey === "createdAt") {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      } else if (sortKey === "price" || sortKey === "costPrice" || sortKey === "vatRate") {
        aValue = aValue || 0;
        bValue = bValue || 0;
      } else if (sortKey === "isActive") {
        aValue = a.isActive ? 1 : 0;
        bValue = b.isActive ? 1 : 0;
      } else if (sortKey === "categoryName") {
        aValue = (a.categoryName || getCategoryName(a.categoryId) || "").toLowerCase();
        bValue = (b.categoryName || getCategoryName(b.categoryId) || "").toLowerCase();
      } else if (typeof aValue === "string") {
        aValue = (aValue || "").toLowerCase();
        bValue = (bValue || "").toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [products, search, filterBrandId, typeFilter, categoryFilter, vatFilter, unitFilter,
      printDishFilter, printLabelFilter, printSeafoodFilter, sellingTypeFilter, statusFilter,
      sortKey, sortDirection, getCategoryName]);

  // Bulk selection derived state (must be after filteredProducts)
  const isAllSelected = filteredProducts.length > 0 && selectedProductIds.size === filteredProducts.length;
  const isSomeSelected = selectedProductIds.size > 0 && selectedProductIds.size < filteredProducts.length;

  // Handle select all/none
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
    } else {
      setSelectedProductIds(new Set());
    }
  };

  // Handle select single product
  const handleSelectProduct = (productId: string, checked: boolean) => {
    const newSet = new Set(selectedProductIds);
    if (checked) {
      newSet.add(productId);
    } else {
      newSet.delete(productId);
    }
    setSelectedProductIds(newSet);
  };

  // Bulk operation handlers
  const handleCloseBulkDialog = () => {
    setBulkOperation(null);
    setBulkCategoryId("");
    setBulkVatRate(10);
    setBulkPrice(0);
    setBulkPrintValue(true);
    setBulkUnit("");
    setBulkSellingType(SellingType.PORTION);
    setBulkPreparationTime(0);
    setBulkResult(null);
  };

  const handleBulkOperation = async () => {
    if (selectedProductIds.size === 0) return;

    const productIds = Array.from(selectedProductIds);
    setProcessingBulk(true);

    try {
      let result: ProductBulkOperationResult;

      switch (bulkOperation) {
        case "category":
          if (!bulkCategoryId) {
            toast({ title: "Lỗi", description: "Vui lòng chọn danh mục", variant: "destructive" });
            setProcessingBulk(false);
            return;
          }
          result = await bulkProductService.updateCategory(productIds, bulkCategoryId);
          break;
        case "activate":
          result = await bulkProductService.toggleActive(productIds, true);
          break;
        case "deactivate":
          result = await bulkProductService.toggleActive(productIds, false);
          break;
        case "delete":
          result = await bulkProductService.delete(productIds);
          break;
        case "vat":
          result = await bulkProductService.updateVatRate(productIds, bulkVatRate);
          break;
        case "price":
          if (bulkPrice <= 0) {
            toast({ title: "Lỗi", description: "Vui lòng nhập giá hợp lệ", variant: "destructive" });
            setProcessingBulk(false);
            return;
          }
          result = await bulkProductService.updatePrice(productIds, bulkPrice);
          break;
        case "print-label":
          result = await bulkProductService.updatePrintLabel(productIds, bulkPrintValue);
          break;
        case "print-seafood":
          result = await bulkProductService.updatePrintSeafood(productIds, bulkPrintValue);
          break;
        case "print-dish":
          result = await bulkProductService.updatePrintDish(productIds, bulkPrintValue);
          break;
        case "unit":
          if (!bulkUnit.trim()) {
            toast({ title: "Lỗi", description: "Vui lòng chọn hoặc nhập đơn vị", variant: "destructive" });
            setProcessingBulk(false);
            return;
          }
          // Get or create unit if it doesn't exist
          const unitName = await getOrCreateUnit(bulkUnit.trim());
          result = await bulkProductService.updateUnit(productIds, unitName);
          break;
        case "selling-type":
          result = await bulkProductService.updateSellingType(productIds, bulkSellingType);
          break;
        case "preparation-time":
          result = await bulkProductService.updatePreparationTime(productIds, bulkPreparationTime);
          break;
        default:
          return;
      }

      toast({
        title: "Thành công",
        description: `Đã thực hiện thành công ${result.success}/${selectedProductIds.size} món ăn`,
      });

      // Reload products and clear selection
      loadProducts(filterBrandId, filterBranchId);
      setSelectedProductIds(new Set());
      handleCloseBulkDialog();
    } catch (error: any) {
      console.error("Bulk operation error:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    } finally {
      setProcessingBulk(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý món ăn</h1>
          <p className="text-muted-foreground">Thêm, sửa và quản lý menu món ăn theo thương hiệu</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Xuất Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadTemplate}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Tải file mẫu
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Import từ Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm món ăn
          </Button>
        </div>
      </div>

      {/* Hidden file input for Excel import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls"
        className="hidden"
      />

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
              <div className="relative w-48">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {/* Filter Popover */}
              <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Bộ lọc
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                        {[
                          typeFilter.size > 0 ? 1 : 0,
                          categoryFilter.size > 0 ? 1 : 0,
                          vatFilter !== "all" ? 1 : 0,
                          unitFilter !== "all" ? 1 : 0,
                          printDishFilter !== "all" ? 1 : 0,
                          printLabelFilter !== "all" ? 1 : 0,
                          printSeafoodFilter !== "all" ? 1 : 0,
                          sellingTypeFilter !== "all" ? 1 : 0,
                          statusFilter !== "all" ? 1 : 0,
                        ].reduce((a, b) => a + b, 0)}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96" align="end">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Bộ lọc</h4>
                        {hasActiveFilters && (
                          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8 px-2 text-xs">
                            <X className="mr-1 h-3 w-3" />
                            Xóa tất cả
                          </Button>
                        )}
                      </div>

                      {/* Type Filter - Multi-select */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Loại món ăn</Label>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(typeLabels).map(([type, { label, color }]) => (
                            <Badge
                              key={type}
                              variant={typeFilter.has(type) ? "default" : "outline"}
                              className={cn(
                                "cursor-pointer transition-colors",
                                typeFilter.has(type) ? color : "hover:bg-muted"
                              )}
                              onClick={() => toggleTypeFilter(type)}
                            >
                              {typeFilter.has(type) && <Check className="mr-1 h-3 w-3" />}
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Category Filter - Multi-select */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Danh mục món ăn</Label>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                          {categories.filter(c => c.isActive).map((cat) => (
                            <Badge
                              key={cat.id}
                              variant={categoryFilter.has(cat.id) ? "default" : "outline"}
                              className="cursor-pointer transition-colors hover:bg-muted"
                              onClick={() => toggleCategoryFilter(cat.id)}
                            >
                              {categoryFilter.has(cat.id) && <Check className="mr-1 h-3 w-3" />}
                              {cat.name}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* VAT Filter */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">VAT</Label>
                        <Select value={vatFilter} onValueChange={setVatFilter}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Tất cả" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="has_vat">Có VAT</SelectItem>
                            <SelectItem value="no_vat">Không VAT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Unit Filter */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Đơn vị</Label>
                        <Select value={unitFilter} onValueChange={setUnitFilter}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Tất cả" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            {uniqueUnits.map((unit) => (
                              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Print Dish Filter */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">In món</Label>
                        <Select value={printDishFilter} onValueChange={setPrintDishFilter}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Tất cả" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="yes">Có</SelectItem>
                            <SelectItem value="no">Không</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Print Label Filter */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">In tem</Label>
                        <Select value={printLabelFilter} onValueChange={setPrintLabelFilter}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Tất cả" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="yes">Có</SelectItem>
                            <SelectItem value="no">Không</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Print Seafood Filter */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">In hồ hải sản</Label>
                        <Select value={printSeafoodFilter} onValueChange={setPrintSeafoodFilter}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Tất cả" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="yes">Có</SelectItem>
                            <SelectItem value="no">Không</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Selling Type Filter */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Loại bán</Label>
                        <Select value={sellingTypeFilter} onValueChange={setSellingTypeFilter}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Tất cả" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="portion">Theo phần</SelectItem>
                            <SelectItem value="weight">Theo cân</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Status Filter */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Trạng thái</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Tất cả" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="active">Hoạt động</SelectItem>
                            <SelectItem value="inactive">Tạm ngưng</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
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
            <>
              {/* Selection bar with bulk actions */}
              {selectedProductIds.size > 0 && (
                <div className="flex items-center justify-between bg-muted/50 px-4 py-2 rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                      {...(isSomeSelected ? { "data-state": "indeterminate" } : {})}
                    />
                    <span className="text-sm font-medium">
                      Đã chọn {selectedProductIds.size} món ăn
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Thao tác hàng loạt
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => setBulkOperation("category")}>
                        <Tag className="mr-2 h-4 w-4" />
                        Chuyển danh mục
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setBulkOperation("vat")}>
                        <Percent className="mr-2 h-4 w-4" />
                        Cập nhật VAT
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setBulkOperation("price")}>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Chỉnh sửa giá
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setBulkOperation("print-dish")}>
                        <Printer className="mr-2 h-4 w-4" />
                        Cập nhật In món
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setBulkOperation("print-label")}>
                        <Printer className="mr-2 h-4 w-4" />
                        Cập nhật In tem
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setBulkOperation("print-seafood")}>
                        <Printer className="mr-2 h-4 w-4" />
                        Cập nhật In hồ hải sản
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setBulkOperation("unit")}>
                        <Scale className="mr-2 h-4 w-4" />
                        Cập nhật Đơn vị
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setBulkOperation("selling-type")}>
                        <UtensilsCrossed className="mr-2 h-4 w-4" />
                        Cập nhật Loại bán
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setBulkOperation("preparation-time")}>
                        <Clock className="mr-2 h-4 w-4" />
                        Cập nhật Thời gian chế biến
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setBulkOperation("activate")}>
                        <Power className="mr-2 h-4 w-4 text-green-600" />
                        Kích hoạt tất cả
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setBulkOperation("deactivate")}>
                        <Power className="mr-2 h-4 w-4 text-orange-500" />
                        Tạm ngưng tất cả
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setBulkOperation("delete")} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Xóa tất cả
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                      {...(isSomeSelected ? { "data-state": "indeterminate" } : {})}
                    />
                  </TableHead>
                  {isColumnVisible("image") && <TableHead className="w-[50px]">Ảnh</TableHead>}
                  {isColumnVisible("code") && (
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("code")}>
                      <div className="flex items-center">Mã{getSortIcon("code")}</div>
                    </TableHead>
                  )}
                  {isColumnVisible("name") && (
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("name")}>
                      <div className="flex items-center">Tên món{getSortIcon("name")}</div>
                    </TableHead>
                  )}
                  {isColumnVisible("type") && (
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("type")}>
                      <div className="flex items-center">Loại{getSortIcon("type")}</div>
                    </TableHead>
                  )}
                  {isColumnVisible("categoryName") && (
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("categoryName")}>
                      <div className="flex items-center">Danh mục{getSortIcon("categoryName")}</div>
                    </TableHead>
                  )}
                  {isColumnVisible("price") && (
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50 text-right" onClick={() => handleSort("price")}>
                      <div className="flex items-center justify-end">Giá (đã VAT){getSortIcon("price")}</div>
                    </TableHead>
                  )}
                  {isColumnVisible("priceBeforeVat") && <TableHead className="text-right">Giá trước VAT</TableHead>}
                  {isColumnVisible("vatAmount") && <TableHead className="text-right">Tiền thuế VAT</TableHead>}
                  {isColumnVisible("vatRate") && (
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50 text-right" onClick={() => handleSort("vatRate")}>
                      <div className="flex items-center justify-end">VAT (%){getSortIcon("vatRate")}</div>
                    </TableHead>
                  )}
                  {isColumnVisible("costPrice") && (
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50 text-right" onClick={() => handleSort("costPrice")}>
                      <div className="flex items-center justify-end">Giá vốn{getSortIcon("costPrice")}</div>
                    </TableHead>
                  )}
                  {isColumnVisible("description") && <TableHead>Mô tả</TableHead>}
                  {isColumnVisible("preparationTime") && <TableHead>Thời gian CB</TableHead>}
                  {isColumnVisible("sellingType") && (
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("sellingType")}>
                      <div className="flex items-center">Loại bán{getSortIcon("sellingType")}</div>
                    </TableHead>
                  )}
                  {isColumnVisible("unit") && (
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("unit")}>
                      <div className="flex items-center">Đơn vị{getSortIcon("unit")}</div>
                    </TableHead>
                  )}
                  {isColumnVisible("printDish") && <TableHead>In món</TableHead>}
                  {isColumnVisible("printLabel") && <TableHead>In tem</TableHead>}
                  {isColumnVisible("printSeafood") && <TableHead>In hải sản</TableHead>}
                  {isColumnVisible("isActive") && (
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("isActive")}>
                      <div className="flex items-center">Trạng thái{getSortIcon("isActive")}</div>
                    </TableHead>
                  )}
                  <TableHead className="w-[80px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className={selectedProductIds.has(product.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProductIds.has(product.id)}
                        onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                      />
                    </TableCell>
                    {isColumnVisible("image") && (
                      <TableCell>
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                    )}
                    {isColumnVisible("code") && <TableCell className="font-mono text-sm">{product.code}</TableCell>}
                    {isColumnVisible("name") && (
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {product.name}
                          {product.seasonalPrice && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs" title={product.seasonalPrice.seasonalPriceName}>
                              Giá thời vụ
                            </Badge>
                          )}
                          {newProductIds.has(product.id) && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">Mới</Badge>
                          )}
                          {updatedProductIds.has(product.id) && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">Cập nhật</Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible("type") && (
                      <TableCell>
                        <Badge className={typeLabels[product.type]?.color || ""}>
                          {typeLabels[product.type]?.label || product.type}
                        </Badge>
                      </TableCell>
                    )}
                    {isColumnVisible("categoryName") && <TableCell>{product.categoryName || getCategoryName(product.categoryId)}</TableCell>}
                    {isColumnVisible("price") && (
                      <TableCell className="text-right">
                        {product.seasonalPrice ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-medium text-orange-600">
                              {formatCurrency(product.seasonalPrice.adjustedPrice)}
                            </span>
                            <span className="text-xs text-muted-foreground line-through">
                              {formatCurrency(product.price)}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-orange-50 text-orange-600 border-orange-200">
                              {product.seasonalPrice.adjustmentType === 'percentage'
                                ? `+${product.seasonalPrice.adjustmentValue}%`
                                : `+${formatCurrency(product.seasonalPrice.adjustmentValue)}`}
                            </Badge>
                          </div>
                        ) : (
                          formatCurrency(product.price)
                        )}
                      </TableCell>
                    )}
                    {isColumnVisible("priceBeforeVat") && <TableCell className="text-right">{formatCurrency(Math.round(product.price / (1 + (product.vatRate || 10) / 100)))}</TableCell>}
                    {isColumnVisible("vatAmount") && <TableCell className="text-right">{formatCurrency(Math.round(product.price - product.price / (1 + (product.vatRate || 10) / 100)))}</TableCell>}
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Operation Dialog */}
      <Dialog open={bulkOperation !== null} onOpenChange={(open) => !open && handleCloseBulkDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {bulkOperation === "category" && "Chuyển danh mục"}
              {bulkOperation === "activate" && "Kích hoạt món ăn"}
              {bulkOperation === "deactivate" && "Tạm ngưng món ăn"}
              {bulkOperation === "delete" && "Xóa món ăn"}
              {bulkOperation === "vat" && "Cập nhật VAT"}
              {bulkOperation === "price" && "Chỉnh sửa giá"}
              {bulkOperation === "print-label" && "Cập nhật In tem"}
              {bulkOperation === "print-seafood" && "Cập nhật In hồ hải sản"}
              {bulkOperation === "print-dish" && "Cập nhật In món"}
              {bulkOperation === "unit" && "Cập nhật Đơn vị"}
              {bulkOperation === "selling-type" && "Cập nhật Loại bán"}
              {bulkOperation === "preparation-time" && "Cập nhật Thời gian chế biến"}
            </DialogTitle>
            <DialogDescription>
              Thao tác sẽ áp dụng cho {selectedProductIds.size} món ăn đã chọn
            </DialogDescription>
          </DialogHeader>

          {/* Category selection */}
          {bulkOperation === "category" && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Chọn danh mục mới</Label>
                <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.isActive).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* VAT selection */}
          {bulkOperation === "vat" && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nhập mức VAT (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  placeholder="Nhập % VAT..."
                  value={bulkVatRate}
                  onChange={(e) => setBulkVatRate(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Nhập giá trị từ 0 đến 100. Ví dụ: 0, 5, 8, 10...
                </p>
              </div>
            </div>
          )}

          {/* Price input */}
          {bulkOperation === "price" && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nhập giá mới (đã bao gồm VAT)</Label>
                <Input
                  type="number"
                  placeholder="Nhập giá..."
                  value={bulkPrice || ""}
                  onChange={(e) => setBulkPrice(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Giá này sẽ được áp dụng cho tất cả món ăn đã chọn
                </p>
              </div>
            </div>
          )}

          {/* Print options (label, seafood, dish) */}
          {(bulkOperation === "print-label" || bulkOperation === "print-seafood" || bulkOperation === "print-dish") && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>
                  {bulkOperation === "print-label" && "In tem"}
                  {bulkOperation === "print-seafood" && "In hồ hải sản"}
                  {bulkOperation === "print-dish" && "In món"}
                </Label>
                <Select value={String(bulkPrintValue)} onValueChange={(v) => setBulkPrintValue(v === "true")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Có</SelectItem>
                    <SelectItem value="false">Không</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Unit input */}
          {bulkOperation === "unit" && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Chọn hoặc tạo đơn vị</Label>
                <Popover open={bulkUnitComboboxOpen} onOpenChange={setBulkUnitComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={bulkUnitComboboxOpen}
                      className="w-full justify-between font-normal"
                    >
                      {bulkUnit || "Chọn đơn vị..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Tìm hoặc tạo đơn vị..."
                        value={bulkUnit}
                        onValueChange={setBulkUnit}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {bulkUnit.trim() ? (
                            <div className="py-2 px-4 text-sm">
                              <span className="text-muted-foreground">Nhấn để tạo: </span>
                              <span className="font-medium">&quot;{bulkUnit}&quot;</span>
                            </div>
                          ) : (
                            <div className="py-2 px-4 text-sm text-muted-foreground">
                              Nhập tên đơn vị để tìm hoặc tạo mới
                            </div>
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {/* Option to create new unit if not exists */}
                          {isBulkNewUnit && (
                            <CommandItem
                              value={`create-${bulkUnit}`}
                              onSelect={() => {
                                setBulkUnitComboboxOpen(false);
                              }}
                              className="text-primary"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Tạo mới: &quot;{bulkUnit}&quot;
                            </CommandItem>
                          )}
                          {filteredBulkUnits.map((unit) => (
                            <CommandItem
                              key={unit.id}
                              value={unit.name}
                              onSelect={() => {
                                setBulkUnit(unit.name);
                                setBulkUnitComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  bulkUnit === unit.name ? "opacity-100" : "opacity-0"
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
                {isBulkNewUnit && (
                  <p className="text-xs text-muted-foreground">
                    Đơn vị &quot;{bulkUnit}&quot; sẽ được tạo tự động khi cập nhật
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Selling type selection */}
          {bulkOperation === "selling-type" && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Chọn loại bán</Label>
                <Select value={bulkSellingType} onValueChange={(v) => setBulkSellingType(v as SellingType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại bán..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SellingType.PORTION}>Theo phần</SelectItem>
                    <SelectItem value={SellingType.WEIGHT}>Theo cân</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Preparation time input */}
          {bulkOperation === "preparation-time" && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nhập thời gian chế biến (phút)</Label>
                <Input
                  type="number"
                  placeholder="Nhập số phút..."
                  value={bulkPreparationTime || ""}
                  onChange={(e) => setBulkPreparationTime(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* Activate/Deactivate confirmation */}
          {(bulkOperation === "activate" || bulkOperation === "deactivate") && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Bạn có chắc chắn muốn <strong>{bulkOperation === "activate" ? "kích hoạt" : "tạm ngưng"}</strong> {selectedProductIds.size} món ăn đã chọn?
              </p>
            </div>
          )}

          {/* Delete confirmation */}
          {bulkOperation === "delete" && (
            <div className="py-4">
              <p className="text-sm text-destructive">
                Bạn có chắc chắn muốn <strong>xóa</strong> {selectedProductIds.size} món ăn đã chọn?
                <br />
                <span className="text-xs">Hành động này không thể hoàn tác.</span>
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseBulkDialog}>
              Hủy
            </Button>
            <Button
              onClick={handleBulkOperation}
              disabled={processingBulk}
              variant={bulkOperation === "delete" ? "destructive" : "default"}
            >
              {processingBulk && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {/* Image and Name Row */}
              <div className="grid grid-cols-[150px_1fr] gap-4">
                <div className="grid gap-2">
                  <Label>Hình ảnh</Label>
                  <ImageUpload
                    value={formData.imageUrl}
                    onChange={(url) => setFormData({ ...formData, imageUrl: url })}
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
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
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
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formData.price ? new Intl.NumberFormat("vi-VN").format(Math.floor(formData.price)) : ""}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\./g, "");
                      const numValue = parseInt(rawValue, 10);
                      setFormData({ ...formData, price: isNaN(numValue) ? 0 : numValue });
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
                    type="text"
                    inputMode="numeric"
                    placeholder="30.000"
                    value={formData.costPrice ? new Intl.NumberFormat("vi-VN").format(Math.floor(formData.costPrice)) : ""}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\./g, "");
                      const numValue = parseInt(rawValue, 10);
                      setFormData({ ...formData, costPrice: isNaN(numValue) ? 0 : numValue });
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
                                <button
                                  type="button"
                                  className="ml-1 hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleNote(noteId);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </button>
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
                          {/* Option to create new note */}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quản lý Topping - {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              Chọn nhóm topping có sẵn hoặc tạo nhóm mới để gán vào món
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

                {/* All topping groups with checkboxes */}
                {allToppingGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Cherry className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Chưa có nhóm topping nào</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tạo nhóm mới ở trên để bắt đầu
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Danh sách nhóm topping</Label>
                      <span className="text-xs text-muted-foreground">
                        Đã chọn {assignedGroupIds.size}/{allToppingGroups.length} nhóm
                      </span>
                    </div>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {allToppingGroups.map((group) => {
                          const isAssigned = assignedGroupIds.has(group.id);
                          // Get the group data with items from toppingGroups if assigned
                          const groupWithItems = toppingGroups.find(g => g.id === group.id) || group;

                          return (
                            <div
                              key={group.id}
                              className={cn(
                                "border rounded-lg transition-colors",
                                isAssigned ? "border-primary bg-primary/5" : "border-border"
                              )}
                            >
                              {/* Group header with checkbox */}
                              <div
                                className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                                onClick={() => toggleGroupExpanded(group.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={isAssigned}
                                    onCheckedChange={() => handleToggleGroupAssignment(group.id, isAssigned)}
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={savingToppings}
                                  />
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
                                    • {groupWithItems.items?.length || 0} item
                                  </span>
                                </div>
                              </div>

                              {/* Group items - only show if expanded */}
                              {expandedGroups.has(group.id) && (
                                <div className="border-t p-3 space-y-2">
                                  {/* Topping items */}
                                  {groupWithItems.items?.length > 0 ? (
                                    groupWithItems.items.map((item) => (
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
                                    ))
                                  ) : (
                                    <p className="text-xs text-muted-foreground py-2">
                                      Chưa có topping nào trong nhóm này
                                    </p>
                                  )}

                                  {/* Add topping section */}
                                  {addingToppingToGroupId === group.id ? (
                                    <div className="p-3 border rounded-lg bg-background space-y-3">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-xs font-medium">Thêm topping vào nhóm</Label>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-xs"
                                          onClick={() => {
                                            setAddingToppingToGroupId(null);
                                            setShowQuickCreateTopping(false);
                                          }}
                                        >
                                          Đóng
                                        </Button>
                                      </div>

                                      {/* Available toppings list */}
                                      <div className="max-h-32 overflow-y-auto space-y-1">
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
                                        {getAvailableToppingsForGroup(group.id).length === 0 && !showQuickCreateTopping && (
                                          <p className="text-xs text-muted-foreground p-2 text-center">
                                            Không còn topping nào có sẵn
                                          </p>
                                        )}
                                      </div>

                                      {/* Quick create topping */}
                                      {showQuickCreateTopping ? (
                                        <div className="space-y-2 border-t pt-3">
                                          <Label className="text-xs">Tạo nhanh topping mới</Label>
                                          <div className="flex gap-2">
                                            <Input
                                              placeholder="Tên topping"
                                              value={quickToppingName}
                                              onChange={(e) => setQuickToppingName(e.target.value)}
                                              className="flex-1"
                                            />
                                            <Input
                                              type="number"
                                              placeholder="Giá"
                                              value={quickToppingPrice || ""}
                                              onChange={(e) => setQuickToppingPrice(Number(e.target.value))}
                                              className="w-20"
                                            />
                                            <Input
                                              type="number"
                                              placeholder="VAT %"
                                              value={quickToppingVat || ""}
                                              onChange={(e) => setQuickToppingVat(Number(e.target.value))}
                                              className="w-16"
                                            />
                                            <Button
                                              size="sm"
                                              onClick={() => handleQuickCreateTopping(group.id)}
                                              disabled={!quickToppingName.trim() || creatingQuickTopping}
                                            >
                                              {creatingQuickTopping ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <Check className="h-4 w-4" />
                                              )}
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full"
                                          onClick={() => setShowQuickCreateTopping(true)}
                                        >
                                          <Plus className="h-4 w-4 mr-1" />
                                          Tạo topping mới
                                        </Button>
                                      )}
                                    </div>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full"
                                      onClick={() => setAddingToppingToGroupId(group.id)}
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Thêm topping vào nhóm
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
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

      {/* Import dialog */}
      <Dialog open={dialogMode === "import"} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import món ăn từ Excel</DialogTitle>
            <DialogDescription>
              Xem lại dữ liệu trước khi import. Các dòng có lỗi sẽ được đánh dấu màu đỏ.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {importErrors.length > 0 && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm font-medium text-destructive mb-2">Cảnh báo:</p>
                <ul className="text-xs text-destructive space-y-1 max-h-24 overflow-y-auto">
                  {importErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Tên món</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead className="text-right">Giá</TableHead>
                    <TableHead className="text-right">VAT (%)</TableHead>
                    <TableHead>Đơn vị</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.map((item, index) => {
                    const hasError = !item.name || !item.type || item.price === undefined;
                    return (
                      <TableRow key={index} className={hasError ? "bg-destructive/5" : ""}>
                        <TableCell className="font-mono text-xs">{index + 2}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.id ? (
                            <Badge variant="outline" className="font-mono">Cập nhật</Badge>
                          ) : (
                            <Badge variant="secondary">Tạo mới</Badge>
                          )}
                        </TableCell>
                        <TableCell className={!item.name ? "text-destructive" : ""}>
                          {item.name || <span className="italic text-muted-foreground">Thiếu</span>}
                        </TableCell>
                        <TableCell className={!item.type ? "text-destructive" : ""}>
                          {item.type ? (
                            <Badge className={typeLabels[item.type]?.color}>
                              {typeLabels[item.type]?.label || item.type}
                            </Badge>
                          ) : (
                            <span className="italic text-muted-foreground">Thiếu</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.categoryName || categories.find(c => c.id === item.categoryId)?.name || "-"}
                        </TableCell>
                        <TableCell className={item.price === undefined ? "text-right text-destructive" : "text-right"}>
                          {item.price !== undefined ? new Intl.NumberFormat("vi-VN").format(item.price) + "đ" : <span className="italic text-muted-foreground">Thiếu</span>}
                        </TableCell>
                        <TableCell className="text-right">{item.vatRate ?? 10}%</TableCell>
                        <TableCell>{item.unit || "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <div>
                Tổng: {importData.length} dòng |
                Tạo mới: {importData.filter(d => !d.id).length} |
                Cập nhật: {importData.filter(d => d.id).length}
              </div>
              {importData.filter(d => !d.name || !d.type || d.price === undefined).length > 0 && (
                <div className="text-destructive">
                  {importData.filter(d => !d.name || !d.type || d.price === undefined).length} dòng lỗi (thiếu dữ liệu bắt buộc)
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Hủy
            </Button>
            <Button onClick={handleImport} disabled={importing || importData.length === 0}>
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {importData.length} dòng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
