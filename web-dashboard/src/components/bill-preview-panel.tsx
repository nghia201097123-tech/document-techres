"use client";

import * as React from "react";
import { CreateBillTemplateDto } from "@/services/bill-template-service";

interface BillPreviewPanelProps {
  template: Partial<CreateBillTemplateDto>;
  className?: string;
}

/**
 * Bill Preview Panel - Shows a live preview of the bill template
 * Renders a visual representation of how the bill will look when printed
 */
export function BillPreviewPanel({ template, className }: BillPreviewPanelProps) {
  // Calculate preview width based on paper width
  const getPreviewWidth = () => {
    const paperWidth = template.paperWidth || 80;
    if (paperWidth <= 58) return "200px";
    if (paperWidth <= 80) return "280px";
    return "350px";
  };

  // Get font size class
  const getFontSizeClass = () => {
    switch (template.fontSize) {
      case "small": return "text-xs";
      case "large": return "text-base";
      default: return "text-sm";
    }
  };

  const separator = template.separatorChar || "-";
  const doubleSeparator = template.doubleSeparatorChar || "=";

  return (
    <div className={className}>
      <div className="text-center text-xs text-muted-foreground mb-2">
        Xem trước • {template.paperWidth || 80}mm
      </div>
      <div
        className={`bg-white p-4 border rounded-lg font-mono mx-auto shadow-sm ${getFontSizeClass()}`}
        style={{ width: getPreviewWidth() }}
      >
          {/* Header */}
          <div className="text-center mb-2">
            {template.showLogo && (
              <div className="text-2xl mb-1">🏪</div>
            )}
            <p className="font-bold text-base">{template.storeName || "TÊN CỬA HÀNG"}</p>
            {template.storeAddress && (
              <p className="text-xs">{template.storeAddress}</p>
            )}
            {template.storePhone && (
              <p className="text-xs">ĐT: {template.storePhone}</p>
            )}
            {template.taxCode && (
              <p className="text-xs">MST: {template.taxCode}</p>
            )}
            {template.headerText && (
              <p className="text-xs">{template.headerText}</p>
            )}
          </div>

          {/* Separator */}
          <p className="text-center text-muted-foreground my-1 overflow-hidden">
            {doubleSeparator.repeat(30)}
          </p>

          {/* Bill Title */}
          <p className="text-center font-bold">{template.billTitle || "HÓA ĐƠN BÁN HÀNG"}</p>

          {/* Order Info */}
          <div className="text-xs my-2">
            {template.showOrderNumber && <p>Mã đơn: #123456</p>}
            {template.showTableName && <p>Bàn: A01</p>}
            {template.showStaffName && <p>NV: Nguyễn Văn A</p>}
            {template.showCustomerName && <p>Khách hàng: Trần Văn B</p>}
            {template.showDateTime && <p>Giờ: 15:30 01/01/2024</p>}
            {template.showCheckInTime && <p>{template.checkInLabel || "Giờ vào"}: 14:00</p>}
            {template.showCheckOutTime && <p>{template.checkOutLabel || "Giờ ra"}: 15:30</p>}
          </div>

          {/* Separator */}
          <p className="text-center text-muted-foreground my-1 overflow-hidden">
            {separator.repeat(30)}
          </p>

          {/* Items */}
          <div className="space-y-2 text-xs">
            {/* Item 1 */}
            <div>
              <div className="flex justify-between items-start">
                <span className="flex-1 font-medium">Phở bò tái nạm</span>
                {template.showQuantity && <span className="text-xs bg-gray-200 px-1 rounded mx-1">x1</span>}
                {template.showUnitPrice && (
                  <span>45,000</span>
                )}
              </div>
              {template.showItemCode && (
                <p className="text-xs text-muted-foreground">Mã: PHO-001</p>
              )}
              {template.showItemNote && (
                <p className="text-xs text-muted-foreground italic">Ít hành, thêm giá</p>
              )}
            </div>

            {/* Item 2 - with discount */}
            <div>
              <div className="flex justify-between items-start">
                <span className="flex-1 font-medium">Cà phê sữa đá</span>
                {template.showQuantity && <span className="text-xs bg-gray-200 px-1 rounded mx-1">x3</span>}
                {template.showUnitPrice && (
                  <span className={template.showItemDiscount ? "line-through text-muted-foreground" : ""}>
                    60,000
                  </span>
                )}
              </div>
              {template.showItemDiscount && (
                <div className="flex justify-between text-xs text-green-600">
                  <span>Giảm 10%</span>
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
                <span className="flex-1 font-medium">Bánh mì thịt</span>
                {template.showQuantity && <span className="text-xs bg-gray-200 px-1 rounded mx-1">x2</span>}
                {template.showUnitPrice && (
                  <span>50,000</span>
                )}
              </div>
              {template.showItemCode && (
                <p className="text-xs text-muted-foreground">Mã: BM-003</p>
              )}
            </div>
          </div>

          {/* Separator */}
          <p className="text-center text-muted-foreground my-2 overflow-hidden">
            {separator.repeat(30)}
          </p>

          {/* Subtotal & Discounts */}
          <div className="space-y-1 text-xs">
            {template.showSubtotal && (
              <div className="flex justify-between">
                <span>Tạm tính:</span>
                <span>149,000</span>
              </div>
            )}

            {template.showTotalItemDiscount && (
              <div className="flex justify-between text-green-600">
                <span>{template.itemDiscountLabel || "Giảm giá món"}:</span>
                <span>-6,000</span>
              </div>
            )}

            {template.showBillDiscount && (
              <div className="flex justify-between text-green-600">
                <span>
                  {template.billDiscountLabel || "Giảm giá hóa đơn"}{template.showDiscountPercent && " (10%)"}:
                </span>
                <span>-14,300</span>
              </div>
            )}

            {template.showCouponDiscount && (
              <div className="flex justify-between text-green-600">
                <span>{template.couponDiscountLabel || "Mã giảm giá"} (MUAXUAN20):</span>
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
                <span>{template.totalDiscountLabel || "Tổng giảm giá"}:</span>
                <span>-90,300</span>
              </div>
            )}

            {template.showServiceFee && (
              <div className="flex justify-between">
                <span>Phí dịch vụ (5%):</span>
                <span>7,450</span>
              </div>
            )}

            {/* VAT Details */}
            {template.showVatDetails && (
              <>
                {template.showPriceBeforeVat && (
                  <div className="flex justify-between">
                    <span>{template.priceBeforeVatLabel || "Giá trước thuế"}:</span>
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
                    <span>{template.priceAfterVatLabel || "Giá sau thuế"}:</span>
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
            {doubleSeparator.repeat(30)}
          </p>

          {/* Total */}
          <div className="flex justify-between font-bold text-lg">
            <span>TỔNG TIỀN:</span>
            <span>72,765</span>
          </div>

          {/* Payment Info */}
          {template.showPaymentMethod && (
            <div className="flex justify-between text-xs mt-2">
              <span>Thanh toán:</span>
              <span>Tiền mặt</span>
            </div>
          )}

          {template.showReceivedAmount && (
            <div className="flex justify-between text-xs">
              <span>Tiền nhận:</span>
              <span>100,000</span>
            </div>
          )}

          {template.showChangeAmount && (
            <div className="flex justify-between text-xs">
              <span>Tiền trả lại:</span>
              <span>27,235</span>
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
                {template.qrCodeType === "order_id" && "Mã đơn hàng"}
                {template.qrCodeType === "payment" && "Thanh toán"}
                {template.qrCodeType === "review" && "Đánh giá"}
                {template.qrCodeType === "custom" && "Tùy chỉnh"}
              </p>
            </div>
          )}

          {/* Barcode */}
          {template.showBarcode && (
            <div className="text-center my-3">
              <div className="inline-block">
                <div className="h-8 w-32 bg-gradient-to-r from-black via-white to-black bg-[length:4px_100%] bg-repeat-x"></div>
                <p className="text-xs">*123456789*</p>
              </div>
            </div>
          )}

          {/* WiFi Info */}
          {template.showWifiInfo && template.wifiName && (
            <div className="text-center text-xs my-2 p-2 bg-gray-50 rounded">
              <p className="font-medium">📶 WiFi</p>
              <p>
                WiFi: {template.wifiName} / {template.wifiPassword || "********"}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-3 space-y-1">
            <p className="font-medium">{template.thankYouMessage || "Cảm ơn quý khách!"}</p>
            <p className="text-xs">{template.comebackMessage || "Hẹn gặp lại!"}</p>
            {template.footerText && (
              <p className="text-xs text-muted-foreground">{template.footerText}</p>
            )}
          </div>

          {/* Print Options Badges */}
          <div className="flex flex-wrap gap-1 justify-center mt-3 text-xs">
            {template.cutPaper && <span className="bg-gray-100 px-1 rounded">✂️ Cắt giấy</span>}
            {template.openCashDrawer && <span className="bg-gray-100 px-1 rounded">💰 Mở két</span>}
            {template.beepAfterPrint && <span className="bg-gray-100 px-1 rounded">🔔 Beep</span>}
            {(template.numberOfCopies || 1) > 1 && <span className="bg-gray-100 px-1 rounded">📄 x{template.numberOfCopies}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
