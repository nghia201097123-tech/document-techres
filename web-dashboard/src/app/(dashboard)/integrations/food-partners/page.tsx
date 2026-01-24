"use client";

import * as React from "react";
import {
  Loader2,
  Link2,
  Link2Off,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Settings2,
  Unplug,
  Building2,
  ArrowRightLeft,
  Store,
  Plus,
  UtensilsCrossed,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BrandBranchFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";
import { cn } from "@/lib/utils";
import {
  FoodPartnerType,
  FoodPartnerInfo,
  ConnectionStatus,
  type PartnerConnectionView,
  type PartnerConnectionPort,
  type PartnerAccountConnection,
  type FoodPlatformAccount,
  type ExternalStore,
  type StoreMapping,
  type CreateStoreMappingDto,
  type ExternalMenu,
  type ExternalMenuCategory,
  type ExternalMenuItem,
  type SyncedExternalItem,
  type SyncedItemsByCategory,
  type ItemMapping,
  type MenuSyncStatus,
  foodPartnerService,
} from "@/services/food-partner-service";
import { Branch, branchService } from "@/services/branch-service";
import { Product, ProductType, productService } from "@/services/product-service";

// Status badge component
const StatusBadge = ({ status }: { status: ConnectionStatus }) => {
  const config: Record<ConnectionStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
    [ConnectionStatus.CONNECTED]: { label: "Đã kết nối", icon: CheckCircle2, className: "bg-green-100 text-green-700 border-green-200" },
    [ConnectionStatus.DISCONNECTED]: { label: "Mất kết nối", icon: Link2Off, className: "bg-gray-100 text-gray-700 border-gray-200" },
    [ConnectionStatus.PENDING]: { label: "Chờ kết nối", icon: Clock, className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    [ConnectionStatus.CONNECTING]: { label: "Đang kết nối", icon: Loader2, className: "bg-blue-100 text-blue-700 border-blue-200" },
    [ConnectionStatus.ERROR]: { label: "Lỗi kết nối", icon: XCircle, className: "bg-red-100 text-red-700 border-red-200" },
  };

  const statusConfig = config[status] || config[ConnectionStatus.PENDING];
  const { label, icon: Icon, className } = statusConfig;

  return (
    <Badge variant="outline" className={cn("gap-1", className)}>
      <Icon className={cn("h-3 w-3", status === ConnectionStatus.CONNECTING && "animate-spin")} />
      {label}
    </Badge>
  );
};

// Partner logo/icon component
const PartnerLogo = ({ type, size = "md" }: { type: FoodPartnerType; size?: "sm" | "md" | "lg" }) => {
  const info = FoodPartnerInfo[type] || { bgColor: "bg-gray-100", color: "text-gray-600" };
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-base",
  };

  const getInitial = () => {
    if (type === FoodPartnerType.SHOPEE) return "S";
    if (type === FoodPartnerType.GRAB) return "G";
    if (type === FoodPartnerType.BEFOOD) return "B";
    return "?";
  };

  return (
    <div className={cn(
      "rounded-lg flex items-center justify-center font-bold",
      info.bgColor,
      info.color,
      sizeClasses[size]
    )}>
      {getInitial()}
    </div>
  );
};

