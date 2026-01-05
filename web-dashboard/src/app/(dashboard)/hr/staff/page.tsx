"use client";

import * as React from "react";
import { Search, UserPlus, Users, Loader2, MoreHorizontal, Eye, Pencil, Power, Download, Upload, FileSpreadsheet, KeyRound, Shield, Settings2, ChevronDown, Building2, UserCog, Copy, Check, ArrowUpDown, ArrowUp, ArrowDown, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { staffService, bulkStaffService, type Staff, type CreateStaffDto, type UpdateStaffDto, type Gender, type BulkStaffItem, type BulkOperationResult } from "@/services/staff-service";
import { permissionService, type Permission } from "@/services/permission-service";
import { locationService } from "@/services/location-service";
import { exportToExcel, exportToExcelWithDropdowns, readExcelFile, downloadTemplateWithDependentDropdowns, type TemplateColumnWithDropdown, type DependentDropdownConfig, type DropdownOption, type ExportColumnWithDropdown } from "@/lib/excel-utils";
import { branchService, type Branch } from "@/services/branch-service";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useColumnConfig, type ColumnConfig } from "@/hooks/use-column-config";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";
import { BrandBranchFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";
import { ImageUpload } from "@/components/ui/image-upload";

// Default column configuration for staff table
const defaultStaffColumns: ColumnConfig[] = [
  { key: "avatar", label: "Ảnh", visible: true },
  { key: "name", label: "Tên nhân viên", visible: true, locked: true },
  { key: "username", label: "Username", visible: true },
  { key: "phone", label: "Số điện thoại", visible: true },
  { key: "email", label: "Email", visible: false },
  { key: "birthDate", label: "Ngày sinh", visible: false },
  { key: "gender", label: "Giới tính", visible: false },
  { key: "idNumber", label: "CCCD", visible: false },
  { key: "provinceName", label: "Tỉnh/Thành phố", visible: false },
  { key: "wardName", label: "Phường/Xã", visible: false },
  { key: "address", label: "Địa chỉ", visible: false },
  { key: "brandName", label: "Thương hiệu", visible: false },
  { key: "branchName", label: "Chi nhánh", visible: true },
  { key: "departmentName", label: "Bộ phận", visible: false },
  { key: "isActive", label: "Trạng thái", visible: true },
];

// Detail view field configuration
interface DetailFieldConfig {
  key: string;
  label: string;
  visible: boolean;
}

const defaultDetailFields: DetailFieldConfig[] = [
  { key: "name", label: "Tên nhân viên", visible: true },
  { key: "username", label: "Username", visible: true },
  { key: "birthDate", label: "Ngày sinh", visible: true },
  { key: "gender", label: "Giới tính", visible: true },
  { key: "phone", label: "Số điện thoại", visible: true },
  { key: "email", label: "Email", visible: true },
  { key: "idNumber", label: "CCCD", visible: true },
  { key: "address", label: "Địa chỉ", visible: true },
  { key: "branchName", label: "Chi nhánh", visible: true },
  { key: "departmentName", label: "Bộ phận", visible: true },
  { key: "isActive", label: "Trạng thái", visible: true },
  { key: "createdAt", label: "Ngày tạo", visible: true },
];

const DETAIL_FIELDS_STORAGE_KEY = "staff-detail-fields-config";

// Redux imports
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBrands } from "@/store/slices/brandsSlice";
import { fetchBranchesByBrand } from "@/store/slices/branchesSlice";
import { fetchDepartments } from "@/store/slices/departmentsSlice";
import { fetchProvinces, fetchWardsByProvince } from "@/store/slices/locationsSlice";

const initialFormData: CreateStaffDto = {
  name: "",
  avatarUrl: "",
  email: "",
  phone: "",
  birthDate: "",
  gender: "male",
  idNumber: "",
  address: "",
  provinceCode: "",
  wardCode: "",
  departmentId: "",
  brandId: "",
  branchId: "",
  usernamePrefix: "tr",
};

// Excel column configuration for export
const excelColumns = [
  { key: "id" as keyof Staff, header: "ID", width: 40 },
  { key: "name" as keyof Staff, header: "Tên nhân viên", width: 25 },
  { key: "username" as keyof Staff, header: "Username", width: 15 },
  { key: "phone" as keyof Staff, header: "Số điện thoại", width: 15 },
  { key: "email" as keyof Staff, header: "Email", width: 25 },
  { key: "birthDate" as keyof Staff, header: "Ngày sinh", width: 12 },
  { key: "gender" as keyof Staff, header: "Giới tính", width: 10 },
  { key: "idNumber" as keyof Staff, header: "CCCD", width: 15 },
  { key: "provinceName" as keyof Staff, header: "Tỉnh/Thành phố", width: 20 },
  { key: "wardName" as keyof Staff, header: "Phường/Xã", width: 20 },
  { key: "address" as keyof Staff, header: "Địa chỉ", width: 30 },
  { key: "brandName" as keyof Staff, header: "Thương hiệu", width: 20 },
  { key: "branchName" as keyof Staff, header: "Chi nhánh", width: 20 },
  { key: "departmentName" as keyof Staff, header: "Bộ phận", width: 20 },
  { key: "isActive" as keyof Staff, header: "Hoạt động", width: 10 },
];

// Extended import data with name fields for lookup
interface ImportDataWithNames extends Omit<Partial<BulkStaffItem>, 'isActive'> {
  provinceName?: string;
  wardName?: string;
  brandName?: string;
  branchName?: string;
  departmentName?: string;
  isActive?: string | boolean; // Can be "Có"/"Không" from Excel or boolean
}

// Excel column mapping for import - includes both ID and NAME columns
const importColumnMapping: { excelHeader: string; key: keyof ImportDataWithNames }[] = [
  { excelHeader: "ID", key: "id" },
  { excelHeader: "Tên nhân viên", key: "name" },
  { excelHeader: "Số điện thoại", key: "phone" },
  { excelHeader: "Email", key: "email" },
  { excelHeader: "Ngày sinh", key: "birthDate" },
  { excelHeader: "Giới tính", key: "gender" },
  { excelHeader: "CCCD", key: "idNumber" },
  { excelHeader: "Địa chỉ", key: "address" },
  // Name columns for lookup
  { excelHeader: "Tỉnh/Thành phố", key: "provinceName" },
  { excelHeader: "Phường/Xã", key: "wardName" },
  { excelHeader: "Thương hiệu", key: "brandName" },
  { excelHeader: "Chi nhánh", key: "branchName" },
  { excelHeader: "Bộ phận", key: "departmentName" },
  { excelHeader: "Hoạt động", key: "isActive" },
];


// Import settings for new staff
interface ImportSettings {
  brandId: string;
  branchId: string;
  departmentId: string;
  provinceCode: string;
  wardCode: string;
}

const initialImportSettings: ImportSettings = {
  brandId: "",
  branchId: "",
  departmentId: "",
  provinceCode: "",
  wardCode: "",
};

type DialogMode = "create" | "edit" | "view" | "import" | null;
type BulkOperation = "department" | "branch" | "activate" | "deactivate" | "reset-password" | null;

