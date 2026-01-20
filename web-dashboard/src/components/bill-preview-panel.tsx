"use client";

import * as React from "react";
import { CreateBillTemplateDto } from "@/services/bill-template-service";

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

  // Memoize container style with dynamic width
  const containerStyleWithWidth = React.useMemo(() => ({
    ...CONTAINER_STYLE,
    width: previewWidth
  }), [previewWidth]);

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
        className={`bg-white p-4 border rounded-lg font-mono mx-auto shadow-sm ${fontSizeClass}`}
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
        <div className="space-y-2 text-xs" style={SECTION_STYLE}>
          {/* Item 1 */}
          <div>
            <div className="flex justify-between items-start">
              <span className="flex-1 font-medium">Pho bo tai nam</span>
              {activeTemplate.showQuantity && <span className="text-xs bg-gray-200 px-1 rounded mx-1">x1</span>}
              {activeTemplate.showUnitPrice && (
                <span>45,000</span>
              )}
            </div>
            {activeTemplate.showItemCode && (
              <p className="text-xs text-muted-foreground">Ma: PHO-001</p>
            )}
            {activeTemplate.showItemNote && (
              <p className="text-xs text-muted-foreground italic">It hanh, them gia</p>
            )}
          </div>

          {/* Item 2 - with discount */}
          <div>
            <div className="flex justify-between items-start">
              <span className="flex-1 font-medium">Ca phe sua da</span>
              {activeTemplate.showQuantity && <span className="text-xs bg-gray-200 px-1 rounded mx-1">x3</span>}
              {activeTemplate.showUnitPrice && (
                <span className={activeTemplate.showItemDiscount ? "line-through text-muted-foreground" : ""}>
                  60,000
                </span>
              )}
            </div>
            {activeTemplate.showItemDiscount && (
              <div className="flex justify-between text-xs text-green-600">
                <span>Giam 10%</span>
                <span>-6,000</span>
              </div>
            )}
            <div className="flex justify-end font-medium">
              <span>{activeTemplate.showItemDiscount ? "54,000" : "60,000"}</span>
            </div>
          </div>

          {/* Item 3 */}
          <div>
            <div className="flex justify-between items-start">
              <span className="flex-1 font-medium">Banh mi thit</span>
              {activeTemplate.showQuantity && <span className="text-xs bg-gray-200 px-1 rounded mx-1">x2</span>}
              {activeTemplate.showUnitPrice && (
                <span>50,000</span>
              )}
            </div>
            {activeTemplate.showItemCode && (
              <p className="text-xs text-muted-foreground">Ma: BM-003</p>
            )}
          </div>
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
