"use client";

import * as React from "react";
import { CreateBillTemplateDto } from "@/services/bill-template-service";

interface BillPreviewPanelProps {
  template: Partial<CreateBillTemplateDto>;
  className?: string;
}

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
 * Memoized to prevent unnecessary re-renders during form input
 */
export const BillPreviewPanel = React.memo(function BillPreviewPanel({ template, className }: BillPreviewPanelProps) {
  // Memoize calculated values to prevent recalculation on every render
  const previewWidth = React.useMemo(() => {
    const paperWidth = template.paperWidth || 80;
    if (paperWidth <= 58) return "200px";
    if (paperWidth <= 80) return "280px";
    return "350px";
  }, [template.paperWidth]);

  const fontSizeClass = React.useMemo(() => {
    switch (template.fontSize) {
      case "small": return "text-xs";
      case "large": return "text-base";
      default: return "text-sm";
    }
  }, [template.fontSize]);

  // Memoize separator strings
  const separatorLine = React.useMemo(() => {
    const separator = template.separatorChar || "-";
    return separator.repeat(30);
  }, [template.separatorChar]);

  const doubleSeparatorLine = React.useMemo(() => {
    const doubleSeparator = template.doubleSeparatorChar || "=";
    return doubleSeparator.repeat(30);
  }, [template.doubleSeparatorChar]);

  // Memoize header props object - only recreate when header-related values change
  const headerProps = React.useMemo(() => ({
    showLogo: template.showLogo,
    storeName: template.storeName,
    storeAddress: template.storeAddress,
    storePhone: template.storePhone,
    taxCode: template.taxCode,
    headerText: template.headerText,
  }), [template.showLogo, template.storeName, template.storeAddress, template.storePhone, template.taxCode, template.headerText]);

  // Memoize footer props object - only recreate when footer-related values change
  const footerProps = React.useMemo(() => ({
    thankYouMessage: template.thankYouMessage,
    comebackMessage: template.comebackMessage,
    footerText: template.footerText,
  }), [template.thankYouMessage, template.comebackMessage, template.footerText]);

  // Memoize print options props object
  const printOptionsProps = React.useMemo(() => ({
    cutPaper: template.cutPaper,
    openCashDrawer: template.openCashDrawer,
    beepAfterPrint: template.beepAfterPrint,
    numberOfCopies: template.numberOfCopies,
  }), [template.cutPaper, template.openCashDrawer, template.beepAfterPrint, template.numberOfCopies]);

  // Memoize order info props
  const orderInfoProps = React.useMemo(() => ({
    showOrderNumber: template.showOrderNumber,
    showTableName: template.showTableName,
    showStaffName: template.showStaffName,
    showCustomerName: template.showCustomerName,
    showDateTime: template.showDateTime,
    showCheckInTime: template.showCheckInTime,
    showCheckOutTime: template.showCheckOutTime,
    checkInLabel: template.checkInLabel,
    checkOutLabel: template.checkOutLabel,
  }), [template.showOrderNumber, template.showTableName, template.showStaffName, template.showCustomerName, template.showDateTime, template.showCheckInTime, template.showCheckOutTime, template.checkInLabel, template.checkOutLabel]);

  // Memoize bill title
  const billTitle = React.useMemo(() => template.billTitle || "HOA DON BAN HANG", [template.billTitle]);

  // Use deferred values for header, footer, order info to prevent jitter during rapid updates
  const deferredHeaderProps = React.useDeferredValue(headerProps);
  const deferredFooterProps = React.useDeferredValue(footerProps);
  const deferredPrintOptionsProps = React.useDeferredValue(printOptionsProps);
  const deferredOrderInfoProps = React.useDeferredValue(orderInfoProps);
  const deferredBillTitle = React.useDeferredValue(billTitle);
  const deferredSeparatorLine = React.useDeferredValue(separatorLine);
  const deferredDoubleSeparatorLine = React.useDeferredValue(doubleSeparatorLine);

  return (
    <div className={className}>
      <div className="text-center text-xs text-muted-foreground mb-2">
        Xem truoc - {template.paperWidth || 80}mm
      </div>
      <div
        className={`bg-white p-4 border rounded-lg font-mono mx-auto shadow-sm ${fontSizeClass}`}
        style={{ width: previewWidth }}
      >
        {/* Header - Memoized component with deferred props */}
        <BillHeader {...deferredHeaderProps} />

        {/* Separator */}
        <p className="text-center text-muted-foreground my-1 overflow-hidden">
          {deferredDoubleSeparatorLine}
        </p>

        {/* Bill Title */}
        <p className="text-center font-bold">{deferredBillTitle}</p>

        {/* Order Info - Memoized component with deferred props */}
        <OrderInfo {...deferredOrderInfoProps} />

        {/* Separator */}
        <p className="text-center text-muted-foreground my-1 overflow-hidden">
          {deferredSeparatorLine}
        </p>

        {/* Items */}
        <div className="space-y-2 text-xs">
          {/* Item 1 */}
          <div>
            <div className="flex justify-between items-start">
              <span className="flex-1 font-medium">Pho bo tai nam</span>
              {template.showQuantity && <span className="text-xs bg-gray-200 px-1 rounded mx-1">x1</span>}
              {template.showUnitPrice && (
                <span>45,000</span>
              )}
            </div>
            {template.showItemCode && (
              <p className="text-xs text-muted-foreground">Ma: PHO-001</p>
            )}
            {template.showItemNote && (
              <p className="text-xs text-muted-foreground italic">It hanh, them gia</p>
            )}
          </div>

          {/* Item 2 - with discount */}
          <div>
            <div className="flex justify-between items-start">
              <span className="flex-1 font-medium">Ca phe sua da</span>
              {template.showQuantity && <span className="text-xs bg-gray-200 px-1 rounded mx-1">x3</span>}
              {template.showUnitPrice && (
                <span className={template.showItemDiscount ? "line-through text-muted-foreground" : ""}>
                  60,000
                </span>
              )}
            </div>
            {template.showItemDiscount && (
              <div className="flex justify-between text-xs text-green-600">
                <span>Giam 10%</span>
                <span>-6,000</span>
              </div>
            )}
            <div className="flex justify-end font-medium">
              <span>{template.showItemDiscount ? "54,000" : "60,000"}</span>
            </div>
          </div>

          {/* Item 3 */}
          <div>
            <div className="flex justify-between items-start">
              <span className="flex-1 font-medium">Banh mi thit</span>
              {template.showQuantity && <span className="text-xs bg-gray-200 px-1 rounded mx-1">x2</span>}
              {template.showUnitPrice && (
                <span>50,000</span>
              )}
            </div>
            {template.showItemCode && (
              <p className="text-xs text-muted-foreground">Ma: BM-003</p>
            )}
          </div>
        </div>

        {/* Separator */}
        <p className="text-center text-muted-foreground my-2 overflow-hidden">
          {deferredSeparatorLine}
        </p>

        {/* Subtotal & Discounts */}
        <div className="space-y-1 text-xs">
          {template.showSubtotal && (
            <div className="flex justify-between">
              <span>Tam tinh:</span>
              <span>149,000</span>
            </div>
          )}

          {template.showTotalItemDiscount && (
            <div className="flex justify-between text-green-600">
              <span>{template.itemDiscountLabel || "Giam gia mon"}:</span>
              <span>-6,000</span>
            </div>
          )}

          {template.showBillDiscount && (
            <div className="flex justify-between text-green-600">
              <span>
                {template.billDiscountLabel || "Giam gia hoa don"}{template.showDiscountPercent && " (10%)"}:
              </span>
              <span>-14,300</span>
            </div>
          )}

          {template.showCouponDiscount && (
            <div className="flex justify-between text-green-600">
              <span>{template.couponDiscountLabel || "Ma giam gia"} (MUAXUAN20):</span>
              <span>-20,000</span>
            </div>
          )}

          {template.showVoucherDiscount && (
            <div className="flex justify-between text-green-600">
              <span>{template.voucherDiscountLabel || "Voucher"} (VIP50K):</span>
              <span>-50,000</span>
            </div>
          )}

          {template.showTotalDiscount && (
            <div className="flex justify-between text-green-600 font-medium">
              <span>{template.totalDiscountLabel || "Tong giam gia"}:</span>
              <span>-90,300</span>
            </div>
          )}

          {template.showServiceFee && (
            <div className="flex justify-between">
              <span>Phi dich vu (5%):</span>
              <span>7,450</span>
            </div>
          )}

          {/* VAT Details */}
          {template.showVatDetails && (
            <>
              {template.showPriceBeforeVat && (
                <div className="flex justify-between">
                  <span>{template.priceBeforeVatLabel || "Gia truoc thue"}:</span>
                  <span>66,150</span>
                </div>
              )}
              {template.showVat && (
                <div className="flex justify-between">
                  <span>{template.vatLabel || "VAT"} (10%):</span>
                  <span>6,615</span>
                </div>
              )}
              {template.showPriceAfterVat && (
                <div className="flex justify-between">
                  <span>{template.priceAfterVatLabel || "Gia sau thue"}:</span>
                  <span>72,765</span>
                </div>
              )}
            </>
          )}

          {!template.showVatDetails && template.showVat && (
            <div className="flex justify-between">
              <span>{template.vatLabel || "VAT"} (10%):</span>
              <span>6,615</span>
            </div>
          )}
        </div>

        {/* Separator */}
        <p className="text-center text-muted-foreground my-2 overflow-hidden">
          {deferredDoubleSeparatorLine}
        </p>

        {/* Total */}
        <div className="flex justify-between font-bold text-lg">
          <span>TONG TIEN:</span>
          <span>72,765</span>
        </div>

        {/* Payment Info */}
        {template.showPaymentMethod && (
          <div className="flex justify-between text-xs mt-2">
            <span>Thanh toan:</span>
            <span>Tien mat</span>
          </div>
        )}

        {template.showReceivedAmount && (
          <div className="flex justify-between text-xs">
            <span>Tien nhan:</span>
            <span>100,000</span>
          </div>
        )}

        {template.showChangeAmount && (
          <div className="flex justify-between text-xs">
            <span>Tien tra lai:</span>
            <span>27,235</span>
          </div>
        )}

        {/* Order Note - Ghi chú tổng bill */}
        {template.showOrderNote && (
          <div className="border-t border-dashed pt-2 mt-2">
            <p className="text-xs font-medium">Ghi chu:</p>
            <p className="text-xs text-muted-foreground italic">Giao hang truoc 12h trua</p>
          </div>
        )}

        {/* QR Code */}
        {template.showQrCode && (
          <div className="text-center my-3">
            <div className="inline-block border-2 border-gray-300 p-2 rounded">
              <div className="w-16 h-16 bg-gray-200 flex items-center justify-center">
                <span className="text-xs">QR</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {template.qrCodeType === "order_id" && "Ma don hang"}
              {template.qrCodeType === "payment" && "Thanh toan"}
              {template.qrCodeType === "review" && "Danh gia"}
              {template.qrCodeType === "custom" && "Tuy chinh"}
            </p>
          </div>
        )}

        {/* Barcode */}
        {template.showBarcode && (
          <div className="text-center my-3">
            <div className="inline-block">
              <div className="h-8 w-32 bg-gray-300 flex items-center justify-center">
                <span className="text-xs">|||||||||||</span>
              </div>
              <p className="text-xs">*123456789*</p>
            </div>
          </div>
        )}

        {/* WiFi Info */}
        {template.showWifiInfo && template.wifiName && (
          <div className="text-center text-xs my-2 p-2 bg-gray-50 rounded">
            <p className="font-medium">WiFi</p>
            <p>
              WiFi: {template.wifiName} / {template.wifiPassword || "********"}
            </p>
          </div>
        )}

        {/* Footer - Memoized component with deferred props */}
        <BillFooter {...deferredFooterProps} />

        {/* Print Options Badges - Memoized component with deferred props */}
        <PrintOptions {...deferredPrintOptionsProps} />
      </div>
    </div>
  );
});
