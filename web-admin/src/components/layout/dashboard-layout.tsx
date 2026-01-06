"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { CommandPalette, useCommandPalette } from "@/components/ui/command-palette";
import { useAuthStore } from "@/stores/auth-store";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();
  const authUser = useAuthStore((state) => state.user);

  // Get user from auth store or use default
  const user = authUser ? {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    role: authUser.role,
  } : {
    id: "",
    name: "Admin User",
    email: "admin@techres.vn",
    role: "super_admin",
  };

  const handleCreateItem = (type: string) => {
    // Navigate to the respective page with create action
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
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header
        user={user}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onCreateItem={handleCreateItem}
      />
      <main className="ml-64 pt-16">
        <div className="p-6">{children}</div>
      </main>

      {/* Command Palette - Global */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onCreateItem={handleCreateItem}
      />
    </div>
  );
}
