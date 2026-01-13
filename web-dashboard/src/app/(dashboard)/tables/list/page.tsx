"use client";

import * as React from "react";
import { Plus, Table2, Loader2, MoreHorizontal, Pencil, Power, Trash2, Users, Check, ChevronsUpDown, X, CheckSquare, Square, Type, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { tableService, type Table, type CreateTableDto, type UpdateTableDto, TableStatus, tableStatusLabels } from "@/services/table-service";
import { areaService, type Area } from "@/services/area-service";
import { cn } from "@/lib/utils";
import { BrandBranchFilter, FilterRequiredPlaceholder, useGlobalFilters } from "@/components/ui/brand-filter";

type DialogMode = "create" | "edit" | null;

// Rename format types (like macOS)
type RenameFormat = "replace" | "add_prefix" | "add_suffix" | "name_and_index";

interface BulkRenameConfig {
  format: RenameFormat;
  findText: string;
  replaceText: string;
  prefix: string;
  suffix: string;
  customFormat: string;
  startNumber: number;
  where: "before" | "after";
}

interface BulkProgress {
  current: number;
  total: number;
  status: "idle" | "processing" | "completed" | "error";
  message?: string;
}

export default function TablesPage() {
  const { toast } = useToast();

  // Global filter state from Redux
  const { brandId: filterBrandId, branchId: filterBranchId, setBrandId: setFilterBrandId, setBranchId: setFilterBranchId } = useGlobalFilters();

  const [tables, setTables] = React.useState<Table[]>([]);
  const [areas, setAreas] = React.useState<Area[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [saving, setSaving] = React.useState(false);
  const [selectedTable, setSelectedTable] = React.useState<Table | null>(null);
  const [deleteTable, setDeleteTable] = React.useState<Table | null>(null);
  const [filterAreaId, setFilterAreaId] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Form data
  const [formData, setFormData] = React.useState<CreateTableDto>({
    areaId: "",
    name: "",
    capacity: 4,
    sortOrder: 0,
  });

  // Continue creating checkbox
  const [continueCreating, setContinueCreating] = React.useState(false);

  // Bulk create mode
  const [bulkCreateEnabled, setBulkCreateEnabled] = React.useState(false);
  const [bulkCreateQuantity, setBulkCreateQuantity] = React.useState(5);
  const [bulkCreateFormat, setBulkCreateFormat] = React.useState("Bàn ");
  const [bulkCreateStartNumber, setBulkCreateStartNumber] = React.useState(1);
  const [bulkCreateProgress, setBulkCreateProgress] = React.useState<BulkProgress>({
    current: 0,
    total: 0,
    status: "idle",
  });

  // Track newly created and updated table IDs for badges
  const [newTableIds, setNewTableIds] = React.useState<Set<string>>(new Set());
  const [updatedTableIds, setUpdatedTableIds] = React.useState<Set<string>>(new Set());

  // Area combobox state
  const [areaComboboxOpen, setAreaComboboxOpen] = React.useState(false);
  const [areaSearchValue, setAreaSearchValue] = React.useState("");

  // Bulk operations state
  const [selectedTableIds, setSelectedTableIds] = React.useState<Set<string>>(new Set());
  const [bulkRenameDialogOpen, setBulkRenameDialogOpen] = React.useState(false);
  const [bulkRenameConfig, setBulkRenameConfig] = React.useState<BulkRenameConfig>({
    format: "name_and_index",
    findText: "",
    replaceText: "",
    prefix: "",
    suffix: "",
    customFormat: "Bàn ",
    startNumber: 1,
    where: "after",
  });
  const [bulkProgress, setBulkProgress] = React.useState<BulkProgress>({
    current: 0,
    total: 0,
    status: "idle",
  });
  const [bulkToggleAction, setBulkToggleAction] = React.useState<"enable" | "disable" | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);

  // Load data - only when branch is selected
  const loadData = React.useCallback(async (branchId: string) => {
    if (!branchId) {
      setTables([]);
      setAreas([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [tablesData, areasData] = await Promise.all([
        tableService.getAll(branchId),
        areaService.getAll(branchId),
      ]);
      // Sort by createdAt descending (newest first)
      const sortedTables = [...tablesData].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const sortedAreas = [...areasData].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setTables(sortedTables);
      setAreas(sortedAreas);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Lỗi", description: "Không thể tải dữ liệu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadData(filterBranchId);
  }, [filterBranchId, loadData]);

  // Filter tables by area and status (already filtered by API for branch)
  const filteredTables = React.useMemo(() => {
    return tables.filter((t) => {
      const areaMatch = filterAreaId === "all" || t.areaId === filterAreaId;
      const statusMatch = statusFilter === "all" || t.status === statusFilter;
      return areaMatch && statusMatch;
    });
  }, [tables, filterAreaId, statusFilter]);

  // Group tables by area
  const tablesByArea = React.useMemo(() => {
    const grouped = new Map<string, Table[]>();
    filteredTables.forEach((table) => {
      const areaId = table.areaId;
      if (!grouped.has(areaId)) {
        grouped.set(areaId, []);
      }
      grouped.get(areaId)!.push(table);
    });
    return grouped;
  }, [filteredTables]);

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedTable(null);
    setFormData({ areaId: "", name: "", capacity: 4, sortOrder: 0 });
    setAreaSearchValue("");
    setDialogMode("create");
  };

  // Open edit dialog
  const handleOpenEdit = (table: Table) => {
    setSelectedTable(table);
    setFormData({
      areaId: table.areaId,
      name: table.name,
      capacity: table.capacity,
      sortOrder: table.sortOrder,
    });
    const area = areas.find(a => a.id === table.areaId);
    setAreaSearchValue(area?.name || "");
    setDialogMode("edit");
    // Remove badges when editing
    setNewTableIds(prev => { const next = new Set(prev); next.delete(table.id); return next; });
    setUpdatedTableIds(prev => { const next = new Set(prev); next.delete(table.id); return next; });
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedTable(null);
    setFormData({ areaId: "", name: "", capacity: 4, sortOrder: 0 });
    setAreaSearchValue("");
    setContinueCreating(false);
    // Reset bulk create
    setBulkCreateEnabled(false);
    setBulkCreateProgress({ current: 0, total: 0, status: "idle" });
  };

  // Preview for bulk create
  const bulkCreatePreview = React.useMemo(() => {
    if (!bulkCreateEnabled) return [];
    return Array.from({ length: bulkCreateQuantity }, (_, index) => ({
      name: `${bulkCreateFormat}${bulkCreateStartNumber + index}`,
      index: bulkCreateStartNumber + index,
    }));
  }, [bulkCreateEnabled, bulkCreateQuantity, bulkCreateFormat, bulkCreateStartNumber]);

  // Reset form for continue creating
  const resetFormForContinue = () => {
    // Keep the same areaId and search value, just reset name
    setFormData(prev => ({
      ...prev,
      name: "",
      sortOrder: (prev.sortOrder || 0) + 1,
    }));
  };

  // Get or create area by name
  const getOrCreateArea = async (areaName: string): Promise<string> => {
    // Check if area already exists
    const existingArea = areas.find(a => a.name.toLowerCase() === areaName.toLowerCase());
    if (existingArea) {
      return existingArea.id;
    }

    // Create new area
    const newArea = await areaService.create({ name: areaName });
    setAreas(prev => [newArea, ...prev]);
    toast({ title: "Thành công", description: `Đã tạo khu vực "${areaName}"` });
    return newArea.id;
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For bulk create mode, we don't need a name
    if (!bulkCreateEnabled && !formData.name.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tên bàn", variant: "destructive" });
      return;
    }

    // Check if we have an area selected or need to create one
    if (!formData.areaId && !areaSearchValue.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng chọn hoặc nhập tên khu vực", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      // Get or create area if needed
      let areaId = formData.areaId;
      if (!areaId && areaSearchValue.trim()) {
        areaId = await getOrCreateArea(areaSearchValue.trim());
      }

      if (dialogMode === "create") {
        // Bulk create mode
        if (bulkCreateEnabled) {
          setBulkCreateProgress({ current: 0, total: bulkCreateQuantity, status: "processing" });

          let successCount = 0;
          let failCount = 0;
          const newTables: Table[] = [];

          for (let i = 0; i < bulkCreateQuantity; i++) {
            const tableName = `${bulkCreateFormat}${bulkCreateStartNumber + i}`;
            try {
              const result = await tableService.create({
                areaId,
                name: tableName,
                capacity: formData.capacity,
                sortOrder: (formData.sortOrder || 0) + i,
              });
              newTables.push(result);
              setNewTableIds(prev => new Set([...prev, result.id]));
              successCount++;
            } catch (error) {
              console.error(`Error creating table ${tableName}:`, error);
              failCount++;
            }
            setBulkCreateProgress(prev => ({ ...prev, current: i + 1 }));

            // Small delay to prevent overwhelming the server
            if (i < bulkCreateQuantity - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          // Add all new tables to state
          setTables(prev => [...newTables, ...prev]);

          setBulkCreateProgress(prev => ({
            ...prev,
            status: "completed",
            message: `Tạo thành công ${successCount} bàn${failCount > 0 ? `, thất bại ${failCount} bàn` : ""}`,
          }));

          toast({
            title: "Hoàn tất",
            description: `Đã tạo ${successCount} bàn${failCount > 0 ? `, thất bại ${failCount} bàn` : ""}`,
          });

          // Close dialog after a delay
          setTimeout(() => {
            handleCloseDialog();
          }, 1500);
        } else {
          // Single table create
          const result = await tableService.create({ ...formData, areaId });
          setTables((prev) => [result, ...prev]);
          setNewTableIds(prev => new Set([...prev, result.id]));
          toast({ title: "Thành công", description: `Đã tạo bàn "${result.name}"` });

          // If continue creating is checked, reset form but keep dialog open
          if (continueCreating) {
            setFormData(prev => ({
              areaId: areaId,
              name: "",
              capacity: prev.capacity,
              sortOrder: (prev.sortOrder || 0) + 1,
            }));
          } else {
            handleCloseDialog();
          }
        }
      } else if (dialogMode === "edit" && selectedTable) {
        const updateData: UpdateTableDto = {
          areaId: areaId,
          name: formData.name,
          capacity: formData.capacity,
          sortOrder: formData.sortOrder,
        };
        const result = await tableService.update(selectedTable.id, updateData);
        setTables((prev) => prev.map((t) => (t.id === selectedTable.id ? result : t)));
        setUpdatedTableIds(prev => new Set([...prev, result.id]));
        setNewTableIds(prev => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
        toast({ title: "Thành công", description: "Đã cập nhật bàn" });
        handleCloseDialog();
      }
    } catch (error: any) {
      console.error("Error saving table:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi lưu bàn",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (table: Table) => {
    try {
      const updated = await tableService.toggleActive(table.id);
      setTables((prev) => prev.map((t) => (t.id === table.id ? updated : t)));
      toast({
        title: "Thành công",
        description: `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} bàn ${table.name}`,
      });
    } catch (error: any) {
      console.error("Error toggling table:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Handle update status
  const handleUpdateStatus = async (table: Table, status: TableStatus) => {
    try {
      const updated = await tableService.updateStatus(table.id, status);
      setTables((prev) => prev.map((t) => (t.id === table.id ? updated : t)));
      toast({
        title: "Thành công",
        description: `Đã cập nhật trạng thái bàn ${table.name}`,
      });
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTable) return;

    try {
      await tableService.delete(deleteTable.id);
      setTables((prev) => prev.filter((t) => t.id !== deleteTable.id));
      toast({ title: "Thành công", description: `Đã xóa bàn ${deleteTable.name}` });
    } catch (error: any) {
      console.error("Error deleting table:", error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra khi xóa",
        variant: "destructive",
      });
    } finally {
      setDeleteTable(null);
    }
  };

  const getAreaName = (areaId: string) => {
    return areas.find((a) => a.id === areaId)?.name || "Không xác định";
  };

  // ===== BULK OPERATIONS =====

  // Get selected tables
  const selectedTables = React.useMemo(() => {
    return tables.filter(t => selectedTableIds.has(t.id));
  }, [tables, selectedTableIds]);

  // Toggle table selection
  const toggleTableSelection = (tableId: string) => {
    setSelectedTableIds(prev => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  };

  // Select all tables in current filter
  const selectAllTables = () => {
    setSelectedTableIds(new Set(filteredTables.map(t => t.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedTableIds(new Set());
  };

  // Select all tables in a specific area
  const selectAllTablesInArea = (areaId: string) => {
    const areaTables = tablesByArea.get(areaId) || [];
    setSelectedTableIds(prev => {
      const next = new Set(prev);
      areaTables.forEach(t => next.add(t.id));
      return next;
    });
  };

  // Check if all tables in area are selected
  const areAllTablesInAreaSelected = (areaId: string) => {
    const areaTables = tablesByArea.get(areaId) || [];
    return areaTables.length > 0 && areaTables.every(t => selectedTableIds.has(t.id));
  };

  // Check if some tables in area are selected
  const areSomeTablesInAreaSelected = (areaId: string) => {
    const areaTables = tablesByArea.get(areaId) || [];
    const selectedCount = areaTables.filter(t => selectedTableIds.has(t.id)).length;
    return selectedCount > 0 && selectedCount < areaTables.length;
  };

  // Toggle select all tables in area
  const toggleSelectAllTablesInArea = (areaId: string) => {
    const areaTables = tablesByArea.get(areaId) || [];
    if (areAllTablesInAreaSelected(areaId)) {
      // Deselect all in this area
      setSelectedTableIds(prev => {
        const next = new Set(prev);
        areaTables.forEach(t => next.delete(t.id));
        return next;
      });
    } else {
      // Select all in this area
      selectAllTablesInArea(areaId);
    }
  };

  // Generate new name based on rename config
  const generateNewName = (originalName: string, index: number): string => {
    switch (bulkRenameConfig.format) {
      case "replace":
        if (bulkRenameConfig.findText) {
          return originalName.replace(
            new RegExp(bulkRenameConfig.findText, 'g'),
            bulkRenameConfig.replaceText
          );
        }
        return originalName;
      case "add_prefix":
        return bulkRenameConfig.prefix + originalName;
      case "add_suffix":
        return originalName + bulkRenameConfig.suffix;
      case "name_and_index":
        const number = bulkRenameConfig.startNumber + index;
        if (bulkRenameConfig.where === "before") {
          return `${number}${bulkRenameConfig.customFormat}`;
        } else {
          return `${bulkRenameConfig.customFormat}${number}`;
        }
      default:
        return originalName;
    }
  };

  // Preview renamed tables
  const renamePreview = React.useMemo(() => {
    return selectedTables.map((table, index) => ({
      id: table.id,
      oldName: table.name,
      newName: generateNewName(table.name, index),
    }));
  }, [selectedTables, bulkRenameConfig]);

  // Handle bulk rename
  const handleBulkRename = async () => {
    if (selectedTables.length === 0) return;

    setBulkProgress({ current: 0, total: selectedTables.length, status: "processing" });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedTables.length; i++) {
      const table = selectedTables[i];
      const newName = generateNewName(table.name, i);

      try {
        const updated = await tableService.update(table.id, { name: newName });
        setTables(prev => prev.map(t => t.id === table.id ? updated : t));
        successCount++;
      } catch (error) {
        console.error(`Error renaming table ${table.name}:`, error);
        failCount++;
      }

      setBulkProgress(prev => ({ ...prev, current: i + 1 }));

      // Small delay to prevent overwhelming the server
      if (i < selectedTables.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setBulkProgress(prev => ({
      ...prev,
      status: "completed",
      message: `Đổi tên thành công ${successCount} bàn${failCount > 0 ? `, thất bại ${failCount} bàn` : ""}`,
    }));

    toast({
      title: "Hoàn tất",
      description: `Đã đổi tên ${successCount} bàn${failCount > 0 ? `, thất bại ${failCount} bàn` : ""}`,
    });

    // Clear selection and close dialog after a delay
    setTimeout(() => {
      clearSelection();
      setBulkRenameDialogOpen(false);
      setBulkProgress({ current: 0, total: 0, status: "idle" });
    }, 1500);
  };

  // Handle bulk toggle active
  const handleBulkToggleActive = async (action: "enable" | "disable") => {
    if (selectedTables.length === 0) return;

    setBulkProgress({ current: 0, total: selectedTables.length, status: "processing" });
    setBulkToggleAction(action);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedTables.length; i++) {
      const table = selectedTables[i];
      const shouldToggle = action === "enable" ? !table.isActive : table.isActive;

      if (shouldToggle) {
        try {
          const updated = await tableService.toggleActive(table.id);
          setTables(prev => prev.map(t => t.id === table.id ? updated : t));
          successCount++;
        } catch (error) {
          console.error(`Error toggling table ${table.name}:`, error);
          failCount++;
        }
      }

      setBulkProgress(prev => ({ ...prev, current: i + 1 }));

      // Small delay
      if (i < selectedTables.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    setBulkProgress(prev => ({
      ...prev,
      status: "completed",
      message: `${action === "enable" ? "Kích hoạt" : "Tạm ngưng"} thành công ${successCount} bàn`,
    }));

    toast({
      title: "Hoàn tất",
      description: `Đã ${action === "enable" ? "kích hoạt" : "tạm ngưng"} ${successCount} bàn`,
    });

    // Clear
    setTimeout(() => {
      clearSelection();
      setBulkToggleAction(null);
      setBulkProgress({ current: 0, total: 0, status: "idle" });
    }, 1500);
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedTables.length === 0) return;

    setBulkProgress({ current: 0, total: selectedTables.length, status: "processing" });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedTables.length; i++) {
      const table = selectedTables[i];

      try {
        await tableService.delete(table.id);
        setTables(prev => prev.filter(t => t.id !== table.id));
        successCount++;
      } catch (error) {
        console.error(`Error deleting table ${table.name}:`, error);
        failCount++;
      }

      setBulkProgress(prev => ({ ...prev, current: i + 1 }));

      // Small delay
      if (i < selectedTables.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    setBulkProgress(prev => ({
      ...prev,
      status: "completed",
      message: `Xóa thành công ${successCount} bàn${failCount > 0 ? `, thất bại ${failCount} bàn` : ""}`,
    }));

    toast({
      title: "Hoàn tất",
      description: `Đã xóa ${successCount} bàn${failCount > 0 ? `, thất bại ${failCount} bàn` : ""}`,
    });

    // Clear
    setTimeout(() => {
      clearSelection();
      setBulkDeleteDialogOpen(false);
      setBulkProgress({ current: 0, total: 0, status: "idle" });
    }, 1500);
  };

  // Filter areas for combobox
  const filteredAreas = areas.filter(area =>
    area.name.toLowerCase().includes(areaSearchValue.toLowerCase())
  );

  // Check if search value is a new area
  const isNewArea = areaSearchValue.trim() &&
    !areas.some(a => a.name.toLowerCase() === areaSearchValue.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý bàn</h1>
          <p className="text-muted-foreground">Quản lý danh sách bàn trong nhà hàng</p>
        </div>
        <div className="flex items-center gap-2">
          <BrandBranchFilter
            selectedBrandId={filterBrandId}
            selectedBranchId={filterBranchId}
            onBrandChange={setFilterBrandId}
            onBranchChange={setFilterBranchId}
            showAllOption={false}
            brandClassName="w-[150px]"
            branchClassName="w-[150px]"
          />
          <Select value={filterAreaId} onValueChange={setFilterAreaId}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Khu vực" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả khu vực</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {Object.entries(tableStatusLabels).map(([status, info]) => (
                <SelectItem key={status} value={status}>
                  {info.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(statusFilter !== "all" || filterAreaId !== "all") && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setStatusFilter("all");
                setFilterAreaId("all");
              }}
              title="Xóa bộ lọc"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm bàn
          </Button>
        </div>
      </div>

      {/* Select All Button - shown when no tables selected but tables exist */}
      {selectedTableIds.size === 0 && filteredTables.length > 0 && !loading && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllTables}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Chọn tất cả ({filteredTables.length} bàn)
          </Button>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedTableIds.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedTableIds.size === filteredTables.length}
                  onCheckedChange={(checked) => {
                    if (checked) selectAllTables();
                    else clearSelection();
                  }}
                />
                <span className="font-medium text-blue-800">
                  Đã chọn {selectedTableIds.size} bàn
                </span>
                <Button variant="ghost" size="sm" onClick={clearSelection} className="text-blue-600 hover:text-blue-800">
                  <X className="h-4 w-4 mr-1" />
                  Bỏ chọn
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkRenameDialogOpen(true)}
                  className="bg-white"
                >
                  <Type className="h-4 w-4 mr-2" />
                  Đổi tên
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkToggleActive("enable")}
                  disabled={bulkProgress.status === "processing"}
                  className="bg-white text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <Power className="h-4 w-4 mr-2" />
                  Bật
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkToggleActive("disable")}
                  disabled={bulkProgress.status === "processing"}
                  className="bg-white text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  <PowerOff className="h-4 w-4 mr-2" />
                  Tắt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  disabled={bulkProgress.status === "processing"}
                  className="bg-white text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa
                </Button>
              </div>
            </div>

            {/* Progress bar when processing */}
            {bulkProgress.status === "processing" && (
              <div className="mt-3 space-y-2">
                <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" />
                <p className="text-sm text-blue-600">
                  Đang xử lý: {bulkProgress.current}/{bulkProgress.total}
                </p>
              </div>
            )}

            {bulkProgress.status === "completed" && bulkProgress.message && (
              <div className="mt-3">
                <p className="text-sm text-green-600 font-medium flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {bulkProgress.message}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!filterBranchId ? (
        <FilterRequiredPlaceholder
          title="Vui lòng chọn chi nhánh"
          description="Chọn một chi nhánh từ bộ lọc phía trên để xem danh sách bàn"
        />
      ) : loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : filteredTables.length === 0 && areas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Table2 className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Chưa có bàn nào</p>
            <p className="text-xs text-muted-foreground mt-1">
              Nhấn &quot;Thêm bàn&quot; để bắt đầu. Hệ thống sẽ tự động tạo khu vực nếu chưa có.
            </p>
          </CardContent>
        </Card>
      ) : filteredTables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Table2 className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Chưa có bàn nào</p>
            <p className="text-xs text-muted-foreground mt-1">
              Nhấn &quot;Thêm bàn&quot; để bắt đầu
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(tablesByArea.entries()).map(([areaId, areaTables]) => {
            const allSelected = areAllTablesInAreaSelected(areaId);
            const someSelected = areSomeTablesInAreaSelected(areaId);
            const selectedInArea = areaTables.filter(t => selectedTableIds.has(t.id)).length;
            return (
            <Card key={areaId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={allSelected}
                      ref={(el) => {
                        if (el) {
                          (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                        }
                      }}
                      onCheckedChange={() => toggleSelectAllTablesInArea(areaId)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div>
                      <CardTitle className="text-lg">{getAreaName(areaId)}</CardTitle>
                      <CardDescription>
                        {areaTables.length} bàn
                        {selectedInArea > 0 && (
                          <span className="text-blue-600 ml-2">
                            (đã chọn {selectedInArea})
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  {selectedInArea > 0 && selectedInArea < areaTables.length && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAllTablesInArea(areaId)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <CheckSquare className="h-4 w-4 mr-1" />
                      Chọn tất cả
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {areaTables.map((table) => {
                    const statusInfo = tableStatusLabels[table.status];
                    const isSelected = selectedTableIds.has(table.id);
                    return (
                      <Card
                        key={table.id}
                        className={cn(
                          "relative transition-all cursor-pointer",
                          !table.isActive && "opacity-60",
                          isSelected && "ring-2 ring-blue-500 bg-blue-50/50"
                        )}
                        onClick={() => toggleTableSelection(table.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {/* Selection checkbox */}
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleTableSelection(table.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="mr-1"
                              />
                              <div className={`p-2 rounded-lg ${statusInfo.color}`}>
                                <Table2 className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-medium">{table.name}</p>
                                  {newTableIds.has(table.id) && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Mới</Badge>
                                  )}
                                  {updatedTableIds.has(table.id) && (
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">Cập nhật</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  <span>{table.capacity} chỗ</span>
                                </div>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEdit(table)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Chỉnh sửa
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {Object.entries(tableStatusLabels).map(([status, info]) => (
                                  <DropdownMenuItem
                                    key={status}
                                    onClick={() => handleUpdateStatus(table, status as TableStatus)}
                                    disabled={table.status === status}
                                  >
                                    <div className={`w-2 h-2 rounded-full mr-2 ${info.color.split(" ")[0]}`} />
                                    {info.label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleToggleActive(table)}>
                                  <Power className="mr-2 h-4 w-4" />
                                  {table.isActive ? "Tạm ngưng" : "Kích hoạt"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteTable(table)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Xóa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                            {!table.isActive && (
                              <Badge variant="secondary">Tạm ngưng</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );})}
        </div>
      )}

      {/* Create/Edit Table Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Thêm bàn mới" : "Chỉnh sửa bàn"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Nhập thông tin bàn. Nếu khu vực chưa tồn tại, hệ thống sẽ tự động tạo mới."
                : "Cập nhật thông tin bàn."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Khu vực *</Label>
                <Popover open={areaComboboxOpen} onOpenChange={setAreaComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={areaComboboxOpen}
                      className="w-full justify-between font-normal"
                    >
                      {areaSearchValue || "Chọn hoặc nhập tên khu vực..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Tìm hoặc tạo khu vực..."
                        value={areaSearchValue}
                        onValueChange={(value) => {
                          setAreaSearchValue(value);
                          // Clear areaId if user is typing a new value
                          if (!areas.some(a => a.name.toLowerCase() === value.toLowerCase())) {
                            setFormData(prev => ({ ...prev, areaId: "" }));
                          }
                        }}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {areaSearchValue.trim() ? (
                            <div className="py-2 px-4 text-sm">
                              <span className="text-muted-foreground">Nhấn Enter hoặc chọn để tạo: </span>
                              <span className="font-medium">&quot;{areaSearchValue}&quot;</span>
                            </div>
                          ) : (
                            <div className="py-2 px-4 text-sm text-muted-foreground">
                              Nhập tên khu vực để tìm hoặc tạo mới
                            </div>
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {/* Option to create new area if not exists */}
                          {isNewArea && (
                            <CommandItem
                              value={`create-${areaSearchValue}`}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, areaId: "" }));
                                setAreaComboboxOpen(false);
                              }}
                              className="text-primary"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Tạo mới: &quot;{areaSearchValue}&quot;
                            </CommandItem>
                          )}
                          {filteredAreas.map((area) => (
                            <CommandItem
                              key={area.id}
                              value={area.name}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, areaId: area.id }));
                                setAreaSearchValue(area.name);
                                setAreaComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.areaId === area.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {area.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {isNewArea && (
                  <p className="text-xs text-muted-foreground">
                    Khu vực &quot;{areaSearchValue}&quot; sẽ được tạo tự động khi lưu
                  </p>
                )}
              </div>
              {/* Bulk create toggle - only show in create mode */}
              {dialogMode === "create" && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Checkbox
                    id="bulkCreateEnabled"
                    checked={bulkCreateEnabled}
                    onCheckedChange={(checked) => setBulkCreateEnabled(checked === true)}
                  />
                  <Label
                    htmlFor="bulkCreateEnabled"
                    className="text-sm font-medium cursor-pointer text-blue-800"
                  >
                    Tạo nhanh nhiều bàn
                  </Label>
                </div>
              )}

              {/* Bulk create options */}
              {dialogMode === "create" && bulkCreateEnabled ? (
                <div className="grid gap-4 p-4 bg-gray-50 rounded-lg border">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Định dạng tên</Label>
                      <Input
                        value={bulkCreateFormat}
                        onChange={(e) => setBulkCreateFormat(e.target.value)}
                        placeholder="Bàn "
                        className="bg-white"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Số lượng</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={bulkCreateQuantity}
                        onChange={(e) => setBulkCreateQuantity(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Bắt đầu từ số</Label>
                    <Input
                      type="number"
                      min="0"
                      value={bulkCreateStartNumber}
                      onChange={(e) => setBulkCreateStartNumber(parseInt(e.target.value) || 0)}
                      className="w-32 bg-white"
                    />
                  </div>

                  {/* Preview */}
                  <div className="grid gap-2">
                    <Label className="flex items-center justify-between">
                      <span>Xem trước ({bulkCreateQuantity} bàn)</span>
                    </Label>
                    <ScrollArea className="h-[120px] border rounded-lg bg-white">
                      <div className="p-2 flex flex-wrap gap-2">
                        {bulkCreatePreview.map((item, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-blue-100 text-blue-800"
                          >
                            {item.name}
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Progress */}
                  {bulkCreateProgress.status === "processing" && (
                    <div className="space-y-2">
                      <Progress value={(bulkCreateProgress.current / bulkCreateProgress.total) * 100} className="h-2" />
                      <p className="text-sm text-center text-muted-foreground">
                        Đang tạo: {bulkCreateProgress.current}/{bulkCreateProgress.total}
                      </p>
                    </div>
                  )}

                  {bulkCreateProgress.status === "completed" && bulkCreateProgress.message && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        {bulkCreateProgress.message}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="name">Tên bàn *</Label>
                  <Input
                    id="name"
                    placeholder="Bàn 1, Bàn 2, Bàn VIP..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    autoFocus={dialogMode === "create" && continueCreating}
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="capacity">Số chỗ ngồi</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  placeholder="4"
                  value={formData.capacity || 4}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 4 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sortOrder">Thứ tự hiển thị</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.sortOrder || 0}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>

              {/* Continue creating checkbox - only show in create mode when not bulk creating */}
              {dialogMode === "create" && !bulkCreateEnabled && (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="continueCreating"
                    checked={continueCreating}
                    onCheckedChange={(checked) => setContinueCreating(checked === true)}
                  />
                  <Label
                    htmlFor="continueCreating"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Tiếp tục tạo bàn sau khi lưu
                  </Label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={saving || bulkCreateProgress.status === "processing"}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={
                  saving ||
                  bulkCreateProgress.status === "processing" ||
                  (!bulkCreateEnabled && !formData.name.trim()) ||
                  (!formData.areaId && !areaSearchValue.trim())
                }
              >
                {(saving || bulkCreateProgress.status === "processing") && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dialogMode === "create"
                  ? bulkCreateEnabled
                    ? `Tạo ${bulkCreateQuantity} bàn`
                    : "Tạo bàn"
                  : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTable !== null} onOpenChange={() => setDeleteTable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bàn &quot;{deleteTable?.name}&quot;? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Rename Dialog - macOS Style */}
      <Dialog open={bulkRenameDialogOpen} onOpenChange={setBulkRenameDialogOpen}>
        <DialogContent className="max-w-2xl bg-gradient-to-br from-white to-gray-50">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Type className="h-5 w-5 text-blue-600" />
              </div>
              Đổi tên hàng loạt
            </DialogTitle>
            <DialogDescription>
              Đổi tên {selectedTableIds.size} bàn đã chọn. Chọn định dạng tên như macOS Finder.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Format Selection */}
            <div className="grid gap-2">
              <Label>Định dạng</Label>
              <Select
                value={bulkRenameConfig.format}
                onValueChange={(value: RenameFormat) =>
                  setBulkRenameConfig(prev => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_and_index">Tên và số thứ tự</SelectItem>
                  <SelectItem value="replace">Tìm và thay thế</SelectItem>
                  <SelectItem value="add_prefix">Thêm tiền tố</SelectItem>
                  <SelectItem value="add_suffix">Thêm hậu tố</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Format-specific options */}
            {bulkRenameConfig.format === "name_and_index" && (
              <div className="grid gap-4 p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Định dạng tên</Label>
                    <Input
                      value={bulkRenameConfig.customFormat}
                      onChange={(e) => setBulkRenameConfig(prev => ({
                        ...prev,
                        customFormat: e.target.value
                      }))}
                      placeholder="Bàn "
                      className="bg-white"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Vị trí số</Label>
                    <Select
                      value={bulkRenameConfig.where}
                      onValueChange={(value: "before" | "after") =>
                        setBulkRenameConfig(prev => ({ ...prev, where: value }))
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="after">Sau tên</SelectItem>
                        <SelectItem value="before">Trước tên</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Bắt đầu từ số</Label>
                  <Input
                    type="number"
                    min="0"
                    value={bulkRenameConfig.startNumber}
                    onChange={(e) => setBulkRenameConfig(prev => ({
                      ...prev,
                      startNumber: parseInt(e.target.value) || 0
                    }))}
                    className="w-32 bg-white"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Ví dụ: {bulkRenameConfig.where === "after"
                    ? `${bulkRenameConfig.customFormat}${bulkRenameConfig.startNumber}`
                    : `${bulkRenameConfig.startNumber}${bulkRenameConfig.customFormat}`}
                </p>
              </div>
            )}

            {bulkRenameConfig.format === "replace" && (
              <div className="grid gap-4 p-4 bg-gray-50 rounded-lg border">
                <div className="grid gap-2">
                  <Label>Tìm văn bản</Label>
                  <Input
                    value={bulkRenameConfig.findText}
                    onChange={(e) => setBulkRenameConfig(prev => ({
                      ...prev,
                      findText: e.target.value
                    }))}
                    placeholder="Văn bản cần tìm..."
                    className="bg-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Thay thế bằng</Label>
                  <Input
                    value={bulkRenameConfig.replaceText}
                    onChange={(e) => setBulkRenameConfig(prev => ({
                      ...prev,
                      replaceText: e.target.value
                    }))}
                    placeholder="Văn bản thay thế..."
                    className="bg-white"
                  />
                </div>
              </div>
            )}

            {bulkRenameConfig.format === "add_prefix" && (
              <div className="grid gap-4 p-4 bg-gray-50 rounded-lg border">
                <div className="grid gap-2">
                  <Label>Tiền tố</Label>
                  <Input
                    value={bulkRenameConfig.prefix}
                    onChange={(e) => setBulkRenameConfig(prev => ({
                      ...prev,
                      prefix: e.target.value
                    }))}
                    placeholder="VIP_"
                    className="bg-white"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Ví dụ: {bulkRenameConfig.prefix || "VIP_"}Bàn 1
                </p>
              </div>
            )}

            {bulkRenameConfig.format === "add_suffix" && (
              <div className="grid gap-4 p-4 bg-gray-50 rounded-lg border">
                <div className="grid gap-2">
                  <Label>Hậu tố</Label>
                  <Input
                    value={bulkRenameConfig.suffix}
                    onChange={(e) => setBulkRenameConfig(prev => ({
                      ...prev,
                      suffix: e.target.value
                    }))}
                    placeholder="_VIP"
                    className="bg-white"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Ví dụ: Bàn 1{bulkRenameConfig.suffix || "_VIP"}
                </p>
              </div>
            )}

            {/* Preview */}
            <div className="grid gap-2">
              <Label>Xem trước kết quả</Label>
              <ScrollArea className="h-[200px] border rounded-lg bg-white">
                <div className="p-2 space-y-1">
                  {renamePreview.slice(0, 20).map((item, index) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between p-2 rounded text-sm",
                        index % 2 === 0 ? "bg-gray-50" : "bg-white"
                      )}
                    >
                      <span className="text-muted-foreground line-through">{item.oldName}</span>
                      <span className="mx-2">→</span>
                      <span className="font-medium text-blue-600">{item.newName}</span>
                    </div>
                  ))}
                  {renamePreview.length > 20 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      ... và {renamePreview.length - 20} bàn khác
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Progress */}
            {bulkProgress.status === "processing" && (
              <div className="space-y-2">
                <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  Đang đổi tên: {bulkProgress.current}/{bulkProgress.total}
                </p>
              </div>
            )}

            {bulkProgress.status === "completed" && bulkProgress.message && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {bulkProgress.message}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4 bg-gray-50/50 -mx-6 px-6 -mb-6 pb-6 rounded-b-lg">
            <Button
              variant="outline"
              onClick={() => setBulkRenameDialogOpen(false)}
              disabled={bulkProgress.status === "processing"}
            >
              Hủy
            </Button>
            <Button
              onClick={handleBulkRename}
              disabled={bulkProgress.status === "processing"}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {bulkProgress.status === "processing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Đổi tên {selectedTableIds.size} bàn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Xác nhận xóa hàng loạt
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa <strong>{selectedTableIds.size} bàn</strong> đã chọn?
              <br />
              <span className="text-red-500 font-medium">Hành động này không thể hoàn tác.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Preview list */}
          <ScrollArea className="h-[150px] border rounded-lg my-2">
            <div className="p-2 space-y-1">
              {selectedTables.slice(0, 20).map((table, index) => (
                <div
                  key={table.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded text-sm",
                    index % 2 === 0 ? "bg-gray-50" : "bg-white"
                  )}
                >
                  <Table2 className="h-4 w-4 text-muted-foreground" />
                  <span>{table.name}</span>
                  <span className="text-muted-foreground text-xs">({getAreaName(table.areaId)})</span>
                </div>
              ))}
              {selectedTables.length > 20 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  ... và {selectedTables.length - 20} bàn khác
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Progress */}
          {bulkProgress.status === "processing" && (
            <div className="space-y-2 my-2">
              <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                Đang xóa: {bulkProgress.current}/{bulkProgress.total}
              </p>
            </div>
          )}

          {bulkProgress.status === "completed" && bulkProgress.message && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg my-2">
              <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                <Check className="h-4 w-4" />
                {bulkProgress.message}
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkProgress.status === "processing"}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkProgress.status === "processing"}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {bulkProgress.status === "processing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa {selectedTableIds.size} bàn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
