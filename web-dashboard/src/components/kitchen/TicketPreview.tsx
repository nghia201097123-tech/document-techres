"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TicketFontSize } from "@/services/kitchen-service";

interface TicketPreviewProps {
  paperWidth: number; // 58, 80, etc.
  fontSize: TicketFontSize;
  showStoreName?: boolean;
  showOrderNumber?: boolean;
  showTableName?: boolean;
  showTime?: boolean;
  showNotes?: boolean;
  showPrice?: boolean;
  storeName?: string;
  printItemsSeparately?: boolean;
  className?: string;
}

// Sample data for preview
const SAMPLE_DATA = {
  orderNumber: "GF-472",
  tableName: "Bàn 05",
  items: [
    {
      name: "Trà sữa trân châu",
      quantity: 2,
      price: 35000,
      size: "Size L",
      ice: "50% Đá",
      sugar: "30% Đường",
      toppings: ["Trân châu đen", "Thạch dừa"],
      notes: "Ít đá",
    },
    {
      name: "Cà phê sữa đá",
      quantity: 1,
      price: 25000,
      size: "Size M",
      ice: "100% Đá",
      sugar: "50% Đường",
      toppings: [],
      notes: "",
    },
    {
      name: "Bánh mì thịt nướng",
      quantity: 1,
      price: 30000,
      toppings: ["Thêm rau", "Thêm ớt"],
      notes: "Không hành",
    },
  ],
};

/**
 * Component preview phiếu bếp với các config
 */
export function TicketPreview({
  paperWidth,
  fontSize,
  showStoreName = false,
  showOrderNumber = true,
  showTableName = true,
  showTime = true,
  showNotes = true,
  showPrice = false,
  storeName = "Coffee House",
  printItemsSeparately = false,
  className,
}: TicketPreviewProps) {
  // Scale: 1mm = 3px for display
  const SCALE = 3;
  const width = paperWidth * SCALE;

  // Font sizes based on setting
  const getFontSizes = () => {
    switch (fontSize) {
      case "small":
        return { title: 14, normal: 12, small: 10 };
      case "large":
        return { title: 20, normal: 16, small: 14 };
      default: // medium
        return { title: 16, normal: 14, small: 12 };
    }
  };

  const fonts = getFontSizes();
  const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const date = new Date().toLocaleDateString("vi-VN");

  // Render a single ticket (for separate mode or combined)
  const renderTicket = (items: typeof SAMPLE_DATA.items, ticketIndex?: number) => (
    <div
      className="bg-white border-2 border-gray-300 overflow-hidden"
      style={{
        width: `${width}px`,
        fontFamily: "monospace",
        padding: "8px",
      }}
    >
      {/* Store Name */}
      {showStoreName && storeName && (
        <div
          className="text-center font-bold border-b border-dashed border-gray-400 pb-1 mb-2"
          style={{ fontSize: `${fonts.title}px` }}
        >
          {storeName}
        </div>
      )}

      {/* Header: Order Number & Table */}
      <div className="border-b-2 border-black pb-2 mb-2">
        {showOrderNumber && (
          <div
            className="font-bold text-center"
            style={{ fontSize: `${fonts.title}px` }}
          >
            {SAMPLE_DATA.orderNumber}
            {ticketIndex !== undefined && ` (${ticketIndex + 1}/${SAMPLE_DATA.items.length})`}
          </div>
        )}
        {showTableName && (
          <div
            className="text-center font-medium"
            style={{ fontSize: `${fonts.normal}px` }}
          >
            {SAMPLE_DATA.tableName}
          </div>
        )}
        {showTime && (
          <div
            className="text-center text-gray-600"
            style={{ fontSize: `${fonts.small}px` }}
          >
            {date} {time}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="border-b border-dashed border-gray-300 pb-2">
            {/* Item name with quantity */}
            <div
              className="font-bold flex justify-between"
              style={{ fontSize: `${fonts.normal}px` }}
            >
              <span>{item.name}</span>
              <span>x{item.quantity}</span>
            </div>

            {/* Price */}
            {showPrice && item.price && (
              <div style={{ fontSize: `${fonts.small}px` }} className="text-gray-700 ml-2">
                Giá: {item.price.toLocaleString("vi-VN")}đ
              </div>
            )}

            {/* Attributes */}
            <div style={{ fontSize: `${fonts.small}px` }} className="text-gray-700 ml-2">
              {item.size && <div>• {item.size}</div>}
              {item.ice && <div>• {item.ice}</div>}
              {item.sugar && <div>• {item.sugar}</div>}
              {item.toppings?.map((topping, i) => (
                <div key={i}>+ {topping}</div>
              ))}
            </div>

            {/* Notes */}
            {showNotes && item.notes && (
              <div
                style={{ fontSize: `${fonts.small}px` }}
                className="text-red-600 font-medium ml-2 mt-1"
              >
                ⚠ {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="text-center mt-3 pt-2 border-t border-dashed border-gray-400"
        style={{ fontSize: `${fonts.small}px` }}
      >
        --- Phiếu bếp ---
      </div>
    </div>
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="text-sm text-muted-foreground">
        Xem trước phiếu bếp {paperWidth}mm (cỡ chữ: {fontSize === "small" ? "Nhỏ" : fontSize === "large" ? "Lớn" : "Vừa"})
      </div>

      {/* Tickets container */}
      <div className="flex gap-3 flex-wrap">
        {printItemsSeparately ? (
          // Separate tickets for each item
          SAMPLE_DATA.items.map((item, index) => (
            <div key={index}>
              {renderTicket([item], index)}
            </div>
          ))
        ) : (
          // Combined ticket
          renderTicket(SAMPLE_DATA.items)
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <div>
          Font: Title {fonts.title}px, Normal {fonts.normal}px, Small {fonts.small}px
        </div>
        {printItemsSeparately && (
          <div className="text-orange-600">
            In riêng từng món → {SAMPLE_DATA.items.length} phiếu
          </div>
        )}
      </div>

      {/* Sample data info */}
      <div className="text-xs text-muted-foreground border-t pt-2 mt-1">
        <div className="font-medium mb-1">Dữ liệu mẫu:</div>
        <div>Đơn hàng: {SAMPLE_DATA.orderNumber} - {SAMPLE_DATA.tableName}</div>
        <div>Số món: {SAMPLE_DATA.items.length} món</div>
      </div>
    </div>
  );
}
