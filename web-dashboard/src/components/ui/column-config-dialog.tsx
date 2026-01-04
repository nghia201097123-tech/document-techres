"use client";

import * as React from "react";
import { Settings2, RotateCcw, GripVertical, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type ColumnConfig } from "@/hooks/use-column-config";
import { cn } from "@/lib/utils";

interface ColumnConfigDialogProps {
  columns: ColumnConfig[];
  onToggle: (key: string) => void;
  onReset: () => void;
  trigger?: React.ReactNode;
}

export function ColumnConfigDialog({
  columns,
  onToggle,
  onReset,
  trigger,
}: ColumnConfigDialogProps) {
  const [open, setOpen] = React.useState(false);

  const visibleCount = columns.filter((c) => c.visible).length;
  const totalCount = columns.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Cột hiển thị
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Cấu hình cột hiển thị
          </DialogTitle>
          <DialogDescription>
            Chọn các cột bạn muốn hiển thị trong bảng. Hiện đang hiển thị{" "}
            <span className="font-medium text-foreground">
              {visibleCount}/{totalCount}
            </span>{" "}
            cột.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-1">
            {columns.map((column) => (
              <div
                key={column.key}
                className={cn(
                  "flex items-center justify-between py-2.5 px-3 rounded-md transition-colors",
                  column.visible
                    ? "bg-primary/5 hover:bg-primary/10"
                    : "hover:bg-muted/50",
                  column.locked && "opacity-60"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">
                    {column.visible ? (
                      <Eye className="h-4 w-4 text-primary" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </div>
                  <Label
                    htmlFor={`col-${column.key}`}
                    className={cn(
                      "cursor-pointer font-medium",
                      !column.visible && "text-muted-foreground"
                    )}
                  >
                    {column.label}
                  </Label>
                  {column.locked && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <Switch
                  id={`col-${column.key}`}
                  checked={column.visible}
                  onCheckedChange={() => onToggle(column.key)}
                  disabled={column.locked}
                />
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Đặt lại mặc định
          </Button>
          <Button onClick={() => setOpen(false)}>Xong</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Compact version for inline use in table headers
export function ColumnConfigButton({
  columns,
  onToggle,
  onReset,
}: Omit<ColumnConfigDialogProps, "trigger">) {
  return (
    <ColumnConfigDialog
      columns={columns}
      onToggle={onToggle}
      onReset={onReset}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings2 className="h-4 w-4" />
          <span className="sr-only">Cấu hình cột</span>
        </Button>
      }
    />
  );
}
