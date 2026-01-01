"use client";

import * as React from "react";
import { Building2, Store, MapPin, Package, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className="mt-2 flex items-center text-xs">
            <TrendingUp
              className={`mr-1 h-3 w-3 ${
                trend.isPositive ? "text-green-500" : "text-red-500 rotate-180"
              }`}
            />
            <span className={trend.isPositive ? "text-green-500" : "text-red-500"}>
              {trend.isPositive ? "+" : "-"}{trend.value}%
            </span>
            <span className="ml-1 text-muted-foreground">so với tháng trước</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  // TODO: Fetch real data from API
  const stats = {
    companies: 25,
    brands: 48,
    branches: 156,
    packages: 4,
    activeUsers: 1250,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Tổng quan về hệ thống quản lý TechRes
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng Công ty"
          value={stats.companies}
          description="Đang hoạt động"
          icon={Building2}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Thương hiệu"
          value={stats.brands}
          description="Trên toàn hệ thống"
          icon={Store}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Chi nhánh"
          value={stats.branches}
          description="Đang vận hành"
          icon={MapPin}
          trend={{ value: 15, isPositive: true }}
        />
        <StatCard
          title="Gói App Food"
          value={stats.packages}
          description="Basic, Standard, Premium, Enterprise"
          icon={Package}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Công ty mới đăng ký</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Công ty TNHH ABC", date: "2 giờ trước" },
                { name: "Công ty Cổ phần XYZ", date: "5 giờ trước" },
                { name: "Công ty TNHH DEF", date: "1 ngày trước" },
              ].map((company, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{company.name}</p>
                      <p className="text-xs text-muted-foreground">{company.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chi nhánh mới</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Chi nhánh Quận 1", brand: "Thương hiệu A", date: "3 giờ trước" },
                { name: "Chi nhánh Quận 7", brand: "Thương hiệu B", date: "6 giờ trước" },
                { name: "Chi nhánh Thủ Đức", brand: "Thương hiệu A", date: "1 ngày trước" },
              ].map((branch, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10">
                      <MapPin className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{branch.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {branch.brand} • {branch.date}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
