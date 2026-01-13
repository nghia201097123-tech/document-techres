"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import {
  UtensilsCrossed,
  Users,
  ShoppingCart,
  DollarSign,
  Clock,
  AlertCircle,
} from "lucide-react";

export default function DashboardPage() {
  const { staff, company } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Xin chào, {staff?.name}!</h1>
          <p className="text-muted-foreground">
            Chào mừng đến với Dashboard quản lý {company?.name}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{new Date().toLocaleDateString("vi-VN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}</span>
        </div>
      </div>

      {/* Stats Grid - Empty State */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Doanh thu hôm nay
            </CardTitle>
            <div className="rounded-lg p-2 bg-green-100">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Chưa có dữ liệu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Số đơn hàng
            </CardTitle>
            <div className="rounded-lg p-2 bg-blue-100">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Chưa có dữ liệu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Món bán chạy
            </CardTitle>
            <div className="rounded-lg p-2 bg-orange-100">
              <UtensilsCrossed className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Chưa có dữ liệu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nhân viên đang làm
            </CardTitle>
            <div className="rounded-lg p-2 bg-purple-100">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Chưa có dữ liệu</p>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
            <CardDescription>Các đơn hàng và hoạt động mới nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có hoạt động nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Các đơn hàng sẽ xuất hiện ở đây
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thống kê nhanh</CardTitle>
            <CardDescription>Tổng quan hoạt động trong ngày</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có dữ liệu thống kê</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bắt đầu bán hàng để xem thống kê
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
