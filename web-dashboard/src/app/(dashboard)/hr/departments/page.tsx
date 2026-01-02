"use client";

import * as React from "react";
import { Plus, Building2, Loader2, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { departmentService, type Department, type CreateDepartmentDto } from "@/services/department-service";

export default function DepartmentsPage() {
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [formData, setFormData] = React.useState<CreateDepartmentDto>({
    name: "",
    parentId: undefined,
    description: "",
  });

  // Load departments
  const loadDepartments = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await departmentService.getAll();
      setDepartments(data);
    } catch (error) {
      console.error("Error loading departments:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);
      const result = await departmentService.create(formData);
      setDepartments((prev) => [...prev, result]);
      setDialogOpen(false);
      setFormData({ name: "", parentId: undefined, description: "" });
    } catch (error) {
      console.error("Error creating department:", error);
      alert("Có lỗi xảy ra khi tạo bộ phận");
    } finally {
      setSaving(false);
    }
  };

  // Toggle expand
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Get children of a department
  const getChildren = (parentId: string) => {
    return departments.filter((d) => d.parentId === parentId);
  };

  // Get root departments (no parent)
  const rootDepartments = departments.filter((d) => !d.parentId);

  // Render department item
  const renderDepartment = (dept: Department, level: number = 0) => {
    const children = getChildren(dept.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(dept.id);

    return (
      <div key={dept.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-lg cursor-pointer`}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
          onClick={() => hasChildren && toggleExpand(dept.id)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <div className="w-4" />
          )}
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{dept.name}</span>
          <Badge variant={dept.isActive ? "default" : "secondary"} className="ml-auto">
            {dept.isActive ? "Hoạt động" : "Tạm ngưng"}
          </Badge>
        </div>
        {isExpanded && children.map((child) => renderDepartment(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý bộ phận</h1>
          <p className="text-muted-foreground">Cấu trúc bộ phận trong công ty (hỗ trợ cấp bậc cha-con)</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
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
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có bộ phận nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm bộ phận&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {rootDepartments.map((dept) => renderDepartment(dept))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Department Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm bộ phận mới</DialogTitle>
            <DialogDescription>
              Nhập thông tin bộ phận. Có thể chọn bộ phận cha để tạo cấu trúc phân cấp.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên bộ phận *</Label>
                <Input
                  id="name"
                  placeholder="Bộ phận bếp"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parent">Bộ phận cha</Label>
                <Select
                  value={formData.parentId || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, parentId: value === "none" ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn bộ phận cha (nếu có)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không có (Bộ phận gốc)</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả bộ phận..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving || !formData.name.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tạo bộ phận
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
