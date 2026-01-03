"use client";

import * as React from "react";
import { Key, Search, Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import {
  permissionService,
  type Permission,
} from "@/services/permission-service";

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
  const { toast } = useToast();
  const [permissions, setPermissions] = React.useState<Permission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterModule, setFilterModule] = React.useState<string>("all");

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await permissionService.getAllPermissions({
        search: searchQuery || undefined,
        limit: 100,
      });
      setPermissions(response.data);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách quyền",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const modules = React.useMemo(() => {
    return [...new Set(permissions.map((p) => p.module))];
  }, [permissions]);

  const filteredPermissions = React.useMemo(() => {
    return permissions.filter((permission) => {
      const matchesModule = filterModule === "all" || permission.module === filterModule;
      return matchesModule;
    });
  }, [permissions, filterModule]);

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

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
                      {moduleLabels[module] || module}
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
            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([module, perms]) => (
                <div key={module} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={moduleColors[module] || "default"}>
                      {moduleLabels[module] || module}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({perms.length} quyền)
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
                      {perms.map((permission) => (
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
                      <Badge variant={moduleColors[permission.module] || "default"}>
                        {moduleLabels[permission.module] || permission.module}
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
