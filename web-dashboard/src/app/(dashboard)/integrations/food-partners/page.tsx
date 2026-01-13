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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  type PartnerConnectionPort,
  type PartnerAccountConnection,
  type PartnerConnectionView,
} from "@/services/food-partner-service";

// Mock data for UI development
const mockPorts: PartnerConnectionPort[] = [
  {
    id: "port-1",
    partnerType: FoodPartnerType.SHOPEE,
    shopNumber: 1,
    branchId: "branch-1",
    branchName: "Chi nhánh Quận 1",
    maxConnections: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "port-2",
    partnerType: FoodPartnerType.GRAB,
    shopNumber: 1,
    branchId: "branch-1",
    branchName: "Chi nhánh Quận 1",
    maxConnections: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "port-3",
    partnerType: FoodPartnerType.GRAB,
    shopNumber: 2,
    branchId: "branch-1",
    branchName: "Chi nhánh Quận 1",
    maxConnections: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "port-4",
    partnerType: FoodPartnerType.BEFOOD,
    shopNumber: 1,
    branchId: "branch-1",
    branchName: "Chi nhánh Quận 1",
    maxConnections: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
];

const mockConnections: PartnerAccountConnection[] = [
  {
    id: "conn-1",
    portId: "port-1",
    partnerType: FoodPartnerType.SHOPEE,
    shopNumber: 1,
    username: "shop_techres_q1",
    status: ConnectionStatus.CONNECTED,
    lastSyncAt: "2024-01-15T10:30:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "conn-2",
    portId: "port-2",
    partnerType: FoodPartnerType.GRAB,
    shopNumber: 1,
    username: "grab_techres_1",
    status: ConnectionStatus.ERROR,
    errorMessage: "Token hết hạn, vui lòng đăng nhập lại",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-10T08:00:00Z",
  },
];

// Status badge component
const StatusBadge = ({ status }: { status: ConnectionStatus }) => {
  const config = {
    [ConnectionStatus.CONNECTED]: { label: "Đã kết nối", icon: CheckCircle2, className: "bg-green-100 text-green-700 border-green-200" },
    [ConnectionStatus.DISCONNECTED]: { label: "Chưa kết nối", icon: Link2Off, className: "bg-gray-100 text-gray-700 border-gray-200" },
    [ConnectionStatus.PENDING]: { label: "Đang xử lý", icon: Clock, className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    [ConnectionStatus.ERROR]: { label: "Lỗi kết nối", icon: XCircle, className: "bg-red-100 text-red-700 border-red-200" },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge variant="outline" className={cn("gap-1", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

// Partner logo/icon component
const PartnerLogo = ({ type, size = "md" }: { type: FoodPartnerType; size?: "sm" | "md" | "lg" }) => {
  const info = FoodPartnerInfo[type];
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-base",
  };

  return (
    <div className={cn(
      "rounded-lg flex items-center justify-center font-bold",
      info.bgColor,
      info.color,
      sizeClasses[size]
    )}>
      {type === FoodPartnerType.SHOPEE && "S"}
      {type === FoodPartnerType.GRAB && "G"}
      {type === FoodPartnerType.BEFOOD && "B"}
    </div>
  );
};

export default function FoodPartnersPage() {
  const { toast } = useToast();
  const { brandId: filterBrandId, branchId: filterBranchId, setBrandId: setFilterBrandId, setBranchId: setFilterBranchId } = useGlobalFilters();

  const [loading, setLoading] = React.useState(false);
  const [connectionViews, setConnectionViews] = React.useState<PartnerConnectionView[]>([]);

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

  // Load data when branch changes
  React.useEffect(() => {
    if (filterBranchId && filterBranchId !== "all") {
      loadData();
    } else {
      setConnectionViews([]);
    }
  }, [filterBranchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const data = await foodPartnerService.getConnectionsView(filterBranchId);

      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 500));
      const views: PartnerConnectionView[] = mockPorts.map(port => ({
        port,
        connection: mockConnections.find(c => c.portId === port.id),
      }));
      setConnectionViews(views);
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
      // TODO: Replace with actual API call
      // await foodPartnerService.linkAccount({ portId: selectedPort.id, username, password });

      await new Promise(resolve => setTimeout(resolve, 1000));

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
      // TODO: Replace with actual API call
      // await foodPartnerService.updateConnection(selectedConnection.id, { username, password: password || undefined });

      await new Promise(resolve => setTimeout(resolve, 1000));

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
      // TODO: Replace with actual API call
      // await foodPartnerService.unlinkAccount(selectedConnection.id);

      await new Promise(resolve => setTimeout(resolve, 500));

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
      // TODO: Replace with actual API call
      // const result = await foodPartnerService.testConnection(connectionId);

      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: "Kết nối thành công",
        description: "Tài khoản đang hoạt động bình thường",
      });
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kết nối đối tác App Food</h1>
          <p className="text-muted-foreground">Liên kết tài khoản Shopee Food, GrabFood, BeFood với chi nhánh</p>
        </div>
        <BrandBranchFilter
          selectedBrandId={filterBrandId}
          selectedBranchId={filterBranchId}
          onBrandChange={setFilterBrandId}
          onBranchChange={setFilterBranchId}
          showAllBranchOption={false}
        />
      </div>

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
    </div>
  );
}