export default function StaffPage() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Column configuration hook
  const {
    columns: staffColumns,
    visibleColumns,
    toggleColumn,
    resetToDefault: resetColumns,
    isColumnVisible,
  } = useColumnConfig({
    storageKey: "staff-table-columns",
    defaultColumns: defaultStaffColumns,
  });

  // Redux selectors
  const { items: brands, loading: loadingBrands } = useAppSelector((state) => state.brands);
  const { byBrandId: branchesByBrand, loading: loadingBranches } = useAppSelector((state) => state.branches);
  const { items: departments, loading: loadingDepartments } = useAppSelector((state) => state.departments);
  const { provinces, wardsByProvince, loadingProvinces, loadingWards } = useAppSelector((state) => state.locations);

  // Global filter state from Redux
  const { brandId: filterBrandId, branchId: filterBranchId, setBrandId: setFilterBrandId, setBranchId: setFilterBranchId } = useGlobalFilters();

  // Local state
  const [search, setSearch] = React.useState("");
  const [staffList, setStaffList] = React.useState<Staff[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<CreateStaffDto>(initialFormData);
  const [selectedStaff, setSelectedStaff] = React.useState<Staff | null>(null);
  const [createdStaff, setCreatedStaff] = React.useState<(Staff & { temporaryPassword: string }) | null>(null);

  // Track newly created staff IDs for "New" badge
  const [newStaffIds, setNewStaffIds] = React.useState<Set<string>>(new Set());
  // Track updated staff IDs for "Updated" badge
  const [updatedStaffIds, setUpdatedStaffIds] = React.useState<Set<string>>(new Set());

  // Import state
  const [importData, setImportData] = React.useState<Partial<BulkStaffItem>[]>([]);
  const [importErrors, setImportErrors] = React.useState<string[]>([]);
  const [importing, setImporting] = React.useState(false);
  const [importSettings, setImportSettings] = React.useState<ImportSettings>(initialImportSettings);

  // Continue creating state
  const [continueCreating, setContinueCreating] = React.useState(false);

  // Reset password state
  const [resetPasswordResult, setResetPasswordResult] = React.useState<{ staff: Staff; temporaryPassword: string } | null>(null);

  // Bulk operations state
  const [selectedStaffIds, setSelectedStaffIds] = React.useState<Set<string>>(new Set());
  const [bulkOperation, setBulkOperation] = React.useState<BulkOperation>(null);
  const [bulkDepartmentId, setBulkDepartmentId] = React.useState("");
  const [bulkBranchId, setBulkBranchId] = React.useState("");
  const [processingBulk, setProcessingBulk] = React.useState(false);
  const [bulkResult, setBulkResult] = React.useState<BulkOperationResult | null>(null);
  const [copiedPasswords, setCopiedPasswords] = React.useState<Set<string>>(new Set());

  // Permission states
  const [permissionDialogOpen, setPermissionDialogOpen] = React.useState(false);
  const [permissionStaff, setPermissionStaff] = React.useState<Staff | null>(null);
  const [allPermissions, setAllPermissions] = React.useState<Record<string, Permission[]>>({});
  const [selectedPermissionIds, setSelectedPermissionIds] = React.useState<Set<string>>(new Set());
  const [departmentPermissionIds, setDepartmentPermissionIds] = React.useState<Set<string>>(new Set());
  const [loadingPermissions, setLoadingPermissions] = React.useState(false);
  const [savingPermissions, setSavingPermissions] = React.useState(false);

  // Detail view field configuration state
  const [detailFields, setDetailFields] = React.useState<DetailFieldConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(DETAIL_FIELDS_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return defaultDetailFields;
        }
      }
    }
    return defaultDetailFields;
  });
  const [detailFieldsPopoverOpen, setDetailFieldsPopoverOpen] = React.useState(false);

  // Sorting state
  type SortKey = "name" | "username" | "phone" | "email" | "birthDate" | "gender" | "provinceName" | "branchName" | "departmentName" | "isActive" | "createdAt";
  type SortDirection = "asc" | "desc";
  const [sortKey, setSortKey] = React.useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");

  // Filter state
  const [filterPopoverOpen, setFilterPopoverOpen] = React.useState(false);
  const [genderFilter, setGenderFilter] = React.useState<string>("all");
  const [provinceFilter, setProvinceFilter] = React.useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Check if any filter is active
  const hasActiveFilters = genderFilter !== "all" || provinceFilter !== "all" || departmentFilter !== "all" || statusFilter !== "all";

  // Clear all filters
  const clearAllFilters = () => {
    setGenderFilter("all");
    setProvinceFilter("all");
    setDepartmentFilter("all");
    setStatusFilter("all");
  };

  // Handle sort click
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // Get sort icon
  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortDirection === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  // Helper to check if detail field is visible
  const isDetailFieldVisible = (key: string) => {
    const field = detailFields.find((f) => f.key === key);
    return field?.visible ?? true;
  };

  // Toggle detail field visibility
  const toggleDetailField = (key: string) => {
    const newFields = detailFields.map((f) =>
      f.key === key ? { ...f, visible: !f.visible } : f
    );
    setDetailFields(newFields);
    localStorage.setItem(DETAIL_FIELDS_STORAGE_KEY, JSON.stringify(newFields));
  };

  // Show all detail fields
  const showAllDetailFields = () => {
    const newFields = detailFields.map((f) => ({ ...f, visible: true }));
    setDetailFields(newFields);
    localStorage.setItem(DETAIL_FIELDS_STORAGE_KEY, JSON.stringify(newFields));
  };

  // Hide all detail fields
  const hideAllDetailFields = () => {
    const newFields = detailFields.map((f) => ({ ...f, visible: false }));
    setDetailFields(newFields);
    localStorage.setItem(DETAIL_FIELDS_STORAGE_KEY, JSON.stringify(newFields));
  };

  // Derived state from Redux - for create/edit form
  const branches = formData.brandId ? branchesByBrand[formData.brandId] || [] : [];
  const wards = formData.provinceCode ? wardsByProvince[formData.provinceCode] || [] : [];
  const loadingDropdowns = loadingBrands || loadingDepartments || loadingProvinces;

  // Derived state for import settings
  const importBranches = importSettings.brandId ? branchesByBrand[importSettings.brandId] || [] : [];
  const importWards = importSettings.provinceCode ? wardsByProvince[importSettings.provinceCode] || [] : [];

  // Load staff list - by branch or by brand (all branches)
  const loadStaff = React.useCallback(async (branchId: string, brandId: string) => {
    if (!brandId) {
      setStaffList([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // If branchId is empty but brandId exists, load all staff in the brand
      const data = await staffService.getAll(branchId || undefined, branchId ? undefined : brandId);
      // Sort by createdAt descending (newest first)
      const sortedData = [...data].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setStaffList(sortedData);
    } catch (error) {
      console.error("Error loading staff:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách nhân viên", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    // Normalize "all" values to empty string
    const branchId = filterBranchId === "all" ? "" : filterBranchId;
    const brandId = filterBrandId === "all" ? "" : filterBrandId;
    loadStaff(branchId, brandId);
  }, [filterBranchId, filterBrandId, loadStaff]);

  // Load branches when brand changes (using Redux)
  React.useEffect(() => {
    if (formData.brandId) {
      dispatch(fetchBranchesByBrand(formData.brandId));
    }
  }, [formData.brandId, dispatch]);

  // Load wards when province changes (using Redux)
  React.useEffect(() => {
    if (formData.provinceCode) {
      dispatch(fetchWardsByProvince(formData.provinceCode));
    }
  }, [formData.provinceCode, dispatch]);

  // Load dropdowns when dialog opens (using Redux - cached data)
  React.useEffect(() => {
    if (dialogMode === "create" || dialogMode === "edit" || dialogMode === "import") {
      dispatch(fetchDepartments());
      dispatch(fetchBrands());
      dispatch(fetchProvinces());
    }
  }, [dialogMode, dispatch]);

  // Load filter options when filter popover opens
  React.useEffect(() => {
    if (filterPopoverOpen) {
      dispatch(fetchDepartments());
      dispatch(fetchProvinces());
    }
  }, [filterPopoverOpen, dispatch]);

  // Load data for bulk operation dialogs
  React.useEffect(() => {
    if (bulkOperation === "department") {
      dispatch(fetchDepartments());
    } else if (bulkOperation === "branch") {
      dispatch(fetchBrands());
      // Load branches for current filter brand
      if (filterBrandId && filterBrandId !== "" && filterBrandId !== "all") {
        dispatch(fetchBranchesByBrand(filterBrandId));
      }
    }
  }, [bulkOperation, filterBrandId, dispatch]);

  // Load branches for import settings
  React.useEffect(() => {
    if (importSettings.brandId) {
      dispatch(fetchBranchesByBrand(importSettings.brandId));
    }
  }, [importSettings.brandId, dispatch]);

  // Load wards for import settings
  React.useEffect(() => {
    if (importSettings.provinceCode) {
      dispatch(fetchWardsByProvince(importSettings.provinceCode));
    }
  }, [importSettings.provinceCode, dispatch]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedStaff(null);
    setFormData(initialFormData);
    setCreatedStaff(null);
    setDialogMode("create");
  };

  // Open view dialog
  const handleOpenView = (staff: Staff) => {
    setSelectedStaff(staff);
    setDialogMode("view");
    // Remove badges when viewing
    setNewStaffIds((prev) => { const next = new Set(prev); next.delete(staff.id); return next; });
    setUpdatedStaffIds((prev) => { const next = new Set(prev); next.delete(staff.id); return next; });
  };

  // Open edit dialog
  const handleOpenEdit = (staff: Staff) => {
    setSelectedStaff(staff);
    setFormData({
      name: staff.name,
      avatarUrl: staff.avatarUrl || "",
      email: staff.email || "",
      phone: staff.phone || "",
      birthDate: staff.birthDate || "",
      gender: staff.gender || "male",
      idNumber: staff.idNumber || "",
      address: staff.address || "",
      provinceCode: staff.provinceCode || "",
      wardCode: staff.wardCode || "",
      departmentId: staff.departmentId || "",
      brandId: staff.brandId || "",
      branchId: staff.branchId || "",
      usernamePrefix: "tr",
    });
    setDialogMode("edit");
    // Remove badges when editing
    setNewStaffIds((prev) => { const next = new Set(prev); next.delete(staff.id); return next; });
    setUpdatedStaffIds((prev) => { const next = new Set(prev); next.delete(staff.id); return next; });
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (dialogMode === "create") {
      // Validate required fields for create
      if (!formData.name.trim() || !formData.birthDate || !formData.gender ||
          !formData.departmentId || !formData.brandId || !formData.branchId) {
        toast({ title: "Lỗi", description: "Vui lòng điền đầy đủ các trường bắt buộc", variant: "destructive" });
        return;
      }

      try {
        setSaving(true);
        const result = await staffService.create(formData);
        setStaffList((prev) => [result, ...prev]);
        // Mark as new staff
        setNewStaffIds((prev) => new Set(prev).add(result.id));

        if (continueCreating) {
          // Reset form but keep brand, branch, department for continuous creation
          setFormData({
            ...initialFormData,
            brandId: formData.brandId,
            branchId: formData.branchId,
            departmentId: formData.departmentId,
            provinceCode: formData.provinceCode,
            wardCode: formData.wardCode,
          });
          toast({
            title: "Thành công",
            description: `Đã tạo ${result.name} (${result.username}). Mật khẩu: ${result.temporaryPassword}`,
          });
        } else {
          setCreatedStaff(result);
          toast({ title: "Thành công", description: "Đã tạo nhân viên mới" });
        }
      } catch (error: any) {
        console.error("Error creating staff:", error);
        toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra khi tạo nhân viên", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    } else if (dialogMode === "edit" && selectedStaff) {
      const updateData: UpdateStaffDto = {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        birthDate: formData.birthDate || undefined,
        gender: formData.gender,
        idNumber: formData.idNumber || undefined,
        address: formData.address || undefined,
        provinceCode: formData.provinceCode || undefined,
        wardCode: formData.wardCode || undefined,
        departmentId: formData.departmentId || undefined,
        avatarUrl: formData.avatarUrl || undefined,
      };

      try {
        setSaving(true);
        const result = await staffService.update(selectedStaff.id, updateData);
        setStaffList((prev) => prev.map((s) => (s.id === selectedStaff.id ? result : s)));
        // Mark as updated staff
        setUpdatedStaffIds((prev) => new Set([...prev, result.id]));
        // Remove from new if was new
        setNewStaffIds((prev) => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
        toast({ title: "Thành công", description: "Đã cập nhật thông tin nhân viên" });
        handleCloseDialog();
      } catch (error: any) {
        console.error("Error updating staff:", error);
        toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra khi cập nhật nhân viên", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    }
  };

  // Handle toggle active
  const handleToggleActive = async (staff: Staff) => {
    try {
      const updated = await staffService.toggleActive(staff.id);
      setStaffList((prev) => prev.map((s) => (s.id === staff.id ? updated : s)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} nhân viên ${staff.name}`,
      });
    } catch (error: any) {
      console.error("Error toggling staff:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra", variant: "destructive" });
    }
  };

  // Handle reset password
  const handleResetPassword = async (staff: Staff) => {
    try {
      const result = await staffService.resetPassword(staff.id);
      setResetPasswordResult({ staff, temporaryPassword: result.temporaryPassword });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra khi reset mật khẩu", variant: "destructive" });
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStaffIds(new Set(filteredStaff.map((s) => s.id)));
    } else {
      setSelectedStaffIds(new Set());
    }
  };

  const handleSelectStaff = (staffId: string, checked: boolean) => {
    const newSet = new Set(selectedStaffIds);
    if (checked) {
      newSet.add(staffId);
    } else {
      newSet.delete(staffId);
    }
    setSelectedStaffIds(newSet);
  };

  // Bulk operation handlers
  const handleCloseBulkDialog = () => {
    setBulkOperation(null);
    setBulkDepartmentId("");
    setBulkBranchId("");
    setBulkResult(null);
    setCopiedPasswords(new Set());
  };

  const handleBulkOperation = async () => {
    if (selectedStaffIds.size === 0) return;

    const staffIds = Array.from(selectedStaffIds);
    setProcessingBulk(true);

    try {
      let result: BulkOperationResult;

      switch (bulkOperation) {
        case "department":
          if (!bulkDepartmentId) {
            toast({ title: "Lỗi", description: "Vui lòng chọn bộ phận", variant: "destructive" });
            return;
          }
          result = await bulkStaffService.updateDepartment(staffIds, bulkDepartmentId);
          break;
        case "branch":
          if (!bulkBranchId) {
            toast({ title: "Lỗi", description: "Vui lòng chọn chi nhánh", variant: "destructive" });
            return;
          }
          result = await bulkStaffService.updateBranch(staffIds, bulkBranchId);
          break;
        case "activate":
          result = await bulkStaffService.toggleActive(staffIds, true);
          break;
        case "deactivate":
          result = await bulkStaffService.toggleActive(staffIds, false);
          break;
        case "reset-password":
          result = await bulkStaffService.resetPassword(staffIds);
          setBulkResult(result);
          return; // Don't close dialog, show passwords
        default:
          return;
      }

      toast({
        title: "Thành công",
        description: `Đã xử lý ${result.success}/${staffIds.length} nhân viên`,
      });

      // Reload staff list
      loadStaff(filterBranchId, filterBrandId);
      setSelectedStaffIds(new Set());
      handleCloseBulkDialog();
    } catch (error: any) {
      console.error("Bulk operation error:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleCopyPassword = (password: string, staffId: string) => {
    navigator.clipboard.writeText(password);
    setCopiedPasswords(prev => new Set(prev).add(staffId));
    setTimeout(() => {
      setCopiedPasswords(prev => {
        const newSet = new Set(prev);
        newSet.delete(staffId);
        return newSet;
      });
    }, 2000);
  };

  const handleCopyAllPasswords = () => {
    if (!bulkResult?.passwords) return;
    const text = bulkResult.passwords
      .map(p => `${p.username}: ${p.password}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Đã sao chép", description: "Tất cả mật khẩu đã được sao chép" });
  };

  // Open permission dialog
  const handleOpenPermissions = async (staff: Staff) => {
    setPermissionStaff(staff);
    setPermissionDialogOpen(true);
    setLoadingPermissions(true);

    try {
      // Load all permissions grouped by module
      const grouped = await permissionService.getGrouped();
      setAllPermissions(grouped);

      // Load staff's permissions (including department inherited)
      const staffPerms = await permissionService.getStaffPermissions(staff.id);
      setSelectedPermissionIds(new Set(staffPerms.ownPermissions.map(p => p.id)));
      setDepartmentPermissionIds(new Set(staffPerms.departmentPermissions.map(p => p.id)));
    } catch (error) {
      console.error("Error loading permissions:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách quyền", variant: "destructive" });
    } finally {
      setLoadingPermissions(false);
    }
  };

  // Save staff permissions
  const handleSavePermissions = async () => {
    if (!permissionStaff) return;

    try {
      setSavingPermissions(true);
      await permissionService.assignStaffPermissions({
        staffId: permissionStaff.id,
        permissionIds: Array.from(selectedPermissionIds),
      });
      toast({ title: "Thành công", description: `Đã cập nhật quyền cho nhân viên "${permissionStaff.name}"` });
      setPermissionDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving permissions:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi lưu quyền",
        variant: "destructive",
      });
    } finally {
      setSavingPermissions(false);
    }
  };

  // Toggle permission selection
  const togglePermission = (permissionId: string) => {
    // Don't allow toggling department-inherited permissions
    if (departmentPermissionIds.has(permissionId)) return;

    setSelectedPermissionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  };

  // Toggle all permissions in a module (excluding department inherited)
  const toggleModule = (modulePermissions: Permission[]) => {
    const nonInheritedPerms = modulePermissions.filter(p => !departmentPermissionIds.has(p.id));
    if (nonInheritedPerms.length === 0) return;

    const allSelected = nonInheritedPerms.every(p => selectedPermissionIds.has(p.id));
    setSelectedPermissionIds(prev => {
      const newSet = new Set(prev);
      nonInheritedPerms.forEach(p => {
        if (allSelected) {
          newSet.delete(p.id);
        } else {
          newSet.add(p.id);
        }
      });
      return newSet;
    });
  };

  // Close dialog and reset
  const handleCloseDialog = () => {
    setDialogMode(null);
    setCreatedStaff(null);
    setSelectedStaff(null);
    setFormData(initialFormData);
    setImportData([]);
    setImportErrors([]);
    setImportSettings(initialImportSettings);
  };

  // Handle import settings change
  const handleImportBrandChange = (brandId: string) => {
    setImportSettings({ ...importSettings, brandId, branchId: "" });
  };

  const handleImportProvinceChange = (provinceCode: string) => {
    setImportSettings({ ...importSettings, provinceCode, wardCode: "" });
  };

  // Handle province change
  const handleProvinceChange = (provinceCode: string) => {
    setFormData({ ...formData, provinceCode, wardCode: "" });
  };

  // Handle brand change
  const handleBrandChange = (brandId: string) => {
    setFormData({ ...formData, brandId, branchId: "" });
  };

  // Export to Excel with dropdowns
  const handleExport = async () => {
    if (staffList.length === 0) {
      toast({ title: "Thông báo", description: "Không có dữ liệu để xuất", variant: "destructive" });
      return;
    }

    toast({ title: "Đang tải...", description: "Đang tạo file Excel với dropdown" });

    // Load data for dropdowns
    const [departmentsResult, brandsResult, provincesResult, wardsGroupedByProvince, allBranches] = await Promise.all([
      dispatch(fetchDepartments()).unwrap(),
      dispatch(fetchBrands()).unwrap(),
      dispatch(fetchProvinces()).unwrap(),
      locationService.getWardsGroupedByProvince(),
      branchService.getAll(),
    ]);

    // Build dropdown options
    const provinceOptions: DropdownOption[] = provincesResult.map((p) => ({
      value: p.code,
      label: p.fullName || p.name,
    }));

    const brandOptions: DropdownOption[] = brandsResult.map((b) => ({
      value: b.id,
      label: b.name,
    }));

    // Build wards by province map
    const wardsByProvince = new Map<string, DropdownOption[]>();
    for (const [provinceCode, wards] of Object.entries(wardsGroupedByProvince)) {
      const province = provincesResult.find((p) => p.code === provinceCode);
      const provinceLabel = province?.fullName || province?.name || provinceCode;
      wardsByProvince.set(
        provinceLabel,
        (wards as any[]).map((w) => ({ value: w.code, label: w.fullName || w.name }))
      );
    }

    // Build branches by brand map
    const branchesByBrand = new Map<string, DropdownOption[]>();
    for (const brand of brandsResult) {
      const brandBranches = allBranches.filter((b) => b.brandId === brand.id);
      branchesByBrand.set(
        brand.name,
        brandBranches.map((b) => ({ value: b.id, label: b.name }))
      );
    }

    // Transform data for export
    const exportData = staffList.map((staff) => ({
      ...staff,
      birthDate: staff.birthDate ? new Date(staff.birthDate).toISOString().split("T")[0] : "",
      gender: staff.gender === "male" ? "Nam" : staff.gender === "female" ? "Nữ" : "",
      isActive: staff.isActive ? "Có" : "Không",
    }));

    // Define columns with dropdowns
    const columnsWithDropdowns: ExportColumnWithDropdown<typeof exportData[0]>[] = [
      { key: "id", header: "ID", width: 40 },
      { key: "name", header: "Tên nhân viên", width: 25 },
      { key: "username", header: "Username", width: 15 },
      { key: "phone", header: "Số điện thoại", width: 15 },
      { key: "email", header: "Email", width: 25 },
      { key: "birthDate", header: "Ngày sinh", width: 12 },
      {
        key: "gender",
        header: "Giới tính",
        width: 10,
        dropdown: [
          { value: "male", label: "Nam" },
          { value: "female", label: "Nữ" },
        ],
      },
      { key: "idNumber", header: "CCCD", width: 15 },
      {
        key: "provinceName",
        header: "Tỉnh/Thành phố",
        width: 25,
        dropdown: provinceOptions,
      },
      { key: "wardName", header: "Phường/Xã", width: 25 },
      { key: "address", header: "Địa chỉ", width: 30 },
      {
        key: "brandName",
        header: "Thương hiệu",
        width: 20,
        dropdown: brandOptions,
      },
      { key: "branchName", header: "Chi nhánh", width: 20 },
      {
        key: "departmentName",
        header: "Bộ phận",
        width: 20,
        dropdown: departmentsResult.map((d) => ({ value: d.id, label: d.name })),
      },
      {
        key: "isActive",
        header: "Hoạt động",
        width: 10,
        dropdown: [
          { value: "true", label: "Có" },
          { value: "false", label: "Không" },
        ],
      },
    ];

    // Configure dependent dropdowns
    const dependentDropdowns: DependentDropdownConfig[] = [
      {
        parentHeader: "Tỉnh/Thành phố",
        childHeader: "Phường/Xã",
        parentOptions: provinceOptions,
        childOptionsByParent: wardsByProvince,
      },
      {
        parentHeader: "Thương hiệu",
        childHeader: "Chi nhánh",
        parentOptions: brandOptions,
        childOptionsByParent: branchesByBrand,
      },
    ];

    await exportToExcelWithDropdowns(
      exportData,
      columnsWithDropdowns,
      dependentDropdowns,
      `danh_sach_nhan_vien_${new Date().toISOString().split("T")[0]}`,
      50
    );
    toast({ title: "Thành công", description: "Đã xuất file Excel với dropdown" });
  };

  // Download template with dropdowns
  const handleDownloadTemplate = async () => {
    toast({ title: "Đang tải...", description: "Đang tạo file mẫu với dropdown (có thể mất vài giây)" });

    // Load data for dropdowns
    const [departmentsResult, brandsResult, provincesResult, wardsGroupedByProvince, allBranches] = await Promise.all([
      dispatch(fetchDepartments()).unwrap(),
      dispatch(fetchBrands()).unwrap(),
      dispatch(fetchProvinces()).unwrap(),
      locationService.getWardsGroupedByProvince(), // Get wards grouped by province for dependent dropdown
      branchService.getAll(), // Get all branches from all brands
    ]);

    // Build province options
    const provinceOptions: DropdownOption[] = provincesResult.map((p) => ({
      value: p.code,
      label: p.fullName || p.name,
    }));

    // Build brand options
    const brandOptions: DropdownOption[] = brandsResult.map((b) => ({
      value: b.id,
      label: b.name,
    }));

    // Build wards by province map for dependent dropdown
    const wardsByProvince = new Map<string, DropdownOption[]>();
    for (const [provinceCode, wards] of Object.entries(wardsGroupedByProvince)) {
      // Find province label
      const province = provincesResult.find((p) => p.code === provinceCode);
      const provinceLabel = province?.fullName || province?.name || provinceCode;
      wardsByProvince.set(
        provinceLabel,
        (wards as any[]).map((w) => ({ value: w.code, label: w.fullName || w.name }))
      );
    }

    // Build branches by brand map for dependent dropdown
    const branchesByBrand = new Map<string, DropdownOption[]>();
    for (const brand of brandsResult) {
      const brandBranches = allBranches.filter((b) => b.brandId === brand.id);
      branchesByBrand.set(
        brand.name,
        brandBranches.map((b) => ({ value: b.id, label: b.name }))
      );
    }

    // Build columns with dropdown options using fresh data
    const columnsWithDropdowns: TemplateColumnWithDropdown[] = [
      { header: "ID", example: "(để trống nếu tạo mới)", required: false },
      { header: "Tên nhân viên", example: "Nguyễn Văn A", required: true },
      { header: "Số điện thoại", example: "0901234567", required: false },
      { header: "Email", example: "email@example.com", required: false },
      { header: "Ngày sinh", example: "1990-01-15", required: true },
      {
        header: "Giới tính",
        example: "Nam",
        required: true,
        dropdown: [
          { value: "male", label: "Nam" },
          { value: "female", label: "Nữ" },
        ],
      },
      { header: "CCCD", example: "001234567890", required: false },
      {
        header: "Tỉnh/Thành phố",
        example: provincesResult[0]?.fullName || "Thành phố Hồ Chí Minh",
        required: false,
        dropdown: provinceOptions,
      },
      {
        header: "Phường/Xã",
        example: "", // Leave empty - user must select province first
        required: false,
        // No direct dropdown - will be handled by dependent dropdown
      },
      { header: "Địa chỉ", example: "123 Nguyễn Văn Linh", required: false },
      {
        header: "Thương hiệu",
        example: brandsResult[0]?.name || "The Coffee House",
        required: true,
        dropdown: brandOptions,
      },
      {
        header: "Chi nhánh",
        example: "", // Leave empty - user must select brand first
        required: true,
        // No direct dropdown - will be handled by dependent dropdown
      },
      {
        header: "Bộ phận",
        example: departmentsResult[0]?.name || "Phục vụ",
        required: true,
        dropdown: departmentsResult.map((d) => ({ value: d.id, label: d.name })),
      },
      {
        header: "Hoạt động",
        example: "Có",
        required: false,
        dropdown: [
          { value: "true", label: "Có" },
          { value: "false", label: "Không" },
        ],
      },
    ];

    // Configure dependent dropdowns
    const dependentDropdowns: DependentDropdownConfig[] = [
      {
        parentHeader: "Tỉnh/Thành phố",
        childHeader: "Phường/Xã",
        parentOptions: provinceOptions,
        childOptionsByParent: wardsByProvince,
      },
      {
        parentHeader: "Thương hiệu",
        childHeader: "Chi nhánh",
        parentOptions: brandOptions,
        childOptionsByParent: branchesByBrand,
      },
    ];

    await downloadTemplateWithDependentDropdowns(columnsWithDropdowns, dependentDropdowns, "mau_import_nhan_vien", 100);
    toast({ title: "Thành công", description: "Đã tải file mẫu với dropdown phụ thuộc" });
  };

  // Handle file input change - auto lookup IDs from names
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await readExcelFile<ImportDataWithNames>(file, importColumnMapping);

      // Load reference data and get the results directly
      const [departmentsResult, brandsResult, provincesResult] = await Promise.all([
        dispatch(fetchDepartments()).unwrap(),
        dispatch(fetchBrands()).unwrap(),
        dispatch(fetchProvinces()).unwrap(),
      ]);

      // Use the fresh data from dispatch results
      const freshDepartments = departmentsResult || [];
      const freshBrands = brandsResult || [];
      const freshProvinces = provincesResult || [];

      // Transform data: convert names to IDs
      const transformedData: Partial<BulkStaffItem>[] = [];
      const lookupErrors: string[] = [...result.errors];

      // Collect unique brand names and province names for loading children
      const uniqueBrandNames = [...new Set(result.data.map((d) => d.brandName).filter(Boolean))];
      const uniqueProvinceNames = [...new Set(result.data.map((d) => d.provinceName).filter(Boolean))];

      // Load branches and wards for all relevant parents
      const brandLookup = new Map<string, string>();
      const provinceLookup = new Map<string, string>();

      for (let i = 0; i < result.data.length; i++) {
        const item = result.data[i];
        const rowNumber = i + 2; // Excel row (1-indexed + header)

        // Convert gender string from Excel (could be "Nam", "Nữ", "male", "female")
        const genderStr = String(item.gender || "").toLowerCase();
        const gender: Gender | undefined = genderStr === "nam" || genderStr === "male" ? "male" :
                                           genderStr === "nữ" || genderStr === "female" ? "female" :
                                           undefined;

        // Convert isActive string from Excel (could be "Có", "Không", "true", "false")
        const isActiveStr = String(item.isActive || "").toLowerCase();
        const isActive: boolean | undefined = isActiveStr === "có" || isActiveStr === "true" ? true :
                                              isActiveStr === "không" || isActiveStr === "false" ? false :
                                              undefined;

        const transformedItem: Partial<BulkStaffItem> = {
          id: item.id,
          name: item.name,
          phone: item.phone,
          email: item.email,
          birthDate: item.birthDate,
          gender,
          idNumber: item.idNumber,
          address: item.address,
          isActive,
        };

        // Lookup province code from name
        if (item.provinceName) {
          const province = freshProvinces.find(
            (p) => p.fullName?.toLowerCase() === item.provinceName?.toLowerCase() ||
                   p.name?.toLowerCase() === item.provinceName?.toLowerCase()
          );
          if (province) {
            transformedItem.provinceCode = province.code;
            // Load wards for this province if needed
            dispatch(fetchWardsByProvince(province.code));
          } else {
            lookupErrors.push(`Dòng ${rowNumber}: Không tìm thấy tỉnh/thành phố "${item.provinceName}"`);
          }
        }

        // Lookup brand ID from name
        if (item.brandName) {
          const brand = freshBrands.find(
            (b) => b.name?.toLowerCase() === item.brandName?.toLowerCase()
          );
          if (brand) {
            transformedItem.brandId = brand.id;
            // Load branches for this brand if needed
            dispatch(fetchBranchesByBrand(brand.id));
          } else {
            lookupErrors.push(`Dòng ${rowNumber}: Không tìm thấy thương hiệu "${item.brandName}"`);
          }
        }

        // Lookup department ID from name
        if (item.departmentName) {
          const department = freshDepartments.find(
            (d) => d.name?.toLowerCase() === item.departmentName?.toLowerCase()
          );
          if (department) {
            transformedItem.departmentId = department.id;
          } else {
            lookupErrors.push(`Dòng ${rowNumber}: Không tìm thấy bộ phận "${item.departmentName}"`);
          }
        }

        transformedData.push(transformedItem);
      }

      // Collect unique province codes and brand IDs that need children loaded
      const uniqueProvinceCodes = [...new Set(transformedData.map(d => d.provinceCode).filter(Boolean))] as string[];
      const uniqueBrandIds = [...new Set(transformedData.map(d => d.brandId).filter(Boolean))] as string[];

      // Load wards and branches for all needed parents
      const [wardsResults, branchesResults] = await Promise.all([
        Promise.all(uniqueProvinceCodes.map(code => dispatch(fetchWardsByProvince(code)).unwrap().catch(() => ({ provinceCode: code, wards: [] })))),
        Promise.all(uniqueBrandIds.map(id => dispatch(fetchBranchesByBrand(id)).unwrap().catch(() => []))),
      ]);

      // Build lookup maps from fresh data
      const freshWardsByProvince: Record<string, any[]> = {};
      wardsResults.forEach((res: any) => {
        if (res && res.provinceCode) {
          freshWardsByProvince[res.provinceCode] = res.wards || [];
        }
      });

      const freshBranchesByBrand: Record<string, any[]> = {};
      branchesResults.forEach((res: any) => {
        if (res && res.brandId) {
          freshBranchesByBrand[res.brandId] = res.branches || [];
        }
      });

      // Second pass: lookup ward and branch names (using fresh data)
      for (let i = 0; i < result.data.length; i++) {
        const item = result.data[i];
        const transformedItem = transformedData[i];
        const rowNumber = i + 2;

        // Lookup ward code from name (need province first)
        if (item.wardName && transformedItem.provinceCode) {
          const provinceWards = freshWardsByProvince[transformedItem.provinceCode] || [];
          const wardNameLower = item.wardName.toLowerCase().trim();
          // Try exact match first
          let ward = provinceWards.find(
            (w: any) => w.fullName?.toLowerCase() === wardNameLower ||
                   w.name?.toLowerCase() === wardNameLower
          );
          // Try partial match (contains) as fallback
          if (!ward) {
            ward = provinceWards.find(
              (w: any) => w.fullName?.toLowerCase().includes(wardNameLower) ||
                     wardNameLower.includes(w.fullName?.toLowerCase()) ||
                     w.name?.toLowerCase().includes(wardNameLower) ||
                     wardNameLower.includes(w.name?.toLowerCase())
            );
          }
          // Try matching without prefix (Phường/Xã/Thị trấn)
          if (!ward) {
            const wardNameWithoutPrefix = wardNameLower
              .replace(/^(phường|xã|thị trấn)\s*/i, "").trim();
            ward = provinceWards.find(
              (w: any) => {
                const wNameWithoutPrefix = (w.name || "").toLowerCase()
                  .replace(/^(phường|xã|thị trấn)\s*/i, "").trim();
                return wNameWithoutPrefix === wardNameWithoutPrefix;
              }
            );
          }
          if (ward) {
            transformedItem.wardCode = ward.code;
          } else if (provinceWards.length > 0) {
            lookupErrors.push(`Dòng ${rowNumber}: Không tìm thấy phường/xã "${item.wardName}"`);
          }
        }

        // Lookup branch ID from name (need brand first)
        if (item.branchName && transformedItem.brandId) {
          const brandBranches = freshBranchesByBrand[transformedItem.brandId] || [];
          const branch = brandBranches.find(
            (b: any) => b.name?.toLowerCase() === item.branchName?.toLowerCase()
          );
          if (branch) {
            transformedItem.branchId = branch.id;
          } else if (brandBranches.length > 0) {
            lookupErrors.push(`Dòng ${rowNumber}: Không tìm thấy chi nhánh "${item.branchName}"`);
          }
        }
      }

      setImportData(transformedData);
      setImportErrors(lookupErrors);
      setDialogMode("import");
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message || "Không thể đọc file Excel", variant: "destructive" });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle import
  const handleImport = async () => {
    if (importData.length === 0) {
      toast({ title: "Lỗi", description: "Không có dữ liệu để import", variant: "destructive" });
      return;
    }

    // Check if new staff need settings (missing required fields from Excel lookup)
    const newStaffMissingFields = importData.filter((d) => !d.id && (!d.brandId || !d.branchId || !d.departmentId));
    const hasNewStaffNeedingSettings = newStaffMissingFields.length > 0;

    if (hasNewStaffNeedingSettings) {
      if (!importSettings.brandId || !importSettings.branchId || !importSettings.departmentId) {
        toast({
          title: "Lỗi",
          description: `Có ${newStaffMissingFields.length} nhân viên mới thiếu thông tin. Vui lòng chọn Thương hiệu, Chi nhánh và Bộ phận mặc định.`,
          variant: "destructive"
        });
        return;
      }
    }

    // Apply import settings only to new staff that don't have IDs from Excel lookup
    const dataWithSettings = importData.map((item) => {
      if (!item.id) {
        return {
          ...item,
          // Use Excel lookup value if available, otherwise use import settings
          brandId: item.brandId || importSettings.brandId,
          branchId: item.branchId || importSettings.branchId,
          departmentId: item.departmentId || importSettings.departmentId,
          provinceCode: item.provinceCode || importSettings.provinceCode || undefined,
          wardCode: item.wardCode || importSettings.wardCode || undefined,
        };
      }
      return item;
    });

    try {
      setImporting(true);
      const result = await staffService.bulkImport(dataWithSettings as BulkStaffItem[]);

      if (result.errors.length > 0) {
        toast({
          title: "Hoàn thành với lỗi",
          description: `Tạo mới: ${result.created}, Cập nhật: ${result.updated}, Lỗi: ${result.errors.length}`,
          variant: "destructive",
        });
        setImportErrors(result.errors.map((e) => `Dòng ${e.row}: ${e.message}`));
      } else {
        toast({
          title: "Thành công",
          description: `Đã tạo mới ${result.created} và cập nhật ${result.updated} nhân viên`,
        });
        handleCloseDialog();
        loadStaff(filterBranchId, filterBrandId);
      }
    } catch (error: any) {
      console.error("Error importing:", error);
      toast({ title: "Lỗi", description: error.response?.data?.message || "Có lỗi xảy ra khi import", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  // Format date for display
  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("vi-VN");
  };

  // Get gender label
  const getGenderLabel = (gender?: string) => {
    if (gender === "male") return "Nam";
    if (gender === "female") return "Nữ";
    return "-";
  };

  // Get department name from ID
  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return "-";
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || "-";
  };

  // Filter and sort staff
  const filteredStaff = React.useMemo(() => {
    // First filter
    let result = staffList.filter((s) => {
      // Search filter
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.username?.toLowerCase().includes(search.toLowerCase()) ||
        s.phone?.includes(search);

      // Gender filter
      const matchesGender = genderFilter === "all" || s.gender === genderFilter;

      // Province filter
      const matchesProvince = provinceFilter === "all" || s.provinceCode === provinceFilter;

      // Department filter
      const matchesDepartment = departmentFilter === "all" || s.departmentId === departmentFilter;

      // Status filter
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && s.isActive) ||
        (statusFilter === "inactive" && !s.isActive);

      return matchesSearch && matchesGender && matchesProvince && matchesDepartment && matchesStatus;
    });

    // Then sort
    result.sort((a, b) => {
      let aValue: any = a[sortKey];
      let bValue: any = b[sortKey];

      // Handle special cases
      if (sortKey === "createdAt") {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      } else if (sortKey === "isActive") {
        aValue = a.isActive ? 1 : 0;
        bValue = b.isActive ? 1 : 0;
      } else if (typeof aValue === "string") {
        aValue = (aValue || "").toLowerCase();
        bValue = (bValue || "").toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [staffList, search, genderFilter, provinceFilter, departmentFilter, statusFilter, sortKey, sortDirection]);

  // Bulk selection derived state
  const isAllSelected = filteredStaff.length > 0 && selectedStaffIds.size === filteredStaff.length;
  const isSomeSelected = selectedStaffIds.size > 0 && selectedStaffIds.size < filteredStaff.length;

  // Check if brand is selected (can view staff)
  const isBrandSelected = filterBrandId && filterBrandId !== "" && filterBrandId !== "all";
  // Check if specific branch is selected (not "all" and not empty)
  const isBranchSelected = filterBranchId && filterBranchId !== "" && filterBranchId !== "all";
  // Check if viewing all branches
  const isViewingAllBranches = isBrandSelected && !isBranchSelected;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý nhân viên</h1>
          <p className="text-muted-foreground">Thêm, sửa và quản lý nhân viên trong thương hiệu</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Xuất Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadTemplate}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Tải file mẫu
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Import từ Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleOpenCreate}>
            <UserPlus className="mr-2 h-4 w-4" />
            Thêm nhân viên
          </Button>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách nhân viên</CardTitle>
              <CardDescription>
                {isBrandSelected
                  ? `Tổng cộng ${staffList.length} nhân viên${isViewingAllBranches ? " (tất cả chi nhánh)" : ""}`
                  : "Vui lòng chọn thương hiệu"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <BrandBranchFilter
                selectedBrandId={filterBrandId}
                selectedBranchId={filterBranchId}
                onBrandChange={setFilterBrandId}
                onBranchChange={setFilterBranchId}
                brandClassName="w-[160px]"
                branchClassName="w-[160px]"
                showAllBrandOption={false}
                showAllBranchOption={true}
                allBranchLabel="Tất cả chi nhánh"
              />
              {isBrandSelected && (
                <>
                  <div className="relative w-56">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm..."
                      className="pl-10"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  {/* Filter dropdown */}
                  <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Bộ lọc
                        {hasActiveFilters && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                            {[genderFilter, provinceFilter, departmentFilter, statusFilter].filter(f => f !== "all").length}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Bộ lọc</h4>
                          {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8 px-2 text-xs">
                              <X className="mr-1 h-3 w-3" />
                              Xóa tất cả
                            </Button>
                          )}
                        </div>
                        <div className="space-y-3">
                          {/* Gender Filter */}
                          <div className="space-y-1.5">
                            <Label className="text-sm">Giới tính</Label>
                            <Select value={genderFilter} onValueChange={setGenderFilter}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Tất cả" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="male">Nam</SelectItem>
                                <SelectItem value="female">Nữ</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {/* Province Filter */}
                          <div className="space-y-1.5">
                            <Label className="text-sm">Tỉnh/Thành phố</Label>
                            <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Tất cả" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                {provinces.map((p) => (
                                  <SelectItem key={p.code} value={p.code}>{p.fullName || p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* Department Filter */}
                          <div className="space-y-1.5">
                            <Label className="text-sm">Bộ phận</Label>
                            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Tất cả" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                {departments.map((d) => (
                                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* Status Filter */}
                          <div className="space-y-1.5">
                            <Label className="text-sm">Trạng thái</Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Tất cả" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="active">Đang hoạt động</SelectItem>
                                <SelectItem value="inactive">Ngưng hoạt động</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <ColumnConfigDialog
                    columns={staffColumns}
                    onToggle={toggleColumn}
                    onReset={resetColumns}
                  />
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!isBrandSelected ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Chọn thương hiệu để xem nhân viên</p>
              <p className="text-sm text-muted-foreground mt-1">Vui lòng chọn thương hiệu từ bộ lọc phía trên. Có thể chọn xem tất cả chi nhánh hoặc chi nhánh cụ thể.</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có nhân viên nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nhấn &quot;Thêm nhân viên&quot; để bắt đầu
              </p>
            </div>
          ) : (
            <>
              {/* Selection bar with bulk actions */}
              {selectedStaffIds.size > 0 && (
                <div className="flex items-center justify-between bg-muted/50 px-4 py-2 rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      className="data-[state=indeterminate]:bg-primary"
                      {...(isSomeSelected ? { "data-state": "indeterminate" } : {})}
                    />
                    <span className="text-sm font-medium">
                      Đã chọn {selectedStaffIds.size} nhân viên
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Thao tác hàng loạt
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => setBulkOperation("department")}>
                        <UserCog className="mr-2 h-4 w-4" />
                        Chuyển bộ phận
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setBulkOperation("branch")}>
                        <Building2 className="mr-2 h-4 w-4" />
                        Chuyển chi nhánh
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setBulkOperation("activate")}>
                        <Power className="mr-2 h-4 w-4 text-green-600" />
                        Kích hoạt tất cả
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setBulkOperation("deactivate")}>
                        <Power className="mr-2 h-4 w-4 text-orange-500" />
                        Tạm ngưng tất cả
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setBulkOperation("reset-password")}>
                        <KeyRound className="mr-2 h-4 w-4" />
                        Reset mật khẩu
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        className="data-[state=indeterminate]:bg-primary"
                        {...(isSomeSelected ? { "data-state": "indeterminate" } : {})}
                      />
                    </TableHead>
                    {isColumnVisible("avatar") && <TableHead className="w-[50px]">Ảnh</TableHead>}
                    {isColumnVisible("name") && (
                      <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("name")}>
                        <div className="flex items-center">Tên nhân viên{getSortIcon("name")}</div>
                      </TableHead>
                    )}
                    {isColumnVisible("username") && (
                      <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("username")}>
                        <div className="flex items-center">Username{getSortIcon("username")}</div>
                      </TableHead>
                    )}
                    {isColumnVisible("phone") && (
                      <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("phone")}>
                        <div className="flex items-center">Số điện thoại{getSortIcon("phone")}</div>
                      </TableHead>
                    )}
                    {isColumnVisible("email") && (
                      <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("email")}>
                        <div className="flex items-center">Email{getSortIcon("email")}</div>
                      </TableHead>
                    )}
                    {isColumnVisible("birthDate") && (
                      <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("birthDate")}>
                        <div className="flex items-center">Ngày sinh{getSortIcon("birthDate")}</div>
                      </TableHead>
                    )}
                    {isColumnVisible("gender") && (
                      <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("gender")}>
                        <div className="flex items-center">Giới tính{getSortIcon("gender")}</div>
                      </TableHead>
                    )}
                    {isColumnVisible("idNumber") && <TableHead>CCCD</TableHead>}
                    {isColumnVisible("provinceName") && (
                      <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("provinceName")}>
                        <div className="flex items-center">Tỉnh/TP{getSortIcon("provinceName")}</div>
                      </TableHead>
                    )}
                    {isColumnVisible("wardName") && <TableHead>Phường/Xã</TableHead>}
                    {isColumnVisible("address") && <TableHead>Địa chỉ</TableHead>}
                    {isColumnVisible("brandName") && <TableHead>Thương hiệu</TableHead>}
                    {isColumnVisible("branchName") && (
                      <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("branchName")}>
                        <div className="flex items-center">Chi nhánh{getSortIcon("branchName")}</div>
                      </TableHead>
                    )}
                    {isColumnVisible("departmentName") && (
                      <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("departmentName")}>
                        <div className="flex items-center">Bộ phận{getSortIcon("departmentName")}</div>
                      </TableHead>
                    )}
                    {isColumnVisible("isActive") && (
                      <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("isActive")}>
                        <div className="flex items-center">Trạng thái{getSortIcon("isActive")}</div>
                      </TableHead>
                    )}
                    <TableHead className="w-[80px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((staff) => (
                  <TableRow key={staff.id} className={selectedStaffIds.has(staff.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedStaffIds.has(staff.id)}
                        onCheckedChange={(checked) => handleSelectStaff(staff.id, checked as boolean)}
                      />
                    </TableCell>
                    {isColumnVisible("avatar") && (
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          {staff.avatarUrl ? (
                            <AvatarImage src={staff.avatarUrl} alt={staff.name} />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {staff.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                    )}
                    {isColumnVisible("name") && (
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {staff.name}
                          {newStaffIds.has(staff.id) && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">Mới</Badge>
                          )}
                          {updatedStaffIds.has(staff.id) && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">Vừa cập nhật</Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible("username") && <TableCell className="font-mono text-sm">{staff.username}</TableCell>}
                    {isColumnVisible("phone") && <TableCell>{staff.phone || "-"}</TableCell>}
                    {isColumnVisible("email") && <TableCell>{staff.email || "-"}</TableCell>}
                    {isColumnVisible("birthDate") && <TableCell>{staff.birthDate || "-"}</TableCell>}
                    {isColumnVisible("gender") && <TableCell>{staff.gender === "male" ? "Nam" : staff.gender === "female" ? "Nữ" : "-"}</TableCell>}
                    {isColumnVisible("idNumber") && <TableCell>{staff.idNumber || "-"}</TableCell>}
                    {isColumnVisible("provinceName") && <TableCell>{staff.provinceName || "-"}</TableCell>}
                    {isColumnVisible("wardName") && <TableCell>{staff.wardName || "-"}</TableCell>}
                    {isColumnVisible("address") && <TableCell className="max-w-[200px] truncate">{staff.address || "-"}</TableCell>}
                    {isColumnVisible("brandName") && <TableCell>{staff.brandName || "-"}</TableCell>}
                    {isColumnVisible("branchName") && <TableCell>{staff.branchName || "-"}</TableCell>}
                    {isColumnVisible("departmentName") && <TableCell>{staff.departmentName || "-"}</TableCell>}
                    {isColumnVisible("isActive") && (
                      <TableCell>
                        <Badge variant={staff.isActive ? "default" : "secondary"}>
                          {staff.isActive ? "Hoạt động" : "Tạm ngưng"}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenView(staff)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(staff)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(staff)}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Reset mật khẩu
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenPermissions(staff)}>
                            <Shield className="mr-2 h-4 w-4" />
                            Phân quyền
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleActive(staff)}>
                            <Power className="mr-2 h-4 w-4" />
                            {staff.isActive ? "Tạm ngưng" : "Kích hoạt"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Operation Dialog */}
      <Dialog open={bulkOperation !== null} onOpenChange={(open) => !open && handleCloseBulkDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {bulkOperation === "department" && "Chuyển bộ phận"}
              {bulkOperation === "branch" && "Chuyển chi nhánh"}
              {bulkOperation === "activate" && "Kích hoạt nhân viên"}
              {bulkOperation === "deactivate" && "Tạm ngưng nhân viên"}
              {bulkOperation === "reset-password" && (bulkResult ? "Kết quả reset mật khẩu" : "Reset mật khẩu")}
            </DialogTitle>
            <DialogDescription>
              {!bulkResult && `Thao tác sẽ áp dụng cho ${selectedStaffIds.size} nhân viên đã chọn`}
              {bulkResult && `Đã reset thành công ${bulkResult.success}/${selectedStaffIds.size} mật khẩu`}
            </DialogDescription>
          </DialogHeader>

          {/* Department selection */}
          {bulkOperation === "department" && !bulkResult && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Chọn bộ phận mới</Label>
                <Select value={bulkDepartmentId} onValueChange={setBulkDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn bộ phận..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Branch selection */}
          {bulkOperation === "branch" && !bulkResult && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Chọn chi nhánh mới</Label>
                <Select value={bulkBranchId} onValueChange={setBulkBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn chi nhánh..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(filterBrandId && branchesByBrand[filterBrandId] || []).map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Activate/Deactivate confirmation */}
          {(bulkOperation === "activate" || bulkOperation === "deactivate") && !bulkResult && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Bạn có chắc chắn muốn <strong>{bulkOperation === "activate" ? "kích hoạt" : "tạm ngưng"}</strong> {selectedStaffIds.size} nhân viên đã chọn?
              </p>
            </div>
          )}

          {/* Reset password confirmation or result */}
          {bulkOperation === "reset-password" && (
            <div className="py-4">
              {!bulkResult ? (
                <p className="text-sm text-muted-foreground">
                  Bạn có chắc chắn muốn reset mật khẩu cho {selectedStaffIds.size} nhân viên đã chọn?
                  <br />
                  <span className="text-orange-500">Mật khẩu mới sẽ được hiển thị sau khi hoàn tất.</span>
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleCopyAllPasswords}>
                      <Copy className="mr-2 h-4 w-4" />
                      Sao chép tất cả
                    </Button>
                  </div>
                  <ScrollArea className="h-[300px] border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Mật khẩu mới</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkResult.passwords?.map((p) => (
                          <TableRow key={p.staffId}>
                            <TableCell className="font-mono text-sm">{p.username}</TableCell>
                            <TableCell className="font-mono text-sm">{p.password}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleCopyPassword(p.password, p.staffId)}
                              >
                                {copiedPasswords.has(p.staffId) ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  {bulkResult.errors.length > 0 && (
                    <div className="text-sm text-destructive">
                      {bulkResult.failed} nhân viên không thể reset mật khẩu
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseBulkDialog}>
              {bulkResult ? "Đóng" : "Hủy"}
            </Button>
            {!bulkResult && (
              <Button onClick={handleBulkOperation} disabled={processingBulk}>
                {processingBulk && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Xác nhận
              </Button>
            )}
            {bulkResult && (
              <Button onClick={() => {
                loadStaff(filterBranchId, filterBrandId);
                setSelectedStaffIds(new Set());
                handleCloseBulkDialog();
              }}>
                Hoàn tất
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Staff Dialog */}
      <Dialog open={dialogMode === "view"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="flex flex-row items-start justify-between">
            <div>
              <DialogTitle>Chi tiết nhân viên</DialogTitle>
              <DialogDescription>Thông tin chi tiết của nhân viên</DialogDescription>
            </div>
            <Popover open={detailFieldsPopoverOpen} onOpenChange={setDetailFieldsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Cấu hình Fields
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Hiển thị Fields</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={showAllDetailFields}>
                        Tất cả
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={hideAllDetailFields}>
                        Ẩn hết
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-2">
                      {detailFields.map((field) => (
                        <div key={field.key} className="flex items-center gap-2">
                          <Checkbox
                            id={`detail-field-${field.key}`}
                            checked={field.visible}
                            onCheckedChange={() => toggleDetailField(field.key)}
                          />
                          <Label
                            htmlFor={`detail-field-${field.key}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {field.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex justify-center">
                <Avatar className="h-24 w-24">
                  {selectedStaff.avatarUrl ? (
                    <AvatarImage src={selectedStaff.avatarUrl} alt={selectedStaff.name} />
                  ) : null}
                  <AvatarFallback className="text-xl">
                    {selectedStaff.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {(isDetailFieldVisible("name") || isDetailFieldVisible("username")) && (
                <div className="grid grid-cols-2 gap-4">
                  {isDetailFieldVisible("name") && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Tên nhân viên</Label>
                      <p className="font-medium">{selectedStaff.name}</p>
                    </div>
                  )}
                  {isDetailFieldVisible("username") && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Username</Label>
                      <p className="font-mono">{selectedStaff.username}</p>
                    </div>
                  )}
                </div>
              )}
              {(isDetailFieldVisible("birthDate") || isDetailFieldVisible("gender")) && (
                <div className="grid grid-cols-2 gap-4">
                  {isDetailFieldVisible("birthDate") && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Ngày sinh</Label>
                      <p>{formatDate(selectedStaff.birthDate)}</p>
                    </div>
                  )}
                  {isDetailFieldVisible("gender") && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Giới tính</Label>
                      <p>{getGenderLabel(selectedStaff.gender)}</p>
                    </div>
                  )}
                </div>
              )}
              {(isDetailFieldVisible("phone") || isDetailFieldVisible("email")) && (
                <div className="grid grid-cols-2 gap-4">
                  {isDetailFieldVisible("phone") && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Số điện thoại</Label>
                      <p>{selectedStaff.phone || "-"}</p>
                    </div>
                  )}
                  {isDetailFieldVisible("email") && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Email</Label>
                      <p>{selectedStaff.email || "-"}</p>
                    </div>
                  )}
                </div>
              )}
              {isDetailFieldVisible("idNumber") && (
                <div>
                  <Label className="text-muted-foreground text-xs">CCCD</Label>
                  <p>{selectedStaff.idNumber || "-"}</p>
                </div>
              )}
              {isDetailFieldVisible("address") && (
                <div>
                  <Label className="text-muted-foreground text-xs">Địa chỉ</Label>
                  <p>{selectedStaff.address || "-"}</p>
                </div>
              )}
              {(isDetailFieldVisible("branchName") || isDetailFieldVisible("departmentName")) && (
                <div className="grid grid-cols-2 gap-4">
                  {isDetailFieldVisible("branchName") && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Chi nhánh</Label>
                      <p>{selectedStaff.branchName || "-"}</p>
                    </div>
                  )}
                  {isDetailFieldVisible("departmentName") && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Bộ phận</Label>
                      <p>{selectedStaff.departmentName || getDepartmentName(selectedStaff.departmentId)}</p>
                    </div>
                  )}
                </div>
              )}
              {(isDetailFieldVisible("isActive") || isDetailFieldVisible("createdAt")) && (
                <div className="grid grid-cols-2 gap-4">
                  {isDetailFieldVisible("isActive") && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Trạng thái</Label>
                      <Badge variant={selectedStaff.isActive ? "default" : "secondary"}>
                        {selectedStaff.isActive ? "Hoạt động" : "Tạm ngưng"}
                      </Badge>
                    </div>
                  )}
                  {isDetailFieldVisible("createdAt") && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Ngày tạo</Label>
                      <p>{formatDate(selectedStaff.createdAt)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCloseDialog()}>
              Đóng
            </Button>
            <Button onClick={() => selectedStaff && handleOpenEdit(selectedStaff)}>
              <Pencil className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={dialogMode === "import"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import nhân viên từ Excel</DialogTitle>
            <DialogDescription>
              Hệ thống tự động nhận diện Tỉnh/Thành phố, Thương hiệu, Chi nhánh, Bộ phận từ tên trong Excel.
              {importData.some((d) => !d.id && (!d.brandId || !d.branchId || !d.departmentId))
                ? " Một số dòng thiếu thông tin, vui lòng chọn giá trị mặc định bên dưới."
                : " Tất cả dữ liệu đã sẵn sàng để import."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="default">{importData.filter((d) => !d.id).length}</Badge>
                <span>Tạo mới</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{importData.filter((d) => d.id).length}</Badge>
                <span>Cập nhật</span>
              </div>
              {/* Show how many NEW staff have complete data from Excel */}
              {(() => {
                const newStaffComplete = importData.filter((d) => !d.id && d.brandId && d.branchId && d.departmentId).length;
                const newStaffMissing = importData.filter((d) => !d.id && (!d.brandId || !d.branchId || !d.departmentId)).length;
                return (
                  <>
                    {newStaffComplete > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {newStaffComplete}
                        </Badge>
                        <span className="text-green-700">Đầy đủ thông tin</span>
                      </div>
                    )}
                    {newStaffMissing > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          {newStaffMissing}
                        </Badge>
                        <span className="text-yellow-700">Thiếu thông tin</span>
                      </div>
                    )}
                  </>
                );
              })()}
              {importErrors.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{importErrors.length}</Badge>
                  <span>Cảnh báo</span>
                </div>
              )}
            </div>

            {/* Settings for new staff - only show if some new staff are missing required fields */}
            {importData.some((d) => !d.id && (!d.brandId || !d.branchId || !d.departmentId)) && (
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-200 space-y-4">
                <p className="text-sm font-medium text-blue-800">Cài đặt cho nhân viên mới:</p>

                {/* Brand and Branch */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-sm">Thương hiệu *</Label>
                    <Select
                      value={importSettings.brandId}
                      onValueChange={handleImportBrandChange}
                      disabled={loadingBrands}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Chọn thương hiệu" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm">Chi nhánh *</Label>
                    <Select
                      value={importSettings.branchId}
                      onValueChange={(value) => setImportSettings({ ...importSettings, branchId: value })}
                      disabled={!importSettings.brandId || loadingBranches || importBranches.length === 0}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Chọn chi nhánh" />
                      </SelectTrigger>
                      <SelectContent>
                        {importBranches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Department */}
                <div className="grid gap-2">
                  <Label className="text-sm">Bộ phận *</Label>
                  <Select
                    value={importSettings.departmentId}
                    onValueChange={(value) => setImportSettings({ ...importSettings, departmentId: value })}
                    disabled={loadingDepartments}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Chọn bộ phận" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Province and Ward */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-sm">Tỉnh/Thành phố</Label>
                    <Select
                      value={importSettings.provinceCode}
                      onValueChange={handleImportProvinceChange}
                      disabled={loadingProvinces}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Chọn tỉnh/thành phố" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.map((province) => (
                          <SelectItem key={province.code} value={province.code}>
                            {province.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm">Phường/Xã</Label>
                    <Select
                      value={importSettings.wardCode}
                      onValueChange={(value) => setImportSettings({ ...importSettings, wardCode: value })}
                      disabled={!importSettings.provinceCode || loadingWards || importWards.length === 0}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Chọn phường/xã" />
                      </SelectTrigger>
                      <SelectContent>
                        {importWards.map((ward) => (
                          <SelectItem key={ward.code} value={ward.code}>
                            {ward.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Errors */}
            {importErrors.length > 0 && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <p className="text-sm font-medium text-red-800 mb-2">Lỗi:</p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  {importErrors.slice(0, 5).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {importErrors.length > 5 && (
                    <li>... và {importErrors.length - 5} lỗi khác</li>
                  )}
                </ul>
              </div>
            )}

            {/* Preview table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">STT</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead>SĐT</TableHead>
                    <TableHead>Thương hiệu/Chi nhánh</TableHead>
                    <TableHead>Bộ phận</TableHead>
                    <TableHead>Loại</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.slice(0, 10).map((item, index) => {
                    const isUpdate = !!item.id;
                    const brand = item.brandId ? brands.find((b) => b.id === item.brandId) : null;
                    const allBranches = item.brandId ? branchesByBrand[item.brandId] || [] : [];
                    const branch = item.branchId ? allBranches.find((b) => b.id === item.branchId) : null;
                    const department = item.departmentId ? departments.find((d) => d.id === item.departmentId) : null;
                    // For updates, we don't need brand/branch/department (they keep current values)
                    const hasAllRequired = isUpdate || (item.brandId && item.branchId && item.departmentId);

                    return (
                      <TableRow key={index} className={!hasAllRequired ? "bg-yellow-50" : ""}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.phone || "-"}</TableCell>
                        <TableCell className="text-xs">
                          {isUpdate ? (
                            <span className="text-muted-foreground">Giữ nguyên</span>
                          ) : (
                            <>
                              {brand?.name || <span className="text-yellow-600">Chưa có</span>}
                              {" / "}
                              {branch?.name || <span className="text-yellow-600">Chưa có</span>}
                            </>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {isUpdate ? (
                            <span className="text-muted-foreground">Giữ nguyên</span>
                          ) : (
                            department?.name || <span className="text-yellow-600">Chưa có</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isUpdate ? "secondary" : hasAllRequired ? "default" : "outline"}>
                            {isUpdate ? "Cập nhật" : hasAllRequired ? "Tạo mới" : "Thiếu TT"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {importData.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        ... và {importData.length - 10} dòng khác
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Hủy
            </Button>
            <Button onClick={handleImport} disabled={importing || importData.length === 0}>
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {importData.length} dòng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Staff Dialog */}
      <Dialog open={dialogMode === "create" || dialogMode === "edit"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Thêm nhân viên mới" : "Chỉnh sửa nhân viên"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Nhập thông tin nhân viên. Hệ thống sẽ tự động tạo tài khoản và mật khẩu tạm thời."
                : "Cập nhật thông tin nhân viên"}
            </DialogDescription>
          </DialogHeader>
          {createdStaff ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                <p className="text-sm font-medium text-green-800 mb-3">Tạo nhân viên thành công!</p>
                <div className="space-y-2">
                  <p className="text-sm text-green-700">
                    Tên nhân viên: <strong>{createdStaff.name}</strong>
                  </p>
                  <p className="text-sm text-green-700">
                    Tên đăng nhập: <strong className="font-mono">{createdStaff.username}</strong>
                  </p>
                  <p className="text-sm text-green-700">
                    Mật khẩu tạm thời: <strong className="font-mono">{createdStaff.temporaryPassword}</strong>
                  </p>
                </div>
                <p className="text-xs text-green-600 mt-3">
                  Vui lòng ghi lại thông tin này và yêu cầu nhân viên đổi mật khẩu khi đăng nhập lần đầu.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseDialog}>Đóng</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                {/* Avatar Upload */}
                <div className="flex justify-center">
                  <div className="grid gap-2 text-center">
                    <Label>Ảnh đại diện</Label>
                    <ImageUpload
                      value={formData.avatarUrl}
                      onChange={(url) => setFormData({ ...formData, avatarUrl: url })}
                      aspectRatio={1}
                      maxWidth={400}
                      maxHeight={400}
                      folder="staff"
                      circular
                      className="w-32 h-32 mx-auto"
                      placeholder="Chọn ảnh"
                    />
                  </div>
                </div>

                {/* Row 1: Name and Username Prefix */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Tên nhân viên *</Label>
                    <Input
                      id="name"
                      placeholder="Nguyễn Văn A"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  {dialogMode === "create" && (
                    <div className="grid gap-2">
                      <Label htmlFor="usernamePrefix">Mã đăng nhập</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="usernamePrefix"
                          placeholder="tr"
                          maxLength={2}
                          className="w-20 text-center font-mono uppercase"
                          value={formData.usernamePrefix}
                          onChange={(e) => setFormData({ ...formData, usernamePrefix: e.target.value.toLowerCase().replace(/[^a-z]/g, '').substring(0, 2) })}
                        />
                        <span className="text-muted-foreground font-mono">000001</span>
                        <span className="text-xs text-muted-foreground">(tự động)</span>
                      </div>
                    </div>
                  )}
                  {dialogMode === "edit" && selectedStaff && (
                    <div className="grid gap-2">
                      <Label>Username</Label>
                      <Input value={selectedStaff.username} disabled className="font-mono" />
                    </div>
                  )}
                </div>

                {/* Row 2: Birth Date and Gender */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="birthDate">Ngày sinh *</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      required={dialogMode === "create"}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gender">Giới tính *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value: Gender) => setFormData({ ...formData, gender: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn giới tính" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Nam</SelectItem>
                        <SelectItem value="female">Nữ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 3: Province and Ward */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="provinceCode">Tỉnh/Thành phố</Label>
                    <Select
                      value={formData.provinceCode || ""}
                      onValueChange={handleProvinceChange}
                      disabled={loadingProvinces}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn tỉnh/thành phố" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.map((province) => (
                          <SelectItem key={province.code} value={province.code}>
                            {province.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="wardCode">Phường/Xã</Label>
                    <Select
                      value={formData.wardCode || ""}
                      onValueChange={(value) => setFormData({ ...formData, wardCode: value })}
                      disabled={!formData.provinceCode || loadingWards || wards.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn phường/xã" />
                      </SelectTrigger>
                      <SelectContent>
                        {wards.map((ward) => (
                          <SelectItem key={ward.code} value={ward.code}>
                            {ward.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 4: Address */}
                <div className="grid gap-2">
                  <Label htmlFor="address">Địa chỉ chi tiết</Label>
                  <Input
                    id="address"
                    placeholder="123 Nguyễn Văn Linh"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                {/* Row 5: Brand and Branch - only for create mode */}
                {dialogMode === "create" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="brandId">Thương hiệu *</Label>
                      <Select
                        value={formData.brandId}
                        onValueChange={handleBrandChange}
                        disabled={loadingBrands}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn thương hiệu" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="branchId">Chi nhánh *</Label>
                      <Select
                        value={formData.branchId}
                        onValueChange={(value) => setFormData({ ...formData, branchId: value })}
                        disabled={!formData.brandId || loadingBranches || branches.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn chi nhánh" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Row 6: Department */}
                <div className="grid gap-2">
                  <Label htmlFor="departmentId">Bộ phận {dialogMode === "create" ? "*" : ""}</Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                    disabled={loadingDepartments}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn bộ phận" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Row 7: ID Number and Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="idNumber">Căn cước công dân</Label>
                    <Input
                      id="idNumber"
                      placeholder="001234567890"
                      value={formData.idNumber}
                      onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Row 8: Phone */}
                <div className="grid gap-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    placeholder="0909123456"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-4">
                {dialogMode === "create" && (
                  <div className="flex items-center space-x-2 mr-auto">
                    <Checkbox
                      id="continueCreating"
                      checked={continueCreating}
                      onCheckedChange={(checked) => setContinueCreating(checked === true)}
                    />
                    <Label htmlFor="continueCreating" className="text-sm font-normal cursor-pointer">
                      Tiếp tục tạo sau khi lưu
                    </Label>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || (dialogMode === "create" && (!formData.name.trim() || !formData.birthDate || !formData.departmentId || !formData.brandId || !formData.branchId))}
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {dialogMode === "create" ? "Tạo nhân viên" : "Cập nhật"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Result Dialog */}
      <Dialog open={resetPasswordResult !== null} onOpenChange={() => setResetPasswordResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset mật khẩu thành công</DialogTitle>
            <DialogDescription>
              Mật khẩu mới đã được tạo cho nhân viên
            </DialogDescription>
          </DialogHeader>
          {resetPasswordResult && (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                <div className="space-y-2">
                  <p className="text-sm text-green-700">
                    Nhân viên: <strong>{resetPasswordResult.staff.name}</strong>
                  </p>
                  <p className="text-sm text-green-700">
                    Username: <strong className="font-mono">{resetPasswordResult.staff.username}</strong>
                  </p>
                  <p className="text-sm text-green-700">
                    Mật khẩu mới: <strong className="font-mono text-lg">{resetPasswordResult.temporaryPassword}</strong>
                  </p>
                </div>
                <p className="text-xs text-green-600 mt-3">
                  Vui lòng ghi lại mật khẩu này và yêu cầu nhân viên đổi mật khẩu khi đăng nhập.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResetPasswordResult(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Assignment Dialog */}
      <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Phân quyền cho nhân viên
            </DialogTitle>
            <DialogDescription>
              Gán quyền riêng cho nhân viên &quot;{permissionStaff?.name}&quot;.
              {permissionStaff?.departmentName && (
                <span className="block mt-1">
                  Nhân viên thuộc bộ phận <strong>{permissionStaff.departmentName}</strong> và đã thừa hưởng các quyền của bộ phận đó.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingPermissions ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(allPermissions).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Shield className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có quyền nào được định nghĩa trong hệ thống</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Legend */}
                {departmentPermissionIds.size > 0 && (
                  <div className="flex items-center gap-4 text-sm p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-blue-500" />
                      <span>Quyền riêng</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-green-500" />
                      <span>Thừa hưởng từ bộ phận</span>
                    </div>
                  </div>
                )}

                {Object.entries(allPermissions).map(([module, permissions]) => {
                  const nonInheritedPerms = permissions.filter(p => !departmentPermissionIds.has(p.id));
                  const allNonInheritedSelected = nonInheritedPerms.length > 0 && nonInheritedPerms.every(p => selectedPermissionIds.has(p.id));
                  const someSelected = permissions.some(p => selectedPermissionIds.has(p.id) || departmentPermissionIds.has(p.id));

                  return (
                    <div key={module} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Checkbox
                          id={`module-${module}`}
                          checked={allNonInheritedSelected}
                          disabled={nonInheritedPerms.length === 0}
                          className={someSelected && !allNonInheritedSelected ? "data-[state=checked]:bg-primary/50" : ""}
                          onCheckedChange={() => toggleModule(permissions)}
                        />
                        <Label
                          htmlFor={`module-${module}`}
                          className="text-base font-semibold cursor-pointer"
                        >
                          {module}
                        </Label>
                        <Badge variant="outline" className="ml-auto">
                          {permissions.filter(p => selectedPermissionIds.has(p.id) || departmentPermissionIds.has(p.id)).length}/{permissions.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                        {permissions.map((perm) => {
                          const isInherited = departmentPermissionIds.has(perm.id);
                          const isOwn = selectedPermissionIds.has(perm.id);

                          return (
                            <div key={perm.id} className="flex items-start gap-2">
                              <Checkbox
                                id={perm.id}
                                checked={isOwn || isInherited}
                                disabled={isInherited}
                                onCheckedChange={() => togglePermission(perm.id)}
                                className={isInherited ? "data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600" : ""}
                              />
                              <div className="grid gap-0.5">
                                <div className="flex items-center gap-2">
                                  <Label
                                    htmlFor={perm.id}
                                    className={`text-sm font-medium ${isInherited ? "cursor-default" : "cursor-pointer"}`}
                                  >
                                    {perm.name}
                                  </Label>
                                  {isInherited && (
                                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                                      Bộ phận
                                    </Badge>
                                  )}
                                </div>
                                {perm.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {perm.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="mt-4">
            <div className="flex items-center gap-4 mr-auto text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4 text-blue-500" />
                <span>Quyền riêng: {selectedPermissionIds.size}</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4 text-green-500" />
                <span>Thừa hưởng: {departmentPermissionIds.size}</span>
              </div>
            </div>
            <Button variant="outline" onClick={() => setPermissionDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSavePermissions} disabled={savingPermissions}>
              {savingPermissions && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu quyền
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
