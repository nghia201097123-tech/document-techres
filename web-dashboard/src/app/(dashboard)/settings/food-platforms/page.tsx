"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { BrandFilter, useGlobalFilters } from "@/components/ui/brand-filter";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Link2,
  Link2Off,
  RefreshCw,
  Store,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Settings2,
  Eye,
} from "lucide-react";
import {
  foodPlatformService,
  FoodPlatformAccount,
  FoodPlatformType,
  FoodPlatformStatus,
  FoodPlatformInfo,
  FoodPlatformStatusInfo,
  CreateFoodPlatformDto,
  UpdateFoodPlatformDto,
  FoodPlatformAuthType,
} from "@/services/food-platform-service";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBranchesByBrand } from "@/store/slices/branchesSlice";

type DialogMode = "create" | "edit" | null;

interface PlatformForm {
  branchId: string;
  name: string;
  platform: FoodPlatformType;
  sortOrder: number;
  isActive: boolean;
  pollIntervalSeconds: number;
}

const DEFAULT_FORM: PlatformForm = {
  branchId: "",
  name: "",
  platform: FoodPlatformType.GRAB,
  sortOrder: 0,
  isActive: true,
  pollIntervalSeconds: 30,
};

export default function FoodPlatformsPage() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { brandId: filterBrandId, setBrandId: setFilterBrandId } = useGlobalFilters();

  // Branch selection
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("");

  // Get branches from Redux store
  const branches = useAppSelector((state) =>
    filterBrandId ? state.branches.byBrandId[filterBrandId] || [] : []
  );

  // Platform accounts state
  const [accounts, setAccounts] = React.useState<FoodPlatformAccount[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [editingAccount, setEditingAccount] = React.useState<FoodPlatformAccount | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<PlatformForm>(DEFAULT_FORM);

  // Delete confirmation
  const [deleteAccount, setDeleteAccount] = React.useState<FoodPlatformAccount | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Load branches when brand changes
  React.useEffect(() => {
    if (filterBrandId) {
      dispatch(fetchBranchesByBrand(filterBrandId));
    }
    setSelectedBranchId("");
    setAccounts([]);
  }, [filterBrandId, dispatch]);

  // Load accounts when branch changes
  React.useEffect(() => {
    if (selectedBranchId) {
      loadAccounts();
    } else {
      setAccounts([]);
    }
  }, [selectedBranchId]);

  const loadAccounts = async () => {
    if (!selectedBranchId) return;

    setLoading(true);
    try {
      const data = await foodPlatformService.getByBranch(selectedBranchId);
      setAccounts(data);
    } catch (error) {
      console.error("Error loading accounts:", error);
      toast({
        title: "Loi",
        description: "Khong the tai danh sach cong ket noi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Statistics
  const stats = React.useMemo(() => {
    const total = accounts.length;
    const connected = accounts.filter((a) => a.status === FoodPlatformStatus.CONNECTED).length;
    const error = accounts.filter((a) => a.status === FoodPlatformStatus.ERROR).length;
    const pending = accounts.filter(
      (a) => a.status === FoodPlatformStatus.PENDING || a.status === FoodPlatformStatus.DISCONNECTED
    ).length;
    return { total, connected, error, pending };
  }, [accounts]);

  // Group accounts by platform
  const groupedAccounts = React.useMemo(() => {
    const groups: Record<FoodPlatformType, FoodPlatformAccount[]> = {
      [FoodPlatformType.SHOPEE_FOOD]: [],
      [FoodPlatformType.GRAB]: [],
      [FoodPlatformType.BEFOOD]: [],
    };

    accounts.forEach((account) => {
      if (groups[account.platform]) {
        groups[account.platform].push(account);
      }
    });

    return groups;
  }, [accounts]);

  // Open create dialog
  const openCreateDialog = () => {
    setForm({
      ...DEFAULT_FORM,
      branchId: selectedBranchId,
    });
    setEditingAccount(null);
    setDialogMode("create");
  };

  // Open edit dialog
  const openEditDialog = (account: FoodPlatformAccount) => {
    setForm({
      branchId: account.branchId,
      name: account.name,
      platform: account.platform,
      sortOrder: account.sortOrder,
      isActive: account.isActive,
      pollIntervalSeconds: account.pollIntervalSeconds || 30,
    });
    setEditingAccount(account);
    setDialogMode("edit");
  };

  // Save account
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({
        title: "Loi",
        description: "Vui long nhap ten cong ket noi",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (dialogMode === "create") {
        const dto: CreateFoodPlatformDto = {
          branchId: form.branchId,
          name: form.name.trim(),
          platform: form.platform,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        };
        await foodPlatformService.create(dto);
        toast({
          title: "Thanh cong",
          description: "Da tao cong ket noi moi",
        });
      } else if (dialogMode === "edit" && editingAccount) {
        const dto: UpdateFoodPlatformDto = {
          name: form.name.trim(),
          sortOrder: form.sortOrder,
          isActive: form.isActive,
          pollIntervalSeconds: form.pollIntervalSeconds,
        };
        await foodPlatformService.update(editingAccount.id, dto);
        toast({
          title: "Thanh cong",
          description: "Da cap nhat cong ket noi",
        });
      }

      setDialogMode(null);
      loadAccounts();
    } catch (error: any) {
      console.error("Error saving account:", error);
      toast({
        title: "Loi",
        description: error.response?.data?.message || "Khong the luu cong ket noi",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete account
  const handleDelete = async () => {
    if (!deleteAccount) return;

    setDeleting(true);
    try {
      await foodPlatformService.delete(deleteAccount.id);
      toast({
        title: "Thanh cong",
        description: "Da xoa cong ket noi",
      });
      setDeleteAccount(null);
      loadAccounts();
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Loi",
        description: error.response?.data?.message || "Khong the xoa cong ket noi",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: FoodPlatformStatus) => {
    switch (status) {
      case FoodPlatformStatus.CONNECTED:
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Da ket noi
          </Badge>
        );
      case FoodPlatformStatus.ERROR:
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Loi ket noi
          </Badge>
        );
      case FoodPlatformStatus.CONNECTING:
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Dang ket noi
          </Badge>
        );
      case FoodPlatformStatus.DISCONNECTED:
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <Link2Off className="h-3 w-3 mr-1" />
            Mat ket noi
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            Chua ket noi
          </Badge>
        );
    }
  };

  // Get selected branch name
  const selectedBranchName = React.useMemo(() => {
    const branch = branches.find((b: any) => b.id === selectedBranchId);
    return branch?.name || "";
  }, [branches, selectedBranchId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ket noi doi tac App Food</h1>
          <p className="text-muted-foreground">
            Lien ket tai khoan Shopee Food, GrabFood, BeFood voi chi nhanh
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Branch selector */}
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="w-[200px]">
              <Store className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Chon chi nhanh" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch: any) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <BrandFilter selectedBrandId={filterBrandId} onBrandChange={setFilterBrandId} />
        </div>
      </div>

      {!selectedBranchId ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Chon chi nhanh</h3>
            <p className="text-muted-foreground">
              Vui long chon chi nhanh de quan ly cac cong ket noi food apps
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Link2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-muted-foreground">Tong cong ket noi</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.connected}</p>
                    <p className="text-sm text-muted-foreground">Da ket noi</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.error}</p>
                    <p className="text-sm text-muted-foreground">Loi ket noi</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-100 rounded-full">
                    <Link2Off className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                    <p className="text-sm text-muted-foreground">Chua ket noi</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add new button */}
          <div className="flex justify-end">
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Them cong ket noi
            </Button>
          </div>

          {/* Loading state */}
          {loading ? (
            <Card>
              <CardContent className="py-16 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : accounts.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Chua co cong ket noi</h3>
                <p className="text-muted-foreground mb-4">
                  Bam "Them cong ket noi" de tao moi
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Them cong ket noi
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Platform Groups */
            <div className="space-y-6">
              {Object.entries(groupedAccounts).map(([platform, platformAccounts]) => {
                if (platformAccounts.length === 0) return null;

                const platformInfo = FoodPlatformInfo[platform as FoodPlatformType];
                const platformKey = platform as FoodPlatformType;

                return (
                  <Card key={platform}>
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                            platformKey === FoodPlatformType.SHOPEE_FOOD
                              ? "bg-orange-100 text-orange-600"
                              : platformKey === FoodPlatformType.GRAB
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {platformInfo.name.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{platformInfo.name}</CardTitle>
                          <CardDescription>{platformAccounts.length} cong ket noi</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {platformAccounts.map((account, index) => (
                        <div
                          key={account.id}
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            account.status === FoodPlatformStatus.CONNECTED
                              ? "bg-green-50 border-green-200"
                              : account.status === FoodPlatformStatus.ERROR
                              ? "bg-red-50 border-red-200"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {/* Shop number */}
                            <div className="text-center">
                              <p className="text-2xl font-bold text-muted-foreground">#{index + 1}</p>
                              <p className="text-xs text-muted-foreground">Shop</p>
                            </div>

                            {/* Divider */}
                            <div className="w-px h-12 bg-gray-300" />

                            {/* Info */}
                            <div>
                              <p className="font-semibold">{account.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {getStatusBadge(account.status)}
                                {account.lastPollAt && (
                                  <span className="text-xs text-muted-foreground">
                                    Dong bo lan cuoi: {new Date(account.lastPollAt).toLocaleString("vi-VN")}
                                  </span>
                                )}
                              </div>
                              {account.status === FoodPlatformStatus.ERROR && account.lastError && (
                                <p className="text-sm text-red-600 mt-1">{account.lastError}</p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => loadAccounts()}>
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Kiem tra
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(account)}>
                              <Settings2 className="h-4 w-4 mr-1" />
                              Cap nhat
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteAccount(account)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Them cong ket noi moi" : "Cap nhat cong ket noi"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Tao cong ket noi moi de lien ket voi food app"
                : "Cap nhat thong tin cong ket noi"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Platform selection (only for create) */}
            {dialogMode === "create" && (
              <div className="space-y-2">
                <Label>Nen tang <span className="text-red-500">*</span></Label>
                <Select
                  value={form.platform}
                  onValueChange={(v) => setForm({ ...form, platform: v as FoodPlatformType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FoodPlatformInfo).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              key === FoodPlatformType.SHOPEE_FOOD
                                ? "bg-orange-100 text-orange-600"
                                : key === FoodPlatformType.GRAB
                                ? "bg-green-100 text-green-600"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {info.name.charAt(0)}
                          </span>
                          <span>{info.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label>Ten hien thi <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: shop_techres_q1"
              />
            </div>

            {/* Poll interval (only for edit) */}
            {dialogMode === "edit" && (
              <div className="space-y-2">
                <Label>Thoi gian dong bo (giay)</Label>
                <Input
                  type="number"
                  min={10}
                  max={300}
                  value={form.pollIntervalSeconds}
                  onChange={(e) => setForm({ ...form, pollIntervalSeconds: parseInt(e.target.value) || 30 })}
                />
                <p className="text-xs text-muted-foreground">Tu 10 - 300 giay</p>
              </div>
            )}

            {/* Sort order */}
            <div className="space-y-2">
              <Label>Thu tu hien thi</Label>
              <Input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Active */}
            <div className="flex items-center justify-between">
              <Label>Kich hoat</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
            </div>

            {/* Auth type hint */}
            {dialogMode === "create" && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <p className="font-medium">Huong dan ket noi:</p>
                {form.platform === FoodPlatformType.SHOPEE_FOOD ? (
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Sau khi tao, mo app CCB de dang nhap</li>
                    <li>Nhap so dien thoai va xac thuc OTP</li>
                    <li>Chon cua hang tu danh sach</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Sau khi tao, mo app CCB de dang nhap</li>
                    <li>Nhap username va password</li>
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              Huy
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dialogMode === "create" ? "Them" : "Luu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteAccount !== null} onOpenChange={() => setDeleteAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xac nhan xoa</AlertDialogTitle>
            <AlertDialogDescription>
              Ban co chac chan muon xoa cong ket noi "{deleteAccount?.name}"?
              Hanh dong nay khong the hoan tac.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xoa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
