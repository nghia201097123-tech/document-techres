"use client";

import * as React from "react";
import { Plus, MoreHorizontal, ChefHat, Printer, Settings, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mock data
const kitchenStations = [
  {
    id: "1",
    name: "Bếp chính",
    printerName: "Kitchen_01",
    printerIp: "192.168.1.101",
    productCount: 15,
    isActive: true
  },
  {
    id: "2",
    name: "Quầy Bar",
    printerName: "Bar_01",
    printerIp: "192.168.1.102",
    productCount: 12,
    isActive: true
  },
  {
    id: "3",
    name: "Bếp lạnh",
    printerName: "Kitchen_02",
    printerIp: "192.168.1.103",
    productCount: 8,
    isActive: true
  },
  {
    id: "4",
    name: "Quầy Dessert",
    printerName: "Dessert_01",
    printerIp: null,
    productCount: 5,
    isActive: false
  },
];

const productMappings = [
  { product: "Phở bò tái", kitchens: ["Bếp chính"] },
  { product: "Phở bò chín", kitchens: ["Bếp chính"] },
  { product: "Cà phê sữa đá", kitchens: ["Quầy Bar"] },
  { product: "Combo Phở + Nước", kitchens: ["Bếp chính", "Quầy Bar"] },
  { product: "Lẩu hải sản", kitchens: ["Bếp chính", "Bếp lạnh"] },
];

export default function KitchenPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý bếp</h1>
          <p className="text-muted-foreground">Cấu hình bếp và gán món vào bếp để in</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Thêm bếp
        </Button>
      </div>

      {/* Kitchen Stations */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kitchenStations.map((station) => (
          <Card key={station.id} className={!station.isActive ? "opacity-60" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <ChefHat className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{station.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {station.productCount} món
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Sửa thông tin</DropdownMenuItem>
                    <DropdownMenuItem>Gán món ăn</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      {station.isActive ? "Tạm ngưng" : "Kích hoạt"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Printer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Máy in:</span>
                  <span className="font-mono text-xs">{station.printerName || "Chưa cấu hình"}</span>
                </div>
                {station.printerIp && (
                  <div className="flex items-center gap-2 text-sm">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">IP:</span>
                    <span className="font-mono text-xs">{station.printerIp}</span>
                  </div>
                )}
                <Badge variant={station.isActive ? "default" : "secondary"} className="mt-2">
                  {station.isActive ? "Hoạt động" : "Tạm ngưng"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Product Mapping */}
      <Card>
        <CardHeader>
          <CardTitle>Gán món vào bếp</CardTitle>
          <CardDescription>
            Mỗi món có thể gán vào nhiều bếp khác nhau (VD: Combo in ra cả Bếp và Bar)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Món ăn</TableHead>
                <TableHead>Bếp in</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productMappings.map((mapping, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{mapping.product}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {mapping.kitchens.map((kitchen) => (
                        <Badge key={kitchen} variant="outline">
                          {kitchen}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      Sửa
                    </Button>
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
