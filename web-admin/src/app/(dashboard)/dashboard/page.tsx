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
  Loader2,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickEntryForm } from "@/components/ui/quick-entry-form";
import { InlineEditableTable, Column } from "@/components/ui/inline-editable-table";
import { useToast } from "@/hooks/use-toast";
import { dashboardService, type RecentCompany, type RecentBranch } from "@/services/dashboard-service";
import { locationService } from "@/services/location-service";
import { formatRelativeTime } from "@/lib/utils";

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
  loading?: boolean;
}

function StatCard({ title, value, description, icon: Icon, href, trend, color, loading }: StatCardProps) {
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
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
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
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// Interface for inline editable company data
interface CompanyData {
  id: string;
  name: string;
  code: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

const companyColumns: Column<CompanyData>[] = [
  { key: "name", title: "Tên công ty", editable: true },
  { key: "code", title: "Mã", width: "100px" },
  { key: "email", title: "Email", editable: true, type: "email" },
  { key: "isActive", title: "Trạng thái", type: "status", width: "120px" },
  { key: "createdAt", title: "Thời gian", width: "120px" },
];

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

  // Convert RecentCompany to CompanyData for inline editing
  const [companies, setCompanies] = React.useState<CompanyData[]>([]);

  // Location seed state
  const [seedingLocations, setSeedingLocations] = React.useState(false);
  const [locationSeedResult, setLocationSeedResult] = React.useState<{ provinces: number; wards: number } | null>(null);

  // Mock brands for quick entry form
  const mockBrands = [
    { id: "1", name: "Coffee House" },
    { id: "2", name: "The Pizza Company" },
  ];

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, companiesData, branches] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getRecentCompanies(5),
          dashboardService.getRecentBranches(3),
        ]);
        setStats(statsData);
        setRecentCompanies(companiesData);
        setRecentBranches(branches);

        // Convert to editable format
        setCompanies(companiesData.map((c, index) => ({
          id: c.id,
          name: c.name,
          code: `C${String(index + 1).padStart(3, '0')}`,
          email: '',
          isActive: true,
          createdAt: formatRelativeTime(c.createdAt),
        })));
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

  // Handle quick entry submission
  const handleQuickEntry = async (type: string, data: Record<string, string>) => {
    try {
      // TODO: Call actual API
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
        toast({
          title: "Thành công",
          description: `Đã tạo ${data.name}`,
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tạo dữ liệu",
        variant: "destructive",
      });
    }
  };

  // Handle inline update
  const handleUpdate = async (id: string, field: string, value: unknown) => {
    try {
      // TODO: Call actual API
      await new Promise((resolve) => setTimeout(resolve, 300));
      setCompanies((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
      );
      toast({
        title: "Đã cập nhật",
        description: "Thay đổi đã được lưu",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      // TODO: Call actual API
      await new Promise((resolve) => setTimeout(resolve, 300));
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      toast({
        title: "Đã xóa",
        description: "Dữ liệu đã được xóa",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa",
        variant: "destructive",
      });
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (id: string) => {
    try {
      // TODO: Call actual API
      await new Promise((resolve) => setTimeout(resolve, 200));
      setCompanies((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
      );
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể thay đổi trạng thái",
        variant: "destructive",
      });
    }
  };

  // Handle location seed
  const handleSeedLocations = async () => {
    if (!confirm("Thao tác này sẽ xóa toàn bộ dữ liệu địa chỉ hành chính cũ và nhập dữ liệu mới (34 tỉnh/thành phố theo QĐ 19/2025/QĐ-TTg sau sáp nhập 07/2025). Bạn có chắc chắn?")) {
      return;
    }
    setSeedingLocations(true);
    setLocationSeedResult(null);
    try {
      const result = await locationService.seedLocations();
      setLocationSeedResult(result);
      toast({
        title: "Thành công",
        description: `Đã nhập ${result.provinces} tỉnh/thành phố và ${result.wards} xã/phường`,
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể nhập dữ liệu địa chỉ",
        variant: "destructive",
      });
    } finally {
      setSeedingLocations(false);
    }
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
          loading={loading}
        />
        <StatCard
          title="Thương hiệu"
          value={stats.brands}
          description="Trên toàn hệ thống"
          icon={Store}
          href="/brands"
          trend={{ value: 8, isPositive: true }}
          color="bg-purple-500/10 text-purple-500"
          loading={loading}
        />
        <StatCard
          title="Chi nhánh"
          value={stats.branches}
          description="Đang vận hành"
          icon={MapPin}
          href="/branches"
          trend={{ value: 15, isPositive: true }}
          color="bg-green-500/10 text-green-500"
          loading={loading}
        />
        <StatCard
          title="Gói App Food"
          value={stats.packages}
          description="Đang cung cấp"
          icon={Package}
          href="/packages"
          color="bg-orange-500/10 text-orange-500"
          loading={loading}
        />
      </div>

      {/* Quick Entry Form */}
      <QuickEntryForm
        onSubmit={handleQuickEntry}
        companies={companies.map((c) => ({ id: c.id, name: c.name }))}
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
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <InlineEditableTable
                data={companies}
                columns={companyColumns}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
                emptyMessage="Chưa có công ty nào"
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Branches */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-green-500/10 p-2">
                <Clock className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-base">Chi nhánh mới</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Cập nhật từ hệ thống
                </p>
              </div>
            </div>
            <Link href="/branches">
              <Button variant="ghost" size="sm">
                Xem tất cả
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
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
                  <div key={branch.id} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                      <MapPin className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{branch.name}</p>
                        <Badge variant="success" className="text-[10px] px-1.5 py-0">
                          Mới
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {branch.brandName}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeTime(branch.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Tools */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Database className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-base">Công cụ hệ thống</CardTitle>
              <p className="text-xs text-muted-foreground">
                Quản lý và cập nhật dữ liệu hệ thống
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Địa chỉ hành chính Việt Nam</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Cập nhật dữ liệu địa chỉ hành chính theo QĐ 19/2025/QĐ-TTg (sau sáp nhập 07/2025).
                  Cấu trúc mới: 34 tỉnh/thành phố → xã/phường (không còn cấp quận/huyện).
                </p>

                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                      <strong>Lưu ý:</strong> Thao tác này sẽ xóa toàn bộ dữ liệu địa chỉ cũ và thay thế bằng dữ liệu mới.
                    </p>
                  </div>
                </div>

                {locationSeedResult && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-green-800">
                        Đã nhập thành công: <strong>{locationSeedResult.provinces}</strong> tỉnh/thành phố
                        và <strong>{locationSeedResult.wards}</strong> xã/phường
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSeedLocations}
                  disabled={seedingLocations}
                  className="mt-4"
                  variant="outline"
                >
                  {seedingLocations ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {seedingLocations ? "Đang cập nhật..." : "Cập nhật dữ liệu địa chỉ"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
