"use client";

import * as React from "react";
import { Plus, Search, MoreHorizontal, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data
const staffList = [
  { id: "1", name: "Nguyễn Văn A", phone: "0901234567", role: "owner", department: "Chủ nhà hàng", isActive: true },
  { id: "2", name: "Trần Thị B", phone: "0902345678", role: "manager", department: "Quản lý", isActive: true },
  { id: "3", name: "Lê Văn C", phone: "0903456789", role: "cashier", department: "Thu ngân", isActive: true },
  { id: "4", name: "Phạm Thị D", phone: "0904567890", role: "staff", department: "Phục vụ", isActive: true },
  { id: "5", name: "Hoàng Văn E", phone: "0905678901", role: "kitchen", department: "Bếp", isActive: false },
];

const roleLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  owner: { label: "Chủ sở hữu", variant: "default" },
  manager: { label: "Quản lý", variant: "secondary" },
  cashier: { label: "Thu ngân", variant: "outline" },
  staff: { label: "Nhân viên", variant: "outline" },
  kitchen: { label: "Bếp", variant: "outline" },
};

export default function StaffPage() {
  const [search, setSearch] = React.useState("");

  const filteredStaff = staffList.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý nhân viên</h1>
          <p className="text-muted-foreground">Thêm, sửa và quản lý nhân viên trong chi nhánh</p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Thêm nhân viên
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách nhân viên</CardTitle>
              <CardDescription>Tổng cộng {staffList.length} nhân viên</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm nhân viên..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên nhân viên</TableHead>
                <TableHead>Số điện thoại</TableHead>
                <TableHead>Bộ phận</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell className="font-medium">{staff.name}</TableCell>
                  <TableCell>{staff.phone}</TableCell>
                  <TableCell>{staff.department}</TableCell>
                  <TableCell>
                    <Badge variant={roleLabels[staff.role]?.variant || "outline"}>
                      {roleLabels[staff.role]?.label || staff.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={staff.isActive ? "default" : "secondary"}>
                      {staff.isActive ? "Hoạt động" : "Tạm ngưng"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Xem chi tiết</DropdownMenuItem>
                        <DropdownMenuItem>Sửa thông tin</DropdownMenuItem>
                        <DropdownMenuItem>Reset mật khẩu</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          {staff.isActive ? "Tạm ngưng" : "Kích hoạt"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
