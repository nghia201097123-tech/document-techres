"use client";

import * as React from "react";
import { Loader2, ChevronRight, ChevronLeft, Check, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { brandService } from "@/services/brand-service";
import { branchService } from "@/services/branch-service";
import { companyService } from "@/services/company-service";
import { locationService, type Province, type Ward } from "@/services/location-service";
import { useToast } from "@/hooks/use-toast";
import type { Brand, Branch, BusinessModel, Company } from "@/types";
import { ProvinceSelect, WardSelect } from "@/components/ui/searchable-select";

interface BrandWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (brand: Brand, branch: Branch) => void;
}

interface BrandWizardData {
  brand: {
    companyId: string;
    name: string;
    code: string;
    businessModel: BusinessModel;
    provinceCode: string;
    wardCode: string;
    address: string;
    description: string;
  };
  branch: {
    name: string;
    code: string;
    provinceCode: string;
    wardCode: string;
    address: string;
    phone: string;
    manager: string;
    openTime: string;
    closeTime: string;
  };
}

const STEPS = [
  { id: 1, title: "Thương hiệu", description: "Thông tin thương hiệu" },
  { id: 2, title: "Chi nhánh", description: "Chi nhánh đầu tiên" },
];

const initialWizardData: BrandWizardData = {
  brand: {
    companyId: "",
    name: "",
    code: "",
    businessModel: "full_system",
    provinceCode: "",
    wardCode: "",
    address: "",
    description: "",
  },
  branch: {
    name: "",
    code: "",
    provinceCode: "",
    wardCode: "",
    address: "",
    phone: "",
    manager: "",
    openTime: "08:00",
    closeTime: "22:00",
  },
};

// Helper: Remove Vietnamese diacritics
function removeVietnameseDiacritics(str: string): string {
  const diacriticsMap: { [key: string]: string } = {
    'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
    'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
    'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
    'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
    'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
    'đ': 'd',
    'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A',
    'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
    'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E',
    'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O',
    'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U',
    'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
    'Đ': 'D',
  };
  return str.split('').map(char => diacriticsMap[char] || char).join('');
}

// Helper: Generate code from name
function generateCode(name: string): string {
  if (!name) return "";
  const cleanName = removeVietnameseDiacritics(name);
  return cleanName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => w.charAt(0))
    .join("");
}

