"use client";

import * as React from "react";
import { Loader2, ChevronRight, ChevronLeft, Check } from "lucide-react";
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
import { companyService, type CreateCompanyWizardData, type WizardResponse } from "@/services/company-service";
import { locationService, type Province, type District, type Ward } from "@/services/location-service";
import { useToast } from "@/hooks/use-toast";

interface CompanyWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: WizardResponse) => void;
}

const STEPS = [
  { id: 1, title: "Công ty", description: "Thông tin công ty" },
  { id: 2, title: "Thương hiệu", description: "Thương hiệu đầu tiên" },
  { id: 3, title: "Chi nhánh", description: "Chi nhánh đầu tiên" },
  { id: 4, title: "Nhân viên", description: "Chủ nhà hàng" },
];

const initialWizardData: CreateCompanyWizardData = {
  company: {
    name: "",
    code: "",
    alias: "",
    email: "",
    isTrial: false,
    taxCode: "",
    addressDetail: "",
    provinceCode: "",
    districtCode: "",
    wardCode: "",
    phone: "",
    representative: ""
  },
  brand: { name: "", code: "", description: "", businessModel: "full_system" },
  branch: { name: "", code: "", address: "", phone: "", manager: "", openTime: "08:00", closeTime: "22:00" },
  staff: { name: "", phone: "", email: "", role: "owner" },
};

// Helper: Generate alias from company name
function generateAlias(name: string): string {
  if (!name) return "";
  // Lấy chữ cái đầu của mỗi từ, loại bỏ các từ phổ biến
  const skipWords = ["công", "ty", "tnhh", "cổ", "phần", "cp", "and", "và", "&"];
  const words = name
    .split(/\s+/)
    .filter(w => !skipWords.includes(w.toLowerCase()))
    .map(w => w.charAt(0).toUpperCase())
    .join("");
  return words || name.substring(0, 3).toUpperCase();
}

