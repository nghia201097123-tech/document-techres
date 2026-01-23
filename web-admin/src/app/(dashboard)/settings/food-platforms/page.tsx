"use client";

import * as React from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  Loader2,
  RefreshCw,
  Store,
  CheckCircle2,
  Circle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  foodPlatformService,
  FoodPlatformAccount,
  FoodPlatformType,
  FoodPlatformStatus,
  PlatformInfo,
  StatusInfo,
  CreateFoodPlatformDto,
  UpdateFoodPlatformDto,
} from "@/services/food-platform-service";
import { companyService, type Company } from "@/services/company-service";
import { branchService, type Branch } from "@/services/branch-service";

// Platform config for quick create
const ALL_PLATFORMS = [
  { type: FoodPlatformType.GRAB, name: "GrabFood", color: "bg-green-500" },
  { type: FoodPlatformType.BEFOOD, name: "BeFood", color: "bg-yellow-500" },
  { type: FoodPlatformType.SHOPEE_FOOD, name: "Shopee Food", color: "bg-orange-500" },
];

export default function FoodPlatformsPage() {
  const [accounts, setAccounts] = React.useState<FoodPlatformAccount[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const { toast } = useToast();

  // Filter states
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedAccount, setSelectedAccount] = React.useState<FoodPlatformAccount | null>(null);
  const [selectedBranch, setSelectedBranch] = React.useState<Branch | null>(null);
  const [selectedPlatform, setSelectedPlatform] = React.useState<FoodPlatformType | null>(null);

  // Edit form data
  const [editFormData, setEditFormData] = React.useState({
    name: "",
    pollIntervalSeconds: 30,
    sortOrder: 0,
  });

  // Load companies on mount
  React.useEffect(() => {
    const loadCompanies = async () => {
      try {
        const data = await companyService.getAll();
        setCompanies(data);
        if (data.length > 0) {
          setSelectedCompany(data[0]);
        }
      } catch (error) {
        console.error("Error loading companies:", error);
      }
    };
    loadCompanies();
  }, []);

  // Load data when company changes
  React.useEffect(() => {
    if (selectedCompany) {
      loadData();
    }
  }, [selectedCompany]);

  const loadData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      // Load accounts and branches in parallel
      // Use company.code for food-platforms API and company.id for branches API
      const [accountsData, branchesData] = await Promise.all([
        foodPlatformService.getByCompany(selectedCompany.code),
        branchService.getList({ companyId: selectedCompany.id, limit: 100 }).then(r => r.data),
      ]);
      setAccounts(accountsData);
      setBranches(branchesData);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tải dữ liệu",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get accounts for a specific branch
  const getAccountsForBranch = (branchId: string) => {
    return accounts.filter((acc) => acc.branchId === branchId);
  };

  // Get all accounts for a specific branch and platform
  const getAccountsForPlatform = (branchId: string, platform: FoodPlatformType) => {
    return accounts.filter((acc) => acc.branchId === branchId && acc.platform === platform);
  };

  // Filter branches by search
  const filteredBranches = React.useMemo(() => {
    if (!searchQuery) return branches;
    const query = searchQuery.toLowerCase();
    return branches.filter(
      (branch) =>
        branch.name.toLowerCase().includes(query) ||
        branch.code?.toLowerCase().includes(query)
    );
  }, [branches, searchQuery]);

  // Handle create single platform
  const handleCreatePlatform = async (branch: Branch, platform: FoodPlatformType) => {
    setSaving(true);
    try {
      const platformName = PlatformInfo[platform]?.name || platform;
      await foodPlatformService.create({
        branchId: branch.id,
        name: `${platformName} - ${branch.name}`,
        platform,
        pollIntervalSeconds: 30,
        isActive: true,
      });
      toast({ title: "Thành công", description: `Đã tạo cổng ${platformName}` });
      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tạo cổng kết nối",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle create all platforms for a branch
  const handleCreateAllPlatforms = async (branch: Branch) => {
    setSaving(true);
    try {
      await foodPlatformService.createAllForBranch(branch.id);
      toast({ title: "Thành công", description: `Đã tạo tất cả cổng cho ${branch.name}` });
      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tạo cổng kết nối",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle edit
  const handleOpenEdit = (account: FoodPlatformAccount) => {
    setSelectedAccount(account);
    setEditFormData({
      name: account.name,
      pollIntervalSeconds: account.pollIntervalSeconds,
      sortOrder: account.sortOrder,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAccount) return;
    setSaving(true);
    try {
      await foodPlatformService.update(selectedAccount.id, editFormData);
      toast({ title: "Thành công", description: "Đã cập nhật cổng kết nối" });
      setIsEditDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể cập nhật",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleOpenDelete = (account: FoodPlatformAccount) => {
    setSelectedAccount(account);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;
    setSaving(true);
    try {
      await foodPlatformService.delete(selectedAccount.id);
      toast({ title: "Thành công", description: "Đã xóa cổng kết nối" });
      setIsDeleteDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể xóa",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (account: FoodPlatformAccount) => {
    try {
      await foodPlatformService.toggleActive(account.id);
      toast({
        title: "Thành công",
        description: `Đã ${account.isActive ? "tắt" : "bật"} cổng kết nối`,
      });
      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể thay đổi trạng thái",
      });
    }
  };

  // Single account button with dropdown menu
  const AccountButton = ({
    account,
    platformName,
    color,
  }: {
    account: FoodPlatformAccount;
    platformName: string;
    color: string;
    showShopNumber?: boolean;
  }) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 gap-1 px-2",
              account.isActive ? "border-green-500 bg-green-50" : "border-gray-300 bg-gray-50"
            )}
          >
            {platformName}
            {account.isActive ? (
              <CheckCircle2 className="h-3 w-3 text-green-500" />
            ) : (
              <Circle className="h-3 w-3 text-gray-400" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => handleOpenEdit(account)}>
            <Pencil className="mr-2 h-4 w-4" />
            Chỉnh sửa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleToggleActive(account)}>
            <Power className="mr-2 h-4 w-4" />
            {account.isActive ? "Tạm dừng" : "Kích hoạt"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => handleOpenDelete(account)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Platform buttons component - shows all accounts for a platform and add button
  const PlatformButtons = ({
    branch,
    platform,
    platformName,
    color,
  }: {
    branch: Branch;
    platform: FoodPlatformType;
    platformName: string;
    color: string;
  }) => {
    const platformAccounts = getAccountsForPlatform(branch.id, platform);
    const hasAccounts = platformAccounts.length > 0;

    return (
      <div className="flex flex-wrap items-center gap-1 p-1 rounded-md bg-muted/30">
        {/* Platform label */}
        <span className="text-xs text-muted-foreground px-1 min-w-[60px]">
          <span className={cn("inline-block w-2 h-2 rounded-full mr-1", color)} />
          {platformName}:
        </span>
        {/* Show existing accounts */}
        {platformAccounts.map((account) => (
          <AccountButton
            key={account.id}
            account={account}
            platformName={`#${account.shopNumber}`}
            color={color}
            showShopNumber={false}
          />
        ))}
        {/* Add new button */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 border-dashed"
          onClick={() => handleCreatePlatform(branch, platform)}
          disabled={saving}
          title={`Thêm ${platformName}`}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  // Stats
  const stats = React.useMemo(() => {
    const totalBranches = branches.length;
    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter((a) => a.isActive).length;
    const connectedAccounts = accounts.filter((a) => a.status === FoodPlatformStatus.CONNECTED).length;
    return { totalBranches, totalAccounts, activeAccounts, connectedAccounts };
  }, [branches, accounts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quản lý cổng kết nối App Food</h2>
          <p className="text-muted-foreground">
            Tạo cổng kết nối Grab, BeFood, Shopee Food cho từng chi nhánh
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Chi nhánh</CardDescription>
            <CardTitle className="text-2xl">{stats.totalBranches}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng cổng kết nối</CardDescription>
            <CardTitle className="text-2xl">{stats.totalAccounts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Đang hoạt động</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.activeAccounts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Đã kết nối</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats.connectedAccounts}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Danh sách chi nhánh</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={selectedCompany?.id || ""}
                onValueChange={(id) => {
                  const company = companies.find(c => c.id === id);
                  if (company) setSelectedCompany(company);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Chọn công ty" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm chi nhánh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Đang tải...
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {branches.length === 0
                ? "Công ty chưa có chi nhánh nào"
                : "Không tìm thấy chi nhánh phù hợp"}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBranches.map((branch) => {
                const branchAccounts = getAccountsForBranch(branch.id);

                return (
                  <div
                    key={branch.id}
                    className="p-4 border rounded-lg hover:bg-muted/50"
                  >
                    {/* Branch Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{branch.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {branch.code} • {branchAccounts.length} cổng
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleCreateAllPlatforms(branch)}
                        disabled={saving}
                        title="Thêm 3 cổng mới (Grab, BeFood, Shopee)"
                      >
                        <Zap className="mr-1 h-3 w-3" />
                        +3 cổng
                      </Button>
                    </div>

                    {/* Platforms Grid */}
                    <div className="flex flex-wrap gap-2">
                      {ALL_PLATFORMS.map((p) => (
                        <PlatformButtons
                          key={p.type}
                          branch={branch}
                          platform={p.type}
                          platformName={p.name}
                          color={p.color}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa cổng kết nối</DialogTitle>
            <DialogDescription>Cập nhật thông tin cổng kết nối</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Tên hiển thị</Label>
              <Input
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Poll interval (giây)</Label>
                <Input
                  type="number"
                  min={10}
                  max={300}
                  value={editFormData.pollIntervalSeconds}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      pollIntervalSeconds: parseInt(e.target.value) || 30,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Thứ tự</Label>
                <Input
                  type="number"
                  min={0}
                  value={editFormData.sortOrder}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa cổng kết nối "{selectedAccount?.name}"?
              <br />
              <span className="text-destructive">
                Lưu ý: Nếu đã có tài khoản liên kết, việc xóa sẽ ngắt kết nối.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
