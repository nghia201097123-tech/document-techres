"use client";

import * as React from "react";
import { Plus, Search, MoreHorizontal, UtensilsCrossed, Filter } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock data
const products = [
  { id: "1", name: "Phở bò tái", code: "PHO001", category: "Đồ ăn", price: 55000, vatRate: 10, type: "food", isActive: true },
  { id: "2", name: "Phở bò chín", code: "PHO002", category: "Đồ ăn", price: 55000, vatRate: 10, type: "food", isActive: true },
  { id: "3", name: "Cà phê sữa đá", code: "CAFE001", category: "Đồ uống", price: 25000, vatRate: 10, type: "drink", isActive: true },
  { id: "4", name: "Trà đào", code: "TRA001", category: "Đồ uống", price: 30000, vatRate: 10, type: "drink", isActive: true },
  { id: "5", name: "Trứng thêm", code: "TOP001", category: "Topping", price: 10000, vatRate: 10, type: "topping", isActive: true },
  { id: "6", name: "Combo trưa", code: "CMB001", category: "Combo", price: 89000, vatRate: 10, type: "combo", isActive: true },
];

const typeLabels: Record<string, { label: string; color: string }> = {
  food: { label: "Đồ ăn", color: "bg-orange-100 text-orange-800" },
  drink: { label: "Đồ uống", color: "bg-blue-100 text-blue-800" },
  other: { label: "Khác", color: "bg-gray-100 text-gray-800" },
  topping: { label: "Topping", color: "bg-purple-100 text-purple-800" },
  combo: { label: "Combo", color: "bg-green-100 text-green-800" },
};

export default function ProductsPage() {
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || p.type === typeFilter;
    return matchSearch && matchType;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý món ăn</h1>
          <p className="text-muted-foreground">Thêm, sửa và quản lý menu món ăn theo thương hiệu</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Thêm món ăn
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách món ăn</CardTitle>
              <CardDescription>Tổng cộng {products.length} món</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Loại món" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="food">Đồ ăn</SelectItem>
                  <SelectItem value="drink">Đồ uống</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                  <SelectItem value="topping">Topping</SelectItem>
                  <SelectItem value="combo">Combo</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm món..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tên món</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead className="text-right">Giá</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-sm">{product.code}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeLabels[product.type]?.color}`}>
                      {typeLabels[product.type]?.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatPrice(product.price)}</TableCell>
                  <TableCell className="text-right">{product.vatRate}%</TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "Đang bán" : "Tạm ngưng"}
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
                        <DropdownMenuItem>Gán bếp in</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          {product.isActive ? "Tạm ngưng bán" : "Kích hoạt"}
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
