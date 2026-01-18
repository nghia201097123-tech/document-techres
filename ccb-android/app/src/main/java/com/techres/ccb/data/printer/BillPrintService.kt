package com.techres.ccb.data.printer

import android.util.Log
import com.techres.ccb.data.local.entity.BillPrinterConfigEntity
import com.techres.ccb.data.local.entity.BillTemplateEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.text.DecimalFormat
import java.text.SimpleDateFormat
import java.util.*

/**
 * Bill Print Service - In bill CHÍNH XÁC theo mẫu preview trên web-dashboard
 *
 * Format giống y chang web preview:
 * 1. HEADER: [LOGO], tên cửa hàng, địa chỉ, SĐT, MST
 * 2. TIÊU ĐỀ: ═══ HÓA ĐƠN BÁN HÀNG ═══
 * 3. THÔNG TIN: Mã đơn, Bàn, NV, Khách hàng, Giờ
 * 4. DANH SÁCH MÓN:
 *    - Tên món                    x1
 *    - Giá gốc: 54,000
 *    - • NHIỀU
 *    - • Size L              +10,000
 *    - Mã: OLM01
 *    - Ghi chú: Ít đường
 *    - → Giảm 20%:           -36,000
 *    - Thành tiền:            64,000
 * 5. TỔNG:
 *    - Tạm tính (3 món):     254,000
 *    - Giảm giá món:         -36,000
 *    - Giảm giá hóa đơn (10%): -21,800
 *    - Mã giảm giá (MUAXUAN20): -20,000
 *    - Voucher (VIP50K):     -50,000
 *    - Tổng giảm giá:       -127,800
 *    - Phí dịch vụ (5%):      6,310
 *    - Giá trước thuế:      120,463
 *    - VAT (10%):            12,046
 *    - Giá sau thuế:        132,509
 *    ═══════════════════════════════
 *    TỔNG CỘNG:           132,500đ
 * 6. THANH TOÁN: Phương thức, Tiền khách, Tiền thừa
 * 7. FOOTER: QR, Barcode, WiFi, Lời cảm ơn
 */
object BillPrintService {
    private const val TAG = "BillPrintService"
    private val currencyFormat = DecimalFormat("#,###")

