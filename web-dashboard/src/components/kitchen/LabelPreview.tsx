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

// Sample data for preview - including notes for testing
const SAMPLE_DATA = {
  itemName: "Trà sữa trân châu",
  orderNumber: "GF-472",
  index: "1/3",
  size: "Size L",
  ice: "50% Đá",
  sugar: "30% Đường",
  allToppings: [
    "Trân châu đen",
    "Thạch dừa",
    "Pudding",
    "Kem cheese",
    "Đậu đỏ",
    "Trân châu trắng",
    "Thạch cà phê",
  ],
  notes: "Ít đá, không đường, mang đi",
  price: "45,000đ",
};

interface SingleLabelProps {
  widthMm: number;
  heightMm: number;
  fonts: { bold: number; normal: number; small: number };
  scale: number;
  showStoreName: boolean;
  showOrderNumber: boolean;
  showTime: boolean;
  showPrice: boolean;
  storeName: string;
  toppings: string[];
  notes?: string;
  labelIndex: number;
  totalLabels: number;
  isOverflow?: boolean;
}

function SingleLabel({
  widthMm,
  heightMm,
  fonts,
  scale,
  showStoreName,
  showOrderNumber,
  showTime,
  showPrice,
  storeName,
  toppings,
  notes,
  labelIndex,
  totalLabels,
  isOverflow = false,
}: SingleLabelProps) {
  const width = widthMm * scale;
  const height = heightMm * scale;
  const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const displayIndex = `${labelIndex}/${totalLabels}`;

  return (
    <div
      className={cn(
        "relative border-2 bg-white overflow-hidden flex-shrink-0",
        isOverflow ? "border-orange-400" : "border-gray-300"
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
            <span>{SAMPLE_DATA.orderNumber}</span>
            <span>{displayIndex}</span>
          </div>
        )}

        {/* Separator */}
        <div className="border-t border-gray-400 my-0.5" />

        {/* Item Name */}
        <div
          className="font-bold truncate"
          style={{ fontSize: `${fonts.bold}px` }}
        >
          {SAMPLE_DATA.itemName}
        </div>

        {/* Size, Ice, Sugar - only on first label */}
        {labelIndex === 1 && (
          <div style={{ fontSize: `${fonts.normal}px` }} className="text-gray-700">
            <div className="truncate">+{SAMPLE_DATA.size}</div>
            <div className="truncate">+{SAMPLE_DATA.ice}</div>
            <div className="truncate">+{SAMPLE_DATA.sugar}</div>
          </div>
        )}

        {/* Continuation indicator for overflow labels */}
        {labelIndex > 1 && (
          <div style={{ fontSize: `${fonts.small}px` }} className="text-orange-600 italic">
            (tiếp theo...)
          </div>
        )}

        {/* Toppings */}
        {toppings.length > 0 && (
          <div style={{ fontSize: `${fonts.normal}px` }} className="text-gray-700">
            {toppings.map((topping, i) => (
              <div key={i} className="truncate">
                +{topping}
              </div>
            ))}
          </div>
        )}

        {/* Notes - only on first label */}
        {notes && labelIndex === 1 && (
          <>
            <div className="border-t border-dashed border-gray-400 my-0.5" />
            <div
              style={{ fontSize: `${fonts.normal}px` }}
              className="text-red-600 font-medium"
            >
              Ghi chú: {notes}
            </div>
          </>
        )}

        {/* Price - only on last label */}
        {showPrice && labelIndex === totalLabels && (
          <>
            <div className="border-t border-gray-400 my-0.5" />
            <div
              className="flex justify-between font-bold"
              style={{ fontSize: `${fonts.normal}px` }}
            >
              <span>Thành tiền:</span>
              <span>{SAMPLE_DATA.price}</span>
            </div>
          </>
        )}

        {/* Time - only on last label */}
        {showTime && labelIndex === totalLabels && (
          <>
            <div className="border-t border-gray-400 my-0.5" />
            <div style={{ fontSize: `${fonts.small}px` }} className="text-gray-600">
              {new Date().toLocaleDateString("vi-VN")} {time}
            </div>
          </>
        )}
      </div>

      {/* Overflow indicator */}
      {isOverflow && (
        <div className="absolute top-0 right-0 bg-orange-400 text-white text-[8px] px-1 py-0.5 rounded-bl">
          +{labelIndex - 1}
        </div>
      )}
    </div>
  );
}

