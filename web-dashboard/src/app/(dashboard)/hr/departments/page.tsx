"use client";

import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DepartmentsPage() {
  const departments: any[] = []; // Empty - will fetch from API

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
              <CardDescription>Tổng cộng {departments.length} bộ phận</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có bộ phận nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm bộ phận&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Data will be rendered here */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
