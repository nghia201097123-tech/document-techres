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

// Sample items for preview
const PREVIEW_ITEMS = [
  { code: "PHO-001", name: "Pho bo tai nam", qty: 1, price: 45000, note: "It hanh, them gia", category: "Mon chinh" },
  { code: "CF-002", name: "Ca phe sua da", qty: 3, price: 20000, discount: 6000, category: "Do uong" },
  { code: "BM-003", name: "Banh mi thit", qty: 2, price: 25000, category: "Mon chinh" },
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

  // STANDARD layout: Tên món - SL x Đơn giá = Thành tiền
  if (activeLayout === ItemDisplayLayout.STANDARD) {
    return (
      <div className="space-y-2 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx}>
            <div className="flex justify-between items-start">
              <span className="flex-1 font-medium">{item.name}</span>
              {showQuantity && <span className="text-xs bg-gray-200 px-1 rounded mx-1">x{item.qty}</span>}
              {showUnitPrice && <span>{formatPrice(item.price * item.qty)}</span>}
            </div>
            {showItemCode && <p className="text-xs text-muted-foreground">Ma: {item.code}</p>}
            {showItemNote && item.note && <p className="text-xs text-muted-foreground italic">{item.note}</p>}
            {showItemDiscount && item.discount && (
              <div className="flex justify-between text-xs text-green-600">
                <span>Giam gia</span>
                <span>-{formatPrice(item.discount)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // COMPACT layout: Tên món x SL = Thành tiền (1 dòng)
  if (activeLayout === ItemDisplayLayout.COMPACT) {
    return (
      <div className="space-y-1 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="flex justify-between">
            <span>{item.name} {showQuantity && `x${item.qty}`}</span>
            <span>{formatPrice(item.price * item.qty - (item.discount || 0))}</span>
          </div>
        ))}
      </div>
    );
  }

  // DETAILED layout: Mã + Tên + Ghi chú + Đơn giá + SL + Thành tiền
  if (activeLayout === ItemDisplayLayout.DETAILED) {
    return (
      <div className="space-y-3 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="border-b border-dashed pb-2 last:border-0">
            <div className="flex justify-between font-medium">
              <span>{item.code} - {item.name}</span>
            </div>
            {item.note && <p className="text-muted-foreground italic">Ghi chu: {item.note}</p>}
            <div className="flex justify-between mt-1">
              <span>{item.qty} x {formatPrice(item.price)}</span>
              <span className="font-medium">{formatPrice(item.price * item.qty)}</span>
            </div>
            {item.discount && (
              <div className="flex justify-between text-green-600">
                <span>Giam gia</span>
                <span>-{formatPrice(item.discount)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // TWO_LINE layout: Dòng 1: Tên, Dòng 2: Chi tiết giá
  if (activeLayout === ItemDisplayLayout.TWO_LINE) {
    return (
      <div className="space-y-2 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx}>
            <p className="font-medium">{item.name}</p>
            <div className="flex justify-between pl-4 text-muted-foreground">
              <span>{item.qty} x {formatPrice(item.price)}</span>
              <span className="text-foreground">{formatPrice(item.price * item.qty - (item.discount || 0))}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // PRICE_RIGHT layout: Tên căn trái, giá căn phải
  if (activeLayout === ItemDisplayLayout.PRICE_RIGHT) {
    return (
      <div className="space-y-1 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="flex justify-between">
            <span className="flex-1">{item.name} {showQuantity && `(x${item.qty})`}</span>
            <span className="text-right tabular-nums">{formatPrice(item.price * item.qty - (item.discount || 0))}</span>
          </div>
        ))}
      </div>
    );
  }

  // WITH_INDEX layout: STT. Tên món - SL x Đơn giá
  if (activeLayout === ItemDisplayLayout.WITH_INDEX) {
    return (
      <div className="space-y-1 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="flex justify-between">
            <span>{idx + 1}. {item.name}</span>
            <span>{item.qty} x {formatPrice(item.price)}</span>
          </div>
        ))}
      </div>
    );
  }

  // GROUPED layout: Nhóm theo danh mục
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
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.name} {showQuantity && `x${item.qty}`}</span>
                <span>{formatPrice(item.price * item.qty - (item.discount || 0))}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // GRID_2_COL layout: Grid 2 cột
  if (activeLayout === ItemDisplayLayout.GRID_2_COL) {
    return (
      <div className="grid grid-cols-2 gap-1 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="border border-dashed p-1 rounded">
            <p className="font-medium truncate">{item.name}</p>
            <div className="flex justify-between text-muted-foreground">
              {showQuantity && <span>x{item.qty}</span>}
              <span className="font-medium text-foreground">{formatPrice(item.price * item.qty - (item.discount || 0))}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // MINIMAL layout: Tối giản
  if (activeLayout === ItemDisplayLayout.MINIMAL) {
    return (
      <div className="space-y-0.5 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="flex justify-between">
            <span>{item.name}</span>
            <span>{formatPrice(item.price * item.qty - (item.discount || 0))}</span>
          </div>
        ))}
      </div>
    );
  }

  // DOTTED layout: Dấu chấm
  if (activeLayout === ItemDisplayLayout.DOTTED) {
    return (
      <div className="space-y-0.5 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => {
          const name = `${item.name} ${showQuantity ? `x${item.qty}` : ""}`;
          const price = formatPrice(item.price * item.qty - (item.discount || 0));
          const dots = ".".repeat(Math.max(2, 20 - name.length - price.length));
          return (
            <div key={idx} className="flex">
              <span className="flex-1">{name}<span className="text-muted-foreground">{dots}</span></span>
              <span>{price}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // BOXED layout: Có viền
  if (activeLayout === ItemDisplayLayout.BOXED) {
    return (
      <div className="space-y-1 text-xs">
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="border-2 border-gray-300 rounded p-1.5">
            <div className="flex justify-between items-center">
              <span className="font-medium">{item.name}</span>
              <span className="font-bold">{formatPrice(item.price * item.qty - (item.discount || 0))}</span>
            </div>
            {showQuantity && (
              <p className="text-muted-foreground text-right">SL: {item.qty}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  // TABLE layout: Dạng bảng
  if (activeLayout === ItemDisplayLayout.TABLE) {
    return (
      <div className="text-xs">
        <div className="grid grid-cols-[1fr_auto_auto] gap-1 font-medium border-b pb-1 mb-1">
          <span>Món</span>
          <span className="text-center w-8">SL</span>
          <span className="text-right w-16">Giá</span>
        </div>
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_auto_auto] gap-1 py-0.5">
            <span className="truncate">{item.name}</span>
            <span className="text-center w-8">{item.qty}</span>
            <span className="text-right w-16">{formatPrice(item.price * item.qty - (item.discount || 0))}</span>
          </div>
        ))}
      </div>
    );
  }

  // TABLE_STT layout: Bảng có STT
  if (activeLayout === ItemDisplayLayout.TABLE_STT) {
    return (
      <div className="text-xs">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-1 font-medium border-b pb-1 mb-1">
          <span className="w-6 text-center">STT</span>
          <span>Món</span>
          <span className="text-center w-8">SL</span>
          <span className="text-right w-16">Giá</span>
        </div>
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="grid grid-cols-[auto_1fr_auto_auto] gap-1 py-0.5">
            <span className="w-6 text-center">{idx + 1}</span>
            <span className="truncate">{item.name}</span>
            <span className="text-center w-8">{item.qty}</span>
            <span className="text-right w-16">{formatPrice(item.price * item.qty - (item.discount || 0))}</span>
          </div>
        ))}
      </div>
    );
  }

  // TABLE_QTY_FIRST layout: Bảng SL trước
  if (activeLayout === ItemDisplayLayout.TABLE_QTY_FIRST) {
    return (
      <div className="text-xs">
        <div className="grid grid-cols-[auto_1fr_auto] gap-1 font-medium border-b pb-1 mb-1">
          <span className="text-center w-8">SL</span>
          <span>Món</span>
          <span className="text-right w-16">Giá</span>
        </div>
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="grid grid-cols-[auto_1fr_auto] gap-1 py-0.5">
            <span className="text-center w-8">{item.qty}</span>
            <span className="truncate">{item.name}</span>
            <span className="text-right w-16">{formatPrice(item.price * item.qty - (item.discount || 0))}</span>
          </div>
        ))}
      </div>
    );
  }

  // TABLE_FULL layout: Bảng đầy đủ
  if (activeLayout === ItemDisplayLayout.TABLE_FULL) {
    return (
      <div className="text-xs">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-1 font-medium border-b pb-1 mb-1">
          <span className="w-6 text-center">STT</span>
          <span>Món</span>
          <span className="text-center w-6">SL</span>
          <span className="text-right w-14">Đ.Giá</span>
          <span className="text-right w-14">T.Tiền</span>
        </div>
        {PREVIEW_ITEMS.map((item, idx) => (
          <div key={idx} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-1 py-0.5">
            <span className="w-6 text-center">{idx + 1}</span>
            <span className="truncate">{item.name}</span>
            <span className="text-center w-6">{item.qty}</span>
            <span className="text-right w-14">{formatPrice(item.price)}</span>
            <span className="text-right w-14">{formatPrice(item.price * item.qty - (item.discount || 0))}</span>
          </div>
        ))}
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
        <div className="space-y-1 text-xs" style={SECTION_STYLE}>
          {activeTemplate.showSubtotal && (
            <div className="flex justify-between">
              <span>Tam tinh:</span>
              <span>149,000</span>
            </div>
          )}

          {activeTemplate.showTotalItemDiscount && (
            <div className="flex justify-between text-green-600">
              <span>{activeTemplate.itemDiscountLabel || "Giam gia mon"}:</span>
              <span>-6,000</span>
            </div>
          )}

          {activeTemplate.showBillDiscount && (
            <div className="flex justify-between text-green-600">
              <span>
                {activeTemplate.billDiscountLabel || "Giam gia hoa don"}{activeTemplate.showDiscountPercent && " (10%)"}:
              </span>
              <span>-14,300</span>
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
              <span>-90,300</span>
            </div>
          )}

          {activeTemplate.showServiceFee && (
            <div className="flex justify-between">
              <span>Phi dich vu (5%):</span>
              <span>7,450</span>
            </div>
          )}

          {/* VAT Details */}
          {activeTemplate.showVatDetails && (
            <>
              {activeTemplate.showPriceBeforeVat && (
                <div className="flex justify-between">
                  <span>{activeTemplate.priceBeforeVatLabel || "Gia truoc thue"}:</span>
                  <span>66,150</span>
                </div>
              )}
              {activeTemplate.showVat && (
                <div className="flex justify-between">
                  <span>{activeTemplate.vatLabel || "VAT"} (10%):</span>
                  <span>6,615</span>
                </div>
              )}
              {activeTemplate.showPriceAfterVat && (
                <div className="flex justify-between">
                  <span>{activeTemplate.priceAfterVatLabel || "Gia sau thue"}:</span>
                  <span>72,765</span>
                </div>
              )}
            </>
          )}

          {!activeTemplate.showVatDetails && activeTemplate.showVat && (
            <div className="flex justify-between">
              <span>{activeTemplate.vatLabel || "VAT"} (10%):</span>
              <span>6,615</span>
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
            <span>72,765</span>
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
              <span>100,000</span>
            </div>
          )}

          {activeTemplate.showChangeAmount && (
            <div className="flex justify-between text-xs">
              <span>Tien tra lai:</span>
              <span>27,235</span>
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
