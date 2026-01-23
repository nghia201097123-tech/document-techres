"use client";

import * as React from "react";
import { CreateBillTemplateDto, ItemDisplayLayout } from "@/services/bill-template-service";

interface BillPreviewPanelProps {
  template: Partial<CreateBillTemplateDto>;
  className?: string;
}

/**
 * Stable container style - defined outside component to prevent re-creation
 * This is critical for preventing jitter as style objects won't trigger re-renders
 */
const CONTAINER_STYLE: React.CSSProperties = {
  contain: "layout style paint",
  willChange: "contents",
  contentVisibility: "auto",
  isolation: "isolate"
};

const SECTION_STYLE: React.CSSProperties = {
  contain: "layout style paint",
  transform: "translateZ(0)",
  willChange: "auto"
};

const SEPARATOR_STYLE: React.CSSProperties = {
  contain: "layout style"
};

// Memoized Header component to prevent re-renders when only other sections change
const BillHeader = React.memo(function BillHeader({
  showLogo,
  storeName,
  storeAddress,
  storePhone,
  taxCode,
  headerText,
}: {
  showLogo?: boolean;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  taxCode?: string;
  headerText?: string;
}) {
  return (
    <div className="text-center mb-2">
      {showLogo && (
        <div className="text-2xl mb-1">[LOGO]</div>
      )}
      <p className="font-bold text-base">{storeName || "TEN CUA HANG"}</p>
      {storeAddress && (
        <p className="text-xs">{storeAddress}</p>
      )}
      {storePhone && (
        <p className="text-xs">DT: {storePhone}</p>
      )}
      {taxCode && (
        <p className="text-xs">MST: {taxCode}</p>
      )}
      {headerText && (
        <p className="text-xs">{headerText}</p>
      )}
    </div>
  );
});

// Memoized Footer component to prevent re-renders when only other sections change
const BillFooter = React.memo(function BillFooter({
  thankYouMessage,
  comebackMessage,
  footerText,
}: {
  thankYouMessage?: string;
  comebackMessage?: string;
  footerText?: string;
}) {
  return (
    <div className="text-center mt-3 space-y-1">
      <p className="font-medium">{thankYouMessage || "Cam on quy khach!"}</p>
      <p className="text-xs">{comebackMessage || "Hen gap lai!"}</p>
      {footerText && (
        <p className="text-xs text-muted-foreground">{footerText}</p>
      )}
    </div>
  );
});

// Memoized Print Options component
const PrintOptions = React.memo(function PrintOptions({
  cutPaper,
  openCashDrawer,
  beepAfterPrint,
  numberOfCopies,
}: {
  cutPaper?: boolean;
  openCashDrawer?: boolean;
  beepAfterPrint?: boolean;
  numberOfCopies?: number;
}) {
  return (
    <div className="flex flex-wrap gap-1 justify-center mt-3 text-xs">
      {cutPaper && <span className="bg-gray-100 px-1 rounded">[Cut]</span>}
      {openCashDrawer && <span className="bg-gray-100 px-1 rounded">[Drawer]</span>}
      {beepAfterPrint && <span className="bg-gray-100 px-1 rounded">[Beep]</span>}
      {(numberOfCopies || 1) > 1 && <span className="bg-gray-100 px-1 rounded">x{numberOfCopies}</span>}
    </div>
  );
});

// Sample items for preview with variants/toppings
const PREVIEW_ITEMS = [
  {
    code: "OLM-001",
    name: "O long macchiata",
    qty: 1,
    price: 54000,
    note: "It duong",
    category: "Do uong",
    variants: [
      { name: "NHIEU", price: 0 },
      { name: "Size L", price: 10000 },
    ],
    finalPrice: 64000, // price + variants
  },
  {
    code: "LTM-002",
    name: "Luc tra macchiata",
    qty: 3,
    price: 50000,
    discount: 36000, // 20% discount
    discountPercent: 20,
    category: "Do uong",
    variants: [
      { name: "NHIEU", price: 0 },
      { name: "Size L", price: 10000 },
    ],
    finalPrice: 144000, // (50000 + 10000) * 3 - 36000
  },
  {
    code: "TRA-003",
    name: "Tra da",
    qty: 2,
    price: 5000,
    category: "Do uong",
    finalPrice: 10000,
  },
];

