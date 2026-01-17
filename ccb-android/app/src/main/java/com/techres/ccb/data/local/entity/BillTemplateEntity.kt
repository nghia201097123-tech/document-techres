package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Bill Template Entity - Mẫu hóa đơn
 *
 * Các mẫu bill có thể cấu hình từ web-dashboard:
 * - classic: Mẫu truyền thống
 * - modern: Mẫu hiện đại, tối giản
 * - compact: Mẫu thu gọn
 * - detailed: Mẫu chi tiết với VAT từng món
 * - premium: Mẫu cao cấp với logo, QR
 */
@Entity(
    tableName = "bill_templates",
    indices = [
        Index(value = ["branch_id"]),
        Index(value = ["is_active"]),
        Index(value = ["is_default"])
    ]
)
data class BillTemplateEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "branch_id")
    val branchId: String,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "template_type")
    val templateType: String = "classic", // classic, modern, compact, detailed, premium

    @ColumnInfo(name = "description")
    val description: String? = null,

    // ============ HEADER CONFIG ============
    @ColumnInfo(name = "show_logo")
    val showLogo: Boolean = true,

    @ColumnInfo(name = "logo_url")
    val logoUrl: String? = null,

    @ColumnInfo(name = "store_name")
    val storeName: String,

    @ColumnInfo(name = "store_address")
    val storeAddress: String? = null,

    @ColumnInfo(name = "store_phone")
    val storePhone: String? = null,

    @ColumnInfo(name = "tax_code")
    val taxCode: String? = null,

    @ColumnInfo(name = "header_text")
    val headerText: String? = null,

    // ============ CONTENT CONFIG ============
    @ColumnInfo(name = "bill_title")
    val billTitle: String = "HÓA ĐƠN BÁN HÀNG",

    @ColumnInfo(name = "show_order_number")
    val showOrderNumber: Boolean = true,

    @ColumnInfo(name = "show_table_name")
    val showTableName: Boolean = true,

    @ColumnInfo(name = "show_staff_name")
    val showStaffName: Boolean = true,

    @ColumnInfo(name = "show_customer_name")
    val showCustomerName: Boolean = true,

    @ColumnInfo(name = "show_date_time")
    val showDateTime: Boolean = true,

    @ColumnInfo(name = "date_format")
    val dateFormat: String = "dd/MM/yyyy HH:mm",

    // ============ TIME TRACKING CONFIG ============
    @ColumnInfo(name = "show_check_in_time")
    val showCheckInTime: Boolean = false, // Giờ vào

    @ColumnInfo(name = "show_check_out_time")
    val showCheckOutTime: Boolean = false, // Giờ ra

    @ColumnInfo(name = "check_in_label")
    val checkInLabel: String = "Giờ vào",

    @ColumnInfo(name = "check_out_label")
    val checkOutLabel: String = "Giờ ra",

    // ============ ITEMS CONFIG ============
    @ColumnInfo(name = "show_item_code")
    val showItemCode: Boolean = false,

    @ColumnInfo(name = "show_item_note")
    val showItemNote: Boolean = true,

    @ColumnInfo(name = "show_order_note")
    val showOrderNote: Boolean = true, // Hiển thị ghi chú tổng bill

    @ColumnInfo(name = "show_unit_price")
    val showUnitPrice: Boolean = true,

    @ColumnInfo(name = "show_quantity")
    val showQuantity: Boolean = true,

    // ============ PRICE CONFIG ============
    @ColumnInfo(name = "show_subtotal")
    val showSubtotal: Boolean = true,

    // ============ DISCOUNT CONFIG (4 loại giảm giá) ============
    // 1. Giảm giá món (Item Discount) - ưu tiên 1
    @ColumnInfo(name = "show_item_discount")
    val showItemDiscount: Boolean = true, // Hiển thị giảm giá trên từng món

    @ColumnInfo(name = "show_total_item_discount")
    val showTotalItemDiscount: Boolean = true, // Hiển thị tổng giảm giá các món

    @ColumnInfo(name = "item_discount_label")
    val itemDiscountLabel: String = "Giảm giá món",

    // 2. Giảm giá hóa đơn (Bill Discount) - ưu tiên 2
    @ColumnInfo(name = "show_bill_discount")
    val showBillDiscount: Boolean = true,

    @ColumnInfo(name = "bill_discount_label")
    val billDiscountLabel: String = "Giảm giá hóa đơn",

    // 3. Coupon - ưu tiên 3
    @ColumnInfo(name = "show_coupon_discount")
    val showCouponDiscount: Boolean = true,

    @ColumnInfo(name = "coupon_discount_label")
    val couponDiscountLabel: String = "Mã giảm giá",

    // 4. Voucher - ưu tiên 4
    @ColumnInfo(name = "show_voucher_discount")
    val showVoucherDiscount: Boolean = true,

    @ColumnInfo(name = "voucher_discount_label")
    val voucherDiscountLabel: String = "Voucher",

    // Tổng giảm giá (hiển thị tổng tất cả loại giảm giá)
    @ColumnInfo(name = "show_total_discount")
    val showTotalDiscount: Boolean = true,

    @ColumnInfo(name = "total_discount_label")
    val totalDiscountLabel: String = "Tổng giảm giá",

    // Deprecated - giữ lại để tương thích ngược
    @ColumnInfo(name = "show_discount")
    val showDiscount: Boolean = true,

    @ColumnInfo(name = "show_discount_percent")
    val showDiscountPercent: Boolean = true,

    @ColumnInfo(name = "show_service_fee")
    val showServiceFee: Boolean = true,

    @ColumnInfo(name = "show_vat")
    val showVat: Boolean = true,

    @ColumnInfo(name = "show_vat_details")
    val showVatDetails: Boolean = true,

    @ColumnInfo(name = "show_price_before_vat")
    val showPriceBeforeVat: Boolean = true,

    @ColumnInfo(name = "show_price_after_vat")
    val showPriceAfterVat: Boolean = true,

    @ColumnInfo(name = "vat_label")
    val vatLabel: String = "VAT",

    @ColumnInfo(name = "price_before_vat_label")
    val priceBeforeVatLabel: String = "Giá trước thuế",

    @ColumnInfo(name = "price_after_vat_label")
    val priceAfterVatLabel: String = "Giá sau thuế",

    // ============ PAYMENT CONFIG ============
    @ColumnInfo(name = "show_payment_method")
    val showPaymentMethod: Boolean = true,

    @ColumnInfo(name = "show_received_amount")
    val showReceivedAmount: Boolean = true,

    @ColumnInfo(name = "show_change_amount")
    val showChangeAmount: Boolean = true,

    // ============ FOOTER CONFIG ============
    @ColumnInfo(name = "show_qr_code")
    val showQrCode: Boolean = false,

    @ColumnInfo(name = "qr_code_type")
    val qrCodeType: String = "order_id", // order_id, payment, review, custom

    @ColumnInfo(name = "qr_code_content")
    val qrCodeContent: String? = null,

    @ColumnInfo(name = "show_barcode")
    val showBarcode: Boolean = false,

    @ColumnInfo(name = "thank_you_message")
    val thankYouMessage: String = "Cảm ơn quý khách!",

    @ColumnInfo(name = "comeback_message")
    val comebackMessage: String = "Hẹn gặp lại!",

    @ColumnInfo(name = "footer_text")
    val footerText: String? = null,

    @ColumnInfo(name = "show_wifi_info")
    val showWifiInfo: Boolean = false,

    @ColumnInfo(name = "wifi_name")
    val wifiName: String? = null,

    @ColumnInfo(name = "wifi_password")
    val wifiPassword: String? = null,

    // ============ STYLE CONFIG ============
    @ColumnInfo(name = "paper_width")
    val paperWidth: Int = 80, // 58 hoặc 80mm

    @ColumnInfo(name = "font_size")
    val fontSize: String = "normal", // small, normal, large

    @ColumnInfo(name = "separator_char")
    val separatorChar: String = "-",

    @ColumnInfo(name = "double_separator_char")
    val doubleSeparatorChar: String = "=",

    @ColumnInfo(name = "cut_paper")
    val cutPaper: Boolean = true,

    @ColumnInfo(name = "open_cash_drawer")
    val openCashDrawer: Boolean = false,

    @ColumnInfo(name = "beep_after_print")
    val beepAfterPrint: Boolean = false,

    @ColumnInfo(name = "number_of_copies")
    val numberOfCopies: Int = 1,

    // ============ STATUS ============
    @ColumnInfo(name = "is_default")
    val isDefault: Boolean = false,

    @ColumnInfo(name = "is_active")
    val isActive: Boolean = true,

    @ColumnInfo(name = "sort_order")
    val sortOrder: Int = 0,

    @ColumnInfo(name = "created_at")
    val createdAt: String,

    @ColumnInfo(name = "updated_at")
    val updatedAt: String,

    // Sync fields
    @ColumnInfo(name = "sync_status")
    val syncStatus: String = "synced",

    @ColumnInfo(name = "synced_at")
    val syncedAt: String? = null
)

/**
 * Enum for template types
 */
enum class BillTemplateType(val value: String) {
    CLASSIC("classic"),
    MODERN("modern"),
    COMPACT("compact"),
    DETAILED("detailed"),
    PREMIUM("premium")
}
