package com.techres.ccb.data.printer

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
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
 * Bill Print Service - In bill theo đúng mẫu cấu hình trên web-dashboard
 *
 * Format bill giống y hệt preview trên web:
 * 1. HEADER: Logo, tên cửa hàng, địa chỉ, SĐT, MST, header text
 * 2. TIÊU ĐỀ: Bill title với đường kẻ đôi
 * 3. THÔNG TIN ĐƠN: Mã đơn, bàn, NV, khách hàng, giờ, giờ vào/ra
 * 4. DANH SÁCH MÓN: Tên + SL, giá gốc, variants, toppings, ghi chú, giảm giá món, thành tiền
 * 5. TỔNG TIỀN: Tạm tính, 4 loại giảm giá, phí dịch vụ, VAT, tổng cộng
 * 6. THANH TOÁN: Phương thức, tiền khách, tiền thừa
 * 7. FOOTER: QR, barcode, WiFi, lời cảm ơn
 */
object BillPrintService {
    private const val TAG = "BillPrintService"
    private val currencyFormat = DecimalFormat("#,###")

    /**
     * In bill với template và config được cấu hình
     */
    suspend fun printBill(
        printerConfig: BillPrinterConfigEntity,
        template: BillTemplateEntity,
        billData: BillData
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            var lastError: String? = null

            // Retry logic
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

    /**
     * In bill qua Network (TCP/IP)
     */
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

            // Generate and send bill content
            val billContent = generateBill(template, billData)
            outputStream.write(billContent)
            outputStream.flush()

            // Print multiple copies if configured
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

    /**
     * In bill qua Sunmi built-in printer
     */
    private fun printViaSunmi(template: BillTemplateEntity, billData: BillData): PrinterResult {
        // TODO: Implement Sunmi printing via AIDL
        return PrinterResult.Error("Sunmi printer chưa được hỗ trợ")
    }

    /**
     * Generate bill content - format giống y hệt preview trên web-dashboard
     */
    private fun generateBill(template: BillTemplateEntity, billData: BillData): ByteArray {
        val builder = BillBuilder(template.paperWidth)
        val sep = template.separatorChar.repeat(builder.lineWidth)
        val doubleSep = template.doubleSeparatorChar.repeat(builder.lineWidth)

        builder.apply {
            init()

            // ============ 1. HEADER ============
            alignCenter()

            // Logo
            if (template.showLogo && template.logoUrl != null) {
                line("[LOGO]")
            }

            // Tên cửa hàng (in đậm, to)
            textDoubleSize()
            bold()
            line(template.storeName)
            normalSize()
            boldOff()

            // Địa chỉ
            if (template.storeAddress != null) {
                line(template.storeAddress)
            }

            // Số điện thoại
            if (template.storePhone != null) {
                line("ĐT: ${template.storePhone}")
            }

            // Mã số thuế
            if (template.taxCode != null) {
                line("MST: ${template.taxCode}")
            }

            // Header text tùy chỉnh
            if (template.headerText != null) {
                line(template.headerText)
            }

            // ============ 2. TIÊU ĐỀ BILL ============
            line(doubleSep)
            textDoubleHeight()
            bold()
            line(template.billTitle)
            normalSize()
            boldOff()
            line(doubleSep)

            // ============ 3. THÔNG TIN ĐƠN HÀNG ============
            alignLeft()

            // Mã đơn
            if (template.showOrderNumber) {
                line("Mã đơn: #${billData.orderNumber}")
            }

            // Tên bàn
            if (template.showTableName && billData.tableName != null) {
                line("Bàn: ${billData.tableName}")
            }

            // Nhân viên
            if (template.showStaffName && billData.staffName != null) {
                line("NV: ${billData.staffName}")
            }

            // Khách hàng
            if (template.showCustomerName && billData.customerName != null) {
                line("Khách hàng: ${billData.customerName}")
            }

            // Ngày giờ
            if (template.showDateTime) {
                val dateFormat = SimpleDateFormat(template.dateFormat, Locale.getDefault())
                line("Giờ: ${dateFormat.format(billData.orderDate)}")
            }

            // Giờ vào (check-in)
            if (template.showCheckInTime && billData.checkInTime != null) {
                val timeFormat = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault())
                line("${template.checkInLabel}: ${timeFormat.format(billData.checkInTime)}")
            }

            // Giờ ra (check-out)
            if (template.showCheckOutTime && billData.checkOutTime != null) {
                val timeFormat = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault())
                line("${template.checkOutLabel}: ${timeFormat.format(billData.checkOutTime)}")
            }

            line(sep)

            // ============ 4. DANH SÁCH MÓN ============
            billData.items.forEach { item ->
                // Tên món + số lượng
                val itemHeader = if (template.showQuantity) {
                    "${item.name} x${item.quantity}"
                } else {
                    item.name
                }
                bold()
                line(itemHeader)
                boldOff()

                // Giá gốc
                if (template.showUnitPrice && item.basePrice > 0) {
                    line("  Giá gốc: ${formatCurrency(item.basePrice)}")
                }

                // Variants (Size, Đá, Đường...)
                item.variants.forEach { variant ->
                    if (variant.priceAdjustment > 0) {
                        lineKeyValue("  • ${variant.name}", "+${formatCurrency(variant.priceAdjustment)}")
                    } else {
                        line("  • ${variant.name}")
                    }
                }

                // Toppings (thêm)
                item.toppings.forEach { topping ->
                    val toppingQty = if (topping.quantity > 1) " x${topping.quantity}" else ""
                    lineKeyValue("  + ${topping.name}$toppingQty", "+${formatCurrency(topping.price * topping.quantity)}")
                }

                // Mã món
                if (template.showItemCode && item.code != null) {
                    line("  Mã: ${item.code}")
                }

                // Ghi chú món
                if (template.showItemNote && item.note != null) {
                    line("  Ghi chú: ${item.note}")
                }

                // Giảm giá món (nếu có)
                if (template.showItemDiscount && item.discountAmount > 0) {
                    val discountText = if (item.discountPercent > 0) {
                        "  → ${template.itemDiscountLabel} (${item.discountPercent.toInt()}%)"
                    } else {
                        "  → ${template.itemDiscountLabel}"
                    }
                    lineKeyValue(discountText, "-${formatCurrency(item.discountAmount)}")
                }

                // Thành tiền
                line("  " + "-".repeat(lineWidth - 4))
                bold()
                lineKeyValue("  Thành tiền:", formatCurrency(item.totalPrice))
                boldOff()

                line("")  // Dòng trống giữa các món
            }

            line(sep)

            // ============ 5. TỔNG TIỀN ============
            alignRight()

            // Tạm tính
            if (template.showSubtotal) {
                lineKeyValue("Tạm tính (${billData.items.size} món):", formatCurrency(billData.subtotal))
            }

            // --- 4 LOẠI GIẢM GIÁ (theo đúng thứ tự trên web) ---

            // 1. Giảm giá món (tổng)
            if (template.showTotalItemDiscount && billData.itemDiscountAmount > 0) {
                lineKeyValue("${template.itemDiscountLabel}:", "-${formatCurrency(billData.itemDiscountAmount)}")
            }

            // 2. Giảm giá hóa đơn
            if (template.showBillDiscount && billData.billDiscountAmount > 0) {
                val label = if (template.showDiscountPercent && billData.billDiscountPercent > 0) {
                    "${template.billDiscountLabel} (${billData.billDiscountPercent.toInt()}%)"
                } else {
                    template.billDiscountLabel
                }
                lineKeyValue("$label:", "-${formatCurrency(billData.billDiscountAmount)}")
            }

            // 3. Mã giảm giá (Coupon)
            if (template.showCouponDiscount && billData.couponDiscountAmount > 0) {
                val label = if (billData.couponCode != null) {
                    "${template.couponDiscountLabel} (${billData.couponCode})"
                } else {
                    template.couponDiscountLabel
                }
                lineKeyValue("$label:", "-${formatCurrency(billData.couponDiscountAmount)}")
            }

            // 4. Voucher
            if (template.showVoucherDiscount && billData.voucherDiscountAmount > 0) {
                val label = if (billData.voucherCode != null) {
                    "${template.voucherDiscountLabel} (${billData.voucherCode})"
                } else {
                    template.voucherDiscountLabel
                }
                lineKeyValue("$label:", "-${formatCurrency(billData.voucherDiscountAmount)}")
            }

            // Tổng giảm giá (nếu có nhiều loại)
            if (template.showTotalDiscount && billData.totalDiscountAmount > 0) {
                val discountCount = listOf(
                    billData.itemDiscountAmount,
                    billData.billDiscountAmount,
                    billData.couponDiscountAmount,
                    billData.voucherDiscountAmount
                ).count { it > 0 }

                if (discountCount > 1) {
                    line("-".repeat(lineWidth / 2))
                    bold()
                    lineKeyValue("${template.totalDiscountLabel}:", "-${formatCurrency(billData.totalDiscountAmount)}")
                    boldOff()
                }
            }

            // Phí dịch vụ
            if (template.showServiceFee && billData.serviceFee > 0) {
                lineKeyValue("Phí dịch vụ:", formatCurrency(billData.serviceFee))
            }

            // VAT (chi tiết hoặc đơn giản)
            if (template.showVatDetails) {
                if (template.showPriceBeforeVat) {
                    lineKeyValue("${template.priceBeforeVatLabel}:", formatCurrency(billData.priceBeforeVat))
                }
                if (template.showVat && billData.vatAmount > 0) {
                    lineKeyValue("${template.vatLabel} (${billData.vatRate.toInt()}%):", formatCurrency(billData.vatAmount))
                }
                if (template.showPriceAfterVat) {
                    lineKeyValue("${template.priceAfterVatLabel}:", formatCurrency(billData.priceAfterVat))
                }
            } else if (template.showVat && billData.vatAmount > 0) {
                lineKeyValue("${template.vatLabel} (${billData.vatRate.toInt()}%):", formatCurrency(billData.vatAmount))
            }

            line(doubleSep)

            // TỔNG CỘNG (in to, đậm)
            textDoubleSize()
            bold()
            lineKeyValue("TỔNG CỘNG:", formatCurrency(billData.totalAmount))
            normalSize()
            boldOff()

            line(doubleSep)

            // ============ 6. THANH TOÁN ============
            if (template.showPaymentMethod) {
                lineKeyValue("Thanh toán:", billData.paymentMethod)
            }
            if (template.showReceivedAmount && billData.receivedAmount > 0) {
                lineKeyValue("Tiền khách:", formatCurrency(billData.receivedAmount))
            }
            if (template.showChangeAmount && billData.changeAmount > 0) {
                lineKeyValue("Tiền thừa:", formatCurrency(billData.changeAmount))
            }

            line(sep)

            // ============ 7. FOOTER ============
            alignCenter()

            // QR Code
            if (template.showQrCode) {
                feed(1)
                val qrContent = when (template.qrCodeType) {
                    "order_id" -> billData.orderNumber
                    "custom" -> template.qrCodeContent ?: billData.orderNumber
                    else -> billData.orderNumber
                }
                qrCode(qrContent)
            }

            // Barcode
            if (template.showBarcode) {
                feed(1)
                barcode(billData.orderNumber)
            }

            // WiFi
            if (template.showWifiInfo && template.wifiName != null) {
                line(sep)
                line("WiFi: ${template.wifiName}")
                if (template.wifiPassword != null) {
                    line("Pass: ${template.wifiPassword}")
                }
            }

            // Lời cảm ơn
            feed(1)
            line(template.thankYouMessage)
            line(template.comebackMessage)
            if (template.footerText != null) {
                line(template.footerText)
            }

            // Cắt giấy
            feed(3)
            if (template.cutPaper) {
                cut()
            }

            // Mở két tiền
            if (template.openCashDrawer) {
                openDrawer()
            }

            // Beep
            if (template.beepAfterPrint) {
                beep()
            }
        }

