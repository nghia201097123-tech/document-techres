"use client";

import * as React from "react";
import { Plus, Search, MoreHorizontal, Building2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data - hierarchical structure
const departments = [
  {
    id: "1",
    name: "Chủ nhà hàng",
    description: "Bộ phận quản lý cấp cao",
    staffCount: 1,
    isActive: true,
    children: [],
  },
  {
    id: "2",
    name: "Bếp",
    description: "Bộ phận nấu ăn",
    staffCount: 5,
    isActive: true,
    children: [
      { id: "2.1", name: "Bếp chính", description: "Nấu món chính", staffCount: 2, isActive: true, children: [] },
      { id: "2.2", name: "Bếp phụ", description: "Hỗ trợ bếp chính", staffCount: 2, isActive: true, children: [] },
      { id: "2.3", name: "Sơ chế", description: "Chuẩn bị nguyên liệu", staffCount: 1, isActive: true, children: [] },
    ],
  },
  {
    id: "3",
    name: "Phục vụ",
    description: "Bộ phận phục vụ khách",
    staffCount: 6,
    isActive: true,
    children: [
      { id: "3.1", name: "Phục vụ bàn", description: "Phục vụ tại bàn", staffCount: 4, isActive: true, children: [] },
      { id: "3.2", name: "Thu ngân", description: "Thanh toán", staffCount: 2, isActive: true, children: [] },
    ],
  },
];

interface Department {
  id: string;
  name: string;
  description: string;
  staffCount: number;
  isActive: boolean;
  children: Department[];
}

function DepartmentItem({ dept, level = 0 }: { dept: Department; level?: number }) {
  const [expanded, setExpanded] = React.useState(true);
  const hasChildren = dept.children && dept.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="p-1">
            <ChevronRight
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <div className="w-6" />
        )}

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="h-4 w-4 text-primary" />
        </div>

        <div className="flex-1">
          <div className="font-medium">{dept.name}</div>
          <div className="text-xs text-muted-foreground">{dept.description}</div>
        </div>

        <Badge variant="outline">{dept.staffCount} nhân viên</Badge>
        <Badge variant={dept.isActive ? "default" : "secondary"}>
          {dept.isActive ? "Hoạt động" : "Tạm ngưng"}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Sửa bộ phận</DropdownMenuItem>
            <DropdownMenuItem>Thêm bộ phận con</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              {dept.isActive ? "Tạm ngưng" : "Kích hoạt"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && hasChildren && (
        <div>
          {dept.children.map((child) => (
            <DepartmentItem key={child.id} dept={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DepartmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý bộ phận</h1>
          <p className="text-muted-foreground">Cấu trúc bộ phận trong công ty (hỗ trợ cấp bậc cha-con)</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Thêm bộ phận
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cấu trúc bộ phận</CardTitle>
              <CardDescription>Tổng cộng {departments.length} bộ phận cấp 1</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {departments.map((dept) => (
              <DepartmentItem key={dept.id} dept={dept} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