export function CompanyWizard({ open, onOpenChange, onSuccess }: CompanyWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [wizardData, setWizardData] = React.useState<CreateCompanyWizardData>(initialWizardData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  // Location states
  const [provinces, setProvinces] = React.useState<Province[]>([]);
  const [districts, setDistricts] = React.useState<District[]>([]);
  const [wards, setWards] = React.useState<Ward[]>([]);
  const [loadingLocations, setLoadingLocations] = React.useState(false);

  // Load provinces when dialog opens
  React.useEffect(() => {
    if (open && provinces.length === 0) {
      loadProvinces();
    }
  }, [open]);

  const loadProvinces = async () => {
    try {
      setLoadingLocations(true);
      const data = await locationService.getProvinces();
      setProvinces(data);
    } catch (error) {
      console.error("Error loading provinces:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const loadDistricts = async (provinceCode: string) => {
    try {
      setLoadingLocations(true);
      const data = await locationService.getDistricts(provinceCode);
      setDistricts(data);
      setWards([]); // Reset wards
    } catch (error) {
      console.error("Error loading districts:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const loadWards = async (districtCode: string) => {
    try {
      setLoadingLocations(true);
      const data = await locationService.getWards(districtCode);
      setWards(data);
    } catch (error) {
      console.error("Error loading wards:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleChange = (section: keyof CreateCompanyWizardData, field: string, value: string | boolean) => {
    setWizardData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  // Auto-generate alias when company name changes
  const handleCompanyNameChange = (name: string) => {
    handleChange("company", "name", name);
    // Auto-generate alias if not manually edited
    const suggestedAlias = generateAlias(name);
    if (!wizardData.company.alias || wizardData.company.alias === generateAlias(wizardData.company.name)) {
      handleChange("company", "alias", suggestedAlias);
    }
  };

  const handleProvinceChange = (provinceCode: string) => {
    handleChange("company", "provinceCode", provinceCode);
    handleChange("company", "districtCode", "");
    handleChange("company", "wardCode", "");
    if (provinceCode) {
      loadDistricts(provinceCode);
    } else {
      setDistricts([]);
      setWards([]);
    }
  };

  const handleDistrictChange = (districtCode: string) => {
    handleChange("company", "districtCode", districtCode);
    handleChange("company", "wardCode", "");
    if (districtCode) {
      loadWards(districtCode);
    } else {
      setWards([]);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(wizardData.company.name && wizardData.company.code && wizardData.company.alias && wizardData.company.email);
      case 2:
        return !!(wizardData.brand.name && wizardData.brand.code);
      case 3:
        return !!(wizardData.branch.name && wizardData.branch.code && wizardData.branch.address);
      case 4:
        return !!(wizardData.staff.name);
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc",
      });
      return;
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await companyService.createWithWizard(wizardData);
      const trialMsg = wizardData.company.isTrial ? " (Dùng thử 15 ngày)" : "";
      toast({
        title: "Thành công",
        description: `Đã tạo công ty ${result.company.name}${trialMsg}. Tài khoản: ${result.staff.username} / ${result.staff.temporaryPassword}`,
      });
      onSuccess(result);
      onOpenChange(false);
      // Reset form
      setCurrentStep(1);
      setWizardData(initialWizardData);
      setDistricts([]);
      setWards([]);
    } catch (error: any) {
      console.error("Error creating company:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tạo công ty",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCurrentStep(1);
    setWizardData(initialWizardData);
    setDistricts([]);
    setWards([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo công ty mới</DialogTitle>
          <DialogDescription>
            Hoàn thành 4 bước để tạo công ty với thương hiệu, chi nhánh và chủ nhà hàng
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6">
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
                <div className={`w-8 h-0.5 ${currentStep > step.id ? "bg-green-500" : "bg-muted"}`} />
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
          {/* Step 1: Company */}
          {currentStep === 1 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên công ty *</Label>
                  <Input
                    value={wizardData.company.name}
                    onChange={(e) => handleCompanyNameChange(e.target.value)}
                    placeholder="Công ty TNHH ABC"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mã công ty *</Label>
                  <Input
                    value={wizardData.company.code}
                    onChange={(e) => handleChange("company", "code", e.target.value.toLowerCase())}
                    placeholder="abcfood"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tiên định danh *</Label>
                  <Input
                    value={wizardData.company.alias}
                    onChange={(e) => handleChange("company", "alias", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    placeholder="CTAF"
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">Viết tắt để đăng nhập (tự động gợi ý từ tên)</p>
                </div>
                <div className="space-y-2">
                  <Label>Email công ty *</Label>
                  <Input
                    type="email"
                    value={wizardData.company.email}
                    onChange={(e) => handleChange("company", "email", e.target.value)}
                    placeholder="contact@company.vn"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
                <Checkbox
                  id="isTrial"
                  checked={wizardData.company.isTrial}
                  onCheckedChange={(checked) => handleChange("company", "isTrial", checked as boolean)}
                />
                <Label htmlFor="isTrial" className="text-sm font-normal cursor-pointer">
                  Dùng thử (15 ngày, sau đó tự động tạm ngưng nếu không nâng cấp)
                </Label>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tỉnh/Thành phố</Label>
                  <Select
                    value={wizardData.company.provinceCode || ""}
                    onValueChange={handleProvinceChange}
                    disabled={loadingLocations}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn tỉnh/thành" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p.code} value={p.code}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quận/Huyện</Label>
                  <Select
                    value={wizardData.company.districtCode || ""}
                    onValueChange={handleDistrictChange}
                    disabled={loadingLocations || !wizardData.company.provinceCode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn quận/huyện" />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((d) => (
                        <SelectItem key={d.code} value={d.code}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phường/Xã</Label>
                  <Select
                    value={wizardData.company.wardCode || ""}
                    onValueChange={(v) => handleChange("company", "wardCode", v)}
                    disabled={loadingLocations || !wizardData.company.districtCode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phường/xã" />
                    </SelectTrigger>
                    <SelectContent>
                      {wards.map((w) => (
                        <SelectItem key={w.code} value={w.code}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Địa chỉ chi tiết (số nhà, đường)</Label>
                <Input
                  value={wizardData.company.addressDetail}
                  onChange={(e) => handleChange("company", "addressDetail", e.target.value)}
                  placeholder="123 Nguyễn Văn Linh"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mã số thuế</Label>
                  <Input
                    value={wizardData.company.taxCode}
                    onChange={(e) => handleChange("company", "taxCode", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  <Input
                    value={wizardData.company.phone}
                    onChange={(e) => handleChange("company", "phone", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Người đại diện</Label>
                <Input
                  value={wizardData.company.representative}
                  onChange={(e) => handleChange("company", "representative", e.target.value)}
                />
              </div>
            </>
          )}

          {/* Step 2: Brand */}
          {currentStep === 2 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên thương hiệu *</Label>
                  <Input
                    value={wizardData.brand.name}
                    onChange={(e) => handleChange("brand", "name", e.target.value)}
                    placeholder="Phở 24"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mã thương hiệu *</Label>
                  <Input
                    value={wizardData.brand.code}
                    onChange={(e) => handleChange("brand", "code", e.target.value.toUpperCase())}
                    placeholder="PHO24"
                  />
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
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Input
                  value={wizardData.brand.description}
                  onChange={(e) => handleChange("brand", "description", e.target.value)}
                />
              </div>
            </>
          )}

          {/* Step 3: Branch */}
          {currentStep === 3 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên chi nhánh *</Label>
                  <Input
                    value={wizardData.branch.name}
                    onChange={(e) => handleChange("branch", "name", e.target.value)}
                    placeholder="Chi nhánh Quận 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mã chi nhánh *</Label>
                  <Input
                    value={wizardData.branch.code}
                    onChange={(e) => handleChange("branch", "code", e.target.value.toUpperCase())}
                    placeholder="CN-Q1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Địa chỉ *</Label>
                <Input
                  value={wizardData.branch.address}
                  onChange={(e) => handleChange("branch", "address", e.target.value)}
                  placeholder="123 Nguyễn Huệ, Quận 1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  <Input
                    value={wizardData.branch.phone}
                    onChange={(e) => handleChange("branch", "phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quản lý</Label>
                  <Input
                    value={wizardData.branch.manager}
                    onChange={(e) => handleChange("branch", "manager", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-2">
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
              </div>
            </>
          )}

          {/* Step 4: Staff (Chủ nhà hàng) */}
          {currentStep === 4 && (
            <>
              <div className="p-3 bg-muted rounded-md mb-4">
                <p className="text-sm text-muted-foreground">
                  Bộ phận &quot;Chủ nhà hàng&quot; sẽ được tự động tạo. Nhân viên đầu tiên là chủ sở hữu hệ thống.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Tên chủ nhà hàng *</Label>
                <Input
                  value={wizardData.staff.name}
                  onChange={(e) => handleChange("staff", "name", e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  <Input
                    value={wizardData.staff.phone}
                    onChange={(e) => handleChange("staff", "phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={wizardData.staff.email}
                    onChange={(e) => handleChange("staff", "email", e.target.value)}
                    placeholder="email@company.vn"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                * Nhân viên này sẽ thuộc bộ phận &quot;Chủ nhà hàng&quot; (tự động tạo). Tài khoản đăng nhập sẽ được tạo dựa trên email công ty.
              </p>
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
            {currentStep < 4 ? (
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