        return builder.build()
    }

    /**
     * Format currency (VND)
     */
    private fun formatCurrency(amount: Double): String {
        return "${currencyFormat.format(amount)}đ"
    }

    private fun formatCurrency(amount: Long): String {
        return "${currencyFormat.format(amount)}đ"
    }
}

/**
 * Bill Data - Dữ liệu hóa đơn để in
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
    // Phí và thuế
    val serviceFee: Double = 0.0,
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
    // Legacy support
    val discountAmount: Double = 0.0,
    val discountPercent: Double = 0.0,
    val totalItemDiscount: Double = 0.0,
    // Temporary bill
    val isTemporaryBill: Boolean = false,
    val printCount: Int = 0,
    val printTime: Date? = null
)

/**
 * Bill Item - Thông tin món trong hóa đơn
 */
data class BillItem(
    val code: String? = null,
    val name: String,
    val quantity: Int,
    val unitPrice: Double,
    val originalPrice: Double = 0.0,
    val basePrice: Double = 0.0,
    val discountAmount: Double = 0.0,
    val discountPercent: Double = 0.0,
    val totalPrice: Double,
    val note: String? = null,
    val variants: List<BillVariant> = emptyList(),
    val toppings: List<BillTopping> = emptyList(),
    val vatRate: Double = 8.0
)

