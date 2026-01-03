"use client";

import * as React from "react";
import { Loader2, ChevronRight, ChevronLeft, Check, Copy, CheckCircle } from "lucide-react";
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
import { locationService, type Province, type Ward } from "@/services/location-service";
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
    alias: "",
    email: "",
    isTrial: false,
    taxCode: "",
    addressDetail: "",
    provinceCode: "",
    wardCode: "",
    phone: "",
    representative: ""
  },
  brand: { name: "", description: "", businessModel: "full_system" },
  branch: {
    name: "",
    addressDetail: "",
    provinceCode: "",
    wardCode: "",
    phone: "",
    manager: "",
    openTime: "08:00",
    closeTime: "22:00"
  },
  staff: { name: "", phone: "", email: "", role: "owner", usernamePrefix: "tr" },
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

// Helper: Generate alias from company name (first letter of each word, no diacritics)
// Example: "Công ty điền quan" → "CTDQ"
function generateAlias(name: string): string {
  if (!name) return "";
  // Remove diacritics first
  const cleanName = removeVietnameseDiacritics(name);
  // Take first letter of EVERY word (including "Công", "ty", etc.)
  const words = cleanName
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => w.charAt(0).toUpperCase())
    .join("");
  return words || cleanName.substring(0, 3).toUpperCase();
}

