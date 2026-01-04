"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Settings, User, Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuickCreateDropdown } from "@/components/ui/quick-create-dropdown";

interface HeaderProps {
  user?: {
    name: string;
    email: string;
    role: string;
  };
  onOpenCommandPalette?: () => void;
  onCreateItem?: (type: string) => void;
}

export function Header({ user, onOpenCommandPalette, onCreateItem }: HeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    router.push("/login");
  };

  const handleCreateItem = (type: string) => {
    if (onCreateItem) {
      onCreateItem(type);
    } else {
      // Default behavior: navigate to the respective page with create action
      const routes: Record<string, string> = {
        company: "/companies?action=create",
        brand: "/brands?action=create",
        branch: "/branches?action=create",
        category: "/categories?action=create",
        package: "/packages?action=create",
        admin: "/admins?action=create",
      };
      if (routes[type]) {
        router.push(routes[type]);
      }
    }
  };

  return (
    <header className="fixed left-64 right-0 top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">Web Admin</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search Bar / Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex h-9 w-64 items-center gap-2 rounded-lg border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Tìm kiếm...</span>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium sm:flex">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>

        {/* Quick Create Dropdown */}
        <QuickCreateDropdown onCreateItem={handleCreateItem} />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
            3
          </span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium">
                  {user?.name || "Admin User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.role === "super_admin" ? "Super Admin" : "Support"}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{user?.name || "Admin User"}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || "admin@techres.vn"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Thông tin cá nhân
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Cài đặt
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
