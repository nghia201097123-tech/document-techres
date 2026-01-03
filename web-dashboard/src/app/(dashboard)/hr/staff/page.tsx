"use client";

import * as React from "react";
import { Search, UserPlus, Users, Loader2, MoreHorizontal, Eye, Pencil, Power, Download, Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { staffService, type Staff, type CreateStaffDto, type UpdateStaffDto, type Gender, type BulkStaffItem } from "@/services/staff-service";
import { exportToExcel, readExcelFile, downloadTemplate } from "@/lib/excel-utils";

// Redux imports
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBrands } from "@/store/slices/brandsSlice";
import { fetchBranchesByBrand } from "@/store/slices/branchesSlice";
import { fetchDepartments } from "@/store/slices/departmentsSlice";
import { fetchProvinces, fetchWardsByProvince } from "@/store/slices/locationsSlice";

const initialFormData: CreateStaffDto = {
  name: "",
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
  { key: "address" as keyof Staff, header: "Địa chỉ", width: 30 },
  { key: "departmentId" as keyof Staff, header: "ID Bộ phận", width: 40 },
  { key: "branchName" as keyof Staff, header: "Chi nhánh", width: 20 },
  { key: "isActive" as keyof Staff, header: "Hoạt động", width: 10 },
];

// Excel column mapping for import
const importColumnMapping = [
  { excelHeader: "ID", key: "id" as keyof BulkStaffItem },
  { excelHeader: "Tên nhân viên", key: "name" as keyof BulkStaffItem },
  { excelHeader: "Số điện thoại", key: "phone" as keyof BulkStaffItem },
  { excelHeader: "Email", key: "email" as keyof BulkStaffItem },
  { excelHeader: "Ngày sinh", key: "birthDate" as keyof BulkStaffItem },
  { excelHeader: "Giới tính", key: "gender" as keyof BulkStaffItem },
  { excelHeader: "CCCD", key: "idNumber" as keyof BulkStaffItem },
  { excelHeader: "Địa chỉ", key: "address" as keyof BulkStaffItem },
  { excelHeader: "ID Bộ phận", key: "departmentId" as keyof BulkStaffItem },
  { excelHeader: "ID Thương hiệu", key: "brandId" as keyof BulkStaffItem },
  { excelHeader: "ID Chi nhánh", key: "branchId" as keyof BulkStaffItem },
];

// Template columns
const templateColumns = [
  { header: "ID", example: "(để trống nếu tạo mới)", required: false },
  { header: "Tên nhân viên", example: "Nguyễn Văn A", required: true },
  { header: "Số điện thoại", example: "0901234567", required: false },
  { header: "Email", example: "email@example.com", required: false },
  { header: "Ngày sinh", example: "1990-01-15", required: true },
  { header: "Giới tính", example: "male hoặc female", required: true },
  { header: "CCCD", example: "001234567890", required: false },
  { header: "Địa chỉ", example: "123 Nguyễn Văn Linh, Q.7, TP.HCM", required: true },
  { header: "ID Bộ phận", example: "(UUID của bộ phận)", required: true },
  { header: "ID Thương hiệu", example: "(UUID - chỉ khi tạo mới)", required: false },
  { header: "ID Chi nhánh", example: "(UUID - chỉ khi tạo mới)", required: false },
];

type DialogMode = "create" | "edit" | "view" | "import" | null;

