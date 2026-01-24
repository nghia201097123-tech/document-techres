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
  foodPartnerService,
} from "@/services/food-partner-service";
import { Branch, branchService } from "@/services/branch-service";

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

  // Load data when tab changes to branch-link
  React.useEffect(() => {
    if (activeTab === "branch-link" && tenantId) {
      loadBranchLinkData();
    }
  }, [activeTab, tenantId, filterBrandId]);

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

      if (result.status === ConnectionStatus.CONNECTED) {
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
        {activeTab === "branch-link" && (
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
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="accounts" className="gap-2">
            <Link2 className="h-4 w-4" />
            Kết nối tài khoản
          </TabsTrigger>
          <TabsTrigger value="branch-link" className="gap-2">
            <Building2 className="h-4 w-4" />
            Liên kết chi nhánh
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
                        <p className="text-2xl font-bold">{totalLinkedStores}</p>
                        <p className="text-xs text-muted-foreground">Cửa hàng đã liên kết</p>
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
                        <p className="text-2xl font-bold">{allAccounts.filter(a => a.status === ConnectionStatus.CONNECTED && !a.branchId).length}</p>
                        <p className="text-xs text-muted-foreground">Tài khoản có thể liên kết</p>
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

              {/* Partner Sections for branch link - show all platforms */}
              {Object.values(FoodPartnerType).map((partnerType) => {
                const partner = FoodPartnerInfo[partnerType];
                const linkedAccounts = linkedAccountsByPlatform[partnerType] || [];
                const unlinkedAccounts = unlinkedAccountsByPlatform[partnerType] || [];
                const hasUnlinkedAccounts = unlinkedAccounts.length > 0;

                return (
                  <Card key={partnerType}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <PartnerLogo type={partnerType} />
                          <div>
                            <CardTitle>{partner.name}</CardTitle>
                            <CardDescription>
                              {linkedAccounts.length > 0
                                ? `${linkedAccounts.length} cửa hàng đã liên kết`
                                : "Chưa có liên kết nào"}
                            </CardDescription>
                          </div>
                        </div>
                        {hasUnlinkedAccounts && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                            onClick={() => openAddNewLinkDialog(partnerType)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Thêm liên kết
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {linkedAccounts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Store className="h-10 w-10 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">Chưa có cửa hàng nào được liên kết với chi nhánh</p>
                          {hasUnlinkedAccounts && (
                            <p className="text-xs mt-1">
                              Bấm <strong>"Thêm liên kết"</strong> để bắt đầu liên kết cửa hàng
                            </p>
                          )}
                          {!hasUnlinkedAccounts && (
                            <p className="text-xs mt-1 text-yellow-600">
                              Chưa có tài khoản {partner.name} nào đã kết nối. Vui lòng kết nối tài khoản trước.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {linkedAccounts.map((account) => (
                            <div key={account.id} className="space-y-3">
                              {/* Account Header - shows linked store */}
                              <div
                                className={cn(
                                  "flex items-center justify-between p-4 rounded-lg border",
                                  account.status === ConnectionStatus.CONNECTED && "border-green-200 bg-green-50",
                                  account.status === ConnectionStatus.ERROR && "border-red-200 bg-red-50"
                                )}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="min-w-[200px]">
                                    <p className="font-medium">{account.externalMerchantName || account.username || account.displayName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <StatusBadge status={account.status} />
                                    </div>
                                  </div>
                                  <div className="h-10 w-px bg-border" />
                                  <div className="flex items-center gap-2 text-sm">
                                    <Building2 className="h-4 w-4 text-green-600" />
                                    <span className="text-muted-foreground">Chi nhánh:</span>
                                    <span className="font-medium text-green-700">
                                      {getBranchName(account.branchId)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {account.status === ConnectionStatus.CONNECTED && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleExpandAccount(account.id)}
                                      disabled={loadingStores === account.id}
                                    >
                                      {loadingStores === account.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                      ) : (
                                        <Store className="h-4 w-4 mr-1" />
                                      )}
                                      {expandedAccount === account.id ? "Ẩn chi tiết" : "Xem chi tiết"}
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* External Stores List */}
                              {expandedAccount === account.id && externalStores[account.id] && (
                                <div className="ml-4 pl-4 border-l-2 border-green-200 space-y-3">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Store className="h-4 w-4" />
                                    <span>Thông tin cửa hàng từ {partner.name}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleFetchStores(account.id)}
                                      disabled={loadingStores === account.id}
                                    >
                                      <RefreshCw className={cn("h-3 w-3", loadingStores === account.id && "animate-spin")} />
                                    </Button>
                                  </div>
                                  {externalStores[account.id].length === 0 ? (
                                    <div className="text-sm text-muted-foreground p-4 bg-gray-50 rounded-lg text-center">
                                      Không có thông tin cửa hàng
                                    </div>
                                  ) : (
                                    externalStores[account.id].map((store, storeIndex) => (
                                      <div
                                        key={store.externalStoreId}
                                        className="p-4 bg-white border rounded-lg shadow-sm"
                                      >
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-base">{store.name}</h4>
                                            <Badge variant={store.isActive ? "default" : "secondary"} className="text-xs">
                                              {store.isActive ? "Đang hoạt động" : "Tạm ngưng"}
                                            </Badge>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                              <span className="font-medium min-w-[60px]">ID:</span>
                                              <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                                {store.externalStoreId}
                                              </code>
                                            </div>
                                            {store.phone && (
                                              <div className="flex items-center gap-2 text-muted-foreground">
                                                <span className="font-medium min-w-[60px]">SĐT:</span>
                                                <span>{store.phone}</span>
                                              </div>
                                            )}
                                            {store.email && (
                                              <div className="flex items-center gap-2 text-muted-foreground">
                                                <span className="font-medium min-w-[60px]">Email:</span>
                                                <span>{store.email}</span>
                                              </div>
                                            )}
                                            {store.address && (
                                              <div className="flex items-start gap-2 text-muted-foreground md:col-span-2">
                                                <span className="font-medium min-w-[60px]">Địa chỉ:</span>
                                                <span>{store.address}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
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
                  <p className="text-xs mt-1">Vui lòng kết nối tài khoản mới từ tab "Kết nối tài khoản"</p>
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
    </div>
  );
}