// Memoized Items Section with different layouts
const ItemsSection = React.memo(function ItemsSection({
  layout,
  showItemCode,
  showItemNote,
  showQuantity,
  showUnitPrice,
  showItemDiscount,
}: {
  layout?: ItemDisplayLayout;
  showItemCode?: boolean;
  showItemNote?: boolean;
  showQuantity?: boolean;
  showUnitPrice?: boolean;
  showItemDiscount?: boolean;
}) {
  const activeLayout = layout || ItemDisplayLayout.STANDARD;

  // Format price helper
  const formatPrice = (n: number) => n.toLocaleString("vi-VN");

  // Helper to render variants
  const renderVariants = (item: typeof PREVIEW_ITEMS[0]) => {
    if (!item.variants || item.variants.length === 0) return null;
    return (
      <div className="text-xs pl-2 space-y-0.5">
        {item.variants.map((v, i) => (
          <div key={i} className="flex justify-between">
            <span>• {v.name}</span>
            {v.price > 0 && <span className="text-orange-600">+{formatPrice(v.price)}</span>}
          </div>
        ))}
      </div>
    );
  };

  // STANDARD layout: Tên món - SL x Đơn giá = Thành tiền (với variants)
  if (activeLayout === ItemDisplayLayout.STANDARD) {
    return (
      <div className="space-y-3 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx}>
            <div className="flex justify-between items-start">
              <span className="flex-1 font-medium">{item.name}</span>
              {showQuantity && <span className="text-xs bg-gray-200 px-1 rounded mx-1">x{item.qty}</span>}
            </div>
            {showUnitPrice && (
              <p className="text-xs text-muted-foreground pl-2">Gia goc: {formatPrice(item.price)}</p>
            )}
            {/* Variants/Toppings */}
            {renderVariants(item)}
            {showItemCode && <p className="text-xs text-muted-foreground pl-2">Ma: {item.code}</p>}
            {showItemNote && item.note && <p className="text-xs text-blue-600 italic pl-2">Ghi chu: {item.note}</p>}
            {/* Item Discount */}
            {showItemDiscount && item.discount && (
              <div className="flex justify-between text-xs text-green-600 pl-2">
                <span>→ Giam {item.discountPercent || 0}%:</span>
                <span>-{formatPrice(item.discount)}</span>
              </div>
            )}
            {/* Final price */}
            <div className="flex justify-between text-xs font-medium border-t border-dotted mt-1 pt-1">
              <span className="pl-2">Thanh tien{item.qty > 1 ? ` (${item.qty} x ${formatPrice((item.finalPrice + (item.discount || 0)) / item.qty)})` : ""}:</span>
              <span>{formatPrice(item.finalPrice)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // COMPACT layout: Tên món x SL = Thành tiền (1 dòng, với variants gộp)
  if (activeLayout === ItemDisplayLayout.COMPACT) {
    return (
      <div className="space-y-1 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => {
          const variantNames = item.variants?.filter(v => v.price > 0).map(v => v.name).join(", ") || "";
          return (
            <div key={idx}>
              <div className="flex justify-between">
                <span>{item.name} {variantNames && `(${variantNames})`} {showQuantity && `x${item.qty}`}</span>
                <span>{formatPrice(item.finalPrice)}</span>
              </div>
              {showItemDiscount && item.discount && (
                <div className="flex justify-end text-green-600 text-xs">
                  <span>(-{formatPrice(item.discount)})</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // DETAILED layout: Mã + Tên + Ghi chú + Variants + Đơn giá + SL + Thành tiền
  if (activeLayout === ItemDisplayLayout.DETAILED) {
    return (
      <div className="space-y-3 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="border-b border-dashed pb-2 last:border-0">
            <div className="flex justify-between font-medium">
              <span>{item.code} - {item.name}</span>
              {showQuantity && <span className="bg-gray-200 px-1 rounded">x{item.qty}</span>}
            </div>
            {showUnitPrice && (
              <p className="text-muted-foreground pl-2">Gia goc: {formatPrice(item.price)}</p>
            )}
            {/* Variants */}
            {renderVariants(item)}
            {item.note && <p className="text-blue-600 italic pl-2">Ghi chu: {item.note}</p>}
            {/* Item Discount */}
            {showItemDiscount && item.discount && (
              <div className="flex justify-between text-green-600 pl-2">
                <span>→ Giam {item.discountPercent || 0}%:</span>
                <span>-{formatPrice(item.discount)}</span>
              </div>
            )}
            {/* Final price */}
            <div className="flex justify-between font-medium border-t border-dotted mt-1 pt-1">
              <span className="pl-2">Thanh tien:</span>
              <span>{formatPrice(item.finalPrice)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // TWO_LINE layout: Dòng 1: Tên, Dòng 2: Chi tiết giá (với variants)
  if (activeLayout === ItemDisplayLayout.TWO_LINE) {
    return (
      <div className="space-y-3 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx}>
            <div className="flex justify-between items-start">
              <p className="font-medium">{item.name}</p>
              {showQuantity && <span className="bg-gray-200 px-1 rounded">x{item.qty}</span>}
            </div>
            {/* Variants inline */}
            {item.variants && item.variants.length > 0 && (
              <p className="text-xs text-muted-foreground pl-2">
                {item.variants.map(v => v.name + (v.price > 0 ? ` +${formatPrice(v.price)}` : "")).join(", ")}
              </p>
            )}
            {/* Price line */}
            <div className="flex justify-between pl-4 text-muted-foreground">
              {showUnitPrice && <span>{item.qty} x {formatPrice((item.finalPrice + (item.discount || 0)) / item.qty)}</span>}
              <span className="text-foreground font-medium">{formatPrice(item.finalPrice)}</span>
            </div>
            {showItemDiscount && item.discount && (
              <div className="flex justify-end text-green-600 text-xs">
                <span>(da giam {formatPrice(item.discount)})</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // PRICE_RIGHT layout: Tên căn trái, giá căn phải (với variants inline)
  if (activeLayout === ItemDisplayLayout.PRICE_RIGHT) {
    return (
      <div className="space-y-2 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => {
          const variantText = item.variants?.filter(v => v.price > 0).map(v => v.name).join(", ") || "";
          return (
            <div key={idx}>
              <div className="flex justify-between">
                <span className="flex-1">{item.name} {variantText && `(${variantText})`} {showQuantity && `x${item.qty}`}</span>
                <span className="text-right tabular-nums font-medium">{formatPrice(item.finalPrice)}</span>
              </div>
              {showItemDiscount && item.discount && (
                <div className="flex justify-end text-green-600 text-xs">
                  <span>(-{formatPrice(item.discount)})</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // WITH_INDEX layout: STT. Tên món - SL x Đơn giá (với variants)
  if (activeLayout === ItemDisplayLayout.WITH_INDEX) {
    return (
      <div className="space-y-2 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => {
          const variantText = item.variants?.filter(v => v.price > 0).map(v => v.name).join(", ") || "";
          const unitPrice = (item.finalPrice + (item.discount || 0)) / item.qty;
          return (
            <div key={idx}>
              <div className="flex justify-between">
                <span>{idx + 1}. {item.name} {variantText && `(${variantText})`}</span>
                <span>{item.qty} x {formatPrice(unitPrice)}</span>
              </div>
              {showItemDiscount && item.discount && (
                <div className="flex justify-end text-green-600 text-xs pl-4">
                  <span>Giam: -{formatPrice(item.discount)} → {formatPrice(item.finalPrice)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // GROUPED layout: Nhóm theo danh mục (với variants)
  if (activeLayout === ItemDisplayLayout.GROUPED) {
    // Group items by category
    const grouped: Record<string, typeof PREVIEW_ITEMS> = {};
    PREVIEW_ITEMS.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    return (
      <div className="space-y-2 text-xs">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <p className="text-center font-medium text-muted-foreground">--- {category.toUpperCase()} ---</p>
            {items.map((item, idx) => {
              const variantText = item.variants?.filter(v => v.price > 0).map(v => v.name).join(", ") || "";
              return (
                <div key={idx}>
                  <div className="flex justify-between">
                    <span>{item.name} {variantText && `(${variantText})`} {showQuantity && `x${item.qty}`}</span>
                    <span>{formatPrice(item.finalPrice)}</span>
                  </div>
                  {showItemDiscount && item.discount && (
                    <div className="flex justify-end text-green-600 text-xs">
                      <span>(-{formatPrice(item.discount)})</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // GRID_2_COL layout: Grid 2 cột (với variants)
  if (activeLayout === ItemDisplayLayout.GRID_2_COL) {
    return (
      <div className="grid grid-cols-2 gap-1 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => {
          const variantText = item.variants?.filter(v => v.price > 0).map(v => v.name).join(", ") || "";
          return (
            <div key={idx} className="border border-dashed p-1 rounded">
              <p className="font-medium truncate">{item.name}</p>
              {variantText && <p className="text-xs text-muted-foreground truncate">{variantText}</p>}
              <div className="flex justify-between text-muted-foreground">
                {showQuantity && <span>x{item.qty}</span>}
                <span className="font-medium text-foreground">{formatPrice(item.finalPrice)}</span>
              </div>
              {showItemDiscount && item.discount && (
                <p className="text-green-600 text-right text-xs">(-{formatPrice(item.discount)})</p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // MINIMAL layout: Tối giản (chỉ tên và giá cuối)
  if (activeLayout === ItemDisplayLayout.MINIMAL) {
    return (
      <div className="space-y-0.5 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="flex justify-between">
            <span>{item.name} {showQuantity && `x${item.qty}`}</span>
            <span>{formatPrice(item.finalPrice)}</span>
          </div>
        ))}
      </div>
    );
  }

  // DOTTED layout: Dấu chấm (với variants inline)
  if (activeLayout === ItemDisplayLayout.DOTTED) {
    return (
      <div className="space-y-0.5 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => {
          const variantText = item.variants?.filter(v => v.price > 0).map(v => v.name).join(",") || "";
          const name = `${item.name}${variantText ? ` (${variantText})` : ""} ${showQuantity ? `x${item.qty}` : ""}`;
          const price = formatPrice(item.finalPrice);
          const dots = ".".repeat(Math.max(2, 24 - name.length - price.length));
          return (
            <div key={idx} className="flex">
              <span className="flex-1 truncate">{name}<span className="text-muted-foreground">{dots}</span></span>
              <span>{price}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // BOXED layout: Có viền (với variants)
  if (activeLayout === ItemDisplayLayout.BOXED) {
    return (
      <div className="space-y-1 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="border-2 border-gray-300 rounded p-1.5">
            <div className="flex justify-between items-center">
              <span className="font-medium">{item.name}</span>
              <span className="font-bold">{formatPrice(item.finalPrice)}</span>
            </div>
            {/* Variants */}
            {item.variants && item.variants.length > 0 && (
              <p className="text-muted-foreground text-xs">
                {item.variants.map(v => v.name + (v.price > 0 ? ` +${formatPrice(v.price)}` : "")).join(", ")}
              </p>
            )}
            <div className="flex justify-between text-muted-foreground">
              {showQuantity && <span>SL: {item.qty}</span>}
              {showItemDiscount && item.discount && (
                <span className="text-green-600">-{formatPrice(item.discount)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // TABLE layout: Dạng bảng (với variants dòng phụ)
  if (activeLayout === ItemDisplayLayout.TABLE) {
    return (
      <div className="text-xs">
        <div className="grid grid-cols-[1fr_auto_auto] gap-1 font-medium border-b pb-1 mb-1">
          <span>Mon</span>
          <span className="text-center w-8">SL</span>
          <span className="text-right w-16">Gia</span>
        </div>
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="py-0.5 border-b border-dotted last:border-0">
            <div className="grid grid-cols-[1fr_auto_auto] gap-1">
              <span className="truncate">{item.name}</span>
              <span className="text-center w-8">{item.qty}</span>
              <span className="text-right w-16">{formatPrice(item.finalPrice)}</span>
            </div>
            {/* Variants row */}
            {item.variants && item.variants.length > 0 && (
              <div className="text-muted-foreground pl-2">
                {item.variants.map(v => v.name + (v.price > 0 ? ` +${formatPrice(v.price)}` : "")).join(", ")}
              </div>
            )}
            {showItemDiscount && item.discount && (
              <div className="text-green-600 text-right">-{formatPrice(item.discount)}</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // TABLE_STT layout: Bảng có STT (với variants)
  if (activeLayout === ItemDisplayLayout.TABLE_STT) {
    return (
      <div className="text-xs">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-1 font-medium border-b pb-1 mb-1">
          <span className="w-6 text-center">STT</span>
          <span>Mon</span>
          <span className="text-center w-8">SL</span>
          <span className="text-right w-16">Gia</span>
        </div>
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="py-0.5 border-b border-dotted last:border-0">
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-1">
              <span className="w-6 text-center">{idx + 1}</span>
              <span className="truncate">{item.name}</span>
              <span className="text-center w-8">{item.qty}</span>
              <span className="text-right w-16">{formatPrice(item.finalPrice)}</span>
            </div>
            {/* Variants row */}
            {item.variants && item.variants.length > 0 && (
              <div className="text-muted-foreground pl-8">
                {item.variants.map(v => v.name + (v.price > 0 ? ` +${formatPrice(v.price)}` : "")).join(", ")}
              </div>
            )}
            {showItemDiscount && item.discount && (
              <div className="text-green-600 text-right">-{formatPrice(item.discount)}</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // TABLE_QTY_FIRST layout: Bảng SL trước (với variants)
  if (activeLayout === ItemDisplayLayout.TABLE_QTY_FIRST) {
    return (
      <div className="text-xs">
        <div className="grid grid-cols-[auto_1fr_auto] gap-1 font-medium border-b pb-1 mb-1">
          <span className="text-center w-8">SL</span>
          <span>Mon</span>
          <span className="text-right w-16">Gia</span>
        </div>
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="py-0.5 border-b border-dotted last:border-0">
            <div className="grid grid-cols-[auto_1fr_auto] gap-1">
              <span className="text-center w-8">{item.qty}</span>
              <span className="truncate">{item.name}</span>
              <span className="text-right w-16">{formatPrice(item.finalPrice)}</span>
            </div>
            {/* Variants row */}
            {item.variants && item.variants.length > 0 && (
              <div className="text-muted-foreground pl-10">
                {item.variants.map(v => v.name + (v.price > 0 ? ` +${formatPrice(v.price)}` : "")).join(", ")}
              </div>
            )}
            {showItemDiscount && item.discount && (
              <div className="text-green-600 text-right">-{formatPrice(item.discount)}</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // TABLE_FULL layout: Bảng đầy đủ (với variants)
  if (activeLayout === ItemDisplayLayout.TABLE_FULL) {
    return (
      <div className="text-xs">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-1 font-medium border-b pb-1 mb-1">
          <span className="w-6 text-center">STT</span>
          <span>Mon</span>
          <span className="text-center w-6">SL</span>
          <span className="text-right w-14">D.Gia</span>
          <span className="text-right w-14">T.Tien</span>
        </div>
        {PREVIEW_ITEMS.map((item, idx) => {
          const unitPrice = (item.finalPrice + (item.discount || 0)) / item.qty;
          return (
            <div key={idx} className="py-0.5 border-b border-dotted last:border-0">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-1">
                <span className="w-6 text-center">{idx + 1}</span>
                <span className="truncate">{item.name}</span>
                <span className="text-center w-6">{item.qty}</span>
                <span className="text-right w-14">{formatPrice(unitPrice)}</span>
                <span className="text-right w-14">{formatPrice(item.finalPrice)}</span>
              </div>
              {/* Variants row */}
              {item.variants && item.variants.length > 0 && (
                <div className="text-muted-foreground pl-8">
                  {item.variants.map(v => v.name + (v.price > 0 ? ` +${formatPrice(v.price)}` : "")).join(", ")}
                </div>
              )}
              {showItemDiscount && item.discount && (
                <div className="text-green-600 text-right">-{formatPrice(item.discount)}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback to standard
  return null;
});

// Memoized Order Info component
const OrderInfo = React.memo(function OrderInfo({
  showOrderNumber,
  showTableName,
  showStaffName,
  showCustomerName,
  showDateTime,
  showCheckInTime,
  showCheckOutTime,
  checkInLabel,
  checkOutLabel,
}: {
  showOrderNumber?: boolean;
  showTableName?: boolean;
  showStaffName?: boolean;
  showCustomerName?: boolean;
  showDateTime?: boolean;
  showCheckInTime?: boolean;
  showCheckOutTime?: boolean;
  checkInLabel?: string;
  checkOutLabel?: string;
}) {
  return (
    <div className="text-xs my-2">
      {showOrderNumber && <p>Ma don: #123456</p>}
      {showTableName && <p>Ban: A01</p>}
      {showStaffName && <p>NV: Nguyen Van A</p>}
      {showCustomerName && <p>Khach hang: Tran Van B</p>}
      {showDateTime && <p>Gio: 15:30 01/01/2024</p>}
      {showCheckInTime && <p>{checkInLabel || "Gio vao"}: 14:00</p>}
      {showCheckOutTime && <p>{checkOutLabel || "Gio ra"}: 15:30</p>}
    </div>
  );
});

/**
 * Bill Preview Panel - Shows a live preview of the bill template
 * Renders a visual representation of how the bill will look when printed
 *
 * STABLE RENDERING STRATEGY:
 * 1. All style objects defined OUTSIDE component (no re-creation)
 * 2. useTransition for non-urgent updates to prevent blocking
 * 3. useDeferredValue for template to batch updates
 * 4. Memoized sub-components with stable props
 * 5. CSS containment to isolate repaints
 */
export const BillPreviewPanel = React.memo(function BillPreviewPanel({ template, className }: BillPreviewPanelProps) {
  // Use transition for non-urgent updates - allows React to interrupt rendering
  const [isPending, startTransition] = React.useTransition();

  // Defer template updates to prevent blocking on every keystroke
  // This batches rapid updates together for smoother rendering
  const deferredTemplate = React.useDeferredValue(template);

  // Use the deferred template for all calculations to batch updates
  const activeTemplate = deferredTemplate;

  // Memoize calculated values to prevent recalculation on every render
  const previewWidth = React.useMemo(() => {
    const paperWidth = activeTemplate.paperWidth || 80;
    if (paperWidth <= 58) return "200px";
    if (paperWidth <= 80) return "280px";
    return "350px";
  }, [activeTemplate.paperWidth]);

  const fontSizeClass = React.useMemo(() => {
    switch (activeTemplate.fontSize) {
      case "small": return "text-xs";
      case "large": return "text-base";
      default: return "text-sm";
    }
  }, [activeTemplate.fontSize]);

  // Memoize separator strings - use activeTemplate for batched updates
  const separatorLine = React.useMemo(() => {
    const separator = activeTemplate.separatorChar || "-";
    return separator.repeat(30);
  }, [activeTemplate.separatorChar]);

  const doubleSeparatorLine = React.useMemo(() => {
    const doubleSeparator = activeTemplate.doubleSeparatorChar || "=";
    return doubleSeparator.repeat(30);
  }, [activeTemplate.doubleSeparatorChar]);

  // Memoize header props object - only recreate when header-related values change
  const headerProps = React.useMemo(() => ({
    showLogo: activeTemplate.showLogo,
    storeName: activeTemplate.storeName,
    storeAddress: activeTemplate.storeAddress,
    storePhone: activeTemplate.storePhone,
    taxCode: activeTemplate.taxCode,
    headerText: activeTemplate.headerText,
  }), [activeTemplate.showLogo, activeTemplate.storeName, activeTemplate.storeAddress, activeTemplate.storePhone, activeTemplate.taxCode, activeTemplate.headerText]);

  // Memoize footer props object - only recreate when footer-related values change
  const footerProps = React.useMemo(() => ({
    thankYouMessage: activeTemplate.thankYouMessage,
    comebackMessage: activeTemplate.comebackMessage,
    footerText: activeTemplate.footerText,
  }), [activeTemplate.thankYouMessage, activeTemplate.comebackMessage, activeTemplate.footerText]);

  // Memoize print options props object
  const printOptionsProps = React.useMemo(() => ({
    cutPaper: activeTemplate.cutPaper,
    openCashDrawer: activeTemplate.openCashDrawer,
    beepAfterPrint: activeTemplate.beepAfterPrint,
    numberOfCopies: activeTemplate.numberOfCopies,
  }), [activeTemplate.cutPaper, activeTemplate.openCashDrawer, activeTemplate.beepAfterPrint, activeTemplate.numberOfCopies]);

  // Memoize order info props
  const orderInfoProps = React.useMemo(() => ({
    showOrderNumber: activeTemplate.showOrderNumber,
    showTableName: activeTemplate.showTableName,
    showStaffName: activeTemplate.showStaffName,
    showCustomerName: activeTemplate.showCustomerName,
    showDateTime: activeTemplate.showDateTime,
    showCheckInTime: activeTemplate.showCheckInTime,
    showCheckOutTime: activeTemplate.showCheckOutTime,
    checkInLabel: activeTemplate.checkInLabel,
    checkOutLabel: activeTemplate.checkOutLabel,
  }), [activeTemplate.showOrderNumber, activeTemplate.showTableName, activeTemplate.showStaffName, activeTemplate.showCustomerName, activeTemplate.showDateTime, activeTemplate.showCheckInTime, activeTemplate.showCheckOutTime, activeTemplate.checkInLabel, activeTemplate.checkOutLabel]);

  // Memoize bill title
  const billTitle = React.useMemo(() => activeTemplate.billTitle || "HOA DON BAN HANG", [activeTemplate.billTitle]);

  // Memoize container style with dynamic width, lineHeight and fontSize
  const containerStyleWithWidth = React.useMemo(() => ({
    ...CONTAINER_STYLE,
    width: previewWidth,
    lineHeight: 1 + (activeTemplate.lineSpacing || 0.7),
    fontSize: activeTemplate.fontSize === "small" ? "11px" : activeTemplate.fontSize === "large" ? "15px" : "13px"
  }), [previewWidth, activeTemplate.lineSpacing, activeTemplate.fontSize]);

  return (
    <div className={className}>
      <div className="text-center text-xs text-muted-foreground mb-2">
        Xem truoc - {activeTemplate.paperWidth || 80}mm
        {/* Show subtle loading indicator when updates are pending */}
        {isPending && <span className="ml-2 opacity-50">...</span>}
      </div>
      {/*
        STABLE RENDERING STRATEGY:
        1. containerStyleWithWidth - memoized style object
        2. SECTION_STYLE - static style object (no re-creation)
        3. useDeferredValue batches rapid updates
        4. useTransition allows interruption
        5. CSS containment isolates repaints
      */}
      <div
        className="bg-white p-4 border rounded-lg font-mono mx-auto shadow-sm"
        style={containerStyleWithWidth}
      >
        {/* Header - Memoized component with stable style */}
        <div style={SECTION_STYLE}>
          <BillHeader {...headerProps} />
        </div>

        {/* Separator */}
        <p className="text-center text-muted-foreground my-1 overflow-hidden" style={SEPARATOR_STYLE}>
          {doubleSeparatorLine}
        </p>

        {/* Bill Title */}
        <p className="text-center font-bold" style={SEPARATOR_STYLE}>{billTitle}</p>

        {/* Order Info - Memoized component with stable style */}
        <div style={SECTION_STYLE}>
          <OrderInfo {...orderInfoProps} />
        </div>

        {/* Separator */}
        <p className="text-center text-muted-foreground my-1 overflow-hidden" style={SEPARATOR_STYLE}>
          {separatorLine}
        </p>

        {/* Items - Main content section with stable style */}
        <div style={SECTION_STYLE}>
          <ItemsSection
            layout={activeTemplate.itemDisplayLayout}
            showItemCode={activeTemplate.showItemCode}
            showItemNote={activeTemplate.showItemNote}
            showQuantity={activeTemplate.showQuantity}
            showUnitPrice={activeTemplate.showUnitPrice}
            showItemDiscount={activeTemplate.showItemDiscount}
          />
        </div>

        {/* Separator */}
        <p className="text-center text-muted-foreground my-2 overflow-hidden" style={SEPARATOR_STYLE}>
          {separatorLine}
        </p>

        {/* Subtotal & Discounts - Price/VAT section with stable style */}
        {/* Data: OLM 64k + LTM 144k (da giam 36k) + Tra da 10k = 218k */}
        <div className="space-y-1 text-xs" style={SECTION_STYLE}>
          {activeTemplate.showSubtotal && (
            <div className="flex justify-between">
              <span>Tam tinh (3 mon):</span>
              <span>254,000</span>
            </div>
          )}

          {activeTemplate.showTotalItemDiscount && (
            <div className="flex justify-between text-green-600">
              <span>{activeTemplate.itemDiscountLabel || "Giam gia mon"}:</span>
              <span>-36,000</span>
            </div>
          )}

          {activeTemplate.showBillDiscount && (
            <div className="flex justify-between text-green-600">
              <span>
                {activeTemplate.billDiscountLabel || "Giam gia hoa don"}{activeTemplate.showDiscountPercent && " (10%)"}:
              </span>
              <span>-21,800</span>
            </div>
          )}

          {activeTemplate.showCouponDiscount && (
            <div className="flex justify-between text-green-600">
              <span>{activeTemplate.couponDiscountLabel || "Ma giam gia"} (MUAXUAN20):</span>
              <span>-20,000</span>
            </div>
          )}

          {activeTemplate.showVoucherDiscount && (
            <div className="flex justify-between text-green-600">
              <span>{activeTemplate.voucherDiscountLabel || "Voucher"} (VIP50K):</span>
              <span>-50,000</span>
            </div>
          )}

          {activeTemplate.showTotalDiscount && (
            <div className="flex justify-between text-green-600 font-medium">
              <span>{activeTemplate.totalDiscountLabel || "Tong giam gia"}:</span>
              <span>-127,800</span>
            </div>
          )}

          {activeTemplate.showServiceFee && (
            <div className="flex justify-between">
              <span>Phi dich vu (5%):</span>
              <span>6,310</span>
            </div>
          )}

          {/* VAT Details */}
          {activeTemplate.showVatDetails && (
            <>
              {activeTemplate.showPriceBeforeVat && (
                <div className="flex justify-between">
                  <span>{activeTemplate.priceBeforeVatLabel || "Gia truoc thue"}:</span>
                  <span>120,463</span>
                </div>
              )}
              {activeTemplate.showVat && (
                <div className="flex justify-between">
                  <span>{activeTemplate.vatLabel || "VAT"} (10%):</span>
                  <span>12,046</span>
                </div>
              )}
              {activeTemplate.showPriceAfterVat && (
                <div className="flex justify-between">
                  <span>{activeTemplate.priceAfterVatLabel || "Gia sau thue"}:</span>
                  <span>132,509</span>
                </div>
              )}
            </>
          )}

          {!activeTemplate.showVatDetails && activeTemplate.showVat && (
            <div className="flex justify-between">
              <span>{activeTemplate.vatLabel || "VAT"} (10%):</span>
              <span>12,046</span>
            </div>
          )}
        </div>

        {/* Separator */}
        <p className="text-center text-muted-foreground my-2 overflow-hidden" style={SEPARATOR_STYLE}>
          {doubleSeparatorLine}
        </p>

        {/* Total - Payment section with stable style */}
        <div style={SECTION_STYLE}>
          <div className="flex justify-between font-bold text-lg">
            <span>TONG TIEN:</span>
            <span>132,500d</span>
          </div>

          {/* Payment Info */}
          {activeTemplate.showPaymentMethod && (
            <div className="flex justify-between text-xs mt-2">
              <span>Thanh toan:</span>
              <span>Tien mat</span>
            </div>
          )}

          {activeTemplate.showReceivedAmount && (
            <div className="flex justify-between text-xs">
              <span>Tien nhan:</span>
              <span>200,000</span>
            </div>
          )}

          {activeTemplate.showChangeAmount && (
            <div className="flex justify-between text-xs">
              <span>Tien tra lai:</span>
              <span>67,500</span>
            </div>
          )}
        </div>

        {/* Order Note - Ghi chú tổng bill */}
        {activeTemplate.showOrderNote && (
          <div className="border-t border-dashed pt-2 mt-2" style={SEPARATOR_STYLE}>
            <p className="text-xs font-medium">Ghi chu:</p>
            <p className="text-xs text-muted-foreground italic">Giao hang truoc 12h trua</p>
          </div>
        )}

        {/* QR Code */}
        {activeTemplate.showQrCode && (
          <div className="text-center my-3" style={SEPARATOR_STYLE}>
            <div className="inline-block border-2 border-gray-300 p-2 rounded">
              <div className="w-16 h-16 bg-gray-200 flex items-center justify-center">
                <span className="text-xs">QR</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeTemplate.qrCodeType === "order_id" && "Ma don hang"}
              {activeTemplate.qrCodeType === "payment" && "Thanh toan"}
              {activeTemplate.qrCodeType === "review" && "Danh gia"}
              {activeTemplate.qrCodeType === "custom" && "Tuy chinh"}
            </p>
          </div>
        )}

        {/* Barcode */}
        {activeTemplate.showBarcode && (
          <div className="text-center my-3" style={SEPARATOR_STYLE}>
            <div className="inline-block">
              <div className="h-8 w-32 bg-gray-300 flex items-center justify-center">
                <span className="text-xs">|||||||||||</span>
              </div>
              <p className="text-xs">*123456789*</p>
            </div>
          </div>
        )}

        {/* WiFi Info */}
        {activeTemplate.showWifiInfo && activeTemplate.wifiName && (
          <div className="text-center text-xs my-2 p-2 bg-gray-50 rounded" style={SEPARATOR_STYLE}>
            <p className="font-medium">WiFi</p>
            <p>
              WiFi: {activeTemplate.wifiName} / {activeTemplate.wifiPassword || "********"}
            </p>
          </div>
        )}

        {/* Footer - Memoized component with stable style */}
        <div style={SECTION_STYLE}>
          <BillFooter {...footerProps} />
        </div>

        {/* Print Options Badges - Memoized component with stable style */}
        <div style={SECTION_STYLE}>
          <PrintOptions {...printOptionsProps} />
        </div>
      </div>
    </div>
  );
});
