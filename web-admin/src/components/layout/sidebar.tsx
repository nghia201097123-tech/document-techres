"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Store,
  MapPin,
  Wallet,
  Package,
  Shield,
  Users,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  Settings,
  Landmark,
  CreditCard,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: { title: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Quản lý Công ty",
    href: "/companies",
    icon: Building2,
  },
  {
    title: "Quản lý Thương hiệu",
    href: "/brands",
    icon: Store,
  },
  {
    title: "Quản lý Chi nhánh",
    href: "/branches",
    icon: MapPin,
  },
  {
    title: "Danh mục Thu/Chi",
    href: "/transaction-categories",
    icon: Wallet,
  },
  {
    title: "Gói App Food",
    href: "/packages",
    icon: Package,
  },
  {
    title: "Phân quyền",
    icon: Shield,
    children: [
      { title: "Nhóm quyền", href: "/permissions/groups" },
      { title: "Danh sách quyền", href: "/permissions/list" },
    ],
  },
  {
    title: "Quản trị viên",
    href: "/admins",
    icon: Users,
  },
  {
    title: "Thiết lập",
    icon: Settings,
    children: [
      { title: "Tài khoản ngân hàng", href: "/settings/bank-accounts" },
      { title: "Phương thức thanh toán", href: "/settings/payment-methods" },
      { title: "Mẫu in", href: "/settings/print-templates" },
    ],
  },
];

interface SidebarItemProps {
  item: NavItem;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

function SidebarItem({ item, isActive, isOpen, onToggle }: SidebarItemProps) {
  const pathname = usePathname();
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    const isChildActive = item.children?.some((child) =>
      pathname.startsWith(child.href)
    );

    return (
      <div>
        <button
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isChildActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
          <span className="flex-1 text-left">{item.title}</span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {isOpen && (
          <div className="ml-4 mt-1 space-y-1 border-l pl-4">
            {item.children?.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm transition-colors",
                  pathname === child.href
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {child.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{item.title}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = React.useState<string[]>(["Phân quyền"]);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">TechRes Admin</span>
        </Link>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map((item) => (
          <SidebarItem
            key={item.title}
            item={item}
            isActive={item.href ? pathname === item.href : false}
            isOpen={openMenus.includes(item.title)}
            onToggle={() => toggleMenu(item.title)}
          />
        ))}
      </nav>
    </aside>
  );
}
