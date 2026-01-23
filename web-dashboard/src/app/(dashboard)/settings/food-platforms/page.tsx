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
  Phone,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
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
}

const DEFAULT_FORM: PlatformForm = {
  branchId: "",
  name: "",
  platform: FoodPlatformType.GRAB,
  sortOrder: 0,
  isActive: true,
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

  // Toggle active status
  const handleToggle = async (account: FoodPlatformAccount) => {
    try {
      await foodPlatformService.toggle(account.id);
      toast({
        title: "Thanh cong",
        description: account.isActive ? "Da tat cong ket noi" : "Da bat cong ket noi",
      });
      loadAccounts();
    } catch (error: any) {
      console.error("Error toggling account:", error);
      toast({
        title: "Loi",
        description: error.response?.data?.message || "Khong the thay doi trang thai",
        variant: "destructive",
      });
    }
  };

  // Disconnect account
  const handleDisconnect = async (account: FoodPlatformAccount) => {
    try {
      await foodPlatformService.disconnect(account.id);
      toast({
        title: "Thanh cong",
        description: "Da ngat ket noi",
      });
      loadAccounts();
    } catch (error: any) {
      console.error("Error disconnecting:", error);
      toast({
        title: "Loi",
        description: error.response?.data?.message || "Khong the ngat ket noi",
        variant: "destructive",
      });
    }
  };

  // Get status icon
  const getStatusIcon = (status: FoodPlatformStatus) => {
    switch (status) {
      case FoodPlatformStatus.CONNECTED:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case FoodPlatformStatus.CONNECTING:
        return <Clock className="h-4 w-4 text-blue-500" />;
      case FoodPlatformStatus.PENDING:
        return <Clock className="h-4 w-4 text-gray-500" />;
      case FoodPlatformStatus.DISCONNECTED:
        return <Link2Off className="h-4 w-4 text-yellow-500" />;
      case FoodPlatformStatus.ERROR:
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quan ly cong ket noi Food Apps</h1>
          <p className="text-muted-foreground">
            Quan ly cac cong ket noi voi Grab Food, BeFood, ShopeeFood
          </p>
        </div>
        <BrandFilter />
      </div>

      {/* Branch Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chon chi nhanh</CardTitle>
          <CardDescription>
            Chon chi nhanh de quan ly cac cong ket noi food apps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-md">
              <Label>Chi nhanh</Label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chon chi nhanh..." />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedBranchId && (
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Them cong ket noi
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Platform Accounts List */}
      {selectedBranchId && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Danh sach cong ket noi</CardTitle>
                <CardDescription>
                  Cac cong ket noi food apps cua chi nhanh nay
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadAccounts} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Lam moi
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chua co cong ket noi nao</p>
                <p className="text-sm">Bam "Them cong ket noi" de tao moi</p>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.map((account) => {
                  const platformInfo = FoodPlatformInfo[account.platform];
                  const statusInfo = FoodPlatformStatusInfo[account.status];

                  return (
                    <div
                      key={account.id}
                      className={`border rounded-lg p-4 ${!account.isActive ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {/* Platform Icon */}
                          <div className={`p-3 rounded-lg ${platformInfo.bgColor}`}>
                            <span className="text-2xl">{platformInfo.icon}</span>
                          </div>

                          {/* Info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{account.name}</h3>
                              <Badge variant="outline" className={platformInfo.color}>
                                {platformInfo.name}
                              </Badge>
                              <Badge variant="outline" className={statusInfo.color}>
                                {getStatusIcon(account.status)}
                                <span className="ml-1">{statusInfo.label}</span>
                              </Badge>
                              {!account.isActive && (
                                <Badge variant="secondary">Tam dung</Badge>
                              )}
                            </div>

                            {/* Connection details */}
                            <div className="mt-2 text-sm text-muted-foreground space-y-1">
                              {account.externalStoreName && (
                                <p className="flex items-center gap-2">
                                  <Store className="h-3 w-3" />
                                  Cua hang: {account.externalStoreName}
                                </p>
                              )}
                              {account.username && (
                                <p className="flex items-center gap-2">
                                  <User className="h-3 w-3" />
                                  Username: {account.username}
                                </p>
                              )}
                              {account.phoneNumber && (
                                <p className="flex items-center gap-2">
                                  <Phone className="h-3 w-3" />
                                  SĐT: {account.phoneNumber}
                                </p>
                              )}
                              {account.lastPollAt && (
                                <p className="text-xs">
                                  Dong bo gan nhat: {new Date(account.lastPollAt).toLocaleString("vi-VN")}
                                </p>
                              )}
                              {account.status === FoodPlatformStatus.ERROR && account.lastError && (
                                <p className="text-red-500 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {account.lastError}
                                </p>
                              )}
                            </div>

                            {/* Auth type hint */}
                            {account.status === FoodPlatformStatus.PENDING && (
                              <p className="mt-2 text-sm text-blue-600">
                                {account.authType === FoodPlatformAuthType.PHONE_OTP
                                  ? "* Dang nhap bang SĐT + OTP tren app CCB"
                                  : "* Dang nhap bang Username/Password tren app CCB"}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={account.isActive}
                            onCheckedChange={() => handleToggle(account)}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEditDialog(account)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {account.status === FoodPlatformStatus.CONNECTED && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDisconnect(account)}
                            >
                              <Link2Off className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setDeleteAccount(account)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={() => setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Them cong ket noi moi" : "Chinh sua cong ket noi"}
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
                <Label>Nen tang</Label>
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
                          <span>{info.icon}</span>
                          <span>{info.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({info.authType === FoodPlatformAuthType.PHONE_OTP ? "OTP" : "Username/Password"})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label>Ten hien thi</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: GrabFood - Chi nhanh Q1"
              />
            </div>

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
                <p className="font-medium">Huong dan:</p>
                {FoodPlatformInfo[form.platform].authType === FoodPlatformAuthType.PHONE_OTP ? (
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Sau khi tao cong, mo app CCB de dang nhap</li>
                    <li>Nhap so dien thoai va xac thuc OTP</li>
                    <li>Chon cua hang tu danh sach</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Sau khi tao cong, mo app CCB de dang nhap</li>
                    <li>Nhap username va password cua tai khoan {FoodPlatformInfo[form.platform].name}</li>
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
              {dialogMode === "create" ? "Tao" : "Luu"}
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
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xoa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