/**
 * Bill Variant - Các lựa chọn biến thể (Size, Ice, Sugar...)
 */
data class BillVariant(
    val name: String,
    val groupName: String? = null,
    val priceAdjustment: Double = 0.0
)

data class BillTopping(
    val name: String,
    val price: Double,
    val quantity: Int = 1
)

/**
 * Bill Builder - Helper class to build ESC/POS commands
 */
class BillBuilder(paperWidth: Int) {
    private val buffer = mutableListOf<Byte>()
    val lineWidth = if (paperWidth == 58) 32 else 48

    // ESC/POS Commands
    private val INIT = byteArrayOf(0x1B, 0x40)
    private val ALIGN_LEFT = byteArrayOf(0x1B, 0x61, 0x00)
    private val ALIGN_CENTER = byteArrayOf(0x1B, 0x61, 0x01)
    private val ALIGN_RIGHT = byteArrayOf(0x1B, 0x61, 0x02)
    private val TEXT_NORMAL = byteArrayOf(0x1B, 0x21, 0x00)
    private val TEXT_DOUBLE_HEIGHT = byteArrayOf(0x1B, 0x21, 0x10)
    private val TEXT_DOUBLE_WIDTH = byteArrayOf(0x1B, 0x21, 0x20)
    private val TEXT_DOUBLE = byteArrayOf(0x1B, 0x21, 0x30)
    private val BOLD_ON = byteArrayOf(0x1B, 0x45, 0x01)
    private val BOLD_OFF = byteArrayOf(0x1B, 0x45, 0x00)
    private val LINE_FEED = byteArrayOf(0x0A)
    private val CUT_PAPER = byteArrayOf(0x1D, 0x56, 0x42, 0x00)
    private val OPEN_DRAWER = byteArrayOf(0x1B, 0x70, 0x00, 0x19, 0x78)
    private val BEEP = byteArrayOf(0x1B, 0x42, 0x03, 0x02)

