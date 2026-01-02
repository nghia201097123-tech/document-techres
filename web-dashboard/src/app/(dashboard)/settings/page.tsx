"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/stores/auth-store";
import { Building2, Store, MapPin, Clock, CreditCard, FileText } from "lucide-react";

export default function SettingsPage() {
  const { company } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Thiết lập</h1>
        <p className="text-muted-foreground">Cấu hình thông tin công ty, thương hiệu và chi nhánh</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Thông tin công ty</CardTitle>
            </div>
            <CardDescription>Thông tin chung của công ty</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tên công ty</Label>
              <Input value={company?.name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Mã công ty (Tiên định danh)</Label>
              <Input value={company?.code || ""} disabled className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={company?.email || ""} placeholder="contact@company.vn" />
            </div>
            <div className="space-y-2">
              <Label>Số điện thoại</Label>
              <Input value={company?.phone || ""} placeholder="028 1234 5678" />
            </div>
            <Button>Lưu thay đổi</Button>
          </CardContent>
        </Card>

        {/* Branch Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <CardTitle>Thiết lập chi nhánh</CardTitle>
            </div>
            <CardDescription>Cấu hình chi nhánh hiện tại</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tên chi nhánh</Label>
              <Input placeholder="Chi nhánh Quận 1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Giờ mở cửa</Label>
                <Input type="time" defaultValue="08:00" />
              </div>
              <div className="space-y-2">
                <Label>Giờ đóng cửa</Label>
                <Input type="time" defaultValue="22:00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Địa chỉ</Label>
              <Input placeholder="123 Nguyễn Huệ, Quận 1" />
            </div>
            <Button>Lưu thay đổi</Button>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Phương thức thanh toán</CardTitle>
            </div>
            <CardDescription>Cấu hình các phương thức thanh toán</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Tiền mặt</p>
                <p className="text-sm text-muted-foreground">Thanh toán bằng tiền mặt</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Chuyển khoản</p>
                <p className="text-sm text-muted-foreground">Thanh toán qua ngân hàng</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Thẻ tín dụng</p>
                <p className="text-sm text-muted-foreground">Thanh toán bằng thẻ</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ví điện tử</p>
                <p className="text-sm text-muted-foreground">MoMo, ZaloPay, VNPay...</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* E-Invoice Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Hóa đơn điện tử</CardTitle>
            </div>
            <CardDescription>Cấu hình liên kết đối tác HĐĐT</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Chưa liên kết đối tác HĐĐT
              </p>
              <Button variant="outline" className="mt-2">
                Thiết lập liên kết
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Hỗ trợ: FPT, INVOICE, MIFI, VNPT, MISA, HILO, VIETTEL
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
