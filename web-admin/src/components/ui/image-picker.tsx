"use client";

import * as React from "react";
import { Upload, Link, X, ImageIcon } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/lib/utils";

interface ImagePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
}

type InputMode = "file" | "url";

export function ImagePicker({
  value,
  onChange,
  disabled,
  placeholder = "https://example.com/image.png",
  label = "Hình ảnh",
  className,
}: ImagePickerProps) {
  const [inputMode, setInputMode] = React.useState<InputMode>("file");
  const [urlValue, setUrlValue] = React.useState(value || "");
  const [previewError, setPreviewError] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync urlValue with external value changes
  React.useEffect(() => {
    setUrlValue(value || "");
    setPreviewError(false);
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file hình ảnh");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Kích thước file không được vượt quá 5MB");
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUrlValue(base64);
      setPreviewError(false);
      onChange?.(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setUrlValue(newValue);
    setPreviewError(false);
    onChange?.(newValue);
  };

  const handleClear = () => {
    setUrlValue("");
    setPreviewError(false);
    onChange?.("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageError = () => {
    setPreviewError(true);
  };

  const hasValue = urlValue && urlValue.trim() !== "";

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-md w-fit">
        <Button
          type="button"
          variant={inputMode === "file" ? "default" : "ghost"}
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => setInputMode("file")}
          disabled={disabled}
        >
          <Upload className="h-3 w-3 mr-1" />
          Tải lên
        </Button>
        <Button
          type="button"
          variant={inputMode === "url" ? "default" : "ghost"}
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => setInputMode("url")}
          disabled={disabled}
        >
          <Link className="h-3 w-3 mr-1" />
          URL
        </Button>
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        {inputMode === "file" ? (
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={disabled}
              className="hidden"
              id="image-picker-file"
            />
            <label
              htmlFor="image-picker-file"
              className={cn(
                "flex h-9 w-full items-center justify-center rounded-md border border-input bg-transparent px-3 py-1 text-sm cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              <Upload className="h-4 w-4 mr-2" />
              {hasValue && !value?.startsWith("http") ? "Đã chọn hình ảnh" : "Chọn hình ảnh từ máy tính"}
            </label>
          </div>
        ) : (
          <Input
            type="url"
            value={urlValue.startsWith("data:") ? "" : urlValue}
            onChange={handleUrlChange}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1"
          />
        )}

        {hasValue && !disabled && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Preview area */}
      {hasValue && (
        <div className="relative w-full max-w-[200px]">
          <div className="relative rounded-lg border overflow-hidden bg-muted aspect-square">
            {!previewError ? (
              <img
                src={urlValue}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <ImageIcon className="h-8 w-8 mb-2" />
                <span className="text-xs">Không thể tải hình ảnh</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Placeholder when no image */}
      {!hasValue && (
        <div className="relative w-full max-w-[200px]">
          <div className="rounded-lg border border-dashed bg-muted/50 aspect-square flex flex-col items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 mb-2" />
            <span className="text-xs">Chưa có hình ảnh</span>
          </div>
        </div>
      )}
    </div>
  );
}
