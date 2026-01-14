package com.techres.ccb.data.printer

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.util.Log
import com.techres.ccb.data.local.entity.BillPrinterConfigEntity
import com.techres.ccb.data.local.entity.BillTemplateEntity
import com.techres.ccb.data.local.entity.BillTemplateType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.text.DecimalFormat
import java.text.SimpleDateFormat
import java.util.*

/**
 * Bill Print Service - Dịch vụ in bill chuyên nghiệp
 *
 * Hỗ trợ:
 * - Nhiều mẫu bill (classic, modern, compact, detailed, premium)
 * - Hiển thị giá trước và sau VAT
 * - QR Code, Barcode
 * - Auto retry khi lỗi
 * - Multiple printer connections (Network, Bluetooth, USB, Sunmi)
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
            val billContent = generateBillContent(template, billData)
            outputStream.write(billContent)
            outputStream.flush()

            // Print multiple copies if configured
            repeat(config.numberOfCopies - 1) {
                delay(500) // Small delay between copies
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
     * Generate bill content based on template
     */
    private fun generateBillContent(template: BillTemplateEntity, billData: BillData): ByteArray {
        return when (BillTemplateType.entries.find { it.value == template.templateType } ?: BillTemplateType.CLASSIC) {
            BillTemplateType.CLASSIC -> generateClassicBill(template, billData)
            BillTemplateType.MODERN -> generateModernBill(template, billData)
            BillTemplateType.COMPACT -> generateCompactBill(template, billData)
            BillTemplateType.DETAILED -> generateDetailedBill(template, billData)
            BillTemplateType.PREMIUM -> generatePremiumBill(template, billData)
        }
    }

    /**
     * Mẫu Classic - Truyền thống
     */
    private fun generateClassicBill(template: BillTemplateEntity, billData: BillData): ByteArray {
        val builder = BillBuilder(template.paperWidth)
        val sep = template.separatorChar.repeat(builder.lineWidth)
        val doubleSep = template.doubleSeparatorChar.repeat(builder.lineWidth)

        builder.apply {
            init()

            // Header
            alignCenter()
            if (template.showLogo && template.logoUrl != null) {
                // Logo printing would go here
            }
            textDoubleSize()
            bold()
            line(template.storeName)
            normalSize()
            boldOff()

            template.storeAddress?.let { line(it) }
            template.storePhone?.let { line("ĐT: $it") }
            template.taxCode?.let { line("MST: $it") }
            template.headerText?.let { line(it) }

            line(doubleSep)
            textDoubleHeight()
            bold()
            line(template.billTitle)
            normalSize()
            boldOff()
            line(doubleSep)

            // Order info
            alignLeft()
            if (template.showOrderNumber) {
                line("Số HĐ: ${billData.orderNumber}")
            }
            if (template.showDateTime) {
                val dateFormat = SimpleDateFormat(template.dateFormat, Locale.getDefault())
                line("Ngày: ${dateFormat.format(billData.orderDate)}")
            }
            if (template.showTableName && billData.tableName != null) {
                line("Bàn: ${billData.tableName}")
            }
            if (template.showStaffName && billData.staffName != null) {
                line("Thu ngân: ${billData.staffName}")
            }
            if (template.showCustomerName && billData.customerName != null) {
                line("Khách hàng: ${billData.customerName}")
            }

            // Time tracking (giờ vào/ra)
            if (template.showCheckInTime && billData.checkInTime != null) {
                val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                line("${template.checkInLabel}: ${timeFormat.format(billData.checkInTime)}")
            }
            if (template.showCheckOutTime && billData.checkOutTime != null) {
                val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                line("${template.checkOutLabel}: ${timeFormat.format(billData.checkOutTime)}")
            }

            line(sep)

            // Items - Detailed format matching CCB Offline
            billData.items.forEach { item ->
                // Product name with quantity badge
                val nameWithQty = if (template.showQuantity) {
                    "${item.name} x${item.quantity}"
                } else {
                    item.name
                }
                bold()
                line(nameWithQty)
                boldOff()

                // Base price (giá gốc)
                if (template.showUnitPrice && item.basePrice > 0) {
                    line("  Giá gốc: ${formatCurrency(item.basePrice)}")
                }

                // Variants (Size, Ice, Sugar, etc.)
                item.variants.forEach { variant ->
                    if (variant.priceAdjustment > 0) {
                        lineKeyValue("  • ${variant.name}", "+${formatCurrency(variant.priceAdjustment)}")
                    } else {
                        line("  • ${variant.name}")
                    }
                }

                // Toppings (extra items)
                item.toppings.forEach { topping ->
                    val toppingQty = if (topping.quantity > 1) " x${topping.quantity}" else ""
                    lineKeyValue("  + ${topping.name}$toppingQty", "+${formatCurrency(topping.price * topping.quantity)}")
                }

                // Item note
                if (template.showItemNote && item.note != null) {
                    line("  -> ${item.note}")
                }

                // Item discount (nếu có)
                if (template.showItemDiscount && item.discountAmount > 0) {
                    val discountText = if (item.discountPercent > 0) {
                        "  ${template.itemDiscountLabel} (${item.discountPercent.toInt()}%)"
                    } else {
                        "  ${template.itemDiscountLabel}"
                    }
                    lineKeyValue(discountText, "-${formatCurrency(item.discountAmount)}")
                }

                // Subtotal per item (thành tiền)
                line("  ".repeat(1) + "-".repeat(lineWidth - 2))
                bold()
                lineKeyValue("  Thành tiền:", formatCurrency(item.totalPrice))
                boldOff()

                line("")  // Empty line between items
            }

            line(sep)

            // Totals
            alignRight()

            if (template.showSubtotal) {
                lineKeyValue("Tạm tính:", formatCurrency(billData.subtotal))
            }

            // ============ 4 LOẠI GIẢM GIÁ (theo thứ tự ưu tiên) ============

            // 1. Giảm giá món (tổng)
            if (template.showTotalItemDiscount && billData.itemDiscountAmount > 0) {
                lineKeyValue("${template.itemDiscountLabel}:", "-${formatCurrency(billData.itemDiscountAmount)}")
            }

            // 2. Giảm giá hóa đơn
            if (template.showBillDiscount && billData.billDiscountAmount > 0) {
                val billDiscountText = if (template.showDiscountPercent && billData.billDiscountPercent > 0) {
                    "${template.billDiscountLabel} (${billData.billDiscountPercent.toInt()}%):"
                } else {
                    "${template.billDiscountLabel}:"
                }
                lineKeyValue(billDiscountText, "-${formatCurrency(billData.billDiscountAmount)}")
            }

            // 3. Coupon
            if (template.showCouponDiscount && billData.couponDiscountAmount > 0) {
                val couponText = if (billData.couponCode != null) {
                    "${template.couponDiscountLabel} (${billData.couponCode}):"
                } else {
                    "${template.couponDiscountLabel}:"
                }
                lineKeyValue(couponText, "-${formatCurrency(billData.couponDiscountAmount)}")
            }

            // 4. Voucher
            if (template.showVoucherDiscount && billData.voucherDiscountAmount > 0) {
                val voucherText = if (billData.voucherCode != null) {
                    "${template.voucherDiscountLabel} (${billData.voucherCode}):"
                } else {
                    "${template.voucherDiscountLabel}:"
                }
                lineKeyValue(voucherText, "-${formatCurrency(billData.voucherDiscountAmount)}")
            }

            // Tổng giảm giá (nếu có nhiều loại)
            if (template.showTotalDiscount && billData.totalDiscountAmount > 0) {
                val hasMultipleDiscounts = listOf(
                    billData.itemDiscountAmount,
                    billData.billDiscountAmount,
                    billData.couponDiscountAmount,
                    billData.voucherDiscountAmount
                ).count { it > 0 } > 1

                if (hasMultipleDiscounts) {
                    line("-".repeat(lineWidth / 2))
                    bold()
                    lineKeyValue("${template.totalDiscountLabel}:", "-${formatCurrency(billData.totalDiscountAmount)}")
                    boldOff()
                }
            }

            // Legacy discount support (tương thích ngược)
            if (template.showDiscount && billData.discountAmount > 0 && billData.totalDiscountAmount == 0.0) {
                val discountText = if (template.showDiscountPercent && billData.discountPercent > 0) {
                    "Giảm giá (${billData.discountPercent.toInt()}%):"
                } else {
                    "Giảm giá:"
                }
                lineKeyValue(discountText, "-${formatCurrency(billData.discountAmount)}")
            }

            if (template.showServiceFee && billData.serviceFee > 0) {
                lineKeyValue("Phí dịch vụ:", formatCurrency(billData.serviceFee))
            }

            // VAT Details
            if (template.showVatDetails && template.showPriceBeforeVat) {
                lineKeyValue("${template.priceBeforeVatLabel}:", formatCurrency(billData.priceBeforeVat))
            }

            if (template.showVat && billData.vatAmount > 0) {
                lineKeyValue("${template.vatLabel} (${billData.vatRate.toInt()}%):", formatCurrency(billData.vatAmount))
            }

            if (template.showVatDetails && template.showPriceAfterVat) {
                lineKeyValue("${template.priceAfterVatLabel}:", formatCurrency(billData.priceAfterVat))
            }

            line(doubleSep)

            // Total
            textDoubleSize()
            bold()
            lineKeyValue("TỔNG CỘNG:", formatCurrency(billData.totalAmount))
            normalSize()
            boldOff()

            line(doubleSep)

            // Payment info
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

            // Footer
            alignCenter()
            line(template.thankYouMessage)
            line(template.comebackMessage)
            template.footerText?.let { line(it) }

            // WiFi info
            if (template.showWifiInfo && template.wifiName != null) {
                line(sep)
                line("WiFi: ${template.wifiName}")
                template.wifiPassword?.let { line("Pass: $it") }
            }

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

            // Cut paper
            feed(3)
            if (template.cutPaper) {
                cut()
            }

            // Open cash drawer
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
     * Mẫu Modern - Hiện đại, tối giản
     */
    private fun generateModernBill(template: BillTemplateEntity, billData: BillData): ByteArray {
        val builder = BillBuilder(template.paperWidth)

        builder.apply {
            init()

            // Clean header
            alignCenter()
            textDoubleSize()
            bold()
            line(template.storeName)
            normalSize()
            boldOff()

            feed(1)

            // Minimal info line
            alignLeft()
            val dateFormat = SimpleDateFormat("dd/MM HH:mm", Locale.getDefault())
            val infoLine = buildString {
                append("#${billData.orderNumber}")
                if (billData.tableName != null) append(" | ${billData.tableName}")
                append(" | ${dateFormat.format(billData.orderDate)}")
            }
            line(infoLine)

            feed(1)

            // Items - clean format with details
            billData.items.forEach { item ->
                bold()
                lineColumns(
                    "${item.quantity}x ${item.name}",
                    formatCurrency(item.totalPrice)
                )
                boldOff()

                // Variants with price adjustment
                item.variants.forEach { variant ->
                    if (variant.priceAdjustment > 0) {
                        lineColumns("   • ${variant.name}", "+${formatCurrency(variant.priceAdjustment)}")
                    } else {
                        line("   • ${variant.name}")
                    }
                }

                // Toppings
                item.toppings.forEach { topping ->
                    lineColumns("   + ${topping.name}", "+${formatCurrency(topping.price)}")
                }

                // Item discount
                if (template.showItemDiscount && item.discountAmount > 0) {
                    lineColumns("   ${template.itemDiscountLabel}", "-${formatCurrency(item.discountAmount)}")
                }
            }

            feed(1)
            line("─".repeat(builder.lineWidth))

            // Totals - with 4 discount types (condensed labels for compact mode)
            alignRight()

            // 4 discount types - respect template config
            if (template.showTotalItemDiscount && billData.itemDiscountAmount > 0) {
                lineKeyValue("${template.itemDiscountLabel}:", "-${formatCurrency(billData.itemDiscountAmount)}")
            }
            if (template.showBillDiscount && billData.billDiscountAmount > 0) {
                lineKeyValue("${template.billDiscountLabel}:", "-${formatCurrency(billData.billDiscountAmount)}")
            }
            if (template.showCouponDiscount && billData.couponDiscountAmount > 0) {
                lineKeyValue("${template.couponDiscountLabel}:", "-${formatCurrency(billData.couponDiscountAmount)}")
            }
            if (template.showVoucherDiscount && billData.voucherDiscountAmount > 0) {
                lineKeyValue("${template.voucherDiscountLabel}:", "-${formatCurrency(billData.voucherDiscountAmount)}")
            }

            // Legacy support
            if (billData.discountAmount > 0 && billData.totalDiscountAmount == 0.0) {
                lineKeyValue("Giảm:", "-${formatCurrency(billData.discountAmount)}")
            }

            if (template.showVat && billData.vatAmount > 0) {
                lineKeyValue("VAT:", formatCurrency(billData.vatAmount))
            }

            feed(1)
            textDoubleSize()
            bold()
            lineKeyValue("TOTAL:", formatCurrency(billData.totalAmount))
            normalSize()
            boldOff()

            // Footer
            feed(2)
            alignCenter()
            line(template.thankYouMessage)

            feed(3)
            if (template.cutPaper) cut()
        }

        return builder.build()
    }

    /**
     * Mẫu Compact - Thu gọn
     */
    private fun generateCompactBill(template: BillTemplateEntity, billData: BillData): ByteArray {
        val builder = BillBuilder(template.paperWidth)

        builder.apply {
            init()

            // Compact header
            alignCenter()
            bold()
            line(template.storeName)
            boldOff()

            val dateFormat = SimpleDateFormat("dd/MM HH:mm", Locale.getDefault())
            line("#${billData.orderNumber} ${billData.tableName ?: ""} ${dateFormat.format(billData.orderDate)}")
            line("-".repeat(builder.lineWidth))

            // Items - very compact
            alignLeft()
            billData.items.forEach { item ->
                line("${item.quantity}x ${item.name} ${formatCurrency(item.totalPrice)}")
            }

            line("-".repeat(builder.lineWidth))

            // Total only
            alignRight()
            bold()
            line("TỔNG: ${formatCurrency(billData.totalAmount)}")
            boldOff()

            feed(2)
            if (template.cutPaper) cut()
        }

        return builder.build()
    }

    /**
     * Mẫu Detailed - Chi tiết với VAT từng món
     */
    private fun generateDetailedBill(template: BillTemplateEntity, billData: BillData): ByteArray {
        val builder = BillBuilder(template.paperWidth)
        val sep = "-".repeat(builder.lineWidth)
        val doubleSep = "=".repeat(builder.lineWidth)

        builder.apply {
            init()

            // Full header
            alignCenter()
            textDoubleSize()
            bold()
            line(template.storeName)
            normalSize()
            boldOff()

            template.storeAddress?.let { line(it) }
            template.storePhone?.let { line("ĐT: $it") }
            template.taxCode?.let { line("MST: $it") }

            line(doubleSep)
            textDoubleHeight()
            bold()
            line("HÓA ĐƠN BÁN HÀNG")
            normalSize()
            boldOff()
            line(doubleSep)

            // Detailed order info
            alignLeft()
            line("Số HĐ:    ${billData.orderNumber}")
            val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault())
            line("Ngày:     ${dateFormat.format(billData.orderDate)}")
            billData.tableName?.let { line("Bàn:      $it") }
            billData.staffName?.let { line("Thu ngân: $it") }
            billData.customerName?.let { line("Khách:    $it") }

            line(sep)

            // Items with VAT details
            line("Chi tiết đơn hàng:")
            line(sep)

            var totalBeforeVat = 0.0
            var totalVat = 0.0

            billData.items.forEach { item ->
                bold()
                line("${item.quantity}x ${item.name}")
                boldOff()

                if (item.code != null) {
                    line("  Mã: ${item.code}")
                }

                // Base price
                if (item.basePrice > 0) {
                    line("  Giá gốc: ${formatCurrency(item.basePrice)}")
                }

                // Variants with price adjustment
                item.variants.forEach { variant ->
                    if (variant.priceAdjustment > 0) {
                        lineKeyValue("  • ${variant.name}", "+${formatCurrency(variant.priceAdjustment)}")
                    } else {
                        line("  • ${variant.name}")
                    }
                }

                // Toppings
                item.toppings.forEach { topping ->
                    val toppingQty = if (topping.quantity > 1) " x${topping.quantity}" else ""
                    lineKeyValue("  + ${topping.name}$toppingQty", "+${formatCurrency(topping.price * topping.quantity)}")
                }

                // Item discount
                if (template.showItemDiscount && item.discountAmount > 0) {
                    val discountText = if (item.discountPercent > 0) {
                        "  ${template.itemDiscountLabel} (${item.discountPercent.toInt()}%)"
                    } else {
                        "  ${template.itemDiscountLabel}"
                    }
                    lineKeyValue(discountText, "-${formatCurrency(item.discountAmount)}")
                }

                val itemBeforeVat = item.totalPrice / (1 + item.vatRate / 100)
                val itemVat = item.totalPrice - itemBeforeVat
                totalBeforeVat += itemBeforeVat
                totalVat += itemVat

                line("  Giá trước VAT: ${formatCurrency(itemBeforeVat)}")
                line("  VAT (${item.vatRate.toInt()}%): ${formatCurrency(itemVat)}")
                bold()
                line("  Thành tiền: ${formatCurrency(item.totalPrice)}")
                boldOff()

                line(sep)
            }

            // Summary with full breakdown
            alignRight()
            lineKeyValue("Tạm tính:", formatCurrency(billData.subtotal))

            // 4 discount types (detailed) - sử dụng template config
            if (template.showTotalItemDiscount && billData.itemDiscountAmount > 0) {
                lineKeyValue("${template.itemDiscountLabel}:", "-${formatCurrency(billData.itemDiscountAmount)}")
            }
            if (template.showBillDiscount && billData.billDiscountAmount > 0) {
                val billDiscountText = if (template.showDiscountPercent && billData.billDiscountPercent > 0) {
                    "${template.billDiscountLabel} (${billData.billDiscountPercent.toInt()}%):"
                } else {
                    "${template.billDiscountLabel}:"
                }
                lineKeyValue(billDiscountText, "-${formatCurrency(billData.billDiscountAmount)}")
            }
            if (template.showCouponDiscount && billData.couponDiscountAmount > 0) {
                val couponText = if (billData.couponCode != null) {
                    "${template.couponDiscountLabel} (${billData.couponCode}):"
                } else {
                    "${template.couponDiscountLabel}:"
                }
                lineKeyValue(couponText, "-${formatCurrency(billData.couponDiscountAmount)}")
            }
            if (template.showVoucherDiscount && billData.voucherDiscountAmount > 0) {
                val voucherText = if (billData.voucherCode != null) {
                    "${template.voucherDiscountLabel} (${billData.voucherCode}):"
                } else {
                    "${template.voucherDiscountLabel}:"
                }
                lineKeyValue(voucherText, "-${formatCurrency(billData.voucherDiscountAmount)}")
            }

            // Total discount
            if (template.showTotalDiscount && billData.totalDiscountAmount > 0) {
                val discountCount = listOf(
                    billData.itemDiscountAmount,
                    billData.billDiscountAmount,
                    billData.couponDiscountAmount,
                    billData.voucherDiscountAmount
                ).count { it > 0 }

                if (discountCount > 1) {
                    bold()
                    lineKeyValue("${template.totalDiscountLabel}:", "-${formatCurrency(billData.totalDiscountAmount)}")
                    boldOff()
                }
            }

            // Legacy support
            if (billData.discountAmount > 0 && billData.totalDiscountAmount == 0.0) {
                val discountText = if (billData.discountPercent > 0) {
                    "Giảm giá (${billData.discountPercent.toInt()}%):"
                } else {
                    "Giảm giá:"
                }
                lineKeyValue(discountText, "-${formatCurrency(billData.discountAmount)}")
            }

            if (billData.serviceFee > 0) {
                lineKeyValue("Phí dịch vụ:", formatCurrency(billData.serviceFee))
            }

            line(sep)

            // VAT Summary
            bold()
            line("THÔNG TIN THUẾ:")
            boldOff()
            lineKeyValue("Giá trước thuế:", formatCurrency(billData.priceBeforeVat))
            lineKeyValue("Thuế GTGT (${billData.vatRate}%):", formatCurrency(billData.vatAmount))
            lineKeyValue("Giá sau thuế:", formatCurrency(billData.priceAfterVat))

            line(doubleSep)

            textDoubleSize()
            bold()
            lineKeyValue("TỔNG THANH TOÁN:", formatCurrency(billData.totalAmount))
            normalSize()
            boldOff()

            line(doubleSep)

            // Payment details
            lineKeyValue("Hình thức:", billData.paymentMethod)
            if (billData.receivedAmount > 0) {
                lineKeyValue("Tiền khách đưa:", formatCurrency(billData.receivedAmount))
                lineKeyValue("Tiền thừa:", formatCurrency(billData.changeAmount))
            }

            // Footer
            feed(1)
            alignCenter()
            line(template.thankYouMessage)
            line(template.comebackMessage)

            feed(3)
            if (template.cutPaper) cut()
        }

        return builder.build()
    }

    /**
     * Mẫu Premium - Cao cấp với QR, logo
     */
    private fun generatePremiumBill(template: BillTemplateEntity, billData: BillData): ByteArray {
        // Similar to Classic but with more premium styling
        return generateClassicBill(template, billData)
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
    val subtotal: Double,                    // Tạm tính (tổng giá gốc các món)
    val totalItemDiscount: Double = 0.0,     // Tổng giảm giá các món
    val discountAmount: Double = 0.0,        // Giảm giá đơn hàng (deprecated - dùng 4 loại bên dưới)
    val discountPercent: Double = 0.0,       // % giảm giá đơn hàng (deprecated)
    // ============ 4 LOẠI GIẢM GIÁ ============
    val itemDiscountAmount: Double = 0.0,    // 1. Giảm giá món (tổng tất cả item)
    val billDiscountAmount: Double = 0.0,    // 2. Giảm giá hóa đơn
    val billDiscountPercent: Double = 0.0,   // % giảm giá hóa đơn
    val couponDiscountAmount: Double = 0.0,  // 3. Giảm giá từ coupon
    val couponCode: String? = null,          // Mã coupon (nếu có)
    val voucherDiscountAmount: Double = 0.0, // 4. Giảm giá từ voucher
    val voucherCode: String? = null,         // Mã voucher (nếu có)
    val totalDiscountAmount: Double = 0.0,   // Tổng tất cả giảm giá
    val serviceFee: Double = 0.0,
    val vatRate: Double = 10.0,
    val vatAmount: Double,
    val priceBeforeVat: Double,
    val priceAfterVat: Double,
    val totalAmount: Double,
    val paymentMethod: String = "Tiền mặt",
    val receivedAmount: Double = 0.0,
    val changeAmount: Double = 0.0,
    // ============ TIME TRACKING ============
    val checkInTime: Date? = null,           // Giờ vào
    val checkOutTime: Date? = null,          // Giờ ra
    // ============ TEMPORARY BILL (Bill tạm) ============
    val isTemporaryBill: Boolean = false,    // Đánh dấu là bill tạm
    val printCount: Int = 0,                  // Số lần in (lần thứ mấy)
    val printTime: Date? = null               // Thời gian in bill này
)

/**
 * Bill Item - Thông tin món trong hóa đơn
 */
data class BillItem(
    val code: String? = null,
    val name: String,
    val quantity: Int,
    val unitPrice: Double,           // Đơn giá sau giảm (basePrice + variants)
    val originalPrice: Double = 0.0, // Đơn giá gốc (trước giảm, trước variants)
    val basePrice: Double = 0.0,     // Giá gốc (không có variant)
    val discountAmount: Double = 0.0,// Số tiền giảm trên món này
    val discountPercent: Double = 0.0,// % giảm giá (nếu có)
    val totalPrice: Double,          // Thành tiền (sau giảm)
    val note: String? = null,
    val variants: List<BillVariant> = emptyList(),  // Variants (Size, Ice, Sugar...)
    val toppings: List<BillTopping> = emptyList(),   // Toppings (extra items)
    val vatRate: Double = 8.0        // VAT rate của món này (%)
)

/**
 * Bill Variant - Các lựa chọn biến thể (Size, Ice, Sugar...)
 */
data class BillVariant(
    val name: String,                // Tên variant (VD: "Size L", "NHIỀU", "30%")
    val groupName: String? = null,   // Nhóm (VD: "Size", "Đá", "Đường")
    val priceAdjustment: Double = 0.0 // Điều chỉnh giá (+10,000 hoặc 0)
)

data class BillTopping(
    val name: String,
    val price: Double,
    val quantity: Int = 1
)

/**
 * Bill Builder - Helper class to build ESC/POS commands
 * Hỗ trợ in tiếng Việt có dấu
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
    // ESC t n - Select character code table
    private val CODEPAGE_UTF8 = byteArrayOf(0x1B, 0x74, 0xFF.toByte())  // UTF-8 mode (some printers)
    private val CODEPAGE_WPC1252 = byteArrayOf(0x1B, 0x74, 0x10)       // Windows-1252 (Latin-1)
    // FS . - Cancel Chinese character mode (ensure ASCII/UTF-8 mode)
    private val CANCEL_CHINESE = byteArrayOf(0x1C, 0x2E)
    // FS & - Select Kanji character mode (enables multibyte)
    private val ENABLE_MULTIBYTE = byteArrayOf(0x1C, 0x26)
    // ESC R n - Select international character set
    private val CHARSET_VIETNAM = byteArrayOf(0x1B, 0x52, 0x00)        // USA (base for UTF-8)

    fun init() = apply {
        buffer.addAll(INIT.toList())
        // Enable Vietnamese/UTF-8 support
        // Order matters: cancel Chinese mode first, then set UTF-8 codepage
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

    fun lineColumns(vararg columns: String) = apply {
        val colWidth = lineWidth / columns.size
        val line = columns.mapIndexed { index, col ->
            if (index == 0) {
                col.take(colWidth).padEnd(colWidth)
            } else {
                col.take(colWidth).padStart(colWidth)
            }
        }.joinToString("")
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

    /**
     * In text tiếng Việt dưới dạng hình ảnh (bitmap)
     * Dùng khi máy in không hỗ trợ UTF-8 Vietnamese
     */
    fun lineAsBitmap(text: String, fontSize: Float = 24f, bold: Boolean = false) = apply {
        val bitmap = textToBitmap(text, fontSize, bold)
        printBitmap(bitmap)
        bitmap.recycle()
    }

    /**
     * Convert text thành bitmap để in
     */
    private fun textToBitmap(text: String, fontSize: Float, bold: Boolean): Bitmap {
        val paint = Paint().apply {
            color = Color.BLACK
            textSize = fontSize
            isAntiAlias = true
            typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        }

        // Calculate width based on paper (58mm ~ 384px, 80mm ~ 576px)
        val maxWidth = if (lineWidth <= 32) 384 else 576
        val textWidth = paint.measureText(text).toInt()
        val width = minOf(textWidth + 10, maxWidth)
        val height = (fontSize * 1.5f).toInt()

        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)
        canvas.drawText(text, 5f, fontSize, paint)

        return bitmap
    }

    /**
     * Print bitmap as ESC/POS raster image
     */
    private fun printBitmap(bitmap: Bitmap) {
        val width = bitmap.width
        val height = bitmap.height
        val bytesPerLine = (width + 7) / 8

        // Convert to monochrome
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

        // GS v 0 - Print raster bit image
        buffer.addAll(byteArrayOf(0x1D, 0x76, 0x30, 0x00).toList())
        buffer.add((bytesPerLine and 0xFF).toByte())
        buffer.add(((bytesPerLine shr 8) and 0xFF).toByte())
        buffer.add((height and 0xFF).toByte())
        buffer.add(((height shr 8) and 0xFF).toByte())

        // Convert pixels to monochrome bytes
        for (y in 0 until height) {
            for (x in 0 until bytesPerLine) {
                var byte = 0
                for (bit in 0 until 8) {
                    val px = x * 8 + bit
                    if (px < width) {
                        val pixel = pixels[y * width + px]
                        val gray = (Color.red(pixel) + Color.green(pixel) + Color.blue(pixel)) / 3
                        if (gray < 128) { // Dark pixel
                            byte = byte or (0x80 shr bit)
                        }
                    }
                }
                buffer.add(byte.toByte())
            }
        }
    }

    fun build(): ByteArray = buffer.toByteArray()
}
