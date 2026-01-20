"use client";

import * as React from "react";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import { staffService, type Staff, type CreateStaffDto, type Gender } from "@/services/staff-service";
import { ImageUpload } from "@/components/ui/image-upload";
import { ProvinceSelect, WardSelect } from "@/components/ui/searchable-select";
import { useAuthStore } from "@/stores/auth-store";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchWardsByProvince } from "@/store/slices/locationsSlice";

// Initial form data
const getInitialFormData = (): CreateStaffDto => ({
  name: "",
  avatarUrl: "",
  email: "",
  phone: "",
  birthDate: "",
  gender: "male",
  idNumber: "",
  address: "",
  provinceCode: "",
  wardCode: "",
  departmentId: "",
  brandId: "",
  branchId: "",
  usernamePrefix: "tr",
});

interface StaffFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  staffId?: string;
  onClose: () => void;
  onSuccess: (staff: Staff & { temporaryPassword?: string }) => void;
  continueCreating: boolean;
  setContinueCreating: (value: boolean) => void;
}

const StaffFormDialog = React.memo(function StaffFormDialog({
  open,
  mode,
  staffId,
  onClose,
  onSuccess,
  continueCreating,
  setContinueCreating,
}: StaffFormDialogProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const tenantId = useAuthStore((state) => state.tenantId);

  // Redux selectors
  const { items: brands, loading: loadingBrands } = useAppSelector((state) => state.brands);
  const { byBrandId: branchesByBrand, loading: loadingBranches } = useAppSelector((state) => state.branches);
  const { items: departments, loading: loadingDepartments } = useAppSelector((state) => state.departments);
  const { provinces, wardsByProvince, loadingProvinces, loadingWards } = useAppSelector((state) => state.locations);

  // ============ ALL STATE IS LOCAL TO THIS COMPONENT ============
  const [formData, setFormData] = React.useState<CreateStaffDto>(getInitialFormData);
  const [saving, setSaving] = React.useState(false);
  const [loadingStaff, setLoadingStaff] = React.useState(false);
  const [selectedStaff, setSelectedStaff] = React.useState<Staff | null>(null);
  const [createdStaff, setCreatedStaff] = React.useState<(Staff & { temporaryPassword: string }) | null>(null);

  // Get branches based on selected brand
  const branches = React.useMemo(() => {
    if (!formData.brandId) return [];
    return branchesByBrand[formData.brandId] || [];
  }, [formData.brandId, branchesByBrand]);

  // Get wards based on selected province
  const wards = React.useMemo(() => {
    if (!formData.provinceCode) return [];
    return wardsByProvince[formData.provinceCode] || [];
  }, [formData.provinceCode, wardsByProvince]);

  // Load staff data for edit mode
  React.useEffect(() => {
    if (!open) return;

    if (mode === "edit" && staffId) {
      setLoadingStaff(true);
      const loadStaff = async () => {
        try {
          const staff = await staffService.getById(staffId);
          setSelectedStaff(staff);
          setFormData({
            name: staff.name,
            avatarUrl: staff.avatarUrl || "",
            email: staff.email || "",
            phone: staff.phone || "",
            birthDate: staff.birthDate || "",
            gender: staff.gender || "male",
            idNumber: staff.idNumber || "",
            address: staff.address || "",
            provinceCode: staff.provinceCode || "",
            wardCode: staff.wardCode || "",
            departmentId: staff.departmentId || "",
            brandId: staff.brandId || "",
            branchId: staff.branchId || "",
            usernamePrefix: "tr",
          });
          // Load wards if province is set
          if (staff.provinceCode) {
            dispatch(fetchWardsByProvince(staff.provinceCode));
          }
        } catch (error) {
          console.error("Error loading staff:", error);
          toast({ title: "Lỗi", description: "Không thể tải thông tin nhân viên", variant: "destructive" });
        } finally {
          setLoadingStaff(false);
        }
      };
      loadStaff();
    } else {
      // Create mode - reset form
      setFormData(getInitialFormData());
      setSelectedStaff(null);
      setCreatedStaff(null);
    }
  }, [open, mode, staffId, toast, dispatch]);

  // Handle province change
  const handleProvinceChange = (provinceCode: string) => {
    setFormData(prev => ({ ...prev, provinceCode, wardCode: "" }));
    if (provinceCode) {
      dispatch(fetchWardsByProvince(provinceCode));
    }
  };

  // Handle brand change
  const handleBrandChange = (brandId: string) => {
    setFormData(prev => ({ ...prev, brandId, branchId: "" }));
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (mode === "create") {
      // Validate required fields for create
      if (!formData.name.trim() || !formData.birthDate || !formData.gender ||
          !formData.departmentId || !formData.brandId || !formData.branchId) {
        toast({ title: "Lỗi", description: "Vui lòng điền đầy đủ các trường bắt buộc", variant: "destructive" });
        return;
      }

      setSaving(true);
      try {
        const result = await staffService.create(formData);

        if (continueCreating) {
          // Reset form but keep brand, branch, department for continuous creation
          setFormData(prev => ({
            ...getInitialFormData(),
            brandId: prev.brandId,
            branchId: prev.branchId,
            departmentId: prev.departmentId,
            provinceCode: prev.provinceCode,
            wardCode: prev.wardCode,
          }));
          // Auto copy to clipboard
          const copyText = `Tên định danh: ${tenantId}\nTài khoản: ${result.username}\nMật khẩu: ${result.temporaryPassword}\nVui lòng ghi lại mật khẩu này và yêu cầu nhân viên đổi mật khẩu khi đăng nhập.`;
          navigator.clipboard.writeText(copyText);
          toast({ title: "Thành công", description: `Đã tạo nhân viên "${result.name}" và copy thông tin đăng nhập` });
          onSuccess(result);
        } else {
          // Show success screen with password
          setCreatedStaff(result);
          onSuccess(result);
        }
      } catch (error: any) {
        console.error("Error creating staff:", error);
        toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra khi tạo nhân viên", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    } else if (mode === "edit" && staffId) {
      // Validate required fields for update
      if (!formData.name.trim() || !formData.brandId || !formData.branchId) {
        toast({ title: "Lỗi", description: "Vui lòng điền đầy đủ các trường bắt buộc", variant: "destructive" });
        return;
      }

      setSaving(true);
      try {
        const result = await staffService.update(staffId, formData);
        toast({ title: "Thành công", description: "Đã cập nhật thông tin nhân viên" });
        onSuccess(result);
        onClose();
      } catch (error: any) {
        console.error("Error updating staff:", error);
        toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra khi cập nhật nhân viên", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleCloseAndReset = () => {
    setCreatedStaff(null);
    setSelectedStaff(null);
    setFormData(getInitialFormData());
    onClose();
  };

  const isLoading = loadingStaff;

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAndReset()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Thêm nhân viên mới" : "Chỉnh sửa nhân viên"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Nhập thông tin nhân viên. Hệ thống sẽ tự động tạo tài khoản và mật khẩu tạm thời."
              : "Cập nhật thông tin nhân viên"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : createdStaff ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4 border border-green-200">
              <p className="text-sm font-medium text-green-800 mb-3">Tạo nhân viên thành công!</p>
              <div className="space-y-2">
                <p className="text-sm text-green-700">
                  Tên nhân viên: <strong>{createdStaff.name}</strong>
                </p>
                <p className="text-sm text-green-700">
                  Tên đăng nhập: <strong className="font-mono">{createdStaff.username}</strong>
                </p>
                <p className="text-sm text-green-700">
                  Mật khẩu tạm thời: <strong className="font-mono">{createdStaff.temporaryPassword}</strong>
                </p>
              </div>
              <p className="text-xs text-green-600 mt-3">
                Vui lòng ghi lại thông tin này và yêu cầu nhân viên đổi mật khẩu khi đăng nhập lần đầu.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  const text = `Tên định danh: ${tenantId}\nTài khoản: ${createdStaff.username}\nMật khẩu: ${createdStaff.temporaryPassword}\nVui lòng ghi lại mật khẩu này và yêu cầu nhân viên đổi mật khẩu khi đăng nhập.`;
                  navigator.clipboard.writeText(text);
                  toast({ title: "Đã copy thông tin đăng nhập" });
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy thông tin
              </Button>
              <Button onClick={handleCloseAndReset}>Đóng</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Avatar Upload */}
              <div className="flex justify-center">
                <div className="grid gap-2 text-center">
                  <Label>Ảnh đại diện</Label>
                  <ImageUpload
                    value={formData.avatarUrl}
                    onChange={(url) => setFormData(prev => ({ ...prev, avatarUrl: url }))}
                    aspectRatio={1}
                    maxWidth={400}
                    maxHeight={400}
                    folder="staff"
                    circular
                    className="w-32 h-32 mx-auto"
                    placeholder="Chọn ảnh"
                  />
                </div>
              </div>

              {/* Row 1: Name and Username Prefix */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Tên nhân viên *</Label>
                  <Input
                    id="name"
                    placeholder="Nguyễn Văn A"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    autoComplete="off"
                  />
                </div>
                {mode === "create" && (
                  <div className="grid gap-2">
                    <Label htmlFor="usernamePrefix">Mã đăng nhập</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="usernamePrefix"
                        placeholder="tr"
                        maxLength={2}
                        className="w-20 text-center font-mono uppercase"
                        value={formData.usernamePrefix}
                        onChange={(e) => setFormData(prev => ({ ...prev, usernamePrefix: e.target.value.toLowerCase().replace(/[^a-z]/g, '').substring(0, 2) }))}
                        autoComplete="off"
                      />
                      <span className="text-muted-foreground font-mono">000001</span>
                      <span className="text-xs text-muted-foreground">(tự động)</span>
                    </div>
                  </div>
                )}
                {mode === "edit" && selectedStaff && (
                  <div className="grid gap-2">
                    <Label>Username</Label>
                    <Input value={selectedStaff.username} disabled className="font-mono" />
                  </div>
                )}
              </div>

              {/* Row 2: Birth Date and Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="birthDate">Ngày sinh *</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                    required={mode === "create"}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gender">Giới tính *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value: Gender) => setFormData(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn giới tính" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Nam</SelectItem>
                      <SelectItem value="female">Nữ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Province and Ward */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="provinceCode">Tỉnh/Thành phố</Label>
                  <ProvinceSelect
                    options={provinces}
                    value={formData.provinceCode || ""}
                    onValueChange={handleProvinceChange}
                    loading={loadingProvinces}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="wardCode">Phường/Xã</Label>
                  <WardSelect
                    options={wards}
                    value={formData.wardCode || ""}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, wardCode: value }))}
                    disabled={!formData.provinceCode || loadingWards}
                    loading={loadingWards}
                  />
                </div>
              </div>

              {/* Row 4: Address */}
              <div className="grid gap-2">
                <Label htmlFor="address">Địa chỉ chi tiết</Label>
                <Input
                  id="address"
                  placeholder="123 Nguyễn Văn Linh"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  autoComplete="off"
                />
              </div>

              {/* Row 5: Brand and Branch */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="brandId">Thương hiệu *</Label>
                  <Select
                    value={formData.brandId}
                    onValueChange={handleBrandChange}
                    disabled={loadingBrands}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn thương hiệu" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="branchId">Chi nhánh chính *</Label>
                  <Select
                    value={formData.branchId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, branchId: value }))}
                    disabled={!formData.brandId || loadingBranches || branches.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chi nhánh" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 6: Department */}
              <div className="grid gap-2">
                <Label htmlFor="departmentId">Bộ phận {mode === "create" ? "*" : ""}</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, departmentId: value }))}
                  disabled={loadingDepartments}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn bộ phận" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Row 7: ID Number, Email, Phone */}
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="idNumber">Số CCCD</Label>
                  <Input
                    id="idNumber"
                    placeholder="012345678912"
                    value={formData.idNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0901234567"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-4">
              {mode === "create" && (
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
                <Button type="button" variant="outline" onClick={handleCloseAndReset}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={saving || (mode === "create" && (!formData.name.trim() || !formData.birthDate || !formData.departmentId || !formData.brandId || !formData.branchId))}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "create" ? "Tạo nhân viên" : "Cập nhật"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
});

export default StaffFormDialog;
