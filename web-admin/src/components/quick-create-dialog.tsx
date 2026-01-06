"use client";

import * as React from "react";
import { Loader2, Zap, Check, Copy, CheckCircle } from "lucide-react";
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
import { companyService, type WizardResponse } from "@/services/company-service";
import { useToast } from "@/hooks/use-toast";

interface QuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: WizardResponse) => void;
}

export function QuickCreateDialog({ open, onOpenChange, onSuccess }: QuickCreateDialogProps) {
  const [companyName, setCompanyName] = React.useState("");
  const [isTrial, setIsTrial] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [createdResult, setCreatedResult] = React.useState<WizardResponse | null>(null);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng nhập tên công ty",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await companyService.quickCreate({
        companyName: companyName.trim(),
        isTrial,
      });
      setCreatedResult(result);
      onSuccess(result);
    } catch (error: any) {
      console.error("Error quick creating company:", error);
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
    setCompanyName("");
    setIsTrial(false);
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
              Tạo nhanh thành công!
            </DialogTitle>
            <DialogDescription>
              Đã tạo công ty &quot;{createdResult.company.name}&quot;
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

            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <p className="font-medium text-blue-800">Đã tự động tạo:</p>
              <ul className="text-blue-600 mt-1 space-y-1">
                <li>• Thương hiệu: {createdResult.brand.name}</li>
                <li>• Chi nhánh: {createdResult.branch.name}</li>
                <li>• Bộ phận: {createdResult.department.name}</li>
              </ul>
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Tạo nhanh công ty
          </DialogTitle>
          <DialogDescription>
            Chỉ cần nhập tên công ty, hệ thống sẽ tự động tạo thương hiệu, chi nhánh và tài khoản chủ nhà hàng.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tên công ty *</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="VD: Nhà hàng Phở Việt"
              autoFocus
            />
          </div>

          <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
            <Checkbox
              id="quickTrial"
              checked={isTrial}
              onCheckedChange={(checked) => setIsTrial(checked as boolean)}
            />
            <Label htmlFor="quickTrial" className="text-sm font-normal cursor-pointer">
              Dùng thử (15 ngày)
            </Label>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-1">Hệ thống sẽ tự động tạo:</p>
            <ul className="space-y-1 text-blue-600">
              <li>• Tiên định danh từ tên công ty</li>
              <li>• Thương hiệu cùng tên</li>
              <li>• Chi nhánh chính</li>
              <li>• Tài khoản chủ nhà hàng (mã: tr000001)</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !companyName.trim()}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Zap className="w-4 h-4 mr-2" />
            Tạo nhanh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
