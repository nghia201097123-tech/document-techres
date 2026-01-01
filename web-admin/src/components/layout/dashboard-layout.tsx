"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // TODO: Get user from auth context/store
  const user = {
    name: "Admin User",
    email: "admin@techres.vn",
    role: "super_admin",
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header user={user} />
      <main className="ml-64 pt-16">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
