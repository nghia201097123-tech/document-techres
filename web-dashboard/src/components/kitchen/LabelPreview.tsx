"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface LabelPreviewProps {
  widthMm: number;
  heightMm: number;
  fontScale: number;
  maxToppings: number;
  showStoreName?: boolean;
  showOrderNumber?: boolean;
  showTableName?: boolean;
  showTime?: boolean;
  showPrice?: boolean;
  storeName?: string;
  className?: string;
}

/**
 * Component preview tem với scale responsive
 * Scale: 1mm = 3px cho hiển thị
 */
export function LabelPreview({
  widthMm,
  heightMm,
  fontScale,
  maxToppings,
  showStoreName = false,
  showOrderNumber = true,
  showTableName = true,
  showTime = true,
  showPrice = false,
  storeName = "Coffee House",
  className,
}: LabelPreviewProps) {
  // Scale factor: 1mm = 3px for display
  const SCALE = 3;
  const width = widthMm * SCALE;
  const height = heightMm * SCALE;

  // Base font sizes (scaled)
  const getFontSizes = () => {
    let fontBold: number, fontNormal: number, fontSmall: number;

    if (heightMm <= 30 && widthMm <= 50) {
      fontBold = 22;
      fontNormal = 18;
      fontSmall = 14;
    } else if (heightMm <= 30 && widthMm <= 60) {
      fontBold = 24;
      fontNormal = 20;
      fontSmall = 16;
    } else if (heightMm <= 30) {
      fontBold = 24;
      fontNormal = 20;
      fontSmall = 16;
    } else if (heightMm <= 40) {
      fontBold = 26;
      fontNormal = 22;
      fontSmall = 18;
    } else if (heightMm <= 50 && widthMm <= 80) {
      fontBold = 30;
      fontNormal = 26;
      fontSmall = 20;
    } else if (heightMm <= 50) {
      fontBold = 32;
      fontNormal = 28;
      fontSmall = 22;
    } else {
      fontBold = 36;
      fontNormal = 30;
      fontSmall = 24;
    }

    // Apply font scale and convert to preview scale (divide by 8 for approximate preview)
    const previewScale = fontScale * 0.5;
    return {
      bold: fontBold * previewScale,
      normal: fontNormal * previewScale,
      small: fontSmall * previewScale,
    };
  };

  const fonts = getFontSizes();

  // Sample data for preview
  const sampleData = {
    itemName: "Trà sữa trân châu",
    orderNumber: "GF-472",
    index: "1/3",
    size: "Size L",
    ice: "50% Đá",
    sugar: "30% Đường",
    toppings: ["Trân châu đen", "Thạch dừa", "Pudding", "Kem cheese", "Đậu đỏ"].slice(
      0,
      maxToppings
    ),
    price: "45,000đ",
    time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
  };

  // Calculate if content fits
  const lineHeight = fonts.normal * 1.4;
  const estimatedLines =
    (showStoreName ? 1 : 0) +
    (showOrderNumber ? 1 : 0) +
    1 + // separator
    1 + // item name
    1 + // size
    1 + // ice
    1 + // sugar
    sampleData.toppings.length +
    (showPrice ? 2 : 0) +
    (showTime ? 2 : 0);

  const estimatedHeight = estimatedLines * lineHeight + 10;
  const overflow = estimatedHeight > height;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="text-xs text-muted-foreground">
        Xem trước tem {widthMm}x{heightMm}mm (scale: {fontScale.toFixed(1)}x, max {maxToppings}{" "}
        topping)
      </div>
      <div
        className={cn(
          "relative border-2 bg-white overflow-hidden",
          overflow ? "border-red-500" : "border-gray-300"
        )}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          fontFamily: "monospace",
        }}
      >
        <div className="p-1" style={{ fontSize: `${fonts.small}px` }}>
          {/* Store Name */}
          {showStoreName && storeName && (
            <div
              className="truncate text-gray-600"
              style={{ fontSize: `${fonts.small}px` }}
            >
              {storeName}
            </div>
          )}

          {/* Order Number + Index */}
          {showOrderNumber && (
            <div
              className="flex justify-between"
              style={{ fontSize: `${fonts.small}px` }}
            >
              <span>{sampleData.orderNumber}</span>
              <span>{sampleData.index}</span>
            </div>
          )}

          {/* Separator */}
          <div className="border-t border-gray-400 my-0.5" />

          {/* Item Name */}
          <div
            className="font-bold truncate"
            style={{ fontSize: `${fonts.bold}px` }}
          >
            {sampleData.itemName}
          </div>

          {/* Size, Ice, Sugar */}
          <div style={{ fontSize: `${fonts.normal}px` }} className="text-gray-700">
            <div className="truncate">+{sampleData.size}</div>
            <div className="truncate">+{sampleData.ice}</div>
            <div className="truncate">+{sampleData.sugar}</div>
          </div>

          {/* Toppings */}
          {sampleData.toppings.length > 0 && (
            <div style={{ fontSize: `${fonts.normal}px` }} className="text-gray-700">
              {sampleData.toppings.map((topping, i) => (
                <div key={i} className="truncate">
                  +{topping}
                </div>
              ))}
            </div>
          )}

          {/* Price */}
          {showPrice && (
            <>
              <div className="border-t border-gray-400 my-0.5" />
              <div
                className="flex justify-between font-bold"
                style={{ fontSize: `${fonts.normal}px` }}
              >
                <span>Thành tiền:</span>
                <span>{sampleData.price}</span>
              </div>
            </>
          )}

          {/* Time */}
          {showTime && (
            <>
              <div className="border-t border-gray-400 my-0.5" />
              <div style={{ fontSize: `${fonts.small}px` }} className="text-gray-600">
                {new Date().toLocaleDateString("vi-VN")} {sampleData.time}
              </div>
            </>
          )}
        </div>

        {/* Overflow warning */}
        {overflow && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-center text-[8px] py-0.5">
            Nội dung bị tràn!
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div>
          Font: Bold {fonts.bold.toFixed(0)}px, Normal {fonts.normal.toFixed(0)}px, Small{" "}
          {fonts.small.toFixed(0)}px
        </div>
      </div>
      {overflow && (
        <div className="text-xs text-red-500">
          Cảnh báo: Nội dung có thể bị tràn. Hãy giảm font scale hoặc tăng kích thước tem.
        </div>
      )}
    </div>
  );
}