    suspend fun printBill(
        printerConfig: BillPrinterConfigEntity,
        template: BillTemplateEntity,
        billData: BillData
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            var lastError: String? = null

            repeat(printerConfig.retryCount) { attempt ->
                val result = when (printerConfig.connectionType) {
                    "network" -> printViaNetwork(printerConfig, template, billData)
                    "sunmi" -> printViaSunmi(template, billData)
                    else -> PrinterResult.Error("Loại kết nối không được hỗ trợ: ${printerConfig.connectionType}")
                }

                when (result) {
                    is PrinterResult.Success -> return@withContext result
                    is PrinterResult.Error -> {
                        lastError = result.message
                        Log.w(TAG, "Attempt ${attempt + 1} failed: ${result.message}")
                        if (attempt < printerConfig.retryCount - 1) {
                            delay(printerConfig.retryDelayMs.toLong())
                        }
                    }
                }
            }

            PrinterResult.Error(lastError ?: "In bill thất bại sau ${printerConfig.retryCount} lần thử")
        }
    }

    private suspend fun printViaNetwork(
        config: BillPrinterConfigEntity,
        template: BillTemplateEntity,
        billData: BillData
    ): PrinterResult {
        val ip = config.printerIp ?: return PrinterResult.Error("Chưa cấu hình IP máy in")

        var socket: Socket? = null
        var outputStream: OutputStream? = null

        return try {
            socket = Socket()
            socket.connect(InetSocketAddress(ip, config.printerPort), config.connectionTimeoutMs)
            outputStream = socket.getOutputStream()

            val billContent = generateBill(template, billData)
            outputStream.write(billContent)
            outputStream.flush()

            repeat(config.numberOfCopies - 1) {
                delay(500)
                outputStream.write(billContent)
                outputStream.flush()
            }

            PrinterResult.Success("In bill thành công!")
        } catch (e: Exception) {
            Log.e(TAG, "Print error: ${e.message}")
            PrinterResult.Error("Lỗi in: ${e.message}")
        } finally {
            try {
                outputStream?.close()
                socket?.close()
            } catch (e: Exception) {
                Log.e(TAG, "Close error: ${e.message}")
            }
        }
    }

    private fun printViaSunmi(template: BillTemplateEntity, billData: BillData): PrinterResult {
        return PrinterResult.Error("Sunmi printer chưa được hỗ trợ")
    }

    /**
     * Generate bill - CHÍNH XÁC theo web preview
     */
    private fun generateBill(template: BillTemplateEntity, billData: BillData): ByteArray {
        val b = EscPosBillBuilder(template.paperWidth)

        b.init()

        // ==================== 1. HEADER ====================
        b.center()

        // [LOGO]
        if (template.showLogo) {
            b.text("[LOGO]")
        }

        // Tên cửa hàng (to, đậm)
        b.doubleSize()
        b.bold()
        b.text(template.storeName)
        b.normal()

        // Địa chỉ
        template.storeAddress?.let { b.text(it) }

        // SĐT
        template.storePhone?.let { b.text("ĐT: $it") }

        // MST
        template.taxCode?.let { b.text("MST: $it") }

        // Header text tùy chỉnh
        template.headerText?.let { b.text(it) }

        // ==================== 2. TIÊU ĐỀ ====================
        b.doubleLine()
        b.doubleHeight()
        b.bold()
        b.text(template.billTitle)
        b.normal()
        b.doubleLine()

        // ==================== 3. THÔNG TIN ĐƠN ====================
        b.left()

        if (template.showOrderNumber) {
            b.text("Mã đơn: #${billData.orderNumber}")
        }

        if (template.showTableName && billData.tableName != null) {
            b.text("Bàn: ${billData.tableName}")
        }

        if (template.showStaffName && billData.staffName != null) {
            b.text("NV: ${billData.staffName}")
        }

        if (template.showCustomerName && billData.customerName != null) {
            b.text("Khách hàng: ${billData.customerName}")
        }

        if (template.showDateTime) {
            val df = SimpleDateFormat(template.dateFormat, Locale.getDefault())
            b.text("Giờ: ${df.format(billData.orderDate)}")
        }

        // Giờ vào/ra
        if (template.showCheckInTime && billData.checkInTime != null) {
            val tf = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault())
            b.text("${template.checkInLabel}: ${tf.format(billData.checkInTime)}")
        }

        if (template.showCheckOutTime && billData.checkOutTime != null) {
            val tf = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault())
            b.text("${template.checkOutLabel}: ${tf.format(billData.checkOutTime)}")
        }

        b.line()

        // ==================== 4. DANH SÁCH MÓN ====================
        billData.items.forEach { item ->
            // Tên món + badge số lượng (giống web: "Ô long macchiato    x1")
            if (template.showQuantity) {
                b.row(item.name, "x${item.quantity}")
            } else {
                b.bold()
                b.text(item.name)
                b.normal()
            }

            // Giá gốc
            if (template.showUnitPrice && item.basePrice > 0) {
                b.text("Giá gốc: ${fmt(item.basePrice)}")
            }

            // Variants (• NHIỀU, • Size L +10,000)
            item.variants.forEach { v ->
                if (v.priceAdjustment > 0) {
                    b.row("• ${v.name}", "+${fmt(v.priceAdjustment)}")
                } else {
                    b.text("• ${v.name}")
                }
            }

            // Toppings (+ Trân châu +5,000)
            item.toppings.forEach { t ->
                val qty = if (t.quantity > 1) " x${t.quantity}" else ""
                b.row("+ ${t.name}$qty", "+${fmt(t.price * t.quantity)}")
            }

            // Mã món
            if (template.showItemCode && item.code != null) {
                b.text("Mã: ${item.code}")
            }

            // Ghi chú
            if (template.showItemNote && item.note != null) {
                b.text("Ghi chú: ${item.note}")
            }

            // Giảm giá món (→ Giảm 20%: -36,000)
            if (template.showItemDiscount && item.discountAmount > 0) {
                val discountLabel = if (item.discountPercent > 0) {
                    "→ Giảm ${item.discountPercent.toInt()}%:"
                } else {
                    "→ ${template.itemDiscountLabel}:"
                }
                b.row(discountLabel, "-${fmt(item.discountAmount)}")
            }

            // Thành tiền (có thể hiện phép tính nếu SL > 1)
            val subtotalLabel = if (item.quantity > 1 && item.discountAmount > 0) {
                val unitAfterDiscount = item.totalPrice / item.quantity
                "Thành tiền (${item.quantity} x ${fmt(unitAfterDiscount)}):"
            } else {
                "Thành tiền:"
            }
            b.row(subtotalLabel, fmt(item.totalPrice))

            b.empty()
        }

        b.line()

        // ==================== 5. TỔNG TIỀN ====================

        // Tạm tính (3 món)
        if (template.showSubtotal) {
            b.row("Tạm tính (${billData.items.size} món):", fmt(billData.subtotal))
        }

        // 1. Giảm giá món
        if (template.showTotalItemDiscount && billData.itemDiscountAmount > 0) {
            b.row("${template.itemDiscountLabel}:", "-${fmt(billData.itemDiscountAmount)}")
        }

        // 2. Giảm giá hóa đơn (10%)
        if (template.showBillDiscount && billData.billDiscountAmount > 0) {
            val label = if (template.showDiscountPercent && billData.billDiscountPercent > 0) {
                "${template.billDiscountLabel} (${billData.billDiscountPercent.toInt()}%):"
            } else {
                "${template.billDiscountLabel}:"
            }
            b.row(label, "-${fmt(billData.billDiscountAmount)}")
        }

        // 3. Mã giảm giá (MUAXUAN20)
        if (template.showCouponDiscount && billData.couponDiscountAmount > 0) {
            val label = if (billData.couponCode != null) {
                "${template.couponDiscountLabel} (${billData.couponCode}):"
            } else {
                "${template.couponDiscountLabel}:"
            }
            b.row(label, "-${fmt(billData.couponDiscountAmount)}")
        }

        // 4. Voucher (VIP50K)
        if (template.showVoucherDiscount && billData.voucherDiscountAmount > 0) {
            val label = if (billData.voucherCode != null) {
                "${template.voucherDiscountLabel} (${billData.voucherCode}):"
            } else {
                "${template.voucherDiscountLabel}:"
            }
            b.row(label, "-${fmt(billData.voucherDiscountAmount)}")
        }

        // Tổng giảm giá (nếu có nhiều loại)
        if (template.showTotalDiscount && billData.totalDiscountAmount > 0) {
            val count = listOf(
                billData.itemDiscountAmount,
                billData.billDiscountAmount,
                billData.couponDiscountAmount,
                billData.voucherDiscountAmount
            ).count { it > 0 }
            if (count > 1) {
                b.row("${template.totalDiscountLabel}:", "-${fmt(billData.totalDiscountAmount)}")
            }
        }

        // Phí dịch vụ (5%)
        if (template.showServiceFee && billData.serviceFee > 0) {
            val feeLabel = if (billData.serviceFeePercent > 0) {
                "Phí dịch vụ (${billData.serviceFeePercent.toInt()}%):"
            } else {
                "Phí dịch vụ:"
            }
            b.row(feeLabel, fmt(billData.serviceFee))
        }

        // VAT chi tiết
        if (template.showVatDetails) {
            // Giá trước thuế
            if (template.showPriceBeforeVat) {
                b.row("${template.priceBeforeVatLabel}:", fmt(billData.priceBeforeVat))
            }
            // VAT (10%)
            if (template.showVat && billData.vatAmount > 0) {
                b.row("${template.vatLabel} (${billData.vatRate.toInt()}%):", fmt(billData.vatAmount))
            }
            // Giá sau thuế
            if (template.showPriceAfterVat) {
                b.row("${template.priceAfterVatLabel}:", fmt(billData.priceAfterVat))
            }
        } else if (template.showVat && billData.vatAmount > 0) {
            b.row("${template.vatLabel} (${billData.vatRate.toInt()}%):", fmt(billData.vatAmount))
        }

        b.doubleLine()

        // TỔNG CỘNG (to, đậm)
        b.doubleSize()
        b.bold()
        b.row("TỔNG CỘNG:", fmt(billData.totalAmount))
        b.normal()

        b.doubleLine()

        // ==================== 6. THANH TOÁN ====================
        if (template.showPaymentMethod) {
            b.row("Thanh toán:", billData.paymentMethod)
        }

        if (template.showReceivedAmount && billData.receivedAmount > 0) {
            b.row("Tiền khách:", fmt(billData.receivedAmount))
        }

        if (template.showChangeAmount && billData.changeAmount > 0) {
            b.row("Tiền thừa:", fmt(billData.changeAmount))
        }

        // ==================== GHI CHÚ TỔNG BILL ====================
        if (template.showOrderNote && billData.orderNote != null && billData.orderNote.isNotBlank()) {
            b.line()
            b.bold()
            b.text("Ghi chú:")
            b.normal()
            b.text(billData.orderNote)
        }

        b.line()

        // ==================== 7. FOOTER ====================
        b.center()

        // QR Code
        if (template.showQrCode) {
            b.feed(1)
            b.text("[QR CODE]")
            when (template.qrCodeType) {
                "order_id" -> b.text("Mã đơn hàng")
                "payment" -> b.text("Thanh toán")
                "review" -> b.text("Đánh giá")
                "custom" -> b.text("Tùy chỉnh")
            }
            b.qrCode(template.qrCodeContent ?: billData.orderNumber)
        }

        // Barcode
        if (template.showBarcode) {
            b.feed(1)
            b.text("||||| BARCODE |||||")
            b.barcode(billData.orderNumber)
        }

        // WiFi
        if (template.showWifiInfo && template.wifiName != null) {
            b.line()
            val wifiText = "WiFi: ${template.wifiName} / ${template.wifiPassword ?: "********"}"
            b.text(wifiText)
        }

        // Lời cảm ơn
        b.feed(1)
        b.bold()
        b.text(template.thankYouMessage)
        b.normal()
        b.text(template.comebackMessage)
        template.footerText?.let { b.text(it) }

        // Cắt giấy, mở két, beep
        b.feed(3)
        if (template.cutPaper) b.cut()
        if (template.openCashDrawer) b.openDrawer()
        if (template.beepAfterPrint) b.beep()

        return b.build()
    }

    private fun fmt(amount: Double): String = "${currencyFormat.format(amount.toLong())}"
    private fun fmt(amount: Long): String = "${currencyFormat.format(amount)}"
}