/**
 * Component preview tem với scale responsive
 * Scale: 1mm = 5px cho hiển thị (tăng từ 3 lên 5)
 * Hỗ trợ hiển thị nhiều tem khi topping tràn
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
  // Scale factor: 1mm = 5px for display (increased from 3 for better visibility)
  const SCALE = 5;

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

    // Apply font scale and convert to preview scale
    const previewScale = fontScale * 0.5;
    return {
      bold: fontBold * previewScale,
      normal: fontNormal * previewScale,
      small: fontSmall * previewScale,
    };
  };

  const fonts = getFontSizes();

  // Calculate effective max toppings (auto-calculate if 0)
  const effectiveMaxToppings = React.useMemo(() => {
    if (maxToppings > 0) return maxToppings;
    // Auto-calculate based on label height
    if (heightMm <= 30) return 2;
    if (heightMm <= 40) return 3;
    if (heightMm <= 50) return 4;
    return 5;
  }, [maxToppings, heightMm]);

  // Split toppings into multiple labels if needed
  const labelData = React.useMemo(() => {
    const allToppings = SAMPLE_DATA.allToppings;
    const labels: { toppings: string[]; notes?: string }[] = [];

    if (allToppings.length <= effectiveMaxToppings) {
      // All toppings fit on one label
      labels.push({
        toppings: allToppings,
        notes: SAMPLE_DATA.notes,
      });
    } else {
      // Split toppings across multiple labels
      let remainingToppings = [...allToppings];
      let labelIndex = 0;

      while (remainingToppings.length > 0) {
        const toppingsForThisLabel = remainingToppings.slice(0, effectiveMaxToppings);
        remainingToppings = remainingToppings.slice(effectiveMaxToppings);

        labels.push({
          toppings: toppingsForThisLabel,
          notes: labelIndex === 0 ? SAMPLE_DATA.notes : undefined,
        });
        labelIndex++;
      }
    }

    return labels;
  }, [effectiveMaxToppings]);

  const totalLabels = labelData.length;
  const hasOverflow = totalLabels > 1;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="text-sm text-muted-foreground">
        Xem trước tem {widthMm}x{heightMm}mm (scale: {fontScale.toFixed(1)}x, max{" "}
        {maxToppings === 0 ? `auto(${effectiveMaxToppings})` : maxToppings} topping)
      </div>

      {/* Labels container - horizontal layout */}
      <div className="flex gap-3 flex-wrap">
        {labelData.map((label, index) => (
          <SingleLabel
            key={index}
            widthMm={widthMm}
            heightMm={heightMm}
            fonts={fonts}
            scale={SCALE}
            showStoreName={showStoreName}
            showOrderNumber={showOrderNumber}
            showTime={showTime}
            showPrice={showPrice}
            storeName={storeName}
            toppings={label.toppings}
            notes={label.notes}
            labelIndex={index + 1}
            totalLabels={totalLabels}
            isOverflow={index > 0}
          />
        ))}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <div>
          Font: Bold {fonts.bold.toFixed(0)}px, Normal {fonts.normal.toFixed(0)}px, Small{" "}
          {fonts.small.toFixed(0)}px
        </div>
        {hasOverflow && (
          <div className="text-orange-600">
            Topping tràn ({SAMPLE_DATA.allToppings.length} topping) → In {totalLabels} tem
          </div>
        )}
      </div>

      {/* Sample data info */}
      <div className="text-xs text-muted-foreground border-t pt-2 mt-1">
        <div className="font-medium mb-1">Dữ liệu mẫu:</div>
        <div>Tên: {SAMPLE_DATA.itemName}</div>
        <div>Topping: {SAMPLE_DATA.allToppings.join(", ")}</div>
        <div className="text-red-600">Ghi chú: {SAMPLE_DATA.notes}</div>
      </div>
    </div>
  );
}
