"use client";

import * as React from "react";
import { Loader2, Copy, Check, CheckCircle, Files } from "lucide-react";
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
import { companyService, type WizardResponse, type CloneCompanyData } from "@/services/company-service";
import type { Company } from "@/types";
import { useToast } from "@/hooks/use-toast";

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

function generateAlias(name: string): string {
  if (!name) return "";
  const cleanName = removeVietnameseDiacritics(name);
  const words = cleanName
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => w.charAt(0).toUpperCase())
    .join("");
  return words || cleanName.substring(0, 3).toUpperCase();
}

interface CloneCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceCompany: Company | null;
  onSuccess: (result: WizardResponse) => void;
}

export function CloneCompanyDialog({ open, onOpenChange, sourceCompany, onSuccess }: CloneCompanyDialogProps) {
  const [newName, setNewName] = React.useState("");
  const [newAlias, setNewAlias] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [isTrial, setIsTrial] = React.useState(false);
  const [cloneOptions, setCloneOptions] = React.useState({
    brands: true,
    branches: true,
    products: true,
    categories: true,
    staff: false,
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [createdResult, setCreatedResult] = React.useState<WizardResponse | null>(null);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const { toast } = useToast();

  // Reset form when dialog opens with new source
  React.useEffect(() => {
    if (open && sourceCompany) {
      setNewName(`${sourceCompany.name} (Copy)`);
      setNewAlias(generateAlias(`${sourceCompany.name} Copy`));
      setNewEmail("");
      setIsTrial(false);
      setCloneOptions({
        brands: true,
        branches: true,
        products: true,
        categories: true,
        staff: false,
      });
      setCreatedResult(null);
    }
  }, [open, sourceCompany]);

  const handleNameChange = (name: string) => {
    setNewName(name);
    setNewAlias(generateAlias(name));
  };

  const handleSubmit = async () => {
    if (!sourceCompany) return;

    if (!newName.trim() || !newAlias.trim() || !newEmail.trim()) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng nhập đầy đủ thông tin bắt buộc",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const data: CloneCompanyData = {
        sourceCompanyId: sourceCompany.id,
        newCompanyName: newName.trim(),
        newAlias: newAlias.trim(),
        newEmail: newEmail.trim(),
        isTrial,
        cloneOptions,
      };
      const result = await companyService.clone(data);
      setCreatedResult(result);
      onSuccess(result);
    } catch (error: any) {
      console.error("Error cloning company:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể nhân bản công ty",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setNewName("");
    setNewAlias("");
    setNewEmail("");
    setCreatedResult(null);
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

  // Success view
  if (createdResult) {
    const loginInfo = `Tiên định danh: ${createdResult.company.code}\nTài khoản: ${createdResult.staff.username}\nMật khẩu: ${createdResult.staff.temporaryPassword}`;

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Nhân bản thành công!
            </DialogTitle>
            <DialogDescription>
              Đã nhân bản từ &quot;{sourceCompany?.name}&quot; thành &quot;{createdResult.company.name}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <h4 className="font-semibold text-sm">Thông tin đăng nhập:</h4>

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
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Files className="w-5 h-5 text-blue-500" />
            Nhân bản công ty
          </DialogTitle>
          <DialogDescription>
            Tạo công ty mới từ bản sao của &quot;{sourceCompany?.name}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tên công ty mới *</Label>
            <Input
              value={newName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Tên công ty mới"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tiên định danh *</Label>
              <Input
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="ALIAS"
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@company.vn"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
            <Checkbox
              id="cloneTrial"
              checked={isTrial}
              onCheckedChange={(checked) => setIsTrial(checked as boolean)}
            />
            <Label htmlFor="cloneTrial" className="text-sm font-normal cursor-pointer">
              Dùng thử (15 ngày)
            </Label>
          </div>

          <div className="space-y-3">
            <Label>Dữ liệu nhân bản:</Label>
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cloneBrands"
                  checked={cloneOptions.brands}
                  onCheckedChange={(checked) => setCloneOptions(prev => ({ ...prev, brands: checked as boolean }))}
                />
                <Label htmlFor="cloneBrands" className="text-sm font-normal cursor-pointer">
                  Thương hiệu
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cloneBranches"
                  checked={cloneOptions.branches}
                  onCheckedChange={(checked) => setCloneOptions(prev => ({ ...prev, branches: checked as boolean }))}
                />
                <Label htmlFor="cloneBranches" className="text-sm font-normal cursor-pointer">
                  Chi nhánh
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cloneCategories"
                  checked={cloneOptions.categories}
                  onCheckedChange={(checked) => setCloneOptions(prev => ({ ...prev, categories: checked as boolean }))}
                />
                <Label htmlFor="cloneCategories" className="text-sm font-normal cursor-pointer">
                  Danh mục
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cloneProducts"
                  checked={cloneOptions.products}
                  onCheckedChange={(checked) => setCloneOptions(prev => ({ ...prev, products: checked as boolean }))}
                />
                <Label htmlFor="cloneProducts" className="text-sm font-normal cursor-pointer">
                  Món ăn
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cloneStaff"
                  checked={cloneOptions.staff}
                  onCheckedChange={(checked) => setCloneOptions(prev => ({ ...prev, staff: checked as boolean }))}
                />
                <Label htmlFor="cloneStaff" className="text-sm font-normal cursor-pointer">
                  Nhân viên (không có mật khẩu)
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !newName.trim() || !newEmail.trim()}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Files className="w-4 h-4 mr-2" />
            Nhân bản
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