export function CompanyWizard({ open, onOpenChange, onSuccess }: CompanyWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [wizardData, setWizardData] = React.useState<CreateCompanyWizardData>(initialWizardData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [createdResult, setCreatedResult] = React.useState<WizardResponse | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = React.useState(false);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const { toast } = useToast();

  // Location states
  const [provinces, setProvinces] = React.useState<Province[]>([]);
  const [companyWards, setCompanyWards] = React.useState<Ward[]>([]);
  const [branchWards, setBranchWards] = React.useState<Ward[]>([]);
  const [loadingLocations, setLoadingLocations] = React.useState(false);

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

  const loadCompanyWards = async (provinceCode: string) => {
    try {
      setLoadingLocations(true);
      const data = await locationService.getWards(provinceCode);
      setCompanyWards(data);
    } catch (error) {
      console.error("Error loading wards:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const loadBranchWards = async (provinceCode: string) => {
    try {
      setLoadingLocations(true);
      const data = await locationService.getWards(provinceCode);
      setBranchWards(data);
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

  const handleCompanyNameChange = (name: string) => {
    handleChange("company", "name", name);
    const suggestedAlias = generateAlias(name);
    if (!wizardData.company.alias || wizardData.company.alias === generateAlias(wizardData.company.name)) {
      handleChange("company", "alias", suggestedAlias);
    }
  };

  const handleCompanyProvinceChange = (provinceCode: string) => {
    handleChange("company", "provinceCode", provinceCode);
    handleChange("company", "wardCode", "");
    if (provinceCode) {
      loadCompanyWards(provinceCode);
    } else {
      setCompanyWards([]);
    }
  };

  const handleBranchProvinceChange = (provinceCode: string) => {
    handleChange("branch", "provinceCode", provinceCode);
    handleChange("branch", "wardCode", "");
    if (provinceCode) {
      loadBranchWards(provinceCode);
    } else {
      setBranchWards([]);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(wizardData.company.name && wizardData.company.alias && wizardData.company.email);
      case 2:
        return !!(wizardData.brand.name);
      case 3:
        return !!(wizardData.branch.name);
      case 4:
        // Bắt buộc tên và mã đăng nhập phải đủ 2 ký tự
        return !!(wizardData.staff.name && wizardData.staff.usernamePrefix?.length === 2);
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
      setCreatedResult(result);
      setShowSuccessDialog(true);
      onSuccess(result);
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
    setCompanyWards([]);
    setBranchWards([]);
  };

  const handleCloseSuccess = () => {
    setShowSuccessDialog(false);
    setCreatedResult(null);
    handleClose();
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Success dialog with login credentials
  if (showSuccessDialog && createdResult) {
    const trialMsg = wizardData.company.isTrial ? " (Dùng thử 15 ngày)" : "";
    const loginInfo = `Tiên định danh: ${createdResult.company.code}\nTài khoản: ${createdResult.staff.username}\nMật khẩu: ${createdResult.staff.temporaryPassword}`;

    return (
      <Dialog open={showSuccessDialog} onOpenChange={handleCloseSuccess}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Tạo công ty thành công!
            </DialogTitle>
            <DialogDescription>
              Đã tạo công ty {createdResult.company.name}{trialMsg}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <h4 className="font-semibold text-sm">Thông tin đăng nhập cho khách hàng:</h4>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tiên định danh:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-2 py-1 rounded text-sm font-mono">
                      {createdResult.company.code}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(createdResult.company.code, "code")}
                    >
                      {copiedField === "code" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tên đăng nhập:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-2 py-1 rounded text-sm font-mono">
                      {createdResult.staff.username}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(createdResult.staff.username, "username")}
                    >
                      {copiedField === "username" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Mật khẩu:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-2 py-1 rounded text-sm font-mono text-red-600">
                      {createdResult.staff.temporaryPassword}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(createdResult.staff.temporaryPassword, "password")}
                    >
                      {copiedField === "password" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => copyToClipboard(loginInfo, "all")}
                >
                  {copiedField === "all" ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      Đã sao chép!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Sao chép tất cả
                    </>
                  )}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Vui lòng gửi thông tin đăng nhập cho khách hàng và yêu cầu đổi mật khẩu ngay lần đăng nhập đầu tiên.
            </p>
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
              <div className="space-y-2">
                <Label>Tên công ty *</Label>
                <Input
                  value={wizardData.company.name}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  placeholder="Công ty TNHH ABC"
                />
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tỉnh/Thành phố</Label>
                  <Select
                    value={wizardData.company.provinceCode || ""}
                    onValueChange={handleCompanyProvinceChange}
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
                  <Label>Phường/Xã</Label>
                  <Select
                    value={wizardData.company.wardCode || ""}
                    onValueChange={(v) => handleChange("company", "wardCode", v)}
                    disabled={loadingLocations || !wizardData.company.provinceCode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phường/xã" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyWards.map((w) => (
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

          {/* Step 2: Brand - Bỏ mã thương hiệu */}
          {currentStep === 2 && (
            <>
              <div className="space-y-2">
                <Label>Tên thương hiệu *</Label>
                <Input
                  value={wizardData.brand.name}
                  onChange={(e) => handleChange("brand", "name", e.target.value)}
                  placeholder="Phở 24"
                />
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

          {/* Step 3: Branch - Bỏ mã chi nhánh */}
          {currentStep === 3 && (
            <>
              <div className="space-y-2">
                <Label>Tên chi nhánh *</Label>
                <Input
                  value={wizardData.branch.name}
                  onChange={(e) => handleChange("branch", "name", e.target.value)}
                  placeholder="Chi nhánh Quận 1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tỉnh/Thành phố</Label>
                  <Select
                    value={wizardData.branch.provinceCode || ""}
                    onValueChange={handleBranchProvinceChange}
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
                  <Label>Phường/Xã</Label>
                  <Select
                    value={wizardData.branch.wardCode || ""}
                    onValueChange={(v) => handleChange("branch", "wardCode", v)}
                    disabled={loadingLocations || !wizardData.branch.provinceCode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phường/xã" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchWards.map((w) => (
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
                  value={wizardData.branch.addressDetail}
                  onChange={(e) => handleChange("branch", "addressDetail", e.target.value)}
                  placeholder="123 Nguyễn Huệ"
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

          {/* Step 4: Staff - Bỏ bắt buộc email */}
          {currentStep === 4 && (
            <>
              <div className="p-3 bg-muted rounded-md mb-4">
                <p className="text-sm text-muted-foreground">
                  Bộ phận &quot;Chủ nhà hàng&quot; sẽ được tự động tạo. Nhân viên đầu tiên là chủ sở hữu hệ thống.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên chủ nhà hàng *</Label>
                  <Input
                    value={wizardData.staff.name}
                    onChange={(e) => handleChange("staff", "name", e.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mã đăng nhập *</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={wizardData.staff.usernamePrefix ?? ""}
                      onChange={(e) => {
                        // Chỉ cho phép chữ cái, chuyển thành chữ thường, tối đa 2 ký tự
                        const value = e.target.value.toLowerCase().replace(/[^a-z]/g, '').substring(0, 2);
                        handleChange("staff", "usernamePrefix", value);
                      }}
                      placeholder="tr"
                      maxLength={2}
                      className={`w-20 text-center font-mono uppercase ${
                        wizardData.staff.usernamePrefix && wizardData.staff.usernamePrefix.length !== 2
                          ? 'border-red-500 focus-visible:ring-red-500'
                          : ''
                      }`}
                    />
                    <span className="text-muted-foreground font-mono">000001</span>
                  </div>
                  <p className={`text-xs ${
                    wizardData.staff.usernamePrefix && wizardData.staff.usernamePrefix.length !== 2
                      ? 'text-red-500'
                      : 'text-muted-foreground'
                  }`}>
                    Bắt buộc 2 ký tự (a-z)
                  </p>
                </div>
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
                    placeholder="email@company.vn (không bắt buộc)"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Tài khoản đăng nhập sẽ được tự động tạo theo mã đăng nhập đã chọn. Ví dụ: tr000001
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