export default function StaffPage() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Redux selectors
  const { items: brands, loading: loadingBrands } = useAppSelector((state) => state.brands);
  const { byBrandId: branchesByBrand, loading: loadingBranches } = useAppSelector((state) => state.branches);
  const { items: departments, loading: loadingDepartments } = useAppSelector((state) => state.departments);
  const { provinces, wardsByProvince, loadingProvinces, loadingWards } = useAppSelector((state) => state.locations);

  // Local state
  const [search, setSearch] = React.useState("");
  const [staffList, setStaffList] = React.useState<Staff[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<CreateStaffDto>(initialFormData);
  const [selectedStaff, setSelectedStaff] = React.useState<Staff | null>(null);
  const [createdStaff, setCreatedStaff] = React.useState<(Staff & { temporaryPassword: string }) | null>(null);

  // Import state
  const [importData, setImportData] = React.useState<Partial<BulkStaffItem>[]>([]);
  const [importErrors, setImportErrors] = React.useState<string[]>([]);
  const [importing, setImporting] = React.useState(false);

  // Derived state from Redux
  const branches = formData.brandId ? branchesByBrand[formData.brandId] || [] : [];
  const wards = formData.provinceCode ? wardsByProvince[formData.provinceCode] || [] : [];
  const loadingDropdowns = loadingBrands || loadingDepartments || loadingProvinces;

  // Load staff list
  const loadStaff = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await staffService.getAll();
      setStaffList(data);
    } catch (error) {
      console.error("Error loading staff:", error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách nhân viên", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadStaff();
  }, [loadStaff]);

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
    if (dialogMode === "create" || dialogMode === "edit") {
      dispatch(fetchDepartments());
      dispatch(fetchBrands());
      dispatch(fetchProvinces());
    }
  }, [dialogMode, dispatch]);

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
  };

  // Open edit dialog
  const handleOpenEdit = (staff: Staff) => {
    setSelectedStaff(staff);
    setFormData({
      name: staff.name,
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
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (dialogMode === "create") {
      // Validate required fields for create
      if (!formData.name.trim() || !formData.birthDate || !formData.gender ||
          !formData.address.trim() || !formData.departmentId ||
          !formData.brandId || !formData.branchId) {
        toast({ title: "Lỗi", description: "Vui lòng điền đầy đủ các trường bắt buộc", variant: "destructive" });
        return;
      }

      try {
        setSaving(true);
        const result = await staffService.create(formData);
        setCreatedStaff(result);
        setStaffList((prev) => [...prev, result]);
        toast({ title: "Thành công", description: "Đã tạo nhân viên mới" });
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
      };

      try {
        setSaving(true);
        const result = await staffService.update(selectedStaff.id, updateData);
        setStaffList((prev) => prev.map((s) => (s.id === selectedStaff.id ? result : s)));
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

  // Close dialog and reset
  const handleCloseDialog = () => {
    setDialogMode(null);
    setCreatedStaff(null);
    setSelectedStaff(null);
    setFormData(initialFormData);
    setImportData([]);
    setImportErrors([]);
  };

  // Handle province change
  const handleProvinceChange = (provinceCode: string) => {
    setFormData({ ...formData, provinceCode, wardCode: "" });
  };

  // Handle brand change
  const handleBrandChange = (brandId: string) => {
    setFormData({ ...formData, brandId, branchId: "" });
  };

  // Export to Excel
  const handleExport = () => {
    if (staffList.length === 0) {
      toast({ title: "Thông báo", description: "Không có dữ liệu để xuất", variant: "destructive" });
      return;
    }

    // Transform data for export
    const exportData = staffList.map((staff) => ({
      ...staff,
      birthDate: staff.birthDate ? new Date(staff.birthDate).toISOString().split("T")[0] : "",
      gender: staff.gender === "male" ? "Nam" : staff.gender === "female" ? "Nữ" : "",
      isActive: staff.isActive ? "Có" : "Không",
    }));

    exportToExcel(exportData, excelColumns, `danh_sach_nhan_vien_${new Date().toISOString().split("T")[0]}`);
    toast({ title: "Thành công", description: "Đã xuất file Excel" });
  };

  // Download template
  const handleDownloadTemplate = () => {
    downloadTemplate(templateColumns, "mau_import_nhan_vien");
    toast({ title: "Thành công", description: "Đã tải file mẫu" });
  };

  // Handle file input change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await readExcelFile<BulkStaffItem>(file, importColumnMapping);

      // Transform gender values
      const transformedData = result.data.map((item) => ({
        ...item,
        gender: item.gender === "Nam" || item.gender === "male" ? "male" as Gender :
                item.gender === "Nữ" || item.gender === "female" ? "female" as Gender :
                item.gender as Gender,
      }));

      setImportData(transformedData);
      setImportErrors(result.errors);
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

    try {
      setImporting(true);
      const result = await staffService.bulkImport(importData as BulkStaffItem[]);

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
        loadStaff();
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

  // Filter staff by search
  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.username?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý nhân viên</h1>
          <p className="text-muted-foreground">Thêm, sửa và quản lý nhân viên trong chi nhánh</p>
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
              <CardDescription>Tổng cộng {staffList.length} nhân viên</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm nhân viên..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên nhân viên</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead>Chi nhánh</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[80px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">{staff.name}</TableCell>
                    <TableCell className="font-mono text-sm">{staff.username}</TableCell>
                    <TableCell>{staff.phone || "-"}</TableCell>
                    <TableCell>{staff.branchName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={staff.isActive ? "default" : "secondary"}>
                        {staff.isActive ? "Hoạt động" : "Tạm ngưng"}
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
                          <DropdownMenuItem onClick={() => handleOpenView(staff)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(staff)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
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
          )}
        </CardContent>
      </Card>

      {/* View Staff Dialog */}
      <Dialog open={dialogMode === "view"} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết nhân viên</DialogTitle>
            <DialogDescription>Thông tin chi tiết của nhân viên</DialogDescription>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Tên nhân viên</Label>
                  <p className="font-medium">{selectedStaff.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Username</Label>
                  <p className="font-mono">{selectedStaff.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Ngày sinh</Label>
                  <p>{formatDate(selectedStaff.birthDate)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Giới tính</Label>
                  <p>{getGenderLabel(selectedStaff.gender)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Số điện thoại</Label>
                  <p>{selectedStaff.phone || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p>{selectedStaff.email || "-"}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">CCCD</Label>
                <p>{selectedStaff.idNumber || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Địa chỉ</Label>
                <p>{selectedStaff.address || "-"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Chi nhánh</Label>
                  <p>{selectedStaff.branchName || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Bộ phận</Label>
                  <p>{selectedStaff.departmentName || getDepartmentName(selectedStaff.departmentId)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Trạng thái</Label>
                  <Badge variant={selectedStaff.isActive ? "default" : "secondary"}>
                    {selectedStaff.isActive ? "Hoạt động" : "Tạm ngưng"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Ngày tạo</Label>
                  <p>{formatDate(selectedStaff.createdAt)}</p>
                </div>
              </div>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import nhân viên từ Excel</DialogTitle>
            <DialogDescription>
              Xem lại dữ liệu trước khi import. Các dòng có ID sẽ được cập nhật, còn lại sẽ tạo mới.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="default">{importData.filter((d) => !d.id).length}</Badge>
                <span>Tạo mới</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{importData.filter((d) => d.id).length}</Badge>
                <span>Cập nhật</span>
              </div>
              {importErrors.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{importErrors.length}</Badge>
                  <span>Lỗi</span>
                </div>
              )}
            </div>

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
                    <TableHead>Giới tính</TableHead>
                    <TableHead>Loại</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.slice(0, 10).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.phone || "-"}</TableCell>
                      <TableCell>{item.gender === "male" ? "Nam" : item.gender === "female" ? "Nữ" : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={item.id ? "secondary" : "default"}>
                          {item.id ? "Cập nhật" : "Tạo mới"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {importData.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                  <Label htmlFor="address">Địa chỉ chi tiết *</Label>
                  <Input
                    id="address"
                    placeholder="123 Nguyễn Văn Linh"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required={dialogMode === "create"}
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={saving || (dialogMode === "create" && (!formData.name.trim() || !formData.birthDate || !formData.address.trim() || !formData.departmentId || !formData.brandId || !formData.branchId))}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {dialogMode === "create" ? "Tạo nhân viên" : "Cập nhật"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