export default function FoodPartnersPage() {
  const { toast } = useToast();
  const { brandId: filterBrandId, branchId: filterBranchId, setBrandId: setFilterBrandId, setBranchId: setFilterBranchId, tenantId } = useGlobalFilters();

  // Tab state
  const [activeTab, setActiveTab] = React.useState("accounts");

  const [loading, setLoading] = React.useState(false);
  const [connectionViews, setConnectionViews] = React.useState<PartnerConnectionView[]>([]);

  // Branch link tab states
  const [branchLinkLoading, setBranchLinkLoading] = React.useState(false);
  const [allAccounts, setAllAccounts] = React.useState<FoodPlatformAccount[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [updatingAccount, setUpdatingAccount] = React.useState<string | null>(null);

  // External stores states (fetched from food platforms)
  const [externalStores, setExternalStores] = React.useState<Record<string, ExternalStore[]>>({});
  const [loadingStores, setLoadingStores] = React.useState<string | null>(null);
  const [expandedAccount, setExpandedAccount] = React.useState<string | null>(null);

  // Branch linking dialog states
  const [branchLinkDialogOpen, setBranchLinkDialogOpen] = React.useState(false);
  const [selectedAccountForLink, setSelectedAccountForLink] = React.useState<string | null>(null);
  const [selectedStoreForLink, setSelectedStoreForLink] = React.useState<ExternalStore | null>(null);

  // Add new link dialog states
  const [addNewLinkDialogOpen, setAddNewLinkDialogOpen] = React.useState(false);
  const [selectedPlatformForAdd, setSelectedPlatformForAdd] = React.useState<FoodPartnerType | null>(null);

  // Sync stores dialog states
  const [syncDialogOpen, setSyncDialogOpen] = React.useState(false);
  const [syncingAccount, setSyncingAccount] = React.useState<FoodPlatformAccount | null>(null);
  const [syncingStores, setSyncingStores] = React.useState<ExternalStore[]>([]);
  const [syncLoading, setSyncLoading] = React.useState(false);
  const [savingMapping, setSavingMapping] = React.useState(false);
  const [syncAccountMappings, setSyncAccountMappings] = React.useState<StoreMapping[]>([]);

  // Store mappings from DB (for branch-link tab)
  const [storeMappings, setStoreMappings] = React.useState<Record<string, StoreMapping[]>>({});

  // Change branch dialog states
  const [changeBranchDialogOpen, setChangeBranchDialogOpen] = React.useState(false);
  const [selectedMappingForChange, setSelectedMappingForChange] = React.useState<StoreMapping | null>(null);
  const [deletingMapping, setDeletingMapping] = React.useState<string | null>(null);

  // Menu link tab states
  const [menuLoading, setMenuLoading] = React.useState(false);
  const [selectedAccountForMenu, setSelectedAccountForMenu] = React.useState<FoodPlatformAccount | null>(null);
  const [externalMenu, setExternalMenu] = React.useState<ExternalMenu | null>(null);
  const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>({});

  // Menu sync states
  const [syncingMenu, setSyncingMenu] = React.useState(false);
  const [syncedItems, setSyncedItems] = React.useState<SyncedItemsByCategory[]>([]);
  const [itemMappings, setItemMappings] = React.useState<ItemMapping[]>([]);
  const [menuSyncStatus, setMenuSyncStatus] = React.useState<MenuSyncStatus | null>(null);
  const [loadingSyncedItems, setLoadingSyncedItems] = React.useState(false);

  // Item mapping dialog states
  const [itemMappingDialogOpen, setItemMappingDialogOpen] = React.useState(false);
  const [selectedItemForMapping, setSelectedItemForMapping] = React.useState<SyncedExternalItem | null>(null);
  const [techresProducts, setTechresProducts] = React.useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(false);
  const [productSearchQuery, setProductSearchQuery] = React.useState("");
  const [savingItemMapping, setSavingItemMapping] = React.useState(false);

  // GrabFood items filter states
  const [grabItemSearchQuery, setGrabItemSearchQuery] = React.useState("");
  const [grabItemCategoryFilter, setGrabItemCategoryFilter] = React.useState<string>("all");
  const [grabItemMappingFilter, setGrabItemMappingFilter] = React.useState<string>("all"); // all, mapped, unmapped

  // Dialog states
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = React.useState(false);
  const [selectedPort, setSelectedPort] = React.useState<PartnerConnectionPort | null>(null);
  const [selectedConnection, setSelectedConnection] = React.useState<PartnerAccountConnection | null>(null);

  // Form states
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [testingConnection, setTestingConnection] = React.useState<string | null>(null);

  // Load data when branch changes (accounts tab)
  React.useEffect(() => {
    if (filterBranchId && filterBranchId !== "all") {
      loadData();
    } else {
      setConnectionViews([]);
    }
  }, [filterBranchId]);

  // Load accounts and branches data when tenantId is available (needed for both tabs)
  React.useEffect(() => {
    if (tenantId) {
      loadBranchLinkData();
    }
  }, [tenantId, filterBrandId]);

  const loadData = async () => {
    if (!filterBranchId || filterBranchId === "all") return;

    setLoading(true);
    try {
      const data = await foodPartnerService.getConnectionsView(filterBranchId);
      setConnectionViews(data);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu kết nối",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load branch link data
  const loadBranchLinkData = async () => {
    if (!tenantId) return;

    setBranchLinkLoading(true);
    try {
      const [accountsData, branchesData] = await Promise.all([
        foodPartnerService.getAccountsByTenant(tenantId),
        branchService.getAll(filterBrandId !== "all" ? filterBrandId : undefined),
      ]);
      setAllAccounts(accountsData);
      setBranches(branchesData);
    } catch (error) {
      console.error("Error loading branch link data:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu",
        variant: "destructive",
      });
    } finally {
      setBranchLinkLoading(false);
    }
  };

  // Load menu from platform
  const loadMenu = async (account: FoodPlatformAccount) => {
    setMenuLoading(true);
    setSelectedAccountForMenu(account);
    setExternalMenu(null);
    setExpandedCategories({});

    try {
      const menu = await foodPartnerService.getMenu(account.id);
      setExternalMenu(menu);

      // Expand all categories by default
      const expanded: Record<string, boolean> = {};
      menu.categories.forEach((cat: ExternalMenuCategory) => {
        expanded[cat.categoryID] = true;
      });
      setExpandedCategories(expanded);

      if (menu.categories.length === 0) {
        toast({
          title: "Thông báo",
          description: "Không tìm thấy món ăn nào từ tài khoản này",
        });
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tải menu",
        variant: "destructive",
      });
    } finally {
      setMenuLoading(false);
    }
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Sync menu from platform to database
  const handleSyncMenu = async (account: FoodPlatformAccount) => {
    setSyncingMenu(true);
    try {
      const result = await foodPartnerService.syncMenuItems(account.id);
      toast({
        title: "Đồng bộ thành công",
        description: result.message,
      });

      // Reload synced items after sync
      await loadSyncedItems(account);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể đồng bộ menu",
        variant: "destructive",
      });
    } finally {
      setSyncingMenu(false);
    }
  };

  // Load synced items from database
  const loadSyncedItems = async (account: FoodPlatformAccount) => {
    setLoadingSyncedItems(true);
    try {
      const [items, status, mappings] = await Promise.all([
        foodPartnerService.getSyncedItemsByCategory(account.id),
        foodPartnerService.getMenuSyncStatus(account.id),
        foodPartnerService.getItemMappings(account.id),
      ]);
      setSyncedItems(items);
      setMenuSyncStatus(status);
      setItemMappings(mappings);

      // Expand all categories by default
      const expanded: Record<string, boolean> = {};
      items.forEach((cat) => {
        expanded[cat.categoryId] = true;
      });
      setExpandedCategories(expanded);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tải danh sách món ăn",
        variant: "destructive",
      });
    } finally {
      setLoadingSyncedItems(false);
    }
  };

  // Select account for menu tab
  const selectAccountForMenu = async (account: FoodPlatformAccount) => {
    setSelectedAccountForMenu(account);
    setSyncedItems([]);
    setItemMappings([]);
    setMenuSyncStatus(null);
    await loadSyncedItems(account);
  };

  // Check if an item is mapped
  const getItemMapping = (itemId: string): ItemMapping | undefined => {
    return itemMappings.find(m => m.externalItemId === itemId);
  };

  // Load TechRes products for mapping
  const loadTechresProducts = async (brandId?: string) => {
    setLoadingProducts(true);
    try {
      const products = await productService.getAll(brandId || filterBrandId !== "all" ? filterBrandId : undefined);
      setTechresProducts(products.filter(p => p.isActive));
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tải danh sách món ăn TechRes",
        variant: "destructive",
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  // Open item mapping dialog
  const openItemMappingDialog = async (item: SyncedExternalItem) => {
    setSelectedItemForMapping(item);
    setProductSearchQuery("");
    setItemMappingDialogOpen(true);
    await loadTechresProducts();
  };

  // Handle create item mapping
  const handleCreateItemMapping = async (techresProduct: Product) => {
    if (!selectedAccountForMenu || !selectedItemForMapping) return;

    setSavingItemMapping(true);
    try {
      await foodPartnerService.createItemMapping(selectedAccountForMenu.id, {
        externalItemId: selectedItemForMapping.id,
        techresBrandId: techresProduct.brandId || filterBrandId,
        techresItemId: techresProduct.id,
        techresItemName: techresProduct.name,
      });

      toast({
        title: "Thành công",
        description: `Đã liên kết "${selectedItemForMapping.externalItemName}" với "${techresProduct.name}"`,
      });

      // Close dialog and reload data
      setItemMappingDialogOpen(false);
      setSelectedItemForMapping(null);

      // Reload synced items and mappings
      await loadSyncedItems(selectedAccountForMenu);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tạo liên kết",
        variant: "destructive",
      });
    } finally {
      setSavingItemMapping(false);
    }
  };

  // Handle delete item mapping
  const handleDeleteItemMapping = async (item: SyncedExternalItem) => {
    const mapping = getItemMapping(item.id);
    if (!mapping || !selectedAccountForMenu) return;

    try {
      await foodPartnerService.deleteItemMapping(mapping.id);
      toast({
        title: "Thành công",
        description: `Đã hủy liên kết "${item.externalItemName}"`,
      });

      // Reload data
      await loadSyncedItems(selectedAccountForMenu);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể hủy liên kết",
        variant: "destructive",
      });
    }
  };

  // Filtered products by search query (exclude toppings)
  const filteredProducts = React.useMemo(() => {
    // First filter out toppings
    let filtered = techresProducts.filter(p => p.type !== ProductType.TOPPING);

    // Then apply search query
    if (productSearchQuery.trim()) {
      const query = productSearchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.code?.toLowerCase().includes(query) ||
        p.categoryName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [techresProducts, productSearchQuery]);

  // Get list of unique categories from synced items
  const syncedCategories = React.useMemo(() => {
    return syncedItems.map(cat => ({
      id: cat.categoryId,
      name: cat.categoryName,
    }));
  }, [syncedItems]);

  // Filtered synced items by search, category, and mapping status
  const filteredSyncedItems = React.useMemo(() => {
    let filtered = [...syncedItems];

    // Filter by category
    if (grabItemCategoryFilter !== "all") {
      filtered = filtered.filter(cat => cat.categoryId === grabItemCategoryFilter);
    }

    // Filter items within categories
    filtered = filtered.map(category => {
      let items = [...category.items];

      // Filter by mapping status
      if (grabItemMappingFilter === "mapped") {
        items = items.filter(item => item.isMapped);
      } else if (grabItemMappingFilter === "unmapped") {
        items = items.filter(item => !item.isMapped);
      }

      // Filter by search query
      if (grabItemSearchQuery.trim()) {
        const query = grabItemSearchQuery.toLowerCase();
        items = items.filter(item =>
          item.externalItemName.toLowerCase().includes(query) ||
          item.externalItemId.toLowerCase().includes(query)
        );
      }

      return { ...category, items };
    }).filter(cat => cat.items.length > 0); // Remove empty categories

    return filtered;
  }, [syncedItems, grabItemCategoryFilter, grabItemMappingFilter, grabItemSearchQuery]);

  // Update account branch
  const handleUpdateAccountBranch = async (accountId: string, branchId: string) => {
    setUpdatingAccount(accountId);
    try {
      await foodPartnerService.updateAccountBranch(accountId, branchId);
      toast({
        title: "Thành công",
        description: "Đã cập nhật chi nhánh cho tài khoản",
      });
      loadBranchLinkData();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể cập nhật chi nhánh",
        variant: "destructive",
      });
    } finally {
      setUpdatingAccount(null);
    }
  };

  // Fetch stores from connected account
  const handleFetchStores = async (accountId: string) => {
    setLoadingStores(accountId);
    try {
      const stores = await foodPartnerService.getStores(accountId);
      setExternalStores(prev => ({ ...prev, [accountId]: stores }));
      setExpandedAccount(accountId);
      if (stores.length === 0) {
        toast({
          title: "Thông báo",
          description: "Không tìm thấy cửa hàng nào từ tài khoản này",
        });
      } else {
        toast({
          title: "Thành công",
          description: `Đã tải ${stores.length} cửa hàng từ tài khoản`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tải danh sách cửa hàng",
        variant: "destructive",
      });
    } finally {
      setLoadingStores(null);
    }
  };

  // Toggle expanded account
  const toggleExpandAccount = (accountId: string) => {
    if (expandedAccount === accountId) {
      setExpandedAccount(null);
    } else {
      setExpandedAccount(accountId);
      // Auto fetch stores if not loaded
      if (!externalStores[accountId]) {
        handleFetchStores(accountId);
      }
    }
  };

  // Open branch link dialog
  const openBranchLinkDialog = (accountId: string, store: ExternalStore) => {
    setSelectedAccountForLink(accountId);
    setSelectedStoreForLink(store);
    setBranchLinkDialogOpen(true);
  };

  // Handle branch link from dialog
  const handleBranchLink = async (branchId: string) => {
    if (!selectedAccountForLink) return;

    await handleUpdateAccountBranch(selectedAccountForLink, branchId);
    setBranchLinkDialogOpen(false);
    setSelectedAccountForLink(null);
    setSelectedStoreForLink(null);
  };

  // Open add new link dialog for a platform
  const openAddNewLinkDialog = (platform: FoodPartnerType) => {
    setSelectedPlatformForAdd(platform);
    setAddNewLinkDialogOpen(true);
  };

  // Handle selecting an account to link from add new dialog
  const handleSelectAccountToLink = (accountId: string) => {
    setAddNewLinkDialogOpen(false);
    // Expand the account to show its stores
    toggleExpandAccount(accountId);
    // Set this account for linking
    setSelectedAccountForLink(accountId);
  };

  // Open sync dialog for an account
  const openSyncDialog = async (account: FoodPlatformAccount) => {
    setSyncingAccount(account);
    setSyncDialogOpen(true);
    setSyncLoading(true);
    setSyncingStores([]);
    setSyncAccountMappings([]);

    // Helper function to fetch stores
    const fetchStores = async (): Promise<ExternalStore[]> => {
      return await foodPartnerService.getStores(account.id);
    };

    // Helper function to fetch existing mappings
    const fetchMappings = async (): Promise<StoreMapping[]> => {
      try {
        return await foodPartnerService.getStoreMappings(account.id);
      } catch {
        return [];
      }
    };

    try {
      // Fetch stores from platform and existing mappings in parallel
      const [stores, mappings] = await Promise.all([fetchStores(), fetchMappings()]);
      setSyncingStores(stores);
      setSyncAccountMappings(mappings);
      if (stores.length === 0) {
        toast({
          title: "Thông báo",
          description: "Không tìm thấy cửa hàng nào từ tài khoản này",
        });
      }
    } catch (error: any) {
      // Check if it's a 401 Unauthorized error
      if (error.response?.status === 401) {
        toast({
          title: "Token hết hạn",
          description: "Đang kết nối lại...",
        });

        try {
          // Try to reconnect using stored credentials
          await foodPartnerService.reconnectAccount(account.id);

          toast({
            title: "Kết nối lại thành công",
            description: "Đang tải danh sách cửa hàng...",
          });

          // Retry fetching stores after reconnect
          const stores = await fetchStores();
          setSyncingStores(stores);

          if (stores.length === 0) {
            toast({
              title: "Thông báo",
              description: "Không tìm thấy cửa hàng nào từ tài khoản này",
            });
          }

          // Reload accounts data to update status
          loadBranchLinkData();
        } catch (reconnectError: any) {
          // Reconnect failed - show disconnected message
          toast({
            title: "Mất kết nối",
            description: reconnectError.response?.data?.message || "Tài khoản đã mất kết nối. Vui lòng đăng nhập lại.",
            variant: "destructive",
          });

          // Close dialog and reload data to show updated status
          setSyncDialogOpen(false);
          loadBranchLinkData();
        }
      } else {
        toast({
          title: "Lỗi",
          description: error.response?.data?.message || "Không thể tải danh sách cửa hàng",
          variant: "destructive",
        });
      }
    } finally {
      setSyncLoading(false);
    }
  };

  // Save store mapping (link external store to branch)
  const handleSaveStoreMapping = async (store: ExternalStore, branchId: number, branchName: string) => {
    if (!syncingAccount) return;

    setSavingMapping(true);
    try {
      const mapping: CreateStoreMappingDto = {
        externalStoreId: store.externalStoreId,
        externalStoreName: store.name,
        externalStoreAddress: store.address,
        externalStorePhone: store.phone,
        externalStoreEmail: store.email,
        branchId,
        branchName,
      };

      await foodPartnerService.createStoreMappings(syncingAccount.id, [mapping]);

      toast({
        title: "Thành công",
        description: `Đã liên kết "${store.name}" với "${branchName}"`,
      });

      // Close dialog and reload data
      setSyncDialogOpen(false);
      setSyncingAccount(null);
      setSyncingStores([]);
      loadBranchLinkData();

      // Also load store mappings
      loadStoreMappings();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể lưu liên kết",
        variant: "destructive",
      });
    } finally {
      setSavingMapping(false);
    }
  };

  // Load store mappings from DB for all accounts
  const loadStoreMappings = async () => {
    if (!tenantId || allAccounts.length === 0) return;

    try {
      const mappingsPromises = allAccounts
        .filter(a => a.status === ConnectionStatus.CONNECTED)
        .map(async (account) => {
          const mappings = await foodPartnerService.getStoreMappings(account.id);
          return { accountId: account.id, mappings };
        });

      const results = await Promise.all(mappingsPromises);
      const mappingsMap: Record<string, StoreMapping[]> = {};
      results.forEach(({ accountId, mappings }) => {
        mappingsMap[accountId] = mappings;
      });
      setStoreMappings(mappingsMap);
    } catch (error) {
      console.error("Error loading store mappings:", error);
    }
  };

  // Load store mappings when accounts change
  React.useEffect(() => {
    if (activeTab === "branch-link" && allAccounts.length > 0) {
      loadStoreMappings();
    }
  }, [activeTab, allAccounts]);

  // Open change branch dialog
  const openChangeBranchDialog = (mapping: StoreMapping) => {
    setSelectedMappingForChange(mapping);
    setChangeBranchDialogOpen(true);
  };

  // Handle change branch for store mapping
  const handleChangeBranch = async (branchId: number, branchName: string) => {
    if (!selectedMappingForChange) return;

    setSavingMapping(true);
    try {
      await foodPartnerService.updateStoreMapping(selectedMappingForChange.id, {
        branchId,
        branchName,
      });

      toast({
        title: "Thành công",
        description: `Đã đổi chi nhánh sang "${branchName}"`,
      });

      // Close dialog and reload data
      setChangeBranchDialogOpen(false);
      setSelectedMappingForChange(null);
      loadStoreMappings();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể đổi chi nhánh",
        variant: "destructive",
      });
    } finally {
      setSavingMapping(false);
    }
  };

  // Handle delete store mapping
  const handleDeleteStoreMapping = async (mappingId: string) => {
    setDeletingMapping(mappingId);
    try {
      await foodPartnerService.deleteStoreMapping(mappingId);

      toast({
        title: "Thành công",
        description: "Đã hủy liên kết chi nhánh",
      });

      // Reload data
      loadStoreMappings();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể hủy liên kết",
        variant: "destructive",
      });
    } finally {
      setDeletingMapping(null);
    }
  };

  // Open link dialog
  const handleOpenLinkDialog = (port: PartnerConnectionPort) => {
    setSelectedPort(port);
    setUsername("");
    setPassword("");
    setShowPassword(false);
    setLinkDialogOpen(true);
  };

  // Open edit dialog
  const handleOpenEditDialog = (port: PartnerConnectionPort, connection: PartnerAccountConnection) => {
    setSelectedPort(port);
    setSelectedConnection(connection);
    setUsername(connection.username);
    setPassword("");
    setShowPassword(false);
    setEditDialogOpen(true);
  };

  // Open unlink dialog
  const handleOpenUnlinkDialog = (connection: PartnerAccountConnection) => {
    setSelectedConnection(connection);
    setUnlinkDialogOpen(true);
  };

  // Link account
  const handleLinkAccount = async () => {
    if (!selectedPort || !username || !password) return;

    setSaving(true);
    try {
      await foodPartnerService.linkAccount({
        portId: selectedPort.id,
        username,
        password,
        branchId: filterBranchId && filterBranchId !== "all" ? filterBranchId : undefined,
      });

      toast({
        title: "Thành công",
        description: `Đã liên kết tài khoản ${FoodPartnerInfo[selectedPort.partnerType].name}`,
      });

      setLinkDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể liên kết tài khoản",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Update connection
  const handleUpdateConnection = async () => {
    if (!selectedConnection) return;

    setSaving(true);
    try {
      await foodPartnerService.updateConnection(selectedConnection.id, {
        username,
        password: password || undefined
      });

      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin kết nối",
      });

      setEditDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể cập nhật kết nối",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Unlink account
  const handleUnlinkAccount = async () => {
    if (!selectedConnection) return;

    setSaving(true);
    try {
      await foodPartnerService.unlinkAccount(selectedConnection.id);

      toast({
        title: "Thành công",
        description: "Đã ngắt kết nối tài khoản",
      });

      setUnlinkDialogOpen(false);
      setSelectedConnection(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể ngắt kết nối",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Test connection
  const handleTestConnection = async (connectionId: string) => {
    setTestingConnection(connectionId);
    try {
      const result = await foodPartnerService.testConnection(connectionId);

      if (result.success || result.status === ConnectionStatus.CONNECTED) {
        toast({
          title: "Kết nối thành công",
          description: result.message || "Tài khoản đang hoạt động bình thường",
        });
      } else {
        toast({
          title: "Lỗi kết nối",
          description: result.message || "Không thể kết nối đến đối tác",
          variant: "destructive",
        });
      }

      // Reload data to update status
      loadData();
      loadBranchLinkData();
    } catch (error: any) {
      toast({
        title: "Lỗi kết nối",
        description: error.response?.data?.message || "Không thể kết nối đến đối tác",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(null);
    }
  };

  // Group connections by partner type
  const groupedConnections = React.useMemo(() => {
    const groups: Record<FoodPartnerType, PartnerConnectionView[]> = {
      [FoodPartnerType.SHOPEE]: [],
      [FoodPartnerType.GRAB]: [],
      [FoodPartnerType.BEFOOD]: [],
    };

    connectionViews.forEach(view => {
      groups[view.port.partnerType].push(view);
    });

    return groups;
  }, [connectionViews]);

  // Stats
  const stats = React.useMemo(() => {
    const total = connectionViews.length;
    const connected = connectionViews.filter(v => v.connection?.status === ConnectionStatus.CONNECTED).length;
    const errors = connectionViews.filter(v => v.connection?.status === ConnectionStatus.ERROR).length;
    const notLinked = connectionViews.filter(v => !v.connection).length;
    return { total, connected, errors, notLinked };
  }, [connectionViews]);

  // Group LINKED accounts by platform for branch link tab (only show accounts with branchId)
  const linkedAccountsByPlatform = React.useMemo(() => {
    const groups: Record<FoodPartnerType, FoodPlatformAccount[]> = {
      [FoodPartnerType.SHOPEE]: [],
      [FoodPartnerType.GRAB]: [],
      [FoodPartnerType.BEFOOD]: [],
    };

    allAccounts.forEach(account => {
      // Only include accounts that are linked to a branch
      if (groups[account.platform] && account.branchId) {
        groups[account.platform].push(account);
      }
    });

    return groups;
  }, [allAccounts]);

  // Get UNLINKED accounts (connected but no branchId) for the "Add New" dialog
  const unlinkedAccountsByPlatform = React.useMemo(() => {
    const groups: Record<FoodPartnerType, FoodPlatformAccount[]> = {
      [FoodPartnerType.SHOPEE]: [],
      [FoodPartnerType.GRAB]: [],
      [FoodPartnerType.BEFOOD]: [],
    };

    allAccounts.forEach(account => {
      // Include accounts that are connected but not linked to a branch
      if (groups[account.platform] && !account.branchId && account.status === ConnectionStatus.CONNECTED) {
        groups[account.platform].push(account);
      }
    });

    return groups;
  }, [allAccounts]);

  // Total linked count
  const totalLinkedStores = React.useMemo(() => {
    return allAccounts.filter(a => a.branchId).length;
  }, [allAccounts]);

  // Group store mappings by platform for branch link tab
  const storeMappingsByPlatform = React.useMemo(() => {
    const groups: Record<FoodPartnerType, StoreMapping[]> = {
      [FoodPartnerType.SHOPEE]: [],
      [FoodPartnerType.GRAB]: [],
      [FoodPartnerType.BEFOOD]: [],
    };

    // Get all store mappings from all accounts
    Object.entries(storeMappings).forEach(([accountId, mappings]) => {
      const account = allAccounts.find(a => a.id === accountId);
      if (account) {
        mappings.forEach(mapping => {
          groups[account.platform].push({ ...mapping, account });
        });
      }
    });

    return groups;
  }, [storeMappings, allAccounts]);

  // Total store mappings count
  const totalStoreMappings = React.useMemo(() => {
    return Object.values(storeMappings).flat().length;
  }, [storeMappings]);

  // Get branch name by id
  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || "Chưa gán";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kết nối đối tác App Food</h1>
          <p className="text-muted-foreground">Liên kết tài khoản Shopee Food, GrabFood, BeFood với chi nhánh</p>
        </div>
        {activeTab === "accounts" && (
          <BrandBranchFilter
            selectedBrandId={filterBrandId}
            selectedBranchId={filterBranchId}
            onBrandChange={setFilterBrandId}
            onBranchChange={setFilterBranchId}
            showAllBranchOption={false}
          />
        )}
        {(activeTab === "branch-link" || activeTab === "menu-link") && (
          <BrandBranchFilter
            selectedBrandId={filterBrandId}
            selectedBranchId={filterBranchId}
            onBrandChange={setFilterBrandId}
            onBranchChange={setFilterBranchId}
            showAllBranchOption={true}
            showBranchFilter={false}
          />
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="accounts" className="gap-2">
            <Link2 className="h-4 w-4" />
            Kết nối tài khoản
          </TabsTrigger>
          <TabsTrigger value="branch-link" className="gap-2">
            <Building2 className="h-4 w-4" />
            Liên kết chi nhánh
          </TabsTrigger>
          <TabsTrigger value="menu-link" className="gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            Liên kết món ăn
          </TabsTrigger>
        </TabsList>

        {/* Tab: Account Connections */}
        <TabsContent value="accounts" className="mt-6">
          {!filterBranchId || filterBranchId === "all" ? (
            <FilterRequiredPlaceholder
              title="Vui lòng chọn chi nhánh"
              description="Chọn một chi nhánh cụ thể từ bộ lọc phía trên để quản lý kết nối đối tác"
            />
          ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : connectionViews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Link2Off className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Chưa có cổng kết nối nào</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Chi nhánh này chưa được mở cổng kết nối app food. Vui lòng liên hệ quản trị viên để mở cổng kết nối trên hệ thống Admin.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-800">
                    <Link2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Tổng cổng kết nối</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 text-green-800">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.connected}</p>
                    <p className="text-xs text-muted-foreground">Đã kết nối</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 text-red-800">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.errors}</p>
                    <p className="text-xs text-muted-foreground">Lỗi kết nối</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100 text-gray-800">
                    <Link2Off className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.notLinked}</p>
                    <p className="text-xs text-muted-foreground">Chưa liên kết</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Partner Sections */}
          {Object.entries(groupedConnections).map(([partnerType, views]) => {
            if (views.length === 0) return null;
            const partner = FoodPartnerInfo[partnerType as FoodPartnerType];

            return (
              <Card key={partnerType}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <PartnerLogo type={partnerType as FoodPartnerType} />
                    <div>
                      <CardTitle>{partner.name}</CardTitle>
                      <CardDescription>{views.length} cổng kết nối</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {views.map(({ port, connection }) => (
                      <div
                        key={port.id}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-lg border",
                          connection?.status === ConnectionStatus.ERROR && "border-red-200 bg-red-50",
                          connection?.status === ConnectionStatus.CONNECTED && "border-green-200 bg-green-50",
                          !connection && "border-dashed"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[60px]">
                            <p className="text-2xl font-bold text-muted-foreground">#{port.shopNumber}</p>
                            <p className="text-xs text-muted-foreground">Shop</p>
                          </div>
                          <div className="h-10 w-px bg-border" />
                          <div>
                            {connection ? (
                              <>
                                <p className="font-medium">{connection.username}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <StatusBadge status={connection.status} />
                                  {connection.lastSyncAt && (
                                    <span className="text-xs text-muted-foreground">
                                      Đồng bộ lần cuối: {new Date(connection.lastSyncAt).toLocaleString("vi-VN")}
                                    </span>
                                  )}
                                </div>
                                {connection.errorMessage && (
                                  <p className="text-xs text-red-600 mt-1">{connection.errorMessage}</p>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="font-medium text-muted-foreground">Chưa liên kết tài khoản</p>
                                <p className="text-xs text-muted-foreground">Nhấn "Liên kết" để kết nối tài khoản {partner.name}</p>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {connection ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTestConnection(connection.id)}
                                disabled={testingConnection === connection.id}
                              >
                                {testingConnection === connection.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                                <span className="ml-1 hidden sm:inline">Kiểm tra</span>
                              </Button>
                              {connection.status === ConnectionStatus.CONNECTED && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                  onClick={() => {
                                    const account = allAccounts.find(a => a.id === connection.id);
                                    if (account) openSyncDialog(account);
                                  }}
                                >
                                  <ArrowRightLeft className="h-4 w-4" />
                                  <span className="ml-1 hidden sm:inline">Đồng bộ chi nhánh</span>
                                </Button>
                              )}
                              {connection.status === ConnectionStatus.CONNECTED && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                                  onClick={() => {
                                    const account = allAccounts.find(a => a.id === connection.id);
                                    if (account) {
                                      handleSyncMenu(account);
                                    }
                                  }}
                                  disabled={syncingMenu}
                                >
                                  {syncingMenu ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <UtensilsCrossed className="h-4 w-4" />
                                  )}
                                  <span className="ml-1 hidden sm:inline">Đồng bộ món ăn</span>
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditDialog(port, connection)}
                              >
                                <Settings2 className="h-4 w-4" />
                                <span className="ml-1 hidden sm:inline">Cập nhật</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleOpenUnlinkDialog(connection)}
                              >
                                <Unplug className="h-4 w-4" />
                                <span className="ml-1 hidden sm:inline">Ngắt kết nối</span>
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleOpenLinkDialog(port)}
                            >
                              <Link2 className="mr-1 h-4 w-4" />
                              Liên kết
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}
        </TabsContent>

        {/* Tab: Branch Link */}
        <TabsContent value="branch-link" className="mt-6">
          {branchLinkLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : allAccounts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20">
                <Store className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Chưa có tài khoản nào</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Chưa có tài khoản app food nào trong hệ thống. Vui lòng tạo cổng kết nối từ trang Admin.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Stats for branch link */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100 text-green-800">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{totalStoreMappings}</p>
                        <p className="text-xs text-muted-foreground">Liên kết đã lưu</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-800">
                        <Store className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{allAccounts.filter(a => a.status === ConnectionStatus.CONNECTED).length}</p>
                        <p className="text-xs text-muted-foreground">Tài khoản đã kết nối</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-100 text-gray-800">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{branches.length}</p>
                        <p className="text-xs text-muted-foreground">Chi nhánh trong hệ thống</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Partner Sections for branch link - show store mappings from DB */}
              {Object.values(FoodPartnerType).map((partnerType) => {
                const partner = FoodPartnerInfo[partnerType];
                const platformMappings = storeMappingsByPlatform[partnerType] || [];
                const connectedAccounts = allAccounts.filter(a => a.platform === partnerType && a.status === ConnectionStatus.CONNECTED);
                const hasConnectedAccounts = connectedAccounts.length > 0;

                return (
                  <Card key={partnerType}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <PartnerLogo type={partnerType} />
                          <div>
                            <CardTitle>{partner.name}</CardTitle>
                            <CardDescription>
                              {platformMappings.length > 0
                                ? `${platformMappings.length} liên kết đã lưu`
                                : "Chưa có liên kết nào"}
                            </CardDescription>
                          </div>
                        </div>
                        {hasConnectedAccounts && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                            onClick={() => {
                              const account = connectedAccounts[0];
                              if (account) openSyncDialog(account);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Thêm liên kết
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {platformMappings.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Store className="h-10 w-10 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">Chưa có liên kết nào được lưu</p>
                          {hasConnectedAccounts ? (
                            <p className="text-xs mt-1">
                              Bấm <strong>"Thêm liên kết"</strong> để đồng bộ và liên kết cửa hàng
                            </p>
                          ) : (
                            <p className="text-xs mt-1 text-yellow-600">
                              Chưa có tài khoản {partner.name} nào đã kết nối. Vui lòng kết nối tài khoản trước.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {platformMappings.map((mapping) => (
                            <div
                              key={mapping.id}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-lg border",
                                mapping.isActive && "border-green-200 bg-green-50",
                                !mapping.isActive && "border-gray-200 bg-gray-50"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div className="min-w-[200px]">
                                  <p className="font-medium">{mapping.externalStoreName}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant={mapping.isStoreActive ? "default" : "secondary"} className="text-xs">
                                      {mapping.isStoreActive ? "Đang hoạt động" : "Tạm ngưng"}
                                    </Badge>
                                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                      {mapping.externalStoreId}
                                    </code>
                                  </div>
                                  {mapping.externalStoreAddress && (
                                    <p className="text-xs text-muted-foreground mt-1">{mapping.externalStoreAddress}</p>
                                  )}
                                </div>
                                <div className="h-10 w-px bg-border" />
                                <div className="flex items-center gap-2">
                                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="h-10 w-px bg-border" />
                                <div className="flex items-center gap-2 text-sm">
                                  <Building2 className="h-4 w-4 text-green-600" />
                                  <span className="text-muted-foreground">Chi nhánh TechRes:</span>
                                  <span className="font-medium text-green-700">
                                    {mapping.branchName || `#${mapping.branchId}`}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {mapping.lastSyncedAt && (
                                  <span className="text-xs text-muted-foreground mr-2">
                                    Đồng bộ: {new Date(mapping.lastSyncedAt).toLocaleDateString("vi-VN")}
                                  </span>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                  onClick={() => openChangeBranchDialog(mapping)}
                                >
                                  <ArrowRightLeft className="h-3 w-3 mr-1" />
                                  Đổi chi nhánh
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                  onClick={() => handleDeleteStoreMapping(mapping.id)}
                                  disabled={deletingMapping === mapping.id}
                                >
                                  {deletingMapping === mapping.id ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <X className="h-3 w-3 mr-1" />
                                  )}
                                  Hủy liên kết
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab: Menu Link */}
        <TabsContent value="menu-link" className="mt-6">
          {branchLinkLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : allAccounts.filter(a => a.status === ConnectionStatus.CONNECTED).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20">
                <UtensilsCrossed className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Chưa có tài khoản nào</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Chưa có tài khoản app food nào đã kết nối. Vui lòng kết nối tài khoản trước để xem menu.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Account selector */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Chọn tài khoản để đồng bộ menu</CardTitle>
                  <CardDescription>
                    Chọn một tài khoản đã kết nối để đồng bộ và liên kết món ăn với thương hiệu TechRes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {allAccounts
                      .filter(a => a.status === ConnectionStatus.CONNECTED)
                      .map((account) => {
                        const partner = FoodPartnerInfo[account.platform];
                        const isSelected = selectedAccountForMenu?.id === account.id;

                        return (
                          <Button
                            key={account.id}
                            variant={isSelected ? "default" : "outline"}
                            className={cn("gap-2", isSelected && "bg-green-600 hover:bg-green-700")}
                            onClick={() => selectAccountForMenu(account)}
                            disabled={loadingSyncedItems}
                          >
                            {loadingSyncedItems && selectedAccountForMenu?.id === account.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <PartnerLogo type={account.platform} size="sm" />
                            )}
                            <span>{account.username || account.externalMerchantName || partner.name}</span>
                          </Button>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              {/* Menu sync status & actions */}
              {selectedAccountForMenu && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <PartnerLogo type={selectedAccountForMenu.platform} />
                        <div>
                          <CardTitle>
                            Menu từ {FoodPartnerInfo[selectedAccountForMenu.platform].name}
                          </CardTitle>
                          <CardDescription>
                            {menuSyncStatus ? (
                              <>
                                {menuSyncStatus.totalItems} món ăn đã đồng bộ
                                {menuSyncStatus.lastSyncedAt && (
                                  <> • Lần cuối: {new Date(menuSyncStatus.lastSyncedAt).toLocaleString("vi-VN")}</>
                                )}
                              </>
                            ) : (
                              "Chưa đồng bộ menu"
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadSyncedItems(selectedAccountForMenu)}
                          disabled={loadingSyncedItems}
                        >
                          <RefreshCw className={cn("h-4 w-4 mr-1", loadingSyncedItems && "animate-spin")} />
                          Tải lại
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSyncMenu(selectedAccountForMenu)}
                          disabled={syncingMenu}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {syncingMenu ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <ArrowRightLeft className="h-4 w-4 mr-1" />
                          )}
                          Đồng bộ menu
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Sync stats */}
                  {menuSyncStatus && menuSyncStatus.totalItems > 0 && (
                    <CardContent className="pt-0 pb-4">
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                          <UtensilsCrossed className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-700">{menuSyncStatus.totalItems} tổng món</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">{menuSyncStatus.mappedItems} đã liên kết</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-700">{menuSyncStatus.unmappedItems} chưa liên kết</span>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Menu content from DB */}
              {loadingSyncedItems ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Đang tải danh sách món ăn...</span>
                </div>
              ) : selectedAccountForMenu && syncedItems.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Danh sách món ăn đã đồng bộ</CardTitle>
                    <CardDescription>
                      Các món ăn từ {FoodPartnerInfo[selectedAccountForMenu.platform].name} đã được lưu vào hệ thống. Bạn có thể liên kết với món ăn TechRes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Search and filter controls */}
                    <div className="mb-4 flex flex-col sm:flex-row gap-3">
                      {/* Search input */}
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Tìm kiếm món ăn..."
                          value={grabItemSearchQuery}
                          onChange={(e) => setGrabItemSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                        {grabItemSearchQuery && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setGrabItemSearchQuery("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Category filter */}
                      <Select
                        value={grabItemCategoryFilter}
                        onValueChange={setGrabItemCategoryFilter}
                      >
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="Danh mục" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả danh mục</SelectItem>
                          {syncedCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Mapping status filter */}
                      <Select
                        value={grabItemMappingFilter}
                        onValueChange={setGrabItemMappingFilter}
                      >
                        <SelectTrigger className="w-full sm:w-[180px]">
                          <SelectValue placeholder="Trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          <SelectItem value="mapped">Đã liên kết</SelectItem>
                          <SelectItem value="unmapped">Chưa liên kết</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtered results count */}
                    {(grabItemSearchQuery || grabItemCategoryFilter !== "all" || grabItemMappingFilter !== "all") && (
                      <div className="mb-3 text-sm text-muted-foreground">
                        Hiển thị {filteredSyncedItems.reduce((sum, cat) => sum + cat.items.length, 0)} món ăn
                        {grabItemSearchQuery && <> khớp với "{grabItemSearchQuery}"</>}
                      </div>
                    )}

                    <div className="space-y-4">
                      {filteredSyncedItems.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <UtensilsCrossed className="h-10 w-10 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">Không tìm thấy món ăn nào phù hợp với bộ lọc</p>
                        </div>
                      ) : filteredSyncedItems.map((category) => (
                        <div key={category.categoryId} className="border rounded-lg overflow-hidden">
                          {/* Category header */}
                          <button
                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                            onClick={() => toggleCategory(category.categoryId)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                                <UtensilsCrossed className="h-4 w-4" />
                              </div>
                              <div className="text-left">
                                <h4 className="font-medium">{category.categoryName}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {category.items.length} món ăn
                                  {" • "}
                                  {category.items.filter(i => i.isMapped).length} đã liên kết
                                </p>
                              </div>
                            </div>
                            {expandedCategories[category.categoryId] ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>

                          {/* Category items */}
                          {expandedCategories[category.categoryId] && (
                            <div className="divide-y">
                              {category.items.map((item) => {
                                const mapping = getItemMapping(item.id);

                                return (
                                  <div
                                    key={item.id}
                                    className={cn(
                                      "flex items-start gap-4 p-4",
                                      !item.isActive && "opacity-50 bg-gray-50",
                                      item.isMapped && "bg-green-50 border-l-4 border-l-green-500"
                                    )}
                                  >
                                    {/* Item image */}
                                    <div className="flex-shrink-0">
                                      {item.imageUrl ? (
                                        <img
                                          src={item.imageUrl}
                                          alt={item.externalItemName}
                                          className="w-20 h-20 rounded-lg object-cover"
                                        />
                                      ) : (
                                        <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center">
                                          <ImageIcon className="h-8 w-8 text-gray-400" />
                                        </div>
                                      )}
                                    </div>

                                    {/* Item info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <h5 className="font-medium text-sm line-clamp-2">
                                            {item.externalItemName}
                                          </h5>
                                          {item.description && (
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                              {item.description}
                                            </p>
                                          )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <p className="font-semibold text-green-600">
                                            {item.priceDisplay || `${item.priceInMin.toLocaleString()}đ`}
                                          </p>
                                          {!item.isActive && (
                                            <Badge variant="secondary" className="text-xs mt-1">
                                              Hết hàng
                                            </Badge>
                                          )}
                                        </div>
                                      </div>

                                      {/* Item ID & mapping status */}
                                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                          {item.externalItemId}
                                        </code>
                                        {item.isMapped && mapping ? (
                                          <Badge variant="default" className="bg-green-600 text-xs">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Đã liên kết: {mapping.techresItemName || `#${mapping.techresItemId}`}
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">
                                            <AlertCircle className="h-3 w-3 mr-1" />
                                            Chưa liên kết
                                          </Badge>
                                        )}
                                      </div>

                                      {/* Action buttons */}
                                      <div className="mt-3 flex items-center gap-2">
                                        {item.isMapped && mapping ? (
                                          <>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-7 text-xs"
                                              onClick={() => openItemMappingDialog(item)}
                                            >
                                              <ArrowRightLeft className="h-3 w-3 mr-1" />
                                              Đổi liên kết
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                              onClick={() => handleDeleteItemMapping(item)}
                                            >
                                              <X className="h-3 w-3 mr-1" />
                                              Hủy liên kết
                                            </Button>
                                          </>
                                        ) : (
                                          <Button
                                            size="sm"
                                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                                            onClick={() => openItemMappingDialog(item)}
                                          >
                                            <Link2 className="h-3 w-3 mr-1" />
                                            Liên kết món ăn
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : selectedAccountForMenu && syncedItems.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <UtensilsCrossed className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Chưa có món ăn nào</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                      Chưa đồng bộ menu từ {FoodPartnerInfo[selectedAccountForMenu.platform].name}. Nhấn nút "Đồng bộ menu" để tải và lưu danh sách món ăn.
                    </p>
                    <Button
                      onClick={() => handleSyncMenu(selectedAccountForMenu)}
                      disabled={syncingMenu}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {syncingMenu ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                      )}
                      Đồng bộ menu ngay
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <UtensilsCrossed className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Chọn tài khoản để đồng bộ menu</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      Nhấn vào một trong các tài khoản phía trên để đồng bộ và xem danh sách món ăn.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Link Account Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPort && <PartnerLogo type={selectedPort.partnerType} size="sm" />}
              Liên kết tài khoản
            </DialogTitle>
            <DialogDescription>
              {selectedPort && (
                <>
                  Nhập thông tin đăng nhập {FoodPartnerInfo[selectedPort.partnerType].name} Shop #{selectedPort.shopNumber}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                placeholder="Nhập username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleLinkAccount} disabled={saving || !username || !password}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Liên kết
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Connection Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPort && <PartnerLogo type={selectedPort.partnerType} size="sm" />}
              Cập nhật kết nối
            </DialogTitle>
            <DialogDescription>
              {selectedPort && (
                <>
                  Cập nhật thông tin đăng nhập {FoodPartnerInfo[selectedPort.partnerType].name} Shop #{selectedPort.shopNumber}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-username">Tên đăng nhập</Label>
              <Input
                id="edit-username"
                placeholder="Nhập username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">Mật khẩu mới (để trống nếu không đổi)</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu mới"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateConnection} disabled={saving || !username}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink Confirmation Dialog */}
      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận ngắt kết nối</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn ngắt kết nối tài khoản <strong>{selectedConnection?.username}</strong>?
              <br />
              Sau khi ngắt kết nối, bạn sẽ cần liên kết lại để tiếp tục nhận đơn hàng từ đối tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlinkAccount}
              className="bg-red-600 hover:bg-red-700"
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ngắt kết nối
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Branch Link Dialog */}
      <Dialog open={branchLinkDialogOpen} onOpenChange={setBranchLinkDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-600" />
              Liên kết chi nhánh
            </DialogTitle>
            <DialogDescription>
              {selectedStoreForLink && (
                <>
                  Chọn chi nhánh để liên kết với cửa hàng <strong>{selectedStoreForLink.name}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedStoreForLink && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="font-medium mb-1">{selectedStoreForLink.name}</div>
                <div className="text-muted-foreground text-xs">ID: {selectedStoreForLink.externalStoreId}</div>
                {selectedStoreForLink.address && (
                  <div className="text-muted-foreground text-xs mt-1">{selectedStoreForLink.address}</div>
                )}
              </div>
            )}
            <Label className="mb-2 block">Chọn chi nhánh</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {branches.map((branch) => (
                <Button
                  key={branch.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-3 px-4"
                  onClick={() => handleBranchLink(branch.id)}
                  disabled={updatingAccount !== null}
                >
                  <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{branch.name}</span>
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBranchLinkDialogOpen(false)}>
              Hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Link Dialog - shows available unlinked accounts */}
      <Dialog open={addNewLinkDialogOpen} onOpenChange={setAddNewLinkDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPlatformForAdd && <PartnerLogo type={selectedPlatformForAdd} size="sm" />}
              Thêm liên kết mới
            </DialogTitle>
            <DialogDescription>
              Chọn tài khoản {selectedPlatformForAdd && FoodPartnerInfo[selectedPlatformForAdd].name} để liên kết với chi nhánh
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-3 block">Tài khoản có thể liên kết</Label>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {selectedPlatformForAdd && unlinkedAccountsByPlatform[selectedPlatformForAdd]?.length > 0 ? (
                unlinkedAccountsByPlatform[selectedPlatformForAdd].map((account) => (
                  <div
                    key={account.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectAccountToLink(account.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{account.externalMerchantName || account.username || account.displayName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusBadge status={account.status} />
                          {account.externalMerchantId && (
                            <span className="text-xs text-muted-foreground">
                              ID: {account.externalMerchantId}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Store className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Không có tài khoản nào có thể liên kết</p>
                  <p className="text-xs mt-1 mb-4">Tất cả tài khoản đã được liên kết hoặc chưa có tài khoản nào được kết nối</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAddNewLinkDialogOpen(false);
                      setActiveTab("accounts");
                    }}
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Đi đến kết nối tài khoản
                  </Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNewLinkDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Stores Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              Đồng bộ chi nhánh
            </DialogTitle>
            <DialogDescription>
              {syncingAccount && (
                <>
                  Chọn chi nhánh TechRes để liên kết với cửa hàng từ tài khoản <strong>{syncingAccount.username || syncingAccount.displayName}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {syncLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Đang tải danh sách cửa hàng...</span>
              </div>
            ) : syncingStores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Store className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Không tìm thấy cửa hàng nào từ tài khoản này</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Label className="block text-sm font-medium">Cửa hàng từ {syncingAccount?.platform === FoodPartnerType.GRAB ? "GrabFood" : syncingAccount?.platform}</Label>
                {syncingStores.map((store) => {
                  // Find existing mapping for this store
                  const existingMapping = syncAccountMappings.find(m => m.externalStoreId === store.externalStoreId);
                  const linkedBranch = existingMapping ? branches.find(b => b.id === String(existingMapping.branchId)) : null;

                  return (
                    <div key={store.externalStoreId} className={cn(
                      "p-4 border rounded-lg",
                      existingMapping && "border-green-200 bg-green-50"
                    )}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{store.name}</h4>
                            <Badge variant={store.isActive ? "default" : "secondary"} className="text-xs">
                              {store.isActive ? "Đang hoạt động" : "Tạm ngưng"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>ID: <code className="bg-gray-100 px-1 rounded">{store.externalStoreId}</code></div>
                            {store.address && <div>Địa chỉ: {store.address}</div>}
                            {store.phone && <div>SĐT: {store.phone}</div>}
                            {store.email && <div>Email: {store.email}</div>}
                          </div>
                        </div>
                      </div>

                      {/* Show linked branch if exists */}
                      {existingMapping && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-green-700 font-medium">Đã liên kết với chi nhánh:</span>
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                              <Building2 className="h-3 w-3 mr-1" />
                              {linkedBranch?.name || existingMapping.branchName || `#${existingMapping.branchId}`}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Chọn chi nhánh khác để thay đổi liên kết:</p>
                        </div>
                      )}

                      <div className={cn("mt-3 pt-3", !existingMapping && "border-t")}>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          {existingMapping ? "Đổi chi nhánh liên kết:" : "Chọn chi nhánh TechRes để liên kết:"}
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {branches.map((branch) => {
                            const isCurrentLinked = existingMapping && String(existingMapping.branchId) === branch.id;
                            return (
                              <Button
                                key={branch.id}
                                variant={isCurrentLinked ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleSaveStoreMapping(store, parseInt(branch.id), branch.name)}
                                disabled={savingMapping || isCurrentLinked}
                                className={cn(isCurrentLinked && "bg-green-600 hover:bg-green-600")}
                              >
                                {savingMapping ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : isCurrentLinked ? (
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                ) : (
                                  <Building2 className="h-3 w-3 mr-1" />
                                )}
                                {branch.name}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Branch Dialog - Change branch for existing store mapping */}
      <Dialog open={changeBranchDialogOpen} onOpenChange={setChangeBranchDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              Đổi chi nhánh liên kết
            </DialogTitle>
            <DialogDescription>
              {selectedMappingForChange && (
                <>
                  Chọn chi nhánh TechRes mới để liên kết với cửa hàng <strong>{selectedMappingForChange.externalStoreName}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedMappingForChange && (
              <div className="space-y-4">
                {/* Current mapping info */}
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-2">Cửa hàng đối tác:</p>
                  <p className="font-medium">{selectedMappingForChange.externalStoreName}</p>
                  <code className="text-xs bg-gray-200 px-1.5 py-0.5 rounded mt-1 inline-block">
                    {selectedMappingForChange.externalStoreId}
                  </code>

                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Chi nhánh hiện tại:</p>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-700">
                        {selectedMappingForChange.branchName || `#${selectedMappingForChange.branchId}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Branch selection */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Chọn chi nhánh mới:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {branches.map((branch) => {
                      const isCurrentBranch = String(selectedMappingForChange.branchId) === branch.id;
                      return (
                        <Button
                          key={branch.id}
                          variant={isCurrentBranch ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleChangeBranch(parseInt(branch.id), branch.name)}
                          disabled={savingMapping || isCurrentBranch}
                          className={cn(
                            "justify-start",
                            isCurrentBranch && "bg-green-600 hover:bg-green-600"
                          )}
                        >
                          {savingMapping ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : isCurrentBranch ? (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                          ) : (
                            <Building2 className="h-4 w-4 mr-2" />
                          )}
                          {branch.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeBranchDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Mapping Dialog - Select TechRes product to link with GrabFood item */}
      <Dialog open={itemMappingDialogOpen} onOpenChange={setItemMappingDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-blue-600" />
              Liên kết món ăn TechRes
            </DialogTitle>
            <DialogDescription>
              Chọn món ăn từ thương hiệu TechRes để liên kết với món ăn từ {selectedAccountForMenu && FoodPartnerInfo[selectedAccountForMenu.platform].name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Selected GrabFood item */}
            {selectedItemForMapping && (
              <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start gap-3">
                  {selectedItemForMapping.imageUrl ? (
                    <img
                      src={selectedItemForMapping.imageUrl}
                      alt={selectedItemForMapping.externalItemName}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-orange-100 flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-orange-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-orange-600 font-medium mb-1">
                      Món ăn {selectedAccountForMenu && FoodPartnerInfo[selectedAccountForMenu.platform].name}:
                    </p>
                    <h4 className="font-semibold text-orange-900">{selectedItemForMapping.externalItemName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-medium text-green-600">
                        {selectedItemForMapping.priceDisplay || `${selectedItemForMapping.priceInMin.toLocaleString()}đ`}
                      </span>
                      <code className="text-xs bg-orange-100 px-1.5 py-0.5 rounded text-orange-700">
                        {selectedItemForMapping.externalItemId}
                      </code>
                    </div>
                    {/* Show current mapping if exists */}
                    {(() => {
                      const currentMapping = getItemMapping(selectedItemForMapping.id);
                      if (currentMapping) {
                        return (
                          <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                            <p className="text-xs text-green-700 font-medium mb-1">
                              Đang liên kết với món TechRes:
                            </p>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-semibold text-green-800">
                                {currentMapping.techresItemName || `#${currentMapping.techresItemId}`}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Search input */}
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">Chọn món ăn TechRes để liên kết:</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên, mã món ăn, danh mục..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="pl-9"
                />
                {productSearchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setProductSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Product list */}
            <div className="flex-1 overflow-y-auto border rounded-lg">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Đang tải danh sách món ăn...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UtensilsCrossed className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    {productSearchQuery
                      ? `Không tìm thấy món ăn nào với từ khóa "${productSearchQuery}"`
                      : "Không có món ăn nào trong thương hiệu này"}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      className="w-full flex items-start gap-3 p-3 hover:bg-blue-50 transition-colors text-left"
                      onClick={() => handleCreateItemMapping(product)}
                      disabled={savingItemMapping}
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <UtensilsCrossed className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm line-clamp-1">{product.name}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-semibold text-green-600">
                            {product.price.toLocaleString()}đ
                          </span>
                          {product.categoryName && (
                            <Badge variant="secondary" className="text-xs">
                              {product.categoryName}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {product.code}
                          </code>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {savingItemMapping ? (
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        ) : (
                          <Link2 className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setItemMappingDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
