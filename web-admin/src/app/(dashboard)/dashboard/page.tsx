"use client";

import * as React from "react";
import { Building2, Store, MapPin, Package, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { dashboardService, type RecentCompany, type RecentBranch } from "@/services/dashboard-service";
import { formatRelativeTime } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

function StatCard({ title, value, description, icon: Icon, trend, loading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    companies: 0,
    brands: 0,
    branches: 0,
    packages: 0,
  });
  const [recentCompanies, setRecentCompanies] = React.useState<RecentCompany[]>([]);
  const [recentBranches, setRecentBranches] = React.useState<RecentBranch[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, companies, branches] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getRecentCompanies(3),
          dashboardService.getRecentBranches(3),
        ]);
        setStats(statsData);
        setRecentCompanies(companies);
        setRecentBranches(branches);
      } catch (error) {
        toast({
          title: "Lỗi",
          description: "Không thể tải dữ liệu dashboard",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

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
          loading={loading}
        />
        <StatCard
          title="Thương hiệu"
          value={stats.brands}
          description="Trên toàn hệ thống"
          icon={Store}
          loading={loading}
        />
        <StatCard
          title="Chi nhánh"
          value={stats.branches}
          description="Đang vận hành"
          icon={MapPin}
          loading={loading}
        />
        <StatCard
          title="Gói App Food"
          value={stats.packages}
          description="Đang hoạt động"
          icon={Package}
          loading={loading}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Công ty mới đăng ký</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentCompanies.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Chưa có công ty nào
              </p>
            ) : (
              <div className="space-y-4">
                {recentCompanies.map((company) => (
                  <div key={company.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(company.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chi nhánh mới</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentBranches.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Chưa có chi nhánh nào
              </p>
            ) : (
              <div className="space-y-4">
                {recentBranches.map((branch) => (
                  <div key={branch.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10">
                        <MapPin className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{branch.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {branch.brandName} • {formatRelativeTime(branch.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
