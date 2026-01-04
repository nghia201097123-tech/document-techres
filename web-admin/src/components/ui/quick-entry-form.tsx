"use client";

import * as React from "react";
import {
  Building2,
  Store,
  MapPin,
  Plus,
  Check,
  X,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EntityType = "company" | "brand" | "branch";

interface QuickEntryTab {
  id: EntityType;
  title: string;
  icon: React.ElementType;
  color: string;
}

const tabs: QuickEntryTab[] = [
  { id: "company", title: "Công ty", icon: Building2, color: "text-blue-500" },
  { id: "brand", title: "Thương hiệu", icon: Store, color: "text-purple-500" },
  { id: "branch", title: "Chi nhánh", icon: MapPin, color: "text-green-500" },
];

interface FormField {
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
  type?: string;
}

const formFields: Record<EntityType, FormField[]> = {
  company: [
    { name: "name", label: "Tên công ty", placeholder: "VD: Công ty TNHH ABC", required: true },
    { name: "code", label: "Mã", placeholder: "VD: ABC", required: true },
    { name: "email", label: "Email", placeholder: "VD: contact@abc.vn", type: "email" },
    { name: "phone", label: "Số điện thoại", placeholder: "VD: 0901234567" },
  ],
  brand: [
    { name: "name", label: "Tên thương hiệu", placeholder: "VD: Coffee House", required: true },
    { name: "code", label: "Mã", placeholder: "VD: CFH", required: true },
    { name: "companyId", label: "Công ty", placeholder: "Chọn công ty", required: true },
  ],
  branch: [
    { name: "name", label: "Tên chi nhánh", placeholder: "VD: Chi nhánh Quận 1", required: true },
    { name: "code", label: "Mã", placeholder: "VD: Q1", required: true },
    { name: "brandId", label: "Thương hiệu", placeholder: "Chọn thương hiệu", required: true },
    { name: "address", label: "Địa chỉ", placeholder: "VD: 123 Nguyễn Huệ, Q1" },
  ],
};

interface QuickEntryFormProps {
  onSubmit: (type: EntityType, data: Record<string, string>) => Promise<void>;
  onCancel?: () => void;
  companies?: Array<{ id: string; name: string }>;
  brands?: Array<{ id: string; name: string }>;
}

export function QuickEntryForm({ onSubmit, onCancel, companies = [], brands = [] }: QuickEntryFormProps) {
  const [activeTab, setActiveTab] = React.useState<EntityType>("company");
  const [formData, setFormData] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const currentFields = formFields[activeTab];

  const handleTabChange = (tabId: EntityType) => {
    setActiveTab(tabId);
    setFormData({});
    setShowSuccess(false);
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(activeTab, formData);
      setFormData({});
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error("Error submitting:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({});
    onCancel?.();
  };

  const isFormValid = currentFields
    .filter((f) => f.required)
    .every((f) => formData[f.name]?.trim());

  // Get visible fields (first 3 when collapsed, all when expanded)
  const visibleFields = isExpanded ? currentFields : currentFields.slice(0, 3);
  const hasMoreFields = currentFields.length > 3;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-primary" />
            Tạo nhanh
          </CardTitle>
          {showSuccess && (
            <div className="flex items-center gap-1 text-sm text-green-500">
              <Check className="h-4 w-4" />
              Đã lưu thành công!
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 pt-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "" : tab.color)} />
                {tab.title}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visibleFields.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name} className="text-xs">
                  {field.label}
                  {field.required && <span className="text-destructive">*</span>}
                </Label>
                {field.name === "companyId" ? (
                  <select
                    id={field.name}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">{field.placeholder}</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                ) : field.name === "brandId" ? (
                  <select
                    id={field.name}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">{field.placeholder}</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={field.name}
                    type={field.type || "text"}
                    placeholder={field.placeholder}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="h-9"
                  />
                )}
              </div>
            ))}

            {/* Action buttons */}
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
              <Button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="mr-1 h-4 w-4" />
                    Thêm
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Expand/Collapse button */}
          {hasMoreFields && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  isExpanded && "rotate-180"
                )}
              />
              {isExpanded ? "Thu gọn" : `Thêm ${currentFields.length - 3} trường khác`}
            </button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
