"use client";

import * as React from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload, X, ZoomIn, RotateCw, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadService } from "@/services/upload-service";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  aspectRatio?: number; // e.g., 1 for square, 16/9 for landscape
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
  placeholder?: string;
  folder?: string; // MinIO folder
  disabled?: boolean;
  circular?: boolean; // For avatar
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Calculate output dimensions
  let outputWidth = crop.width * scaleX;
  let outputHeight = crop.height * scaleY;

  // Scale down if exceeds max dimensions
  if (outputWidth > maxWidth) {
    const ratio = maxWidth / outputWidth;
    outputWidth = maxWidth;
    outputHeight *= ratio;
  }
  if (outputHeight > maxHeight) {
    const ratio = maxHeight / outputHeight;
    outputHeight = maxHeight;
    outputWidth *= ratio;
  }

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas is empty"));
        }
      },
      "image/jpeg",
      0.9
    );
  });
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  aspectRatio = 1,
  maxWidth = 800,
  maxHeight = 800,
  className,
  placeholder = "Chọn hình ảnh",
  folder = "images",
  disabled = false,
  circular = false,
}: ImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [imgSrc, setImgSrc] = React.useState<string>("");
  const [crop, setCrop] = React.useState<Crop>();
  const [completedCrop, setCompletedCrop] = React.useState<PixelCrop>();
  const [scale, setScale] = React.useState(1);
  const [uploading, setUploading] = React.useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file hình ảnh");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Kích thước file tối đa là 10MB");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImgSrc(reader.result?.toString() || "");
      setDialogOpen(true);
    });
    reader.readAsDataURL(file);

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspectRatio));
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop || !selectedFile) return;

    setUploading(true);
    try {
      // Get cropped image blob
      const croppedBlob = await getCroppedImg(
        imgRef.current,
        completedCrop,
        maxWidth,
        maxHeight
      );

      // Create file from blob
      const croppedFile = new File(
        [croppedBlob],
        selectedFile.name.replace(/\.[^/.]+$/, ".jpg"),
        { type: "image/jpeg" }
      );

      // Upload to MinIO
      const result = await uploadService.uploadImage(croppedFile, folder);
      onChange(result.url);

      // Close dialog
      setDialogOpen(false);
      setImgSrc("");
      setSelectedFile(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setScale(1);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Không thể upload hình ảnh. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange("");
    onRemove?.();
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setImgSrc("");
    setSelectedFile(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setScale(1);
  };

  return (
    <>
      <div className={cn("relative", className)}>
        {value ? (
          <div className={cn(
            "relative group overflow-hidden border-2 border-dashed border-muted-foreground/25 rounded-lg",
            circular && "rounded-full"
          )}>
            <img
              src={value}
              alt="Uploaded"
              className={cn(
                "w-full h-full object-cover",
                circular && "rounded-full"
              )}
            />
            {!disabled && (
              <div className={cn(
                "absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2",
                circular && "rounded-full"
              )}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Đổi
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className={cn(
              "w-full h-full min-h-[120px] border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
              circular && "rounded-full"
            )}
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{placeholder}</span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Crop Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa hình ảnh</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image Crop Area */}
            <div className="flex justify-center bg-muted/30 rounded-lg p-4 max-h-[400px] overflow-auto">
              {imgSrc && (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspectRatio}
                  circularCrop={circular}
                >
                  <img
                    ref={imgRef}
                    alt="Crop"
                    src={imgSrc}
                    style={{ transform: `scale(${scale})`, maxHeight: "350px" }}
                    onLoad={onImageLoad}
                  />
                </ReactCrop>
              )}
            </div>

            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Thu phóng</Label>
              </div>
              <Slider
                value={[scale]}
                onValueChange={(values) => setScale(values[0])}
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Info */}
            <div className="text-xs text-muted-foreground">
              Kéo để điều chỉnh vùng cắt. Kích thước tối đa: {maxWidth}x{maxHeight}px
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={uploading}>
              Hủy
            </Button>
            <Button type="button" onClick={handleCropComplete} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang upload...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Xác nhận
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