/**
 * ESC/POS Bill Builder - Tạo lệnh in ESC/POS
 */
class EscPosBillBuilder(paperWidth: Int) {
    private val buf = mutableListOf<Byte>()
    private val width = if (paperWidth == 58) 32 else 48
    private val sep = "-".repeat(width)
    private val doubleSep = "=".repeat(width)

    // ESC/POS Commands
    private val CMD_INIT = byteArrayOf(0x1B, 0x40)
    private val CMD_LEFT = byteArrayOf(0x1B, 0x61, 0x00)
    private val CMD_CENTER = byteArrayOf(0x1B, 0x61, 0x01)
    private val CMD_RIGHT = byteArrayOf(0x1B, 0x61, 0x02)
    private val CMD_NORMAL = byteArrayOf(0x1B, 0x21, 0x00)
    private val CMD_DOUBLE_H = byteArrayOf(0x1B, 0x21, 0x10)
    private val CMD_DOUBLE_W = byteArrayOf(0x1B, 0x21, 0x20)
    private val CMD_DOUBLE = byteArrayOf(0x1B, 0x21, 0x30)
    private val CMD_BOLD_ON = byteArrayOf(0x1B, 0x45, 0x01)
    private val CMD_BOLD_OFF = byteArrayOf(0x1B, 0x45, 0x00)
    private val CMD_LF = byteArrayOf(0x0A)
    private val CMD_CUT = byteArrayOf(0x1D, 0x56, 0x42, 0x00)
    private val CMD_DRAWER = byteArrayOf(0x1B, 0x70, 0x00, 0x19, 0x78)
    private val CMD_BEEP = byteArrayOf(0x1B, 0x42, 0x03, 0x02)
    private val CMD_UTF8 = byteArrayOf(0x1B, 0x74, 0xFF.toByte())
    private val CMD_CANCEL_CN = byteArrayOf(0x1C, 0x2E)

