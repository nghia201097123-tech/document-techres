"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Store,
  MapPin,
  Package,
  TrendingUp,
  ArrowRight,
  Clock,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickEntryForm } from "@/components/ui/quick-entry-form";
import { InlineEditableTable, Column } from "@/components/ui/inline-editable-table";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  href: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: string;
}

function StatCard({ title, value, description, icon: Icon, href, trend, color }: StatCardProps) {
  return (
    <Link href={href}>
      <Card className="transition-all hover:shadow-md hover:border-primary/20 cursor-pointer group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={`rounded-lg p-2 ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">{value}</div>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
              {trend && (
                <div className="mt-1 flex items-center text-xs">
                  <TrendingUp
                    className={`mr-1 h-3 w-3 ${
                      trend.isPositive ? "text-green-500" : "text-red-500 rotate-180"
                    }`}
                  />
                  <span className={trend.isPositive ? "text-green-500" : "text-red-500"}>
                    {trend.isPositive ? "+" : "-"}{trend.value}%
                  </span>
                  <span className="ml-1 text-muted-foreground">tháng này</span>
                </div>
              )}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Mock data for companies
interface CompanyData {
  id: string;
  name: string;
  code: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

const mockCompanies: CompanyData[] = [
  { id: "1", name: "Công ty TNHH ABC", code: "ABC", email: "contact@abc.vn", isActive: true, createdAt: "2 giờ trước" },
  { id: "2", name: "Công ty Cổ phần XYZ", code: "XYZ", email: "info@xyz.com", isActive: true, createdAt: "5 giờ trước" },
  { id: "3", name: "Công ty TNHH DEF", code: "DEF", email: "hello@def.vn", isActive: false, createdAt: "1 ngày trước" },
];

const mockBrands = [
  { id: "1", name: "Coffee House" },
  { id: "2", name: "The Pizza Company" },
];

const companyColumns: Column<CompanyData>[] = [
  { key: "name", title: "Tên công ty", editable: true },
  { key: "code", title: "Mã", width: "100px" },
  { key: "email", title: "Email", editable: true, type: "email" },
  { key: "isActive", title: "Trạng thái", type: "status", width: "120px" },
  { key: "createdAt", title: "Thời gian", width: "120px" },
];

export default function DashboardPage() {
  const [companies, setCompanies] = React.useState(mockCompanies);

  // Stats data
  const stats = {
    companies: 25,
    brands: 48,
    branches: 156,
    packages: 4,
  };

  // Handle quick entry submission
  const handleQuickEntry = async (type: string, data: Record<string, string>) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("Quick entry:", type, data);

    if (type === "company") {
      const newCompany: CompanyData = {
        id: String(Date.now()),
        name: data.name,
        code: data.code,
        email: data.email || "",
        isActive: true,
        createdAt: "Vừa xong",
      };
      setCompanies((prev) => [newCompany, ...prev]);
    }
  };

  // Handle inline update
  const handleUpdate = async (id: string, field: string, value: unknown) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  };

  // Handle toggle status
  const handleToggleStatus = async (id: string) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Tổng quan về hệ thống quản lý TechRes
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span>Nhấn</span>
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-medium">Ctrl</kbd>
          <span>+</span>
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-medium">K</kbd>
          <span>để mở Command Palette</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng Công ty"
          value={stats.companies}
          description="Đang hoạt động"
          icon={Building2}
          href="/companies"
          trend={{ value: 12, isPositive: true }}
          color="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          title="Thương hiệu"
          value={stats.brands}
          description="Trên toàn hệ thống"
          icon={Store}
          href="/brands"
          trend={{ value: 8, isPositive: true }}
          color="bg-purple-500/10 text-purple-500"
        />
        <StatCard
          title="Chi nhánh"
          value={stats.branches}
          description="Đang vận hành"
          icon={MapPin}
          href="/branches"
          trend={{ value: 15, isPositive: true }}
          color="bg-green-500/10 text-green-500"
        />
        <StatCard
          title="Gói App Food"
          value={stats.packages}
          description="Đang cung cấp"
          icon={Package}
          href="/packages"
          color="bg-orange-500/10 text-orange-500"
        />
      </div>

      {/* Quick Entry Form */}
      <QuickEntryForm
        onSubmit={handleQuickEntry}
        companies={mockCompanies.map((c) => ({ id: c.id, name: c.name }))}
        brands={mockBrands}
      />

      {/* Recent Data Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Companies with Inline Edit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Building2 className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">Công ty gần đây</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Click vào ô để chỉnh sửa trực tiếp
                </p>
              </div>
            </div>
            <Link href="/companies">
              <Button variant="ghost" size="sm">
                Xem tất cả
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <InlineEditableTable
              data={companies}
              columns={companyColumns}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              emptyMessage="Chưa có công ty nào"
            />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-green-500/10 p-2">
                <Clock className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-base">Hoạt động gần đây</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Cập nhật từ hệ thống
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  icon: Building2,
                  iconBg: "bg-blue-500/10",
                  iconColor: "text-blue-500",
                  title: "Thêm công ty mới",
                  description: "Công ty TNHH ABC đã được tạo",
                  time: "2 giờ trước",
                  badge: { text: "Mới", variant: "success" as const },
                },
                {
                  icon: Store,
                  iconBg: "bg-purple-500/10",
                  iconColor: "text-purple-500",
                  title: "Cập nhật thương hiệu",
                  description: "Coffee House đã cập nhật thông tin",
                  time: "4 giờ trước",
                  badge: { text: "Cập nhật", variant: "secondary" as const },
                },
                {
                  icon: MapPin,
                  iconBg: "bg-green-500/10",
                  iconColor: "text-green-500",
                  title: "Chi nhánh mới",
                  description: "Chi nhánh Quận 1 đã được thêm",
                  time: "6 giờ trước",
                  badge: { text: "Mới", variant: "success" as const },
                },
                {
                  icon: Package,
                  iconBg: "bg-orange-500/10",
                  iconColor: "text-orange-500",
                  title: "Nâng cấp gói",
                  description: "XYZ Corp nâng cấp lên Premium",
                  time: "1 ngày trước",
                  badge: { text: "Nâng cấp", variant: "warning" as const },
                },
              ].map((activity, i) => {
                const Icon = activity.icon;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activity.iconBg}`}>
                      <Icon className={`h-4 w-4 ${activity.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        <Badge variant={activity.badge.variant} className="text-[10px] px-1.5 py-0">
                          {activity.badge.text}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.description}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {activity.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Tips */}
      <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Mẹo sử dụng nhanh</p>
                <p className="text-sm text-muted-foreground">
                  Sử dụng <kbd className="rounded border bg-background px-1">Ctrl+K</kbd> để tìm kiếm và tạo mới từ bất kỳ đâu •
                  Click vào ô trong bảng để chỉnh sửa trực tiếp •
                  Sử dụng form Tạo nhanh phía trên để thêm dữ liệu
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