    // Vietnamese/UTF-8 Character Set Commands
    private val CODEPAGE_UTF8 = byteArrayOf(0x1B, 0x74, 0xFF.toByte())
    private val CANCEL_CHINESE = byteArrayOf(0x1C, 0x2E)
    private val CHARSET_VIETNAM = byteArrayOf(0x1B, 0x52, 0x00)

    fun init() = apply {
        buffer.addAll(INIT.toList())
        buffer.addAll(CANCEL_CHINESE.toList())
        buffer.addAll(CODEPAGE_UTF8.toList())
        buffer.addAll(CHARSET_VIETNAM.toList())
    }

    fun alignLeft() = apply { buffer.addAll(ALIGN_LEFT.toList()) }
    fun alignCenter() = apply { buffer.addAll(ALIGN_CENTER.toList()) }
    fun alignRight() = apply { buffer.addAll(ALIGN_RIGHT.toList()) }
    fun normalSize() = apply { buffer.addAll(TEXT_NORMAL.toList()) }
    fun textDoubleHeight() = apply { buffer.addAll(TEXT_DOUBLE_HEIGHT.toList()) }
    fun textDoubleWidth() = apply { buffer.addAll(TEXT_DOUBLE_WIDTH.toList()) }
    fun textDoubleSize() = apply { buffer.addAll(TEXT_DOUBLE.toList()) }
    fun bold() = apply { buffer.addAll(BOLD_ON.toList()) }
    fun boldOff() = apply { buffer.addAll(BOLD_OFF.toList()) }
    fun cut() = apply { buffer.addAll(CUT_PAPER.toList()) }
    fun openDrawer() = apply { buffer.addAll(OPEN_DRAWER.toList()) }
    fun beep() = apply { buffer.addAll(BEEP.toList()) }

    fun feed(lines: Int) = apply {
        repeat(lines) { buffer.addAll(LINE_FEED.toList()) }
    }

    fun line(text: String) = apply {
        buffer.addAll(text.toByteArray(Charsets.UTF_8).toList())
        buffer.addAll(LINE_FEED.toList())
    }

    fun lineKeyValue(key: String, value: String) = apply {
        val spaces = lineWidth - key.length - value.length
        val line = if (spaces > 0) {
            key + " ".repeat(spaces) + value
        } else {
            "$key $value"
        }
        buffer.addAll(line.toByteArray(Charsets.UTF_8).toList())
        buffer.addAll(LINE_FEED.toList())
    }

    fun qrCode(content: String, size: Int = 6) = apply {
        // QR Code model
        buffer.addAll(byteArrayOf(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00).toList())
        // QR Code size
        buffer.addAll(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size.toByte()).toList())
        // QR Code error correction
        buffer.addAll(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31).toList())
        // Store QR Code data
        val contentBytes = content.toByteArray(Charsets.UTF_8)
        val len = contentBytes.size + 3
        buffer.addAll(byteArrayOf(0x1D, 0x28, 0x6B, (len and 0xFF).toByte(), ((len shr 8) and 0xFF).toByte(), 0x31, 0x50, 0x30).toList())
        buffer.addAll(contentBytes.toList())
        // Print QR Code
        buffer.addAll(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30).toList())
    }

    fun barcode(content: String) = apply {
        // CODE128 barcode
        buffer.addAll(byteArrayOf(0x1D, 0x68, 0x50).toList()) // Height
        buffer.addAll(byteArrayOf(0x1D, 0x77, 0x02).toList()) // Width
        buffer.addAll(byteArrayOf(0x1D, 0x48, 0x02).toList()) // HRI below barcode
        buffer.addAll(byteArrayOf(0x1D, 0x6B, 0x49, content.length.toByte()).toList())
        buffer.addAll(content.toByteArray(Charsets.UTF_8).toList())
    }

    fun build(): ByteArray = buffer.toByteArray()
}
