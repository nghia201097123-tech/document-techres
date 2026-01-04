"use client";

import * as React from "react";
import { Building2, Store, Loader2 } from "lucide-react";
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

interface BrandFilterProps {
  selectedBrandId: string;
  onBrandChange: (brandId: string) => void;
  showAllOption?: boolean;
  allLabel?: string;
  className?: string;
}

export function BrandFilter({
  selectedBrandId,
  onBrandChange,
  showAllOption = true,
  allLabel = "Tất cả thương hiệu",
  className,
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
        <SelectValue placeholder="Thương hiệu" />
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
}: BrandBranchFilterProps) {
  const dispatch = useAppDispatch();
  const { items: brands, loading: loadingBrands } = useAppSelector((state) => state.brands);
  const { byBrandId: branchesByBrand, loading: loadingBranches } = useAppSelector((state) => state.branches);

  const branches = selectedBrandId && selectedBrandId !== "all"
    ? branchesByBrand[selectedBrandId] || []
    : [];

  React.useEffect(() => {
    dispatch(fetchBrands());
  }, [dispatch]);

  React.useEffect(() => {
    if (selectedBrandId && selectedBrandId !== "all") {
      dispatch(fetchBranchesByBrand(selectedBrandId));
    }
  }, [selectedBrandId, dispatch]);

  const handleBrandChange = (brandId: string) => {
    onBrandChange(brandId);
    // Reset branch when brand changes
    onBranchChange("all");
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
          <SelectValue placeholder="Thương hiệu" />
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
        disabled={!selectedBrandId || selectedBrandId === "all"}
      >
        <SelectTrigger className={branchClassName || "w-[180px]"}>
          {loadingBranches ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Store className="mr-2 h-4 w-4" />
          )}
          <SelectValue placeholder="Chi nhánh" />
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
