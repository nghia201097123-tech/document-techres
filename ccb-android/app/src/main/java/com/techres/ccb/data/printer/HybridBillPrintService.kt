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
     *
     * Format y chang web-dashboard preview:
     * - 4 loại giảm giá với label từ template config
     * - Time tracking (giờ vào/ra)
     * - Variants và toppings riêng biệt
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

            // ============ BILL TITLE - Phân biệt bill tạm và bill chính thức ============
            if (billData.isTemporaryBill) {
                // Bill tạm - hiển thị khác biệt
                lineDouble("*** BILL TẠM ***", BitmapTextStyle(centerAlign = true))
                doubleSeparator()

                // Hiển thị thông tin lần in và thời gian
                lineCenter("Lần in thứ: ${billData.printCount}")
                billData.printTime?.let { printTime ->
                    val timeFormat = SimpleDateFormat("HH:mm:ss dd/MM/yyyy", Locale.getDefault())
                    lineCenter("Thời gian in: ${timeFormat.format(printTime)}")
                }
                lineCenter("(Chưa thanh toán)")

                separator()
            } else {
                // Bill chính thức
                lineDouble(template.billTitle, BitmapTextStyle(centerAlign = true))
                doubleSeparator()
            }

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

            // ============ TIME TRACKING (theo config) ============
            if (template.showCheckInTime && billData.checkInTime != null) {
                val timeFormat = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault())
                line("${template.checkInLabel}: ${timeFormat.format(billData.checkInTime)}")
            }
            if (template.showCheckOutTime && billData.checkOutTime != null) {
                val timeFormat = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault())
                line("${template.checkOutLabel}: ${timeFormat.format(billData.checkOutTime)}")
            }

            separator()

            // ============ ITEMS (theo đúng format web-dashboard preview) ============
            billData.items.forEach { item ->
                // 1. Dòng đầu: Tên món + badge số lượng bên phải (ví dụ: "Ô long macchiato" "x3")
                lineKeyValue(item.name, "x${item.quantity}", BitmapTextStyle(bold = true))

                // 2. Giá gốc (trước khi tính variant/discount)
                line("Giá gốc: ${formatCurrency(item.originalPrice)}")

                // 3. Variants - dùng "•" prefix, chỉ hiện giá nếu != 0
                if (item.variants.isNotEmpty()) {
                    item.variants.forEach { variant ->
                        if (variant.priceAdjustment != 0.0) {
                            val adjustSign = if (variant.priceAdjustment > 0) "+" else ""
                            lineKeyValue("• ${variant.name}", "${adjustSign}${formatCurrency(variant.priceAdjustment)}")
                        } else {
                            line("• ${variant.name}")
                        }
                    }
                }

                // 4. Item code (optional)
                if (template.showItemCode && item.code != null) {
                    line("Mã: ${item.code}")
                }

                // 5. Item note (optional)
                if (template.showItemNote && item.note != null) {
                    line("Ghi chú: ${item.note}")
                }

                // 6. Toppings - dùng "+" prefix
                if (item.toppings.isNotEmpty()) {
                    item.toppings.forEach { topping ->
                        val toppingPrice = topping.price * topping.quantity
                        if (topping.quantity > 1) {
                            lineKeyValue("+ ${topping.name} x${topping.quantity}", "+${formatCurrency(toppingPrice)}")
                        } else {
                            lineKeyValue("+ ${topping.name}", "+${formatCurrency(toppingPrice)}")
                        }
                    }
                }

                // 7. Giảm giá trên món (nếu có)
                val hasItemDiscount = item.discountAmount > 0
                if (hasItemDiscount && template.showItemDiscount) {
                    val discountLabel = if (item.discountPercent > 0) {
                        "→ Giảm ${item.discountPercent.toInt()}%:"
                    } else {
                        "→ Giảm:"
                    }
                    lineKeyValue(discountLabel, "-${formatCurrency(item.discountAmount)}")
                }

                // 8. Thành tiền (cuối mỗi món)
                if (item.quantity > 1) {
                    // Hiển thị chi tiết: "Thành tiền (3 x 48,000): 144,000"
                    val unitPriceAfterDiscount = item.totalPrice / item.quantity
                    lineKeyValue("Thành tiền (${item.quantity} x ${formatCurrency(unitPriceAfterDiscount)}):", formatCurrency(item.totalPrice))
                } else {
                    lineKeyValue("Thành tiền:", formatCurrency(item.totalPrice))
                }

                // Dòng trống giữa các món
                line("")
            }

            separator()

            // ============ TOTALS - TỔNG KẾT ============
            // 1. Tạm tính với số lượng món
            if (template.showSubtotal) {
                val itemCount = billData.items.size
                lineKeyValue("Tạm tính ($itemCount món):", formatCurrency(billData.subtotal))
            }

            // ============ 4 LOẠI GIẢM GIÁ (theo đúng config web-dashboard) ============
            // 1. Giảm giá món (Item Discount) - dùng label từ template
            if (template.showTotalItemDiscount && billData.itemDiscountAmount > 0) {
                lineKeyValue("${template.itemDiscountLabel}:", "-${formatCurrency(billData.itemDiscountAmount)}")
            }

            // 2. Giảm giá hóa đơn (Bill Discount) - dùng label từ template
            if (template.showBillDiscount && billData.billDiscountAmount > 0) {
                val billDiscountText = if (template.showDiscountPercent && billData.billDiscountPercent > 0) {
                    "${template.billDiscountLabel} (${billData.billDiscountPercent.toInt()}%):"
                } else {
                    "${template.billDiscountLabel}:"
                }
                lineKeyValue(billDiscountText, "-${formatCurrency(billData.billDiscountAmount)}")
            }

            // 3. Coupon - dùng label từ template + mã coupon
            if (template.showCouponDiscount && billData.couponDiscountAmount > 0) {
                val couponText = if (billData.couponCode != null) {
                    "${template.couponDiscountLabel} (${billData.couponCode}):"
                } else {
                    "${template.couponDiscountLabel}:"
                }
                lineKeyValue(couponText, "-${formatCurrency(billData.couponDiscountAmount)}")
            }

            // 4. Voucher - dùng label từ template + mã voucher
            if (template.showVoucherDiscount && billData.voucherDiscountAmount > 0) {
                val voucherText = if (billData.voucherCode != null) {
                    "${template.voucherDiscountLabel} (${billData.voucherCode}):"
                } else {
                    "${template.voucherDiscountLabel}:"
                }
                lineKeyValue(voucherText, "-${formatCurrency(billData.voucherDiscountAmount)}")
            }

            // 5. Tổng giảm giá (nếu có nhiều loại giảm giá)
            if (template.showTotalDiscount && billData.totalDiscountAmount > 0) {
                lineKeyValue("${template.totalDiscountLabel}:", "-${formatCurrency(billData.totalDiscountAmount)}")
            }

            // ============ PHÍ DỊCH VỤ ============
            if (template.showServiceFee && billData.serviceFee > 0) {
                val serviceFeeText = if (billData.serviceFeePercent > 0) {
                    "Phí dịch vụ (${billData.serviceFeePercent.toInt()}%):"
                } else {
                    "Phí dịch vụ:"
                }
                lineKeyValue(serviceFeeText, formatCurrency(billData.serviceFee))
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

            doubleSeparator()

            // ============ TOTAL - TỔNG CỘNG ============
            // Font size sẽ được tự động scale trong lineKeyValue với bold = true
            if (billData.isTemporaryBill) {
                lineKeyValue("TỔNG TẠM TÍNH:", formatCurrency(billData.totalAmount), BitmapTextStyle(bold = true))
            } else {
                lineKeyValue("TỔNG CỘNG:", formatCurrency(billData.totalAmount), BitmapTextStyle(bold = true))
            }

            // ============ PAYMENT INFO (chỉ hiển thị cho bill chính thức) ============
            if (!billData.isTemporaryBill) {
                if (template.showPaymentMethod) {
                    lineKeyValue("Thanh toán:", billData.paymentMethod)
                }
                if (template.showReceivedAmount && billData.receivedAmount > 0) {
                    lineKeyValue("Tiền khách:", formatCurrency(billData.receivedAmount))
                }
                if (template.showChangeAmount && billData.changeAmount > 0) {
                    lineKeyValue("Tiền thừa:", formatCurrency(billData.changeAmount))
                }
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
            if (billData.isTemporaryBill) {
                // Footer cho bill tạm
                lineCenter("*** ĐÂY LÀ BILL TẠM ***")
                lineCenter("Vui lòng thanh toán tại quầy")
                lineCenter("để nhận hóa đơn chính thức")
            } else {
                // Footer cho bill chính thức
                lineCenter(template.thankYouMessage)
                lineCenter(template.comebackMessage)
                template.footerText?.let { lineCenter(it) }
            }

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
