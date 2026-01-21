"use client";

import * as React from "react";
import { Plus, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { tableService, type Table, type CreateTableDto } from "@/services/table-service";
import { areaService, type Area } from "@/services/area-service";
import { cn } from "@/lib/utils";

interface BulkProgress {
  current: number;
  total: number;
  status: "idle" | "processing" | "completed" | "error";
  message?: string;
}

interface TableFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  tableId?: string;
  branchId: string;
  areas: Area[];
  onClose: () => void;
  onSuccess: (table: Table, isNew: boolean) => void;
  onAreaCreated: (area: Area) => void;
  continueCreating: boolean;
  setContinueCreating: (value: boolean) => void;
}

const TableFormDialog = React.memo(function TableFormDialog({
  open,
  mode,
  tableId,
  branchId,
  areas,
  onClose,
  onSuccess,
  onAreaCreated,
  continueCreating,
  setContinueCreating,
}: TableFormDialogProps) {
  const { toast } = useToast();

  // Form state - all managed locally
  const [formData, setFormData] = React.useState<CreateTableDto>({
    areaId: "",
    name: "",
    capacity: 4,
    sortOrder: 0,
  });
  const [saving, setSaving] = React.useState(false);

  // Area combobox state
  const [areaComboboxOpen, setAreaComboboxOpen] = React.useState(false);
  const [areaSearchValue, setAreaSearchValue] = React.useState("");

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

  // Load table data when editing
  React.useEffect(() => {
    if (open && mode === "edit" && tableId) {
      loadTableData();
    } else if (open && mode === "create") {
      resetForm();
    }
  }, [open, mode, tableId]);

  const loadTableData = async () => {
    if (!tableId) return;
    try {
      const table = await tableService.getById(tableId);
      setFormData({
        areaId: table.areaId,
        name: table.name,
        capacity: table.capacity,
        sortOrder: table.sortOrder,
      });
      const area = areas.find((a) => a.id === table.areaId);
      setAreaSearchValue(area?.name || "");
    } catch (error) {
      console.error("Error loading table:", error);
      toast({ title: "Lỗi", description: "Không thể tải thông tin bàn", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ areaId: "", name: "", capacity: 4, sortOrder: 0 });
    setAreaSearchValue("");
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

  // Get or create area by name
  const getOrCreateArea = async (areaName: string): Promise<string> => {
    const existingArea = areas.find((a) => a.name.toLowerCase() === areaName.toLowerCase());
    if (existingArea) {
      return existingArea.id;
    }

    const newArea = await areaService.create({ name: areaName });
    onAreaCreated(newArea);
    toast({ title: "Thành công", description: `Đã tạo khu vực "${areaName}"` });
    return newArea.id;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bulkCreateEnabled && !formData.name.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tên bàn", variant: "destructive" });
      return;
    }

    if (!formData.areaId && !areaSearchValue.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng chọn hoặc nhập tên khu vực", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      let areaId = formData.areaId;
      if (!areaId && areaSearchValue.trim()) {
        areaId = await getOrCreateArea(areaSearchValue.trim());
      }

      if (mode === "create") {
        if (bulkCreateEnabled) {
          setBulkCreateProgress({ current: 0, total: bulkCreateQuantity, status: "processing" });

          let successCount = 0;
          let failCount = 0;

          for (let i = 0; i < bulkCreateQuantity; i++) {
            const tableName = `${bulkCreateFormat}${bulkCreateStartNumber + i}`;
            try {
              const result = await tableService.create({
                areaId,
                name: tableName,
                capacity: formData.capacity,
                sortOrder: (formData.sortOrder || 0) + i,
              });
              onSuccess(result, true);
              successCount++;
            } catch (error) {
              console.error(`Error creating table ${tableName}:`, error);
              failCount++;
            }
            setBulkCreateProgress((prev) => ({ ...prev, current: i + 1 }));

            if (i < bulkCreateQuantity - 1) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }

          setBulkCreateProgress((prev) => ({
            ...prev,
            status: "completed",
            message: `Tạo thành công ${successCount} bàn${failCount > 0 ? `, thất bại ${failCount} bàn` : ""}`,
          }));

          toast({
            title: "Hoàn tất",
            description: `Đã tạo ${successCount} bàn${failCount > 0 ? `, thất bại ${failCount} bàn` : ""}`,
          });

          setTimeout(() => {
            handleClose();
          }, 1500);
        } else {
          const result = await tableService.create({ ...formData, areaId });
          onSuccess(result, true);
          toast({ title: "Thành công", description: `Đã tạo bàn "${result.name}"` });

          if (continueCreating) {
            setFormData((prev) => ({
              areaId: areaId,
              name: "",
              capacity: prev.capacity,
              sortOrder: (prev.sortOrder || 0) + 1,
            }));
          } else {
            handleClose();
          }
        }
      } else if (mode === "edit" && tableId) {
        const result = await tableService.update(tableId, {
          areaId: areaId,
          name: formData.name,
          capacity: formData.capacity,
          sortOrder: formData.sortOrder,
        });
        onSuccess(result, false);
        toast({ title: "Thành công", description: "Đã cập nhật bàn" });
        handleClose();
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

  const handleClose = () => {
    resetForm();
    setContinueCreating(false);
    onClose();
  };

  // Filter areas for combobox
  const filteredAreas = areas.filter((area) =>
    area.name.toLowerCase().includes(areaSearchValue.toLowerCase())
  );

  const isNewArea =
    areaSearchValue.trim() && !areas.some((a) => a.name.toLowerCase() === areaSearchValue.toLowerCase());

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Thêm bàn mới" : "Chỉnh sửa bàn"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
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
                        if (!areas.some((a) => a.name.toLowerCase() === value.toLowerCase())) {
                          setFormData((prev) => ({ ...prev, areaId: "" }));
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
                        {isNewArea && (
                          <CommandItem
                            value={`create-${areaSearchValue}`}
                            onSelect={() => {
                              setFormData((prev) => ({ ...prev, areaId: "" }));
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
                              setFormData((prev) => ({ ...prev, areaId: area.id }));
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
            {mode === "create" && (
              <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Checkbox
                  id="bulkCreateEnabled"
                  checked={bulkCreateEnabled}
                  onCheckedChange={(checked) => setBulkCreateEnabled(checked === true)}
                />
                <Label htmlFor="bulkCreateEnabled" className="text-sm font-medium cursor-pointer text-blue-800">
                  Tạo nhanh nhiều bàn
                </Label>
              </div>
            )}

            {/* Bulk create options */}
            {mode === "create" && bulkCreateEnabled ? (
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
                      value={bulkCreateQuantity || ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                        setBulkCreateQuantity(val);
                      }}
                      onBlur={() => {
                        if (!bulkCreateQuantity || bulkCreateQuantity < 1) {
                          setBulkCreateQuantity(1);
                        } else if (bulkCreateQuantity > 100) {
                          setBulkCreateQuantity(100);
                        }
                      }}
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Bắt đầu từ số</Label>
                  <Input
                    type="number"
                    min="0"
                    value={bulkCreateStartNumber || ""}
                    onChange={(e) => setBulkCreateStartNumber(e.target.value === "" ? 0 : parseInt(e.target.value, 10))}
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
                        <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
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
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  autoFocus={mode === "create" && continueCreating}
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
                value={formData.capacity || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, capacity: e.target.value === "" ? 0 : parseInt(e.target.value, 10) }))}
                onBlur={(e) => {
                  if (!formData.capacity || formData.capacity < 1) {
                    setFormData((prev) => ({ ...prev, capacity: 4 }));
                  }
                }}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sortOrder">Thứ tự hiển thị</Label>
              <Input
                id="sortOrder"
                type="number"
                min="0"
                placeholder="0"
                value={formData.sortOrder || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, sortOrder: e.target.value === "" ? 0 : parseInt(e.target.value, 10) }))}
              />
            </div>

            {/* Continue creating checkbox - only show in create mode when not bulk creating */}
            {mode === "create" && !bulkCreateEnabled && (
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="continueCreating"
                  checked={continueCreating}
                  onCheckedChange={(checked) => setContinueCreating(checked === true)}
                />
                <Label htmlFor="continueCreating" className="text-sm font-normal cursor-pointer">
                  Tiếp tục tạo bàn sau khi lưu
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
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
              {(saving || bulkCreateProgress.status === "processing") && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mode === "create" ? (bulkCreateEnabled ? `Tạo ${bulkCreateQuantity} bàn` : "Tạo bàn") : "Cập nhật"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default TableFormDialog;