    fun init() = apply {
        buf.addAll(CMD_INIT.toList())
        buf.addAll(CMD_CANCEL_CN.toList())
        buf.addAll(CMD_UTF8.toList())
    }

    fun left() = apply { buf.addAll(CMD_LEFT.toList()) }
    fun center() = apply { buf.addAll(CMD_CENTER.toList()) }
    fun right() = apply { buf.addAll(CMD_RIGHT.toList()) }

    fun normal() = apply {
        buf.addAll(CMD_NORMAL.toList())
        buf.addAll(CMD_BOLD_OFF.toList())
    }

    fun bold() = apply { buf.addAll(CMD_BOLD_ON.toList()) }
    fun doubleHeight() = apply { buf.addAll(CMD_DOUBLE_H.toList()) }
    fun doubleWidth() = apply { buf.addAll(CMD_DOUBLE_W.toList()) }
    fun doubleSize() = apply { buf.addAll(CMD_DOUBLE.toList()) }

    fun text(s: String) = apply {
        buf.addAll(s.toByteArray(Charsets.UTF_8).toList())
        buf.addAll(CMD_LF.toList())
    }

    fun empty() = apply { buf.addAll(CMD_LF.toList()) }

    fun feed(n: Int) = apply { repeat(n) { buf.addAll(CMD_LF.toList()) } }

    fun line() = apply { text(sep) }

    fun doubleLine() = apply { text(doubleSep) }

