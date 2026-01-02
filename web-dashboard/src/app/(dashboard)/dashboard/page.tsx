"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import {
  UtensilsCrossed,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
} from "lucide-react";

export default function DashboardPage() {
  const { staff, company } = useAuthStore();

  const stats = [
    {
      title: "Doanh thu hôm nay",
      value: "2,450,000đ",
      change: "+12%",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Số đơn hàng",
      value: "45",
      change: "+8%",
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Món bán chạy",
      value: "Phở bò đặc biệt",
      change: "32 phần",
      icon: UtensilsCrossed,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Nhân viên đang làm",
      value: "8",
      change: "2 ca",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
            <CardDescription>Các đơn hàng và hoạt động mới nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Đơn hàng #{100 + i}</p>
                    <p className="text-xs text-muted-foreground">
                      Bàn {i} - {i * 2} món - {i * 150000}đ
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {i * 5} phút trước
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thống kê nhanh</CardTitle>
            <CardDescription>Tổng quan hoạt động trong ngày</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Đơn hoàn thành</span>
                <span className="font-medium">42/45 (93%)</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-[93%] bg-green-500 rounded-full"></div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Đơn đang làm</span>
                <span className="font-medium">3</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-[7%] bg-yellow-500 rounded-full"></div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Thanh toán tiền mặt</span>
                <span className="font-medium">1,200,000đ</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Thanh toán chuyển khoản</span>
                <span className="font-medium">1,250,000đ</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
