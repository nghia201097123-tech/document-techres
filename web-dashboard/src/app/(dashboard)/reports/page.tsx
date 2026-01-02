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
  Download,
  Calendar,
  DollarSign,
  ShoppingCart,
  Users,
} from "lucide-react";

export default function ReportsPage() {
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

      {/* Summary Stats - Empty State */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng doanh thu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">--</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Chưa có dữ liệu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Số đơn hàng</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">--</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Chưa có dữ liệu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Đơn trung bình</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">--</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Chưa có dữ liệu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Khách hàng</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-600" />
              <span className="text-2xl font-bold">--</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Chưa có dữ liệu</p>
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
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có dữ liệu doanh thu</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bắt đầu bán hàng để xem biểu đồ
              </p>
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
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có dữ liệu bán hàng</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bắt đầu bán hàng để xem thống kê
              </p>
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
              <p className="text-2xl font-bold text-green-600">--</p>
              <p className="text-xs text-muted-foreground">Chưa có dữ liệu</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-800">Chuyển khoản</p>
              <p className="text-2xl font-bold text-blue-600">--</p>
              <p className="text-xs text-muted-foreground">Chưa có dữ liệu</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-sm text-purple-800">Thẻ / Ví điện tử</p>
              <p className="text-2xl font-bold text-purple-600">--</p>
              <p className="text-xs text-muted-foreground">Chưa có dữ liệu</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