    /**
     * In 2 cột: key bên trái, value bên phải
     */
    fun row(key: String, value: String) = apply {
        val spaces = width - key.length - value.length
        val line = if (spaces > 0) {
            key + " ".repeat(spaces) + value
        } else {
            "$key $value"
        }
        buf.addAll(line.toByteArray(Charsets.UTF_8).toList())
        buf.addAll(CMD_LF.toList())
    }

    fun cut() = apply { buf.addAll(CMD_CUT.toList()) }
    fun openDrawer() = apply { buf.addAll(CMD_DRAWER.toList()) }
    fun beep() = apply { buf.addAll(CMD_BEEP.toList()) }

    fun qrCode(content: String, size: Int = 6) = apply {
        buf.addAll(byteArrayOf(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00).toList())
        buf.addAll(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size.toByte()).toList())
        buf.addAll(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31).toList())
        val bytes = content.toByteArray(Charsets.UTF_8)
        val len = bytes.size + 3
        buf.addAll(byteArrayOf(0x1D, 0x28, 0x6B, (len and 0xFF).toByte(), ((len shr 8) and 0xFF).toByte(), 0x31, 0x50, 0x30).toList())
        buf.addAll(bytes.toList())
        buf.addAll(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30).toList())
    }

    fun barcode(content: String) = apply {
        buf.addAll(byteArrayOf(0x1D, 0x68, 0x50).toList())
        buf.addAll(byteArrayOf(0x1D, 0x77, 0x02).toList())
        buf.addAll(byteArrayOf(0x1D, 0x48, 0x02).toList())
        buf.addAll(byteArrayOf(0x1D, 0x6B, 0x49, content.length.toByte()).toList())
        buf.addAll(content.toByteArray(Charsets.UTF_8).toList())
    }

    fun build(): ByteArray = buf.toByteArray()
}

/**
 * Bill Data - Dữ liệu hóa đơn
 */
data class BillData(
    val orderNumber: String,
    val orderDate: Date,
    val tableName: String? = null,
    val staffName: String? = null,
    val customerName: String? = null,
    val items: List<BillItem>,
    val subtotal: Double,
    // 4 loại giảm giá
    val itemDiscountAmount: Double = 0.0,
    val billDiscountAmount: Double = 0.0,
    val billDiscountPercent: Double = 0.0,
    val couponDiscountAmount: Double = 0.0,
    val couponCode: String? = null,
    val voucherDiscountAmount: Double = 0.0,
    val voucherCode: String? = null,
    val totalDiscountAmount: Double = 0.0,
    // Legacy discount fields (for HybridBillPrintService)
    val discountAmount: Double = 0.0,
    val discountPercent: Double = 0.0,
    val totalItemDiscount: Double = 0.0,
    // Phí và thuế
    val surchargeAmount: Double = 0.0, // Phụ thu
    val serviceFee: Double = 0.0,
    val serviceFeePercent: Double = 0.0,
    val vatRate: Double = 10.0,
    val vatAmount: Double,
    val priceBeforeVat: Double,
    val priceAfterVat: Double,
    val totalAmount: Double,
    // Thanh toán
    val paymentMethod: String = "Tiền mặt",
    val receivedAmount: Double = 0.0,
    val changeAmount: Double = 0.0,
    // Time tracking
    val checkInTime: Date? = null,
    val checkOutTime: Date? = null,
    // Order note - Ghi chú tổng bill
    val orderNote: String? = null,
    // Temporary bill
    val isTemporaryBill: Boolean = false,
    val printCount: Int = 0,
    val printTime: Date? = null,
    // Reprint marker - để đánh dấu bill được in lại (tránh gian lận)
    val isReprint: Boolean = false,
    val reprintTime: Date? = null,
    val reprintReason: String? = null
)

/**
 * Bill Item - Thông tin món
 */
data class BillItem(
    val code: String? = null,
    val name: String,
    val quantity: Int,
    val unitPrice: Double,
    val basePrice: Double = 0.0,
    val originalPrice: Double = 0.0,
    val discountAmount: Double = 0.0,
    val discountPercent: Double = 0.0,
    val discountType: String = "fixed", // "fixed" (tiền mặt) hoặc "percent" (phần trăm)
    val totalPrice: Double,
    val note: String? = null,
    val variants: List<BillVariant> = emptyList(),
    val toppings: List<BillTopping> = emptyList(),
    val vatRate: Double = 8.0
)

data class BillVariant(
    val name: String,
    val priceAdjustment: Double = 0.0
)

data class BillTopping(
    val name: String,
    val price: Double,
    val quantity: Int = 1
)
