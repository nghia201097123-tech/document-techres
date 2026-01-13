package com.techres.ccb.data.printer

import android.util.Log
import com.techres.ccb.data.local.entity.BillPrinterConfigEntity
import com.techres.ccb.data.local.entity.BillTemplateEntity
import com.techres.ccb.data.local.entity.BillTemplateType
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
 * Hybrid Bill Print Service - In bill với tiếng Việt có dấu
 *
 * Sử dụng phương pháp HYBRID:
 * - Tự động detect máy in có hỗ trợ UTF-8 Vietnamese không
 * - Nếu có → dùng ESC/POS text thuần (nhanh, nhẹ)
 * - Nếu không → dùng BITMAP (đảm bảo 100% đúng)
 *
 * @author TechRes
 */
object HybridBillPrintService {
    private const val TAG = "HybridBillPrintService"
    private val currencyFormat = DecimalFormat("#,###")

    /**
     * In bill với template và config
     */
    suspend fun printBill(
        printerConfig: BillPrinterConfigEntity,
        template: BillTemplateEntity,
        billData: BillData
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            var lastError: String? = null

            // Detect printer capability
            val ip = printerConfig.printerIp ?: return@withContext PrinterResult.Error("Chưa cấu hình IP máy in")
            val capability = PrinterCapabilityDetector.detect(ip, printerConfig.printerPort)

            // Generate bill content với Hybrid builder
            val billContent = generateHybridBill(template, billData, capability)

            // Retry logic
            repeat(printerConfig.retryCount) { attempt ->
                val result = when (printerConfig.connectionType) {
                    "network" -> printViaNetwork(printerConfig, billContent)
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
        billContent: ByteArray
    ): PrinterResult {
        val ip = config.printerIp ?: return PrinterResult.Error("Chưa cấu hình IP máy in")

        var socket: Socket? = null
        var outputStream: OutputStream? = null

        return try {
            socket = Socket()
            socket.connect(InetSocketAddress(ip, config.printerPort), config.connectionTimeoutMs)
            outputStream = socket.getOutputStream()

            // Send bill content
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
     * Generate bill content với Hybrid approach
     */
    private fun generateHybridBill(
        template: BillTemplateEntity,
        billData: BillData,
        capability: PrinterCapability
    ): ByteArray {
        // Luôn dùng bitmap mode để đảm bảo tiếng Việt hiển thị đúng
        val useBitmapMode = !capability.supportVietnameseUtf8

        return when (BillTemplateType.entries.find { it.value == template.templateType } ?: BillTemplateType.CLASSIC) {
            BillTemplateType.CLASSIC -> generateClassicBill(template, billData, useBitmapMode)
            BillTemplateType.MODERN -> generateModernBill(template, billData, useBitmapMode)
            BillTemplateType.COMPACT -> generateCompactBill(template, billData, useBitmapMode)
            BillTemplateType.DETAILED -> generateDetailedBill(template, billData, useBitmapMode)
            BillTemplateType.PREMIUM -> generatePremiumBill(template, billData, useBitmapMode)
        }
    }

    /**
     * Mẫu Classic - Truyền thống
     */
    private fun generateClassicBill(
        template: BillTemplateEntity,
        billData: BillData,
        useBitmapMode: Boolean
    ): ByteArray {
        val builder = HybridBillBuilder(template.paperWidth, useBitmapMode)

        builder.apply {
            init()

            // Header
            lineDouble(template.storeName, BitmapTextStyle(centerAlign = true))

            template.storeAddress?.let {
                lineCenter(it)
            }
            template.storePhone?.let {
                lineCenter("ĐT: $it")
            }
            template.taxCode?.let {
                lineCenter("MST: $it")
            }
            template.headerText?.let {
                lineCenter(it)
            }

            doubleSeparator()
            lineDouble(template.billTitle, BitmapTextStyle(centerAlign = true))
            doubleSeparator()

            // Order info
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

            separator()

            // Items header
            if (template.showQuantity && template.showUnitPrice) {
                lineBold("Tên món        SL    Đ.Giá   T.Tiền")
            } else {
                lineBold("Tên món              SL      T.Tiền")
            }
            separator()

            // Items
            billData.items.forEach { item ->
                line(item.name)
                if (template.showQuantity && template.showUnitPrice) {
                    lineKeyValue(
                        "  ${item.quantity} x ${formatCurrency(item.unitPrice)}",
                        formatCurrency(item.totalPrice)
                    )
                } else {
                    lineKeyValue(
                        "  x${item.quantity}",
                        formatCurrency(item.totalPrice)
                    )
                }

                // Item note
                if (template.showItemNote && item.note != null) {
                    line("  → ${item.note}")
                }

                // Toppings
                item.toppings.forEach { topping ->
                    line("  + ${topping.name}: ${formatCurrency(topping.price)}")
                }
            }

            separator()

            // Totals
            if (template.showSubtotal) {
                lineKeyValue("Tạm tính:", formatCurrency(billData.subtotal))
            }

            if (template.showDiscount && billData.discountAmount > 0) {
                val discountText = if (template.showDiscountPercent && billData.discountPercent > 0) {
                    "Giảm giá (${billData.discountPercent}%):"
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
                lineKeyValue("${template.vatLabel} (${billData.vatRate}%):", formatCurrency(billData.vatAmount))
            }

            if (template.showVatDetails && template.showPriceAfterVat) {
                lineKeyValue("${template.priceAfterVatLabel}:", formatCurrency(billData.priceAfterVat))
            }

            doubleSeparator()

            // Total
            lineKeyValue(
                "TỔNG CỘNG:",
                formatCurrency(billData.totalAmount),
                BitmapTextStyle(bold = true, fontSize = 28f)
            )

            doubleSeparator()

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

            separator()

            // Footer
            lineCenter(template.thankYouMessage)
            lineCenter(template.comebackMessage)
            template.footerText?.let { lineCenter(it) }

            // WiFi info
            if (template.showWifiInfo && template.wifiName != null) {
                separator()
                lineCenter("WiFi: ${template.wifiName}")
                template.wifiPassword?.let { lineCenter("Pass: $it") }
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
                openCashDrawer()
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
    private fun generateModernBill(
        template: BillTemplateEntity,
        billData: BillData,
        useBitmapMode: Boolean
    ): ByteArray {
        val builder = HybridBillBuilder(template.paperWidth, useBitmapMode)

        builder.apply {
            init()

            // Clean header
            lineDouble(template.storeName, BitmapTextStyle(centerAlign = true))
            feed(1)

            // Minimal info line
            val dateFormat = SimpleDateFormat("dd/MM HH:mm", Locale.getDefault())
            val infoLine = buildString {
                append("#${billData.orderNumber}")
                if (billData.tableName != null) append(" | ${billData.tableName}")
                append(" | ${dateFormat.format(billData.orderDate)}")
            }
            line(infoLine)
            feed(1)

            // Items - clean format
            billData.items.forEach { item ->
                lineKeyValue("${item.quantity}x ${item.name}", formatCurrency(item.totalPrice))
                item.toppings.forEach { topping ->
                    line("   + ${topping.name}")
                }
            }

            feed(1)
            separator('─')

            // Totals - minimal
            if (billData.discountAmount > 0) {
                lineKeyValue("Giảm:", "-${formatCurrency(billData.discountAmount)}")
            }
            if (template.showVat && billData.vatAmount > 0) {
                lineKeyValue("VAT:", formatCurrency(billData.vatAmount))
            }

            feed(1)
            lineKeyValue("TOTAL:", formatCurrency(billData.totalAmount), BitmapTextStyle(bold = true, fontSize = 28f))

            // Footer
            feed(2)
            lineCenter(template.thankYouMessage)

            feed(3)
            if (template.cutPaper) cut()
        }

        return builder.build()
    }

    /**
     * Mẫu Compact - Thu gọn
     */
    private fun generateCompactBill(
        template: BillTemplateEntity,
        billData: BillData,
        useBitmapMode: Boolean
    ): ByteArray {
        val builder = HybridBillBuilder(template.paperWidth, useBitmapMode)

        builder.apply {
            init()

            // Compact header
            lineBold(template.storeName, BitmapTextStyle(centerAlign = true))

            val dateFormat = SimpleDateFormat("dd/MM HH:mm", Locale.getDefault())
            lineCenter("#${billData.orderNumber} ${billData.tableName ?: ""} ${dateFormat.format(billData.orderDate)}")
            separator()

            // Items - very compact
            billData.items.forEach { item ->
                line("${item.quantity}x ${item.name} ${formatCurrency(item.totalPrice)}")
            }

            separator()

            // Total only
            lineBold("TỔNG: ${formatCurrency(billData.totalAmount)}", BitmapTextStyle(rightAlign = true))

            feed(2)
            if (template.cutPaper) cut()
        }

        return builder.build()
    }

    /**
     * Mẫu Detailed - Chi tiết với VAT từng món
     */
    private fun generateDetailedBill(
        template: BillTemplateEntity,
        billData: BillData,
        useBitmapMode: Boolean
    ): ByteArray {
        val builder = HybridBillBuilder(template.paperWidth, useBitmapMode)

        builder.apply {
            init()

            // Full header
            lineDouble(template.storeName, BitmapTextStyle(centerAlign = true))
            template.storeAddress?.let { lineCenter(it) }
            template.storePhone?.let { lineCenter("ĐT: $it") }
            template.taxCode?.let { lineCenter("MST: $it") }

            doubleSeparator()
            lineDouble("HÓA ĐƠN BÁN HÀNG", BitmapTextStyle(centerAlign = true))
            doubleSeparator()

            // Detailed order info
            line("Số HĐ:    ${billData.orderNumber}")
            val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault())
            line("Ngày:     ${dateFormat.format(billData.orderDate)}")
            billData.tableName?.let { line("Bàn:      $it") }
            billData.staffName?.let { line("Thu ngân: $it") }
            billData.customerName?.let { line("Khách:    $it") }

            separator()

            // Items with VAT details
            lineBold("Chi tiết đơn hàng:")
            separator()

            billData.items.forEach { item ->
                lineBold("${item.quantity}x ${item.name}")

                if (item.code != null) {
                    line("  Mã: ${item.code}")
                }

                val itemBeforeVat = item.totalPrice / (1 + billData.vatRate / 100)
                val itemVat = item.totalPrice - itemBeforeVat

                line("  Đơn giá: ${formatCurrency(item.unitPrice)}")
                line("  Giá trước VAT: ${formatCurrency(itemBeforeVat)}")
                line("  VAT (${billData.vatRate}%): ${formatCurrency(itemVat)}")
                line("  Thành tiền: ${formatCurrency(item.totalPrice)}")

                item.toppings.forEach { topping ->
                    line("  + ${topping.name}: ${formatCurrency(topping.price)}")
                }

                separator()
            }

            // Summary with full VAT breakdown
            lineKeyValue("Tạm tính:", formatCurrency(billData.subtotal))

            if (billData.discountAmount > 0) {
                lineKeyValue("Giảm giá (${billData.discountPercent}%):", "-${formatCurrency(billData.discountAmount)}")
            }

            if (billData.serviceFee > 0) {
                lineKeyValue("Phí dịch vụ:", formatCurrency(billData.serviceFee))
            }

            separator()

            // VAT Summary
            lineBold("THÔNG TIN THUẾ:")
            lineKeyValue("Giá trước thuế:", formatCurrency(billData.priceBeforeVat))
            lineKeyValue("Thuế GTGT (${billData.vatRate}%):", formatCurrency(billData.vatAmount))
            lineKeyValue("Giá sau thuế:", formatCurrency(billData.priceAfterVat))

            doubleSeparator()

            lineKeyValue("TỔNG THANH TOÁN:", formatCurrency(billData.totalAmount), BitmapTextStyle(bold = true, fontSize = 28f))

            doubleSeparator()

            // Payment details
            lineKeyValue("Hình thức:", billData.paymentMethod)
            if (billData.receivedAmount > 0) {
                lineKeyValue("Tiền khách đưa:", formatCurrency(billData.receivedAmount))
                lineKeyValue("Tiền thừa:", formatCurrency(billData.changeAmount))
            }

            // Footer
            feed(1)
            lineCenter(template.thankYouMessage)
            lineCenter(template.comebackMessage)

            feed(3)
            if (template.cutPaper) cut()
        }

        return builder.build()
    }

    /**
     * Mẫu Premium - Cao cấp với QR, logo
     */
    private fun generatePremiumBill(
        template: BillTemplateEntity,
        billData: BillData,
        useBitmapMode: Boolean
    ): ByteArray {
        // Similar to Classic but with more premium styling
        return generateClassicBill(template, billData, useBitmapMode)
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
