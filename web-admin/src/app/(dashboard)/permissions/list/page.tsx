"use client";

import * as React from "react";
import { Key, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Permission } from "@/types";

// Mock data - comprehensive permissions list
const mockPermissions: Permission[] = [
  // Company permissions
  { id: "1", code: "company.view", name: "Xem công ty", module: "company", description: "Xem danh sách và chi tiết công ty" },
  { id: "2", code: "company.create", name: "Tạo công ty", module: "company", description: "Thêm công ty mới vào hệ thống" },
  { id: "3", code: "company.edit", name: "Sửa công ty", module: "company", description: "Chỉnh sửa thông tin công ty" },
  { id: "4", code: "company.delete", name: "Xóa công ty", module: "company", description: "Xóa công ty khỏi hệ thống" },

  // Brand permissions
  { id: "5", code: "brand.view", name: "Xem thương hiệu", module: "brand", description: "Xem danh sách và chi tiết thương hiệu" },
  { id: "6", code: "brand.create", name: "Tạo thương hiệu", module: "brand", description: "Thêm thương hiệu mới" },
  { id: "7", code: "brand.edit", name: "Sửa thương hiệu", module: "brand", description: "Chỉnh sửa thông tin thương hiệu" },
  { id: "8", code: "brand.delete", name: "Xóa thương hiệu", module: "brand", description: "Xóa thương hiệu khỏi hệ thống" },

  // Branch permissions
  { id: "9", code: "branch.view", name: "Xem chi nhánh", module: "branch", description: "Xem danh sách và chi tiết chi nhánh" },
  { id: "10", code: "branch.create", name: "Tạo chi nhánh", module: "branch", description: "Thêm chi nhánh mới" },
  { id: "11", code: "branch.edit", name: "Sửa chi nhánh", module: "branch", description: "Chỉnh sửa thông tin chi nhánh" },
  { id: "12", code: "branch.delete", name: "Xóa chi nhánh", module: "branch", description: "Xóa chi nhánh khỏi hệ thống" },

  // Package permissions
  { id: "13", code: "package.view", name: "Xem gói", module: "package", description: "Xem danh sách và chi tiết gói App Food" },
  { id: "14", code: "package.create", name: "Tạo gói", module: "package", description: "Thêm gói App Food mới" },
  { id: "15", code: "package.edit", name: "Sửa gói", module: "package", description: "Chỉnh sửa thông tin gói" },
  { id: "16", code: "package.delete", name: "Xóa gói", module: "package", description: "Xóa gói App Food" },

  // Category permissions
  { id: "17", code: "category.view", name: "Xem danh mục", module: "category", description: "Xem danh sách danh mục thu/chi" },
  { id: "18", code: "category.create", name: "Tạo danh mục", module: "category", description: "Thêm danh mục thu/chi mới" },
  { id: "19", code: "category.edit", name: "Sửa danh mục", module: "category", description: "Chỉnh sửa danh mục thu/chi" },
  { id: "20", code: "category.delete", name: "Xóa danh mục", module: "category", description: "Xóa danh mục thu/chi" },

  // Permission management
  { id: "21", code: "permission.view", name: "Xem quyền", module: "permission", description: "Xem danh sách quyền và nhóm quyền" },
  { id: "22", code: "permission.manage", name: "Quản lý quyền", module: "permission", description: "Quản lý nhóm quyền và phân quyền" },

  // Admin management
  { id: "23", code: "admin.view", name: "Xem quản trị viên", module: "admin", description: "Xem danh sách quản trị viên" },
  { id: "24", code: "admin.create", name: "Tạo quản trị viên", module: "admin", description: "Thêm quản trị viên mới" },
  { id: "25", code: "admin.edit", name: "Sửa quản trị viên", module: "admin", description: "Chỉnh sửa thông tin quản trị viên" },
  { id: "26", code: "admin.delete", name: "Xóa quản trị viên", module: "admin", description: "Xóa quản trị viên" },

  // Report permissions
  { id: "27", code: "report.view", name: "Xem báo cáo", module: "report", description: "Xem các báo cáo hệ thống" },
  { id: "28", code: "report.export", name: "Xuất báo cáo", module: "report", description: "Xuất báo cáo ra file" },
];

const moduleLabels: Record<string, string> = {
  company: "Công ty",
  brand: "Thương hiệu",
  branch: "Chi nhánh",
  package: "Gói App Food",
  category: "Danh mục Thu/Chi",
  permission: "Phân quyền",
  admin: "Quản trị viên",
  report: "Báo cáo",
};

const moduleColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  company: "default",
  brand: "success",
  branch: "secondary",
  package: "warning",
  category: "default",
  permission: "destructive",
  admin: "secondary",
  report: "success",
};

export default function PermissionsListPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterModule, setFilterModule] = React.useState<string>("all");

  const modules = [...new Set(mockPermissions.map((p) => p.module))];

  const filteredPermissions = mockPermissions.filter((permission) => {
    const matchesSearch =
      permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (permission.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesModule =
      filterModule === "all" || permission.module === filterModule;
    return matchesSearch && matchesModule;
  });

  // Group permissions by module for display
  const groupedPermissions = React.useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    filteredPermissions.forEach((p) => {
      if (!grouped[p.module]) {
        grouped[p.module] = [];
      }
      grouped[p.module].push(p);
    });
    return grouped;
  }, [filteredPermissions]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Danh sách quyền</h2>
        <p className="text-muted-foreground">
          Tất cả các quyền trong hệ thống Web Admin
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              Tổng cộng {filteredPermissions.length} quyền
            </CardTitle>
            <div className="flex gap-2">
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Lọc theo module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả module</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {moduleLabels[module]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên, mã..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filterModule === "all" ? (
            // Show grouped by module when viewing all
            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([module, permissions]) => (
                <div key={module} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={moduleColors[module]}>
                      {moduleLabels[module]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({permissions.length} quyền)
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Tên quyền</TableHead>
                        <TableHead>Mã quyền</TableHead>
                        <TableHead>Mô tả</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissions.map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell>
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                              <Key className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {permission.name}
                          </TableCell>
                          <TableCell>
                            <code className="rounded bg-muted px-2 py-1 text-sm">
                              {permission.code}
                            </code>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {permission.description || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          ) : (
            // Show flat table when filtering by specific module
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Tên quyền</TableHead>
                  <TableHead>Mã quyền</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Mô tả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPermissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell>
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                        <Key className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {permission.name}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-2 py-1 text-sm">
                        {permission.code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={moduleColors[permission.module]}>
                        {moduleLabels[permission.module]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {permission.description || "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPermissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Không tìm thấy quyền nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
