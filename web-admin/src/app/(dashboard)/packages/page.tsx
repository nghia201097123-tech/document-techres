"use client";

import * as React from "react";
import {
  Package,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Check,
  X,
  Loader2,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  packageService,
  type Package as PackageType,
  type PackageFeatures,
} from "@/services/package-service";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const featureLabels: Record<keyof PackageFeatures, string> = {
  orderManagement: "Quản lý đơn hàng",
  inventoryManagement: "Quản lý kho",
  reporting: "Báo cáo",
  multipleUsers: "Nhiều người dùng",
  apiAccess: "API Access",
  prioritySupport: "Hỗ trợ ưu tiên",
};

const defaultFeatures: PackageFeatures = {
  orderManagement: true,
  inventoryManagement: false,
  reporting: true,
  multipleUsers: false,
  apiAccess: false,
  prioritySupport: false,
};

interface PackageFormData {
  name: string;
  code: string;
  maxBranches: number;
  monthlyPrice: number;
  yearlyPrice: number;
  features: PackageFeatures;
}

const initialFormData: PackageFormData = {
  name: "",
  code: "",
  maxBranches: 3,
  monthlyPrice: 0,
  yearlyPrice: 0,
  features: { ...defaultFeatures },
};

export default function PackagesPage() {
  const { toast } = useToast();
  const [packages, setPackages] = React.useState<PackageType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedPackage, setSelectedPackage] = React.useState<PackageType | null>(null);
  const [formData, setFormData] = React.useState<PackageFormData>(initialFormData);
  const [isViewMode, setIsViewMode] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchPackages = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await packageService.getAll({ search: searchQuery || undefined });
      setPackages(response.data);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách gói",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, toast]);

  React.useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleOpenCreate = () => {
    setSelectedPackage(null);
    setFormData(initialFormData);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (pkg: PackageType) => {
    setSelectedPackage(pkg);
    setFormData({
      name: pkg.name,
      code: pkg.code,
      maxBranches: pkg.maxBranches,
      monthlyPrice: pkg.monthlyPrice,
      yearlyPrice: pkg.yearlyPrice,
      features: { ...defaultFeatures, ...pkg.features },
    });
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenView = (pkg: PackageType) => {
    setSelectedPackage(pkg);
    setFormData({
      name: pkg.name,
      code: pkg.code,
      maxBranches: pkg.maxBranches,
      monthlyPrice: pkg.monthlyPrice,
      yearlyPrice: pkg.yearlyPrice,
      features: { ...defaultFeatures, ...pkg.features },
    });
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (pkg: PackageType) => {
    setSelectedPackage(pkg);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (selectedPackage) {
        await packageService.update(selectedPackage.id, {
          name: formData.name,
          maxBranches: formData.maxBranches,
          monthlyPrice: formData.monthlyPrice,
          yearlyPrice: formData.yearlyPrice,
          features: formData.features,
        });
        toast({ title: "Thành công", description: "Đã cập nhật gói" });
      } else {
        await packageService.create(formData);
        toast({ title: "Thành công", description: "Đã thêm gói mới" });
      }
      setIsDialogOpen(false);
      fetchPackages();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPackage) return;
    setIsSubmitting(true);
    try {
      await packageService.delete(selectedPackage.id);
      toast({ title: "Thành công", description: "Đã xóa gói" });
      setIsDeleteDialogOpen(false);
      setSelectedPackage(null);
      fetchPackages();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể xóa gói",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (pkg: PackageType) => {
    try {
      await packageService.toggleStatus(pkg.id);
      toast({
        title: "Thành công",
        description: `Đã ${pkg.isActive ? "tạm dừng" : "kích hoạt"} gói`,
      });
      fetchPackages();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleFeatureChange = (feature: keyof PackageFeatures, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      features: { ...prev.features, [feature]: checked },
    }));
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gói App Food</h2>
          <p className="text-muted-foreground">
            Quản lý các gói dịch vụ App Food
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm gói mới
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Danh sách gói ({packages.length})
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên, mã..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gói</TableHead>
                <TableHead>Chi nhánh tối đa</TableHead>
                <TableHead>Giá tháng</TableHead>
                <TableHead>Giá năm</TableHead>
                <TableHead>Tính năng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                        <Package className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-medium">{pkg.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {pkg.code}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {pkg.maxBranches === -1 ? "Không giới hạn" : pkg.maxBranches}
                  </TableCell>
                  <TableCell>
                    {pkg.monthlyPrice === 0
                      ? "Liên hệ"
                      : formatCurrency(pkg.monthlyPrice)}
                  </TableCell>
                  <TableCell>
                    {pkg.yearlyPrice === 0
                      ? "Liên hệ"
                      : formatCurrency(pkg.yearlyPrice)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {pkg.features && Object.entries(pkg.features)
                        .filter(([, value]) => value)
                        .slice(0, 3)
                        .map(([key]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {featureLabels[key as keyof PackageFeatures] || key}
                          </Badge>
                        ))}
                      {pkg.features && Object.entries(pkg.features).filter(([, v]) => v).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{Object.entries(pkg.features).filter(([, v]) => v).length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={pkg.isActive ? "success" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(pkg)}
                    >
                      {pkg.isActive ? "Hoạt động" : "Tạm dừng"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenView(pkg)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEdit(pkg)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDelete(pkg)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {packages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Không tìm thấy gói nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isViewMode
                ? "Chi tiết gói"
                : selectedPackage
                ? "Chỉnh sửa gói"
                : "Thêm gói mới"}
            </DialogTitle>
            <DialogDescription>
              {isViewMode
                ? "Thông tin chi tiết của gói dịch vụ"
                : selectedPackage
                ? "Cập nhật thông tin gói"
                : "Nhập thông tin gói mới"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tên gói *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isViewMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Mã gói *</Label>
                  <Input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    required
                    disabled={isViewMode || !!selectedPackage}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxBranches">Số chi nhánh tối đa</Label>
                  <Input
                    id="maxBranches"
                    name="maxBranches"
                    type="number"
                    value={formData.maxBranches}
                    onChange={handleChange}
                    disabled={isViewMode}
                    min={-1}
                  />
                  <p className="text-xs text-muted-foreground">-1 = Không giới hạn</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyPrice">Giá tháng (VNĐ)</Label>
                  <Input
                    id="monthlyPrice"
                    name="monthlyPrice"
                    type="number"
                    value={formData.monthlyPrice}
                    onChange={handleChange}
                    disabled={isViewMode}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearlyPrice">Giá năm (VNĐ)</Label>
                  <Input
                    id="yearlyPrice"
                    name="yearlyPrice"
                    type="number"
                    value={formData.yearlyPrice}
                    onChange={handleChange}
                    disabled={isViewMode}
                    min={0}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label>Tính năng</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(featureLabels) as Array<keyof PackageFeatures>).map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="text-sm">{featureLabels[feature]}</span>
                      {isViewMode ? (
                        formData.features[feature] ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )
                      ) : (
                        <Switch
                          checked={formData.features[feature]}
                          onCheckedChange={(checked) =>
                            handleFeatureChange(feature, checked)
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              {isViewMode ? (
                <Button type="button" onClick={() => setIsDialogOpen(false)}>
                  Đóng
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedPackage ? "Cập nhật" : "Thêm mới"}
                  </Button>
                </>
              )}
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
              Bạn có chắc chắn muốn xóa gói{" "}
              <span className="font-medium">{selectedPackage?.name}</span>? Hành
              động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
