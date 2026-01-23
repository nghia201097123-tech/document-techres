"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  UtensilsCrossed,
  FolderOpen,
  ChefHat,
  Settings,
  BarChart3,
  Store,
  ChevronDown,
  ChevronRight,
  Table2,
  MapPin,
  Cherry,
  StickyNote,
  Scale,
  Receipt,
  Calendar,
  Gift,
  Ticket,
  Percent,
  Link2,
  Truck,
  Wallet,
  FolderTree,
  Printer,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import * as React from "react";

interface MenuItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: "Tổng quan",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Nhân sự",
    icon: Users,
    children: [
      { title: "Nhân viên", href: "/hr/staff", icon: Users },
      { title: "Bộ phận", href: "/hr/departments", icon: Building2 },
    ],
  },
  {
    title: "Menu",
    icon: UtensilsCrossed,
    children: [
      { title: "Món ăn", href: "/menu/products", icon: UtensilsCrossed },
      { title: "Món theo CN", href: "/menu/branch-products", icon: Store },
      { title: "Danh mục", href: "/menu/categories", icon: FolderOpen },
      { title: "Đơn vị tính", href: "/menu/units", icon: Scale },
      { title: "Topping Options", href: "/menu/topping-options", icon: Cherry },
      { title: "Ghi chú", href: "/menu/product-notes", icon: StickyNote },
      { title: "Phụ thu", href: "/menu/surcharges", icon: Receipt },
      { title: "Giá thời vụ", href: "/menu/seasonal-prices", icon: Calendar },
      { title: "Món tặng", href: "/menu/gift-items", icon: Gift },
      { title: "Voucher", href: "/menu/vouchers", icon: Ticket },
      { title: "Coupon", href: "/menu/coupons", icon: Percent },
    ],
  },
  {
    title: "Quản lý bàn",
    icon: Table2,
    children: [
      { title: "Khu vực", href: "/tables/areas", icon: MapPin },
      { title: "Danh sách bàn", href: "/tables/list", icon: Table2 },
    ],
  },
  {
    title: "Bếp & Máy in",
    icon: ChefHat,
    children: [
      { title: "Quản lý bếp", href: "/kitchen", icon: ChefHat },
      { title: "Mẫu in Bill", href: "/settings/bill-template", icon: FileText },
      { title: "Máy in Bill", href: "/settings/bill-printer", icon: Printer },
    ],
  },
  {
    title: "Kết nối",
    icon: Link2,
    children: [
      { title: "App Food", href: "/integrations/food-partners", icon: Truck },
    ],
  },
  {
    title: "Tài chính",
    icon: Wallet,
    children: [
      { title: "Danh mục thu chi", href: "/finance/categories", icon: FolderTree },
      { title: "Phiếu thu chi", href: "/finance/vouchers", icon: Receipt },
    ],
  },
  {
    title: "Báo cáo",
    href: "/reports",
    icon: BarChart3,
  },
  {
    title: "Thiết lập",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { company } = useAuthStore();
  const [expandedItems, setExpandedItems] = React.useState<string[]>(["Nhân sự", "Menu", "Quản lý bàn", "Bếp & Máy in", "Kết nối", "Tài chính"]);

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const active = isActive(item.href);

    if (hasChildren) {
      return (
        <div key={item.title}>
          <button
            onClick={() => toggleExpand(item.title)}
            className={cn(
              "flex items-center w-full gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1 text-left">{item.title}</span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children!.map((child) => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.title}
        href={item.href!}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <item.icon className="h-4 w-4" />
        <span>{item.title}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Header */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Store className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">TechRes Dashboard</span>
          <span className="text-xs text-muted-foreground">
            {company?.name || "Nhà hàng"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {menuItems.map((item) => renderMenuItem(item))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground text-center">
          Tenant: <span className="font-mono font-semibold">{company?.code}</span>
        </div>
      </div>
    </div>
  );
}
