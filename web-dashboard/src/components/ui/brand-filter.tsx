"use client";

import * as React from "react";
import { Building2, Store, Loader2, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBrands } from "@/store/slices/brandsSlice";
import { fetchBranchesByBrand } from "@/store/slices/branchesSlice";
import { Card, CardContent } from "@/components/ui/card";

// Placeholder component when filter is required but not selected
interface FilterRequiredPlaceholderProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
}

export function FilterRequiredPlaceholder({
  icon,
  title,
  description,
}: FilterRequiredPlaceholderProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        {icon || <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />}
        <p className="text-lg font-medium text-muted-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
      </CardContent>
    </Card>
  );
}

interface BrandFilterProps {
  selectedBrandId: string;
  onBrandChange: (brandId: string) => void;
  showAllOption?: boolean;
  allLabel?: string;
  className?: string;
  placeholder?: string;
}

export function BrandFilter({
  selectedBrandId,
  onBrandChange,
  showAllOption = true,
  allLabel = "Tất cả thương hiệu",
  className,
  placeholder = "Chọn thương hiệu",
}: BrandFilterProps) {
  const dispatch = useAppDispatch();
  const { items: brands, loading } = useAppSelector((state) => state.brands);

  React.useEffect(() => {
    dispatch(fetchBrands());
  }, [dispatch]);

  return (
    <Select value={selectedBrandId} onValueChange={onBrandChange}>
      <SelectTrigger className={className || "w-[180px]"}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Building2 className="mr-2 h-4 w-4" />
        )}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showAllOption && <SelectItem value="all">{allLabel}</SelectItem>}
        {brands.filter(b => b.isActive).map((brand) => (
          <SelectItem key={brand.id} value={brand.id}>
            {brand.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface BrandBranchFilterProps {
  selectedBrandId: string;
  selectedBranchId: string;
  onBrandChange: (brandId: string) => void;
  onBranchChange: (branchId: string) => void;
  showAllOption?: boolean;
  allBrandLabel?: string;
  allBranchLabel?: string;
  brandClassName?: string;
  branchClassName?: string;
  brandPlaceholder?: string;
  branchPlaceholder?: string;
}

export function BrandBranchFilter({
  selectedBrandId,
  selectedBranchId,
  onBrandChange,
  onBranchChange,
  showAllOption = true,
  allBrandLabel = "Tất cả thương hiệu",
  allBranchLabel = "Tất cả chi nhánh",
  brandClassName,
  branchClassName,
  brandPlaceholder = "Chọn thương hiệu",
  branchPlaceholder = "Chọn chi nhánh",
}: BrandBranchFilterProps) {
  const dispatch = useAppDispatch();
  const { items: brands, loading: loadingBrands } = useAppSelector((state) => state.brands);
  const { byBrandId: branchesByBrand, loading: loadingBranches } = useAppSelector((state) => state.branches);

  const branches = selectedBrandId && selectedBrandId !== "all" && selectedBrandId !== ""
    ? branchesByBrand[selectedBrandId] || []
    : [];

  React.useEffect(() => {
    dispatch(fetchBrands());
  }, [dispatch]);

  React.useEffect(() => {
    if (selectedBrandId && selectedBrandId !== "all" && selectedBrandId !== "") {
      dispatch(fetchBranchesByBrand(selectedBrandId));
    }
  }, [selectedBrandId, dispatch]);

  const handleBrandChange = (brandId: string) => {
    onBrandChange(brandId);
    // Reset branch when brand changes
    onBranchChange("");
  };

  return (
    <>
      <Select value={selectedBrandId} onValueChange={handleBrandChange}>
        <SelectTrigger className={brandClassName || "w-[180px]"}>
          {loadingBrands ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Building2 className="mr-2 h-4 w-4" />
          )}
          <SelectValue placeholder={brandPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && <SelectItem value="all">{allBrandLabel}</SelectItem>}
          {brands.filter(b => b.isActive).map((brand) => (
            <SelectItem key={brand.id} value={brand.id}>
              {brand.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedBranchId}
        onValueChange={onBranchChange}
        disabled={!selectedBrandId || selectedBrandId === "all" || selectedBrandId === ""}
      >
        <SelectTrigger className={branchClassName || "w-[180px]"}>
          {loadingBranches ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Store className="mr-2 h-4 w-4" />
          )}
          <SelectValue placeholder={branchPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && <SelectItem value="all">{allBranchLabel}</SelectItem>}
          {branches.filter(b => b.isActive).map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
