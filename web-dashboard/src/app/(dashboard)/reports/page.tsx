"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  ShoppingCart,
  Users,
  Clock,
} from "lucide-react";

export default function ReportsPage() {
  const revenueData = [
    { day: "T2", value: 2500000 },
    { day: "T3", value: 3200000 },
    { day: "T4", value: 2800000 },
    { day: "T5", value: 3500000 },
    { day: "T6", value: 4200000 },
    { day: "T7", value: 5100000 },
    { day: "CN", value: 4800000 },
  ];

  const maxValue = Math.max(...revenueData.map((d) => d.value));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + "đ";
  };

  const topProducts = [
    { name: "Phở bò tái", quantity: 156, revenue: 8580000 },
    { name: "Cà phê sữa đá", quantity: 243, revenue: 6075000 },
    { name: "Phở bò chín", quantity: 134, revenue: 7370000 },
    { name: "Combo trưa", quantity: 89, revenue: 7921000 },
    { name: "Trà đào", quantity: 167, revenue: 5010000 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Báo cáo</h1>
          <p className="text-muted-foreground">Thống kê doanh thu và hoạt động kinh doanh</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="week">
            <SelectTrigger className="w-[150px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hôm nay</SelectItem>
              <SelectItem value="week">Tuần này</SelectItem>
              <SelectItem value="month">Tháng này</SelectItem>
              <SelectItem value="quarter">Quý này</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Xuất báo cáo
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng doanh thu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">26,100,000đ</span>
            </div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> +15% so với tuần trước
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Số đơn hàng</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">342</span>
            </div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> +8% so với tuần trước
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Đơn trung bình</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">76,316đ</span>
            </div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> +5% so với tuần trước
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Khách hàng</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-600" />
              <span className="text-2xl font-bold">298</span>
            </div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> +12% so với tuần trước
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Doanh thu theo ngày</CardTitle>
            <CardDescription>7 ngày gần nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-[200px]">
              {revenueData.map((item) => (
                <div key={item.day} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-primary rounded-t-md"
                    style={{ height: `${(item.value / maxValue) * 160}px` }}
                  />
                  <span className="text-xs text-muted-foreground mt-2">{item.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Món bán chạy</CardTitle>
            <CardDescription>Top 5 món có doanh thu cao nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, idx) => (
                <div key={product.name} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.quantity} phần
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Phân bổ thanh toán</CardTitle>
          <CardDescription>Tỷ lệ các phương thức thanh toán</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <p className="text-sm text-green-800">Tiền mặt</p>
              <p className="text-2xl font-bold text-green-600">12,500,000đ</p>
              <p className="text-xs text-green-600">48% tổng doanh thu</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-800">Chuyển khoản</p>
              <p className="text-2xl font-bold text-blue-600">11,200,000đ</p>
              <p className="text-xs text-blue-600">43% tổng doanh thu</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-sm text-purple-800">Thẻ / Ví điện tử</p>
              <p className="text-2xl font-bold text-purple-600">2,400,000đ</p>
              <p className="text-xs text-purple-600">9% tổng doanh thu</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
