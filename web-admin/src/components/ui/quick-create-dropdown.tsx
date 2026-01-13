"use client";

import * as React from "react";
import {
  Building2,
  Store,
  MapPin,
  Package,
  Users,
  Wallet,
  Plus,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

export interface QuickCreateItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor?: string;
  bgColor?: string;
}

const quickCreateItems: QuickCreateItem[] = [
  {
    id: "company",
    title: "Công ty",
    description: "Thêm công ty mới",
    icon: Building2,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "brand",
    title: "Thương hiệu",
    description: "Thêm thương hiệu mới",
    icon: Store,
    iconColor: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "branch",
    title: "Chi nhánh",
    description: "Thêm chi nhánh mới",
    icon: MapPin,
    iconColor: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    id: "category",
    title: "Danh mục Thu/Chi",
    description: "Thêm danh mục mới",
    icon: Wallet,
    iconColor: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "package",
    title: "Gói App Food",
    description: "Thêm gói dịch vụ mới",
    icon: Package,
    iconColor: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    id: "admin",
    title: "Quản trị viên",
    description: "Thêm admin mới",
    icon: Users,
    iconColor: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
];

interface QuickCreateDropdownProps {
  onCreateItem: (type: string) => void;
  variant?: "default" | "compact";
}

export function QuickCreateDropdown({ onCreateItem, variant = "default" }: QuickCreateDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "compact" ? (
          <Button size="icon" className="h-9 w-9">
            <Plus className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Tạo mới
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          Tạo nhanh
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {quickCreateItems.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem
                key={item.id}
                onClick={() => onCreateItem(item.id)}
                className="cursor-pointer py-3"
              >
                <div className={`mr-3 flex h-9 w-9 items-center justify-center rounded-lg ${item.bgColor}`}>
                  <Icon className={`h-4 w-4 ${item.iconColor}`} />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          Nhấn <kbd className="rounded border bg-muted px-1">Ctrl</kbd> + <kbd className="rounded border bg-muted px-1">K</kbd> để mở Command Palette
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { quickCreateItems };
