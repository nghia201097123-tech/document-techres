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
            // Sử dụng paperWidth từ printerConfig (ưu tiên) hoặc template
            val billContent = generateHybridBill(printerConfig, template, billData, capability)

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
     * Sử dụng paperWidth từ printerConfig, các config khác từ template
     */
    private fun generateHybridBill(
        printerConfig: BillPrinterConfigEntity,
        template: BillTemplateEntity,
        billData: BillData,
        capability: PrinterCapability
    ): ByteArray {
        // Luôn dùng bitmap mode để đảm bảo tiếng Việt hiển thị đúng
        val useBitmapMode = !capability.supportVietnameseUtf8

        // Sử dụng paperWidth từ printerConfig (đã được user chọn trong app)
        val paperWidth = printerConfig.paperWidth

        return generateBillFromConfig(paperWidth, template, billData, useBitmapMode)
    }

    /**
     * Generate bill theo đúng config từ web dashboard
     * paperWidth: Lấy từ printerConfig (được user chọn trong app)
     * template: Chứa các config hiển thị (từ web dashboard)
     */
    private fun generateBillFromConfig(
        paperWidth: Int,
        template: BillTemplateEntity,
        billData: BillData,
        useBitmapMode: Boolean
    ): ByteArray {
        Log.d(TAG, "Generating bill with paperWidth: ${paperWidth}mm, useBitmapMode: $useBitmapMode")
        val builder = HybridBillBuilder(paperWidth, useBitmapMode)

        builder.apply {
            init()

            // ============ HEADER ============
            lineDouble(template.storeName, BitmapTextStyle(centerAlign = true))

            template.storeAddress?.let { lineCenter(it) }
            template.storePhone?.let { lineCenter("ĐT: $it") }
            template.taxCode?.let { lineCenter("MST: $it") }
            template.headerText?.let { lineCenter(it) }

            doubleSeparator()
            lineDouble(template.billTitle, BitmapTextStyle(centerAlign = true))
            doubleSeparator()

            // ============ ORDER INFO ============
            if (template.showOrderNumber) {
                line("Mã đơn: ${billData.orderNumber}")
            }
            if (template.showTableName && billData.tableName != null) {
                line("Bàn: ${billData.tableName}")
            }
            if (template.showStaffName && billData.staffName != null) {
                line("NV: ${billData.staffName}")
            }
            if (template.showCustomerName && billData.customerName != null) {
                line("Khách hàng: ${billData.customerName}")
            }
            if (template.showDateTime) {
                val dateFormat = SimpleDateFormat(template.dateFormat, Locale.getDefault())
                line("Giờ: ${dateFormat.format(billData.orderDate)}")
            }

            separator()

            // ============ ITEMS ============
            billData.items.forEach { item ->
                // Main item name - IN ĐẬM để nổi bật
                lineBold(item.name)

                // Price line - thụt vào 2 spaces
                lineKeyValue("  ${item.quantity} x ${formatCurrency(item.unitPrice)}", formatCurrency(item.totalPrice))

                // Item code (optional)
                if (template.showItemCode && item.code != null) {
                    line("  Mã: ${item.code}")
                }

                // Item note (optional)
                if (template.showItemNote && item.note != null) {
                    line("  Ghi chú: ${item.note}")
                }

                // Toppings - thụt vào nhiều hơn, dùng ký hiệu khác
                if (item.toppings.isNotEmpty()) {
                    item.toppings.forEach { topping ->
                        // Dùng "  └ " để thể hiện đây là item con của món chính
                        lineKeyValue("    └ ${topping.name}", formatCurrency(topping.price))
                    }
                }
            }

            separator()

            // ============ TOTALS ============
            if (template.showSubtotal) {
                lineKeyValue("Tạm tính:", formatCurrency(billData.subtotal))
            }

            if (template.showDiscount && billData.discountAmount > 0) {
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

            // ============ VAT INFO (theo config) ============
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
                // Chỉ hiện VAT nếu không hiện chi tiết
                lineKeyValue("${template.vatLabel} (${billData.vatRate.toInt()}%):", formatCurrency(billData.vatAmount))
            }

            separator()

            // ============ TOTAL ============
            // Font size sẽ được tự động scale trong lineKeyValue với bold = true
            lineKeyValue("TỔNG:", formatCurrency(billData.totalAmount), BitmapTextStyle(bold = true))

            // ============ PAYMENT INFO ============
            if (template.showPaymentMethod) {
                lineKeyValue("Thanh toán:", billData.paymentMethod)
            }
            if (template.showReceivedAmount && billData.receivedAmount > 0) {
                lineKeyValue("Tiền khách:", formatCurrency(billData.receivedAmount))
            }
            if (template.showChangeAmount && billData.changeAmount > 0) {
                lineKeyValue("Tiền thừa:", formatCurrency(billData.changeAmount))
            }

            // ============ QR CODE (theo config) ============
            if (template.showQrCode) {
                feed(1)
                val qrContent = when (template.qrCodeType) {
                    "order_id" -> billData.orderNumber
                    "custom" -> template.qrCodeContent ?: billData.orderNumber
                    else -> billData.orderNumber
                }
                qrCode(qrContent)
            }

            // ============ BARCODE (theo config) ============
            if (template.showBarcode) {
                feed(1)
                barcode(billData.orderNumber)
            }

            // ============ WIFI INFO (theo config) ============
            if (template.showWifiInfo && template.wifiName != null) {
                separator()
                lineCenter("WiFi: ${template.wifiName} / ${template.wifiPassword ?: ""}")
            }

            // ============ FOOTER ============
            separator()
            lineCenter(template.thankYouMessage)
            lineCenter(template.comebackMessage)
            template.footerText?.let { lineCenter(it) }

            // ============ PRINTER ACTIONS ============
            // Feed đủ nhiều để đẩy footer ra khỏi vị trí cắt (5-6 dòng)
            feed(6)
            if (template.cutPaper) {
                cut()
            }
            if (template.openCashDrawer) {
                openCashDrawer()
            }
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
