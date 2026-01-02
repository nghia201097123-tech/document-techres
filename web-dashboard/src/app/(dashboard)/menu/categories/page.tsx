"use client";

import * as React from "react";
import { Plus, MoreHorizontal, FolderOpen, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data
const categories = [
  { id: "1", name: "Phở", productType: "food", productCount: 8, isActive: true },
  { id: "2", name: "Bún", productType: "food", productCount: 6, isActive: true },
  { id: "3", name: "Cơm", productType: "food", productCount: 12, isActive: true },
  { id: "4", name: "Cà phê", productType: "drink", productCount: 5, isActive: true },
  { id: "5", name: "Trà", productType: "drink", productCount: 7, isActive: true },
  { id: "6", name: "Sinh tố", productType: "drink", productCount: 4, isActive: false },
  { id: "7", name: "Topping", productType: "topping", productCount: 10, isActive: true },
  { id: "8", name: "Combo", productType: "combo", productCount: 3, isActive: true },
];

const typeLabels: Record<string, { label: string; color: string }> = {
  food: { label: "Đồ ăn", color: "bg-orange-100 text-orange-800" },
  drink: { label: "Đồ uống", color: "bg-blue-100 text-blue-800" },
  other: { label: "Khác", color: "bg-gray-100 text-gray-800" },
  topping: { label: "Topping", color: "bg-purple-100 text-purple-800" },
  combo: { label: "Combo", color: "bg-green-100 text-green-800" },
};

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý danh mục</h1>
          <p className="text-muted-foreground">Phân loại món ăn theo danh mục (thuộc 5 loại món)</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Thêm danh mục
        </Button>
      </div>

      {/* Category types */}
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(typeLabels).map(([key, { label, color }]) => (
          <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color}`}>
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {categories.filter((c) => c.productType === key).length} danh mục
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách danh mục</CardTitle>
          <CardDescription>Kéo thả để thay đổi thứ tự hiển thị</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex-1">
                  <div className="font-medium">{category.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {category.productCount} món ăn
                  </div>
                </div>

                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeLabels[category.productType]?.color}`}>
                  {typeLabels[category.productType]?.label}
                </span>

                <Badge variant={category.isActive ? "default" : "secondary"}>
                  {category.isActive ? "Hoạt động" : "Tạm ngưng"}
                </Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Sửa danh mục</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      {category.isActive ? "Tạm ngưng" : "Kích hoạt"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
