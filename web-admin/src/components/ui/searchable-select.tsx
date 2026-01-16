"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface SearchableSelectOption {
  value: string;
  label: string;
  searchText?: string; // Additional text for searching
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Chọn...",
  searchPlaceholder = "Tìm kiếm...",
  emptyMessage = "Không tìm thấy.",
  disabled = false,
  loading = false,
  className,
  triggerClassName,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            triggerClassName
          )}
          disabled={disabled || loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : selectedOption ? (
            selectedOption.label
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-full p-0", className)} align="start">
        <Command
          filter={(value, search) => {
            const option = options.find((o) => o.value === value);
            if (!option) return 0;
            const searchLower = search.toLowerCase();
            const labelMatch = option.label.toLowerCase().includes(searchLower);
            const searchTextMatch = option.searchText?.toLowerCase().includes(searchLower);
            return labelMatch || searchTextMatch ? 1 : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Province/Ward specific searchable select with Vietnamese diacritics support
interface LocationSelectProps {
  options: Array<{ code: string; name: string; fullName?: string }>;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

// Remove Vietnamese diacritics for search
function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export function ProvinceSelect({
  options,
  value,
  onValueChange,
  placeholder = "Chọn tỉnh/thành phố",
  disabled = false,
  loading = false,
  className,
}: LocationSelectProps) {
  const searchableOptions: SearchableSelectOption[] = options.map((opt) => ({
    value: opt.code,
    label: opt.fullName || opt.name,
    searchText: removeVietnameseDiacritics(opt.fullName || opt.name),
  }));

  return (
    <SearchableSelect
      options={searchableOptions}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder="Tìm tỉnh/thành phố..."
      emptyMessage="Không tìm thấy tỉnh/thành phố."
      disabled={disabled}
      loading={loading}
      className={className}
    />
  );
}

export function WardSelect({
  options,
  value,
  onValueChange,
  placeholder = "Chọn phường/xã",
  disabled = false,
  loading = false,
  className,
}: LocationSelectProps) {
  const searchableOptions: SearchableSelectOption[] = options.map((opt) => ({
    value: opt.code,
    label: opt.fullName || opt.name,
    searchText: removeVietnameseDiacritics(opt.fullName || opt.name),
  }));

  return (
    <SearchableSelect
      options={searchableOptions}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder="Tìm phường/xã..."
      emptyMessage="Không tìm thấy phường/xã."
      disabled={disabled}
      loading={loading}
      className={className}
    />
  );
}
