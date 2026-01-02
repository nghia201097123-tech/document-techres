"use client";

import { Plus, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function KitchenPage() {
  const kitchenStations: any[] = []; // Empty - will fetch from API

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
      {kitchenStations.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center justify-center text-center">
              <ChefHat className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có bếp nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm bếp&quot; để bắt đầu cấu hình
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Data will be rendered here */}
        </div>
      )}

      {/* Product Mapping */}
      <Card>
        <CardHeader>
          <CardTitle>Gán món vào bếp</CardTitle>
          <CardDescription>
            Mỗi món có thể gán vào nhiều bếp khác nhau (VD: Combo in ra cả Bếp và Bar)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ChefHat className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Chưa có cấu hình gán món - bếp</p>
            <p className="text-xs text-muted-foreground mt-1">
              Thêm bếp và món ăn trước để cấu hình
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
