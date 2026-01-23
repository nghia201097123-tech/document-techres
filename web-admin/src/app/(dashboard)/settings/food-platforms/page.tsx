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
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// Types for branch/brand selection
interface Brand {
  id: string;
  name: string;
  code: string;
  companyId: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  brandId: string;
}

export default function FoodPlatformsPage() {
  const [accounts, setAccounts] = React.useState<FoodPlatformAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const { toast } = useToast();

  // Filter states
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>("");

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedAccount, setSelectedAccount] = React.useState<FoodPlatformAccount | null>(null);

  // Form data
  const [formData, setFormData] = React.useState<CreateFoodPlatformDto>({
    branchId: "",
    name: "",
    platform: FoodPlatformType.GRAB,
    pollIntervalSeconds: 30,
    sortOrder: 0,
    isActive: true,
  });

  // Load companies on mount
  React.useEffect(() => {
    const loadCompanies = async () => {
      try {
        const data = await companyService.getAll();
        setCompanies(data);
        if (data.length > 0) {
          setSelectedCompanyId(data[0].code);
        }
      } catch (error) {
        console.error("Error loading companies:", error);
      }
    };
    loadCompanies();
  }, []);

  // Load accounts when company changes
  React.useEffect(() => {
    if (selectedCompanyId) {
      loadAccounts();
    }
  }, [selectedCompanyId]);

  const loadAccounts = async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const data = await foodPlatformService.getByCompany(selectedCompanyId);
      setAccounts(data);
    } catch (error: any) {
      console.error("Error loading accounts:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tải danh sách cổng kết nối",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter accounts by search
  const filteredAccounts = React.useMemo(() => {
    if (!searchQuery) return accounts;
    const query = searchQuery.toLowerCase();
    return accounts.filter(
      (acc) =>
        acc.name.toLowerCase().includes(query) ||
        acc.branch?.name?.toLowerCase().includes(query) ||
        PlatformInfo[acc.platform]?.name.toLowerCase().includes(query)
    );
  }, [accounts, searchQuery]);

  // Group accounts by branch
  const groupedAccounts = React.useMemo(() => {
    const groups: Record<string, { branch: FoodPlatformAccount["branch"]; accounts: FoodPlatformAccount[] }> = {};
    for (const acc of filteredAccounts) {
      const branchId = acc.branchId;
      if (!groups[branchId]) {
        groups[branchId] = { branch: acc.branch, accounts: [] };
      }
      groups[branchId].accounts.push(acc);
    }
    return Object.values(groups);
  }, [filteredAccounts]);

  // Handle create/edit
  const handleOpenCreate = () => {
    setSelectedAccount(null);
    setFormData({
      branchId: "",
      name: "",
      platform: FoodPlatformType.GRAB,
      pollIntervalSeconds: 30,
      sortOrder: 0,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (account: FoodPlatformAccount) => {
    setSelectedAccount(account);
    setFormData({
      branchId: account.branchId,
      name: account.name,
      platform: account.platform,
      pollIntervalSeconds: account.pollIntervalSeconds,
      sortOrder: account.sortOrder,
      isActive: account.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (selectedAccount) {
        const updateData: UpdateFoodPlatformDto = {
          name: formData.name,
          pollIntervalSeconds: formData.pollIntervalSeconds,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
        };
        await foodPlatformService.update(selectedAccount.id, updateData);
        toast({ title: "Thành công", description: "Đã cập nhật cổng kết nối" });
      } else {
        await foodPlatformService.create(formData);
        toast({ title: "Thành công", description: "Đã tạo cổng kết nối mới" });
      }
      setIsDialogOpen(false);
      loadAccounts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể lưu cổng kết nối",
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
      loadAccounts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể xóa cổng kết nối",
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
      loadAccounts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể thay đổi trạng thái",
      });
    }
  };

  // Platform logo component
  const PlatformLogo = ({ platform }: { platform: FoodPlatformType }) => {
    const info = PlatformInfo[platform];
    return (
      <div
        className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm",
          info?.bgColor || "bg-gray-100",
          info?.color || "text-gray-600"
        )}
      >
        {platform === FoodPlatformType.GRAB && "G"}
        {platform === FoodPlatformType.BEFOOD && "B"}
        {platform === FoodPlatformType.SHOPEE_FOOD && "S"}
      </div>
    );
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: FoodPlatformStatus }) => {
    const info = StatusInfo[status];
    return (
      <Badge
        variant="outline"
        className={cn("gap-1", info?.bgColor, info?.color, "border-transparent")}
      >
        {info?.label || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quản lý cổng kết nối App Food</h2>
          <p className="text-muted-foreground">
            Tạo và quản lý cổng kết nối Grab, BeFood, Shopee Food theo chi nhánh
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm cổng kết nối
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Danh sách cổng kết nối ({filteredAccounts.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Chọn công ty" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.code}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={loadAccounts}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Đang tải...
            </div>
          ) : groupedAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có cổng kết nối nào
            </div>
          ) : (
            <div className="space-y-6">
              {groupedAccounts.map((group) => (
                <div key={group.branch?.id || "unknown"} className="border rounded-lg">
                  <div className="bg-muted/50 px-4 py-2 border-b">
                    <h3 className="font-medium">{group.branch?.name || "Chi nhánh không xác định"}</h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Platform</TableHead>
                        <TableHead>Tên hiển thị</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Kết nối</TableHead>
                        <TableHead className="text-center">Poll (s)</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.accounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <PlatformLogo platform={account.platform} />
                              <span className="font-medium">
                                {PlatformInfo[account.platform]?.name || account.platform}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{account.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant={account.isActive ? "success" : "secondary"}
                              className="cursor-pointer"
                              onClick={() => handleToggleActive(account)}
                            >
                              {account.isActive ? "Hoạt động" : "Tạm dừng"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={account.status} />
                          </TableCell>
                          <TableCell className="text-center">
                            {account.pollIntervalSeconds}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAccount ? "Chỉnh sửa cổng kết nối" : "Thêm cổng kết nối mới"}
            </DialogTitle>
            <DialogDescription>
              {selectedAccount
                ? "Cập nhật thông tin cổng kết nối"
                : "Tạo cổng kết nối mới cho chi nhánh"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {!selectedAccount && (
                <>
                  <div className="space-y-2">
                    <Label>Chi nhánh *</Label>
                    <Input
                      placeholder="Nhập Branch ID"
                      value={formData.branchId}
                      onChange={(e) =>
                        setFormData({ ...formData, branchId: e.target.value })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Lấy Branch ID từ trang quản lý chi nhánh
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Platform *</Label>
                    <Select
                      value={formData.platform}
                      onValueChange={(v) =>
                        setFormData({ ...formData, platform: v as FoodPlatformType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PlatformInfo).map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            {info.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Tên hiển thị *</Label>
                <Input
                  placeholder="VD: GrabFood - Chi nhánh Q1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Poll interval (giây)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={300}
                    value={formData.pollIntervalSeconds}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
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
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedAccount ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa cổng kết nối "{selectedAccount?.name}"? Hành động này không thể hoàn tác.
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
