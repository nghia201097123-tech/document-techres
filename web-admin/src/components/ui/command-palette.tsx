"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Store,
  MapPin,
  Package,
  Users,
  Shield,
  Wallet,
  LayoutDashboard,
  Search,
  Plus,
  ArrowRight,
  Command,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ElementType;
  type: "navigation" | "create" | "action";
  href?: string;
  action?: () => void;
  shortcut?: string;
}

const navigationItems: CommandItem[] = [
  { id: "dashboard", title: "Dashboard", description: "Tổng quan hệ thống", icon: LayoutDashboard, type: "navigation", href: "/dashboard" },
  { id: "companies", title: "Quản lý Công ty", description: "Danh sách công ty", icon: Building2, type: "navigation", href: "/companies" },
  { id: "brands", title: "Quản lý Thương hiệu", description: "Danh sách thương hiệu", icon: Store, type: "navigation", href: "/brands" },
  { id: "branches", title: "Quản lý Chi nhánh", description: "Danh sách chi nhánh", icon: MapPin, type: "navigation", href: "/branches" },
  { id: "categories", title: "Danh mục Thu/Chi", description: "Quản lý danh mục", icon: Wallet, type: "navigation", href: "/categories" },
  { id: "packages", title: "Gói App Food", description: "Các gói dịch vụ", icon: Package, type: "navigation", href: "/packages" },
  { id: "permissions", title: "Phân quyền", description: "Nhóm quyền & danh sách quyền", icon: Shield, type: "navigation", href: "/permissions/groups" },
  { id: "admins", title: "Quản trị viên", description: "Danh sách admin", icon: Users, type: "navigation", href: "/admins" },
];

const createItems: CommandItem[] = [
  { id: "create-company", title: "Tạo Công ty mới", description: "Thêm công ty vào hệ thống", icon: Building2, type: "create", shortcut: "C" },
  { id: "create-brand", title: "Tạo Thương hiệu mới", description: "Thêm thương hiệu mới", icon: Store, type: "create", shortcut: "B" },
  { id: "create-branch", title: "Tạo Chi nhánh mới", description: "Thêm chi nhánh mới", icon: MapPin, type: "create", shortcut: "N" },
  { id: "create-category", title: "Tạo Danh mục Thu/Chi", description: "Thêm danh mục mới", icon: Wallet, type: "create", shortcut: "D" },
  { id: "create-package", title: "Tạo Gói App Food", description: "Thêm gói dịch vụ mới", icon: Package, type: "create", shortcut: "P" },
  { id: "create-admin", title: "Tạo Quản trị viên", description: "Thêm admin mới", icon: Users, type: "create", shortcut: "A" },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateItem?: (type: string) => void;
}

export function CommandPalette({ open, onOpenChange, onCreateItem }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Filter items based on search
  const filteredNavigation = navigationItems.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCreate = createItems.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase())
  );

  const allItems = [...filteredNavigation, ...filteredCreate];

  // Handle keyboard navigation
  React.useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allItems.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
        break;
      case "Enter":
        e.preventDefault();
        if (allItems[selectedIndex]) {
          handleSelect(allItems[selectedIndex]);
        }
        break;
      case "Escape":
        onOpenChange(false);
        break;
    }
  };

  const handleSelect = (item: CommandItem) => {
    if (item.type === "navigation" && item.href) {
      router.push(item.href);
      onOpenChange(false);
    } else if (item.type === "create") {
      const type = item.id.replace("create-", "");
      onCreateItem?.(type);
      onOpenChange(false);
    } else if (item.action) {
      item.action();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-w-2xl">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={inputRef}
            placeholder="Tìm kiếm trang hoặc tạo mới... (nhập 'tạo' để xem lệnh tạo)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex h-12 w-full rounded-none border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            ESC
          </kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredNavigation.length > 0 && (
            <div className="mb-4">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Điều hướng
              </div>
              {filteredNavigation.map((item, index) => {
                const Icon = item.icon;
                const isSelected = selectedIndex === index;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{item.title}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-50" />
                  </button>
                );
              })}
            </div>
          )}

          {filteredCreate.length > 0 && (
            <div>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Tạo mới
              </div>
              {filteredCreate.map((item, index) => {
                const Icon = item.icon;
                const actualIndex = filteredNavigation.length + index;
                const isSelected = selectedIndex === actualIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500/10">
                      <Plus className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium">
                        <Icon className="h-4 w-4" />
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      )}
                    </div>
                    {item.shortcut && (
                      <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                        ⌘{item.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {allItems.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Không tìm thấy kết quả cho "{search}"
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-background px-1">↑</kbd>
              <kbd className="rounded border bg-background px-1">↓</kbd>
              để điều hướng
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-background px-1">Enter</kbd>
              để chọn
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="h-3 w-3" />
            <span>+</span>
            <kbd className="rounded border bg-background px-1">K</kbd>
            <span>để mở</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for keyboard shortcut
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return { open, setOpen };
}