export function BrandWizard({ open, onOpenChange, onSuccess }: BrandWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [wizardData, setWizardData] = React.useState<BrandWizardData>(initialWizardData);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = React.useState(false);
  const [createdBrand, setCreatedBrand] = React.useState<Brand | null>(null);
  const [createdBranch, setCreatedBranch] = React.useState<Branch | null>(null);
  const { toast } = useToast();

  // Location state
  const [provinces, setProvinces] = React.useState<Province[]>([]);
  const [brandWards, setBrandWards] = React.useState<Ward[]>([]);
  const [branchWards, setBranchWards] = React.useState<Ward[]>([]);
  const [loadingProvinces, setLoadingProvinces] = React.useState(false);
  const [loadingBrandWards, setLoadingBrandWards] = React.useState(false);
  const [loadingBranchWards, setLoadingBranchWards] = React.useState(false);

  // Fetch companies and provinces when dialog opens
  React.useEffect(() => {
    if (open) {
      companyService.getList({ limit: 100 }).then((response) => {
        setCompanies(response.data);
      });
      setLoadingProvinces(true);
      locationService.getProvinces().then((data) => {
        setProvinces(data);
        setLoadingProvinces(false);
      }).catch(() => setLoadingProvinces(false));
    }
  }, [open]);

  // Load wards for brand when brand province changes
  React.useEffect(() => {
    if (wizardData.brand.provinceCode) {
      setLoadingBrandWards(true);
      locationService.getWards(wizardData.brand.provinceCode).then((data) => {
        setBrandWards(data);
        setLoadingBrandWards(false);
      }).catch(() => setLoadingBrandWards(false));
    } else {
      setBrandWards([]);
    }
  }, [wizardData.brand.provinceCode]);

  // Load wards for branch when branch province changes
  React.useEffect(() => {
    if (wizardData.branch.provinceCode) {
      setLoadingBranchWards(true);
      locationService.getWards(wizardData.branch.provinceCode).then((data) => {
        setBranchWards(data);
        setLoadingBranchWards(false);
      }).catch(() => setLoadingBranchWards(false));
    } else {
      setBranchWards([]);
    }
  }, [wizardData.branch.provinceCode]);

  const handleChange = (section: keyof BrandWizardData, field: string, value: string) => {
    setWizardData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleBrandNameChange = (name: string) => {
    handleChange("brand", "name", name);
    const suggestedCode = generateCode(name);
    if (!wizardData.brand.code || wizardData.brand.code === generateCode(wizardData.brand.name)) {
      handleChange("brand", "code", suggestedCode);
    }
  };

  const handleBranchNameChange = (name: string) => {
    handleChange("branch", "name", name);
    const suggestedCode = generateCode(name);
    if (!wizardData.branch.code || wizardData.branch.code === generateCode(wizardData.branch.name)) {
      handleChange("branch", "code", suggestedCode);
    }
  };

  // Handle company change - load company's province/ward as defaults for brand
  const handleCompanyChange = (companyId: string) => {
    const selectedCompany = companies.find((c) => c.id === companyId);
    setWizardData((prev) => ({
      ...prev,
      brand: {
        ...prev.brand,
        companyId,
        provinceCode: selectedCompany?.provinceCode || prev.brand.provinceCode,
        wardCode: selectedCompany?.wardCode || prev.brand.wardCode,
        address: selectedCompany?.address || prev.brand.address,
      },
    }));
  };

  // Handle brand province change - clear ward
  const handleBrandProvinceChange = (provinceCode: string) => {
    setWizardData((prev) => ({
      ...prev,
      brand: {
        ...prev.brand,
        provinceCode,
        wardCode: "",
      },
    }));
  };

  // Handle branch province change - clear ward
  const handleBranchProvinceChange = (provinceCode: string) => {
    setWizardData((prev) => ({
      ...prev,
      branch: {
        ...prev.branch,
        provinceCode,
        wardCode: "",
      },
    }));
  };

  // Copy brand location to branch when moving to step 2
  const handleNext = () => {
    const validation = validateStep(currentStep);
    if (!validation.valid) {
      toast({
        variant: "destructive",
        title: "Vui lòng điền đầy đủ thông tin",
        description: validation.errors.join(", "),
      });
      return;
    }
    if (currentStep < 2) {
      // Copy brand location to branch as defaults
      if (currentStep === 1) {
        setWizardData((prev) => ({
          ...prev,
          branch: {
            ...prev.branch,
            provinceCode: prev.branch.provinceCode || prev.brand.provinceCode,
            wardCode: prev.branch.wardCode || prev.brand.wardCode,
            address: prev.branch.address || prev.brand.address,
          },
        }));
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const validateStep = (step: number): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    switch (step) {
      case 1:
        if (!wizardData.brand.companyId?.trim()) {
          errors.push("Vui lòng chọn công ty");
        }
        if (!wizardData.brand.name?.trim()) {
          errors.push("Tên thương hiệu là bắt buộc");
        }
        if (!wizardData.brand.code?.trim()) {
          errors.push("Mã thương hiệu là bắt buộc");
        }
        break;
      case 2:
        if (!wizardData.branch.name?.trim()) {
          errors.push("Tên chi nhánh là bắt buộc");
        }
        if (!wizardData.branch.code?.trim()) {
          errors.push("Mã chi nhánh là bắt buộc");
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const validation = validateStep(2);
    if (!validation.valid) {
      toast({
        variant: "destructive",
        title: "Vui lòng điền đầy đủ thông tin",
        description: validation.errors.join(", "),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Create brand
      const brand = await brandService.create({
        companyId: wizardData.brand.companyId,
        name: wizardData.brand.name,
        code: wizardData.brand.code,
        businessModel: wizardData.brand.businessModel,
        provinceCode: wizardData.brand.provinceCode || undefined,
        wardCode: wizardData.brand.wardCode || undefined,
        address: wizardData.brand.address || undefined,
        description: wizardData.brand.description || undefined,
      });

      // Step 2: Create branch under the new brand
      const branch = await branchService.create({
        brandId: brand.id,
        name: wizardData.branch.name,
        code: wizardData.branch.code,
        provinceCode: wizardData.branch.provinceCode || undefined,
        wardCode: wizardData.branch.wardCode || undefined,
        address: wizardData.branch.address || undefined,
        phone: wizardData.branch.phone || undefined,
        manager: wizardData.branch.manager || undefined,
        openTime: wizardData.branch.openTime || undefined,
        closeTime: wizardData.branch.closeTime || undefined,
      });

      setCreatedBrand(brand);
      setCreatedBranch(branch);
      setShowSuccessDialog(true);
      onSuccess(brand, branch);
    } catch (error: any) {
      console.error("Error creating brand with branch:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tạo thương hiệu",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCurrentStep(1);
    setWizardData(initialWizardData);
  };

  const handleCloseSuccess = () => {
    setShowSuccessDialog(false);
    setCreatedBrand(null);
    setCreatedBranch(null);
    handleClose();
  };

  // Success dialog
  if (showSuccessDialog && createdBrand && createdBranch) {
    return (
      <Dialog open={showSuccessDialog} onOpenChange={handleCloseSuccess}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Tạo thương hiệu thành công!
            </DialogTitle>
            <DialogDescription>
              Đã tạo thương hiệu và chi nhánh đầu tiên
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Thương hiệu:</span>
                  <span className="font-medium">{createdBrand.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Mã thương hiệu:</span>
                  <code className="bg-background px-2 py-1 rounded text-sm font-mono">
                    {createdBrand.code}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Chi nhánh:</span>
                  <span className="font-medium">{createdBranch.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Mã chi nhánh:</span>
                  <code className="bg-background px-2 py-1 rounded text-sm font-mono">
                    {createdBranch.code}
                  </code>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleCloseSuccess}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo thương hiệu mới</DialogTitle>
          <DialogDescription>
            Hoàn thành 2 bước để tạo thương hiệu với chi nhánh đầu tiên
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-6">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep === step.id
                    ? "bg-primary text-primary-foreground"
                    : currentStep > step.id
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
              </div>
              {index < STEPS.length - 1 && (
                <div className={`w-16 h-0.5 ${currentStep > step.id ? "bg-green-500" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="text-center mb-4">
          <h3 className="font-semibold">{STEPS[currentStep - 1].title}</h3>
          <p className="text-sm text-muted-foreground">{STEPS[currentStep - 1].description}</p>
        </div>

        {/* Step content */}
        <div className="space-y-4 py-4">
          {/* Step 1: Brand */}
          {currentStep === 1 && (
            <>
              <div className="space-y-2">
                <Label>Công ty *</Label>
                <Select
                  value={wizardData.brand.companyId}
                  onValueChange={handleCompanyChange}
                >
                  <SelectTrigger>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên thương hiệu *</Label>
                  <Input
                    value={wizardData.brand.name}
                    onChange={(e) => handleBrandNameChange(e.target.value)}
                    placeholder="Phở 24"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mã thương hiệu *</Label>
                  <Input
                    value={wizardData.brand.code}
                    onChange={(e) => handleChange("brand", "code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    placeholder="P24"
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">Tự động gợi ý từ tên</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mô hình kinh doanh</Label>
                <Select
                  value={wizardData.brand.businessModel}
                  onValueChange={(value) => handleChange("brand", "businessModel", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_system">Full Hệ Thống</SelectItem>
                    <SelectItem value="ccb_only">Chỉ Thu Ngân</SelectItem>
                    <SelectItem value="order_only">Chỉ Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tỉnh/Thành phố</Label>
                  <ProvinceSelect
                    options={provinces}
                    value={wizardData.brand.provinceCode}
                    onValueChange={handleBrandProvinceChange}
                    loading={loadingProvinces}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phường/Xã</Label>
                  <WardSelect
                    options={brandWards}
                    value={wizardData.brand.wardCode}
                    onValueChange={(value) => handleChange("brand", "wardCode", value)}
                    disabled={!wizardData.brand.provinceCode}
                    loading={loadingBrandWards}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Địa chỉ chi tiết</Label>
                <Input
                  value={wizardData.brand.address}
                  onChange={(e) => handleChange("brand", "address", e.target.value)}
                  placeholder="Số nhà, đường..."
                />
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Input
                  value={wizardData.brand.description}
                  onChange={(e) => handleChange("brand", "description", e.target.value)}
                  placeholder="Mô tả thương hiệu (không bắt buộc)"
                />
              </div>
            </>
          )}

          {/* Step 2: Branch */}
          {currentStep === 2 && (
            <>
              <div className="p-3 bg-muted rounded-md mb-4">
                <p className="text-sm text-muted-foreground">
                  Thương hiệu <span className="font-medium text-foreground">{wizardData.brand.name}</span> cần có ít nhất một chi nhánh.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên chi nhánh *</Label>
                  <Input
                    value={wizardData.branch.name}
                    onChange={(e) => handleBranchNameChange(e.target.value)}
                    placeholder="Chi nhánh Quận 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mã chi nhánh *</Label>
                  <Input
                    value={wizardData.branch.code}
                    onChange={(e) => handleChange("branch", "code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    placeholder="CNQ1"
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">Tự động gợi ý từ tên</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tỉnh/Thành phố</Label>
                  <ProvinceSelect
                    options={provinces}
                    value={wizardData.branch.provinceCode}
                    onValueChange={handleBranchProvinceChange}
                    loading={loadingProvinces}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phường/Xã</Label>
                  <WardSelect
                    options={branchWards}
                    value={wizardData.branch.wardCode}
                    onValueChange={(value) => handleChange("branch", "wardCode", value)}
                    disabled={!wizardData.branch.provinceCode}
                    loading={loadingBranchWards}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Địa chỉ chi tiết (số nhà, đường)</Label>
                <Input
                  value={wizardData.branch.address}
                  onChange={(e) => handleChange("branch", "address", e.target.value)}
                  placeholder="123 Nguyễn Huệ"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  <Input
                    value={wizardData.branch.phone}
                    onChange={(e) => handleChange("branch", "phone", e.target.value)}
                    placeholder="028 1234 5678"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quản lý</Label>
                  <Input
                    value={wizardData.branch.manager}
                    onChange={(e) => handleChange("branch", "manager", e.target.value)}
                    placeholder="Tên quản lý"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Giờ mở cửa</Label>
                  <Input
                    type="time"
                    value={wizardData.branch.openTime}
                    onChange={(e) => handleChange("branch", "openTime", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giờ đóng cửa</Label>
                  <Input
                    type="time"
                    value={wizardData.branch.closeTime}
                    onChange={(e) => handleChange("branch", "closeTime", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={handlePrev}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Quay lại
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            {currentStep < 2 ? (
              <Button type="button" onClick={handleNext}>
                Tiếp theo
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Hoàn thành
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
