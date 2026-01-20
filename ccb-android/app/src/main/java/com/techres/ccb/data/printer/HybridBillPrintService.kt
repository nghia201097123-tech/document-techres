package com.techres.ccb.data.printer

import android.util.Log
import com.techres.ccb.data.local.entity.BillPrinterConfigEntity
import com.techres.ccb.data.local.entity.BillTemplateEntity
import com.techres.ccb.data.local.entity.BillTemplateType
import com.techres.ccb.printer.adapter.SunmiPrinterAdapter
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
 * SINGLE CANVAS RENDERING (v2.0):
 * - Render toàn bộ bill trên 1 canvas duy nhất
 * - Giảm GC pressure và jitter
 * - In mượt hơn với line spacing đồng nhất
 *
 * @author TechRes
 */
object HybridBillPrintService {
    private const val TAG = "HybridBillPrintService"
    private val currencyFormat = DecimalFormat("#,###")

    // Flag to enable Single Canvas Rendering (default: true for better performance)
    private var useSingleCanvasRendering = true

    /**
     * Enable/disable Single Canvas Rendering mode
     * Single Canvas: render toàn bộ bill trên 1 bitmap (ít jitter, mượt hơn)
     * Legacy: render từng dòng riêng (compatible với máy in cũ)
     */
    fun setSingleCanvasMode(enabled: Boolean) {
        useSingleCanvasRendering = enabled
        Log.d(TAG, "Single Canvas Rendering: ${if (enabled) "ENABLED" else "DISABLED"}")
    }

    fun isSingleCanvasMode(): Boolean = useSingleCanvasRendering

    // Sunmi printer adapter instance (lazy init)
    private var sunmiAdapter: SunmiPrinterAdapter? = null

    /**
     * Initialize Sunmi adapter (call from Application or PrinterModule)
     */
    fun initSunmiAdapter(adapter: SunmiPrinterAdapter) {
        sunmiAdapter = adapter
    }

    /**
     * In bill với template và config
     *
     * Hỗ trợ 2 loại máy in:
     * 1. MÁY IN LIỀN THÂN (Sunmi built-in): connectionType = "sunmi"
     *    - Sử dụng Sunmi SDK (AIDL interface)
     *    - Không cần IP, tự động kết nối qua service
     *
     * 2. MÁY IN RỜI (Network printer): connectionType = "network"
     *    - Sử dụng TCP/IP socket (giống kitchen ticket)
     *    - Cần cấu hình IP và port
     *    - Hỗ trợ các máy: EPSON, BIXOLON, XPRINTER, v.v.
     */
    suspend fun printBill(
        printerConfig: BillPrinterConfigEntity,
        template: BillTemplateEntity,
        billData: BillData
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            var lastError: String? = null

            Log.d(TAG, "=== PRINT BILL ===")
            Log.d(TAG, "Connection type: ${printerConfig.connectionType}")
            Log.d(TAG, "Order: ${billData.displayNumber}, ${billData.items.size} items")

            // ========== MÁY IN LIỀN THÂN (SUNMI) ==========
            if (printerConfig.connectionType == "sunmi") {
                Log.d(TAG, "Using SUNMI BUILT-IN printer")

                // Cảnh báo nếu config sunmi nhưng có IP -> có thể cấu hình sai
                if (!printerConfig.printerIp.isNullOrBlank()) {
                    Log.w(TAG, "⚠️ CẢNH BÁO: connectionType='sunmi' nhưng có IP '${printerConfig.printerIp}'")
                    Log.w(TAG, "⚠️ Nếu máy in rời (WiFi/LAN), hãy đổi connectionType='network' để in mượt hơn!")
                    Log.w(TAG, "⚠️ Sunmi adapter có thể gây giật khi in qua AIDL interface")
                }

                return@withContext printViaSunmi(printerConfig, template, billData)
            }

            // ========== MÁY IN RỜI (NETWORK) ==========
            Log.d(TAG, "Using NETWORK printer: ${printerConfig.printerIp}:${printerConfig.printerPort}")

            // Detect printer capability for network printers
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
     * In bill qua Sunmi Built-in Printer
     *
     * SINGLE WRITE (giống phiếu bếp):
     * - Gửi toàn bộ data trong 1 lệnh write duy nhất
     * - Đợi máy in xử lý sau khi gửi xong
     *
     * Flow: connect → single write → delay → complete
     */
    private suspend fun printViaSunmi(
        config: BillPrinterConfigEntity,
        template: BillTemplateEntity,
        billData: BillData
    ): PrinterResult {
        val adapter = sunmiAdapter ?: return PrinterResult.Error("Sunmi adapter chưa được khởi tạo")

        return try {
            // Kết nối đến máy in Sunmi
            val connectResult = adapter.connect()
            if (connectResult is com.techres.ccb.printer.core.PrinterResult.Error) {
                return PrinterResult.Error("Không thể kết nối máy in Sunmi: ${connectResult.message}")
            }

            // Generate bill content với cùng settings như kitchen ticket
            val capability = PrinterCapability(
                printerIp = "sunmi_inner",
                printerPort = 0,
                supportVietnameseUtf8 = false, // Force bitmap mode
                printerModel = adapter.getSunmiModel()
            )
            val billContent = generateHybridBill(config, template, billData, capability)

            Log.d(TAG, "Sunmi bill content size: ${billContent.size} bytes (SINGLE WRITE)")

            // In từng bản riêng biệt
            repeat(config.numberOfCopies) { copyIndex ->
                // SINGLE WRITE: Gửi toàn bộ data trong 1 lần (giống phiếu bếp)
                val writeResult = adapter.write(billContent)
                if (writeResult is com.techres.ccb.printer.core.PrinterResult.Error) {
                    Log.w(TAG, "Copy ${copyIndex + 1} failed: ${writeResult.message}")
                    return PrinterResult.Error("Lỗi gửi dữ liệu in: ${writeResult.message}")
                }

                Log.d(TAG, "Sunmi print copy ${copyIndex + 1}/${config.numberOfCopies}: ${billContent.size} bytes sent")

                // Đợi máy in xử lý xong
                delay(800)

                // Delay giữa các bản
                if (copyIndex < config.numberOfCopies - 1) {
                    delay(300)
                }
            }

            Log.d(TAG, "Sunmi print successful (SINGLE WRITE): ${config.numberOfCopies} copies")
            PrinterResult.Success("In bill thành công!")
        } catch (e: Exception) {
            Log.e(TAG, "Sunmi print error: ${e.message}", e)
            PrinterResult.Error("Lỗi in Sunmi: ${e.message}")
        }
    }

    /**
     * In bill qua Network (TCP/IP)
     *
     * SINGLE WRITE (giống phiếu bếp - đã proven hoạt động tốt):
     * - Gửi toàn bộ data trong 1 lệnh write duy nhất
     * - tcpNoDelay = true: Gửi ngay, không đợi Nagle buffer
     * - Delay sau khi gửi để máy in xử lý
     *
     * Mỗi bản copy được in trong kết nối riêng để đảm bảo ổn định
     */
    private suspend fun printViaNetwork(
        config: BillPrinterConfigEntity,
        billContent: ByteArray
    ): PrinterResult {
        val ip = config.printerIp ?: return PrinterResult.Error("Chưa cấu hình IP máy in")

        // In từng bản trong kết nối riêng (giống kitchen ticket)
        repeat(config.numberOfCopies) { copyIndex ->
            val result = printSingleCopy(ip, config.printerPort, config.connectionTimeoutMs, billContent)
            if (result is PrinterResult.Error) {
                return result
            }
            // Delay giữa các bản
            if (copyIndex < config.numberOfCopies - 1) {
                delay(300)
            }
        }

        return PrinterResult.Success("In bill thành công!")
    }

    /**
     * In 1 bản bill qua Network
     *
     * SINGLE WRITE (giống phiếu bếp - đã proven hoạt động tốt):
     * - Gửi toàn bộ data trong 1 lệnh write duy nhất
     * - tcpNoDelay = true để gửi ngay, không buffer
     * - Delay sau khi gửi xong để máy in xử lý
     *
     * Flow: connect → single write → flush → delay → close
     */
    private suspend fun printSingleCopy(
        ip: String,
        port: Int,
        timeoutMs: Int,
        content: ByteArray
    ): PrinterResult {
        var socket: Socket? = null
        var outputStream: OutputStream? = null

        Log.d(TAG, "=== START PRINT BILL (NETWORK - SINGLE WRITE) ===")
        Log.d(TAG, "Target: $ip:$port")
        Log.d(TAG, "Content size: ${content.size} bytes")

        return try {
            Log.d(TAG, "Creating socket...")
            socket = Socket().apply {
                reuseAddress = true
                keepAlive = true
                // tcpNoDelay = true: Gửi ngay, không đợi Nagle buffer (giống phiếu bếp)
                tcpNoDelay = true
                setSoLinger(true, 2)
            }

            Log.d(TAG, "Connecting to $ip:$port...")
            socket.connect(InetSocketAddress(ip, port), timeoutMs)
            Log.d(TAG, "Connected successfully!")

            outputStream = socket.getOutputStream()
            Log.d(TAG, "Got output stream, writing ${content.size} bytes...")

            // SINGLE WRITE: Gửi toàn bộ data trong 1 lần (giống phiếu bếp)
            outputStream.write(content)
            Log.d(TAG, "Write completed, flushing...")
            outputStream.flush()
            Log.d(TAG, "Flush completed!")

            // Đợi máy in xử lý xong bitmap data
            // Bill có nhiều content hơn phiếu bếp nên cần thời gian lâu hơn
            Log.d(TAG, "Waiting 800ms for printer to process...")
            delay(800)

            Log.d(TAG, "=== PRINT BILL SUCCESS (SINGLE WRITE) ===")
            PrinterResult.Success("OK")
        } catch (e: Exception) {
            Log.e(TAG, "=== PRINT BILL FAILED ===")
            Log.e(TAG, "Error type: ${e.javaClass.simpleName}")
            Log.e(TAG, "Error message: ${e.message}")
            PrinterResult.Error("Lỗi in: ${e.message}")
        } finally {
            try {
                Log.d(TAG, "Closing connection...")
                outputStream?.flush()
                socket?.shutdownOutput()
                outputStream?.close()
                socket?.close()
                Log.d(TAG, "Connection closed")
            } catch (e: Exception) {
                Log.e(TAG, "Close error: ${e.message}")
            }
        }
    }

    /**
     * Generate bill content với Hybrid approach
     * Sử dụng paperWidth, fontSize, lineSpacing từ printerConfig (user config trong app)
     * Các config hiển thị (labels, show flags) từ template (web dashboard)
     */
    private fun generateHybridBill(
        printerConfig: BillPrinterConfigEntity,
        template: BillTemplateEntity,
        billData: BillData,
        capability: PrinterCapability
    ): ByteArray {
        // Luôn dùng bitmap mode để đảm bảo tiếng Việt hiển thị đúng
        val useBitmapMode = !capability.supportVietnameseUtf8

        // Sử dụng settings từ printerConfig (đã được user chọn trong app)
        val paperWidth = printerConfig.paperWidth
        val fontSize = printerConfig.fontSize
        val lineSpacing = printerConfig.lineSpacing

        // Sử dụng Single Canvas Rendering nếu được bật (mặc định ON)
        return if (useSingleCanvasRendering && useBitmapMode) {
            Log.d(TAG, "Using SINGLE CANVAS RENDERING mode")
            generateBillWithSingleCanvas(paperWidth, fontSize, lineSpacing, template, billData)
        } else {
            Log.d(TAG, "Using LEGACY per-line rendering mode")
            generateBillFromConfig(paperWidth, fontSize, lineSpacing, template, billData, useBitmapMode)
        }
    }

    /**
     * Generate bill sử dụng Single Canvas Rendering
     *
     * SINGLE CANVAS RENDERING:
     * - Render toàn bộ bill trên 1 canvas/bitmap duy nhất
     * - Giảm GC pressure (chỉ tạo 1 bitmap lớn thay vì nhiều bitmap nhỏ)
     * - In mượt hơn (gửi 1 khối data liên tục)
     * - Line spacing chính xác và đồng nhất
     * - Tránh jitter do timing giữa các bitmap renders
     */
    private fun generateBillWithSingleCanvas(
        paperWidth: Int,
        fontSize: String,
        lineSpacing: Float,
        template: BillTemplateEntity,
        billData: BillData
    ): ByteArray {
        Log.d(TAG, "Generating bill with SINGLE CANVAS: ${billData.displayNumber}, ${billData.items.size} items")

        // Chuyển đổi fontSize từ string sang fontScale float
        val fontScale = when (fontSize) {
            "extra_small" -> 0.7f
            "small" -> 0.85f
            "large" -> 1.2f
            "extra_large" -> 1.4f
            else -> 1.0f // normal/medium
        }

        val builder = SingleCanvasBillBuilder(
            paperWidth = paperWidth,
            fontScale = fontScale,
            lineSpacing = lineSpacing
        )

        builder.apply {
            init()

            // ============ HEADER ============
            lineDouble(template.storeName, BitmapTextStyle(centerAlign = true))

            template.storeAddress?.let { lineCenter(it) }
            template.storePhone?.let { lineCenter("ĐT: $it") }
            template.taxCode?.let { lineCenter("MST: $it") }
            template.headerText?.let { lineCenter(it) }

            doubleSeparator()

            // ============ BILL TITLE ============
            if (billData.isTemporaryBill) {
                lineDouble("*** BILL TẠM ***", BitmapTextStyle(centerAlign = true))
                doubleSeparator()
                lineCenter("Lần in thứ: ${billData.printCount}")
                billData.printTime?.let { printTime ->
                    val timeFormat = SimpleDateFormat("HH:mm:ss dd/MM/yyyy", Locale.getDefault())
                    lineCenter("Thời gian in: ${timeFormat.format(printTime)}")
                }
                lineCenter("(Chưa thanh toán)")
                separator()
            } else if (billData.isReprint) {
                lineDouble("*** BẢN SAO ***", BitmapTextStyle(centerAlign = true))
                lineDouble("*** IN LẠI ***", BitmapTextStyle(centerAlign = true))
                doubleSeparator()
                billData.reprintTime?.let { reprintTime ->
                    val timeFormat = SimpleDateFormat("HH:mm:ss dd/MM/yyyy", Locale.getDefault())
                    lineCenter("Thời gian in lại: ${timeFormat.format(reprintTime)}")
                }
                billData.reprintReason?.let { reason ->
                    lineCenter("Lý do: $reason")
                }
                lineCenter("(Đây không phải bill gốc)")
                separator()
                lineDouble(template.billTitle, BitmapTextStyle(centerAlign = true))
                doubleSeparator()
            } else {
                lineDouble(template.billTitle, BitmapTextStyle(centerAlign = true))
                doubleSeparator()
            }

            // ============ ORDER INFO ============
            if (template.showOrderNumber) {
                line("Mã đơn: ${billData.displayNumber}")
            }
            if (template.showTableName && billData.tableName != null) {
                line("Bàn: ${billData.tableName}")
            }
            if (billData.pagerNumber != null) {
                lineBold("Thẻ rung: ${billData.pagerNumber}")
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

            // ============ TIME TRACKING ============
            if (template.showCheckInTime && billData.checkInTime != null) {
                val timeFormat = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault())
                line("${template.checkInLabel}: ${timeFormat.format(billData.checkInTime)}")
            }
            if (template.showCheckOutTime && billData.checkOutTime != null) {
                val timeFormat = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault())
                line("${template.checkOutLabel}: ${timeFormat.format(billData.checkOutTime)}")
            }

            // ============ ORDER NOTE ============
            if (template.showOrderNote && billData.orderNote != null && billData.orderNote.isNotBlank()) {
                lineItalic("Ghi chú: ${billData.orderNote}")
            }

            separator()

            // ============ ITEMS ============
            billData.items.forEach { item ->
                val toppingTotal = item.variants.sumOf { it.priceAdjustment } +
                        item.toppings.sumOf { it.price * it.quantity }
                val basePrice = if (toppingTotal > 0 && item.originalPrice > 0) {
                    (item.originalPrice - toppingTotal).coerceAtLeast(0.0)
                } else {
                    item.originalPrice
                }

                val quantityPart = if (template.showQuantity) "x${item.quantity}" else ""
                val pricePart = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""

                if (quantityPart.isNotEmpty() && pricePart.isNotEmpty()) {
                    lineKeyValue(item.name, "$quantityPart  $pricePart", BitmapTextStyle(bold = true))
                } else if (quantityPart.isNotEmpty()) {
                    lineKeyValue(item.name, quantityPart, BitmapTextStyle(bold = true))
                } else if (pricePart.isNotEmpty()) {
                    lineKeyValue(item.name, pricePart, BitmapTextStyle(bold = true))
                } else {
                    lineBold(item.name)
                }

                if (template.showUnitPrice && basePrice > 0 && toppingTotal > 0) {
                    line("   ${formatCurrency(basePrice)}")
                }

                if (item.variants.isNotEmpty()) {
                    item.variants.forEach { variant ->
                        if (template.showUnitPrice && variant.priceAdjustment != 0.0) {
                            val adjustSign = if (variant.priceAdjustment > 0) "+" else ""
                            lineKeyValue("   ${variant.name}", "${adjustSign}${formatCurrency(variant.priceAdjustment)}")
                        } else {
                            line("   ${variant.name}")
                        }
                    }
                }

                if (item.toppings.isNotEmpty()) {
                    item.toppings.forEach { topping ->
                        val toppingPrice = topping.price * topping.quantity
                        if (template.showUnitPrice && toppingPrice > 0) {
                            if (topping.quantity > 1) {
                                lineKeyValue("   + ${topping.name} x${topping.quantity}", "+${formatCurrency(toppingPrice)}")
                            } else {
                                lineKeyValue("   + ${topping.name}", "+${formatCurrency(toppingPrice)}")
                            }
                        } else {
                            if (topping.quantity > 1) {
                                line("   + ${topping.name} x${topping.quantity}")
                            } else {
                                line("   + ${topping.name}")
                            }
                        }
                    }
                }

                if (template.showItemCode && item.code != null) {
                    line("   Mã: ${item.code}")
                }

                if (template.showItemNote && item.note != null) {
                    lineItalic("   Ghi chú: ${item.note}")
                }

                val hasItemDiscount = item.discountAmount > 0
                if (hasItemDiscount && template.showItemDiscount) {
                    val discountLabel = if (item.discountType == "percent" && item.discountPercent > 0) {
                        "   → Giảm ${item.discountPercent.toInt()}%:"
                    } else {
                        "   → Giảm:"
                    }
                    lineKeyValue(discountLabel, "-${formatCurrency(item.discountAmount)}")
                }
            }

            separator()

            // ============ TOTALS ============
            if (template.showSubtotal) {
                val itemCount = billData.items.size
                lineKeyValue("Tạm tính ($itemCount món):", formatCurrency(billData.subtotal))
            }

            // ============ 4 LOẠI GIẢM GIÁ ============
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

            if (template.showTotalDiscount && billData.totalDiscountAmount > 0) {
                lineKeyValue("${template.totalDiscountLabel}:", "-${formatCurrency(billData.totalDiscountAmount)}")
            }

            // ============ PHỤ THU ============
            if (billData.surchargeItems.isNotEmpty()) {
                billData.surchargeItems.forEach { item ->
                    val itemText = if (item.quantity > 1) {
                        "Phụ thu: ${item.name} x${item.quantity}"
                    } else {
                        "Phụ thu: ${item.name}"
                    }
                    lineKeyValue(itemText, "+${formatCurrency(item.totalAmount)}")
                }
            } else if (billData.surchargeAmount > 0) {
                lineKeyValue("Phụ thu:", "+${formatCurrency(billData.surchargeAmount)}")
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

            // ============ VAT INFO ============
            if (template.showVatDetails) {
                if (template.showPriceBeforeVat) {
                    lineKeyValue("${template.priceBeforeVatLabel}:", formatCurrency(billData.priceBeforeVat))
                }
                if (template.showVat && billData.vatAmount > 0) {
                    lineKeyValue("${template.vatLabel}:", formatCurrency(billData.vatAmount))
                }
                if (template.showPriceAfterVat) {
                    lineKeyValue("${template.priceAfterVatLabel}:", formatCurrency(billData.priceAfterVat))
                }
            } else if (template.showVat && billData.vatAmount > 0) {
                lineKeyValue("${template.vatLabel}:", formatCurrency(billData.vatAmount))
            }

            doubleSeparator()

            // ============ TOTAL ============
            if (billData.isTemporaryBill) {
                lineKeyValue("TỔNG TẠM TÍNH:", formatCurrency(billData.totalAmount), BitmapTextStyle(bold = true))
            } else {
                lineKeyValue("TỔNG CỘNG:", formatCurrency(billData.totalAmount), BitmapTextStyle(bold = true))
            }

            // ============ PAYMENT INFO ============
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

            // ============ QR CODE ============
            if (template.showQrCode) {
                val qrContent = when (template.qrCodeType) {
                    "order_id" -> billData.orderNumber
                    "custom" -> template.qrCodeContent ?: billData.orderNumber
                    else -> billData.orderNumber
                }
                qrCode(qrContent)
            }

            // ============ BARCODE ============
            if (template.showBarcode) {
                barcode(billData.orderNumber)
            }

            // ============ WIFI INFO ============
            if (template.showWifiInfo && template.wifiName != null) {
                separator()
                lineCenter("WiFi: ${template.wifiName} / ${template.wifiPassword ?: ""}")
            }

            // ============ FOOTER ============
            separator()
            if (billData.isTemporaryBill) {
                lineCenter("*** ĐÂY LÀ BILL TẠM ***")
                lineCenter("Vui lòng thanh toán tại quầy")
                lineCenter("để nhận hóa đơn chính thức")
            } else {
                lineCenter(template.thankYouMessage)
                lineCenter(template.comebackMessage)
                template.footerText?.let { lineCenter(it) }
            }

            // ============ PRINTER ACTIONS ============
            feed(5)
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
     * Generate bill theo đúng config
     * paperWidth, fontSize, lineSpacing: Lấy từ printerConfig (được user chọn trong app)
     * template: Chứa các config hiển thị labels, show flags (từ web dashboard)
     *
     * Format y chang web-dashboard preview:
     * - 4 loại giảm giá với label từ template config
     * - Time tracking (giờ vào/ra)
     * - Variants và toppings riêng biệt
     */
    private fun generateBillFromConfig(
        paperWidth: Int,
        fontSize: String,
        lineSpacing: Float,
        template: BillTemplateEntity,
        billData: BillData,
        useBitmapMode: Boolean
    ): ByteArray {
        // Minimal logging for performance (chi tiết logging đã được disable để in mượt hơn)
        Log.d(TAG, "Generating bill: ${billData.displayNumber}, ${billData.items.size} items, $paperWidth mm, bitmap=$useBitmapMode")

        // Chuyển đổi fontSize từ string sang fontScale float
        // Sử dụng fontSize từ printerConfig (user đã chọn trong app)
        val fontScale = when (fontSize) {
            "extra_small" -> 0.7f
            "small" -> 0.85f
            "large" -> 1.2f
            "extra_large" -> 1.4f
            else -> 1.0f // normal/medium
        }

        // Sử dụng GS v 0 (raster bitmap) thay vì ESC * để tránh khoảng trắng thừa
        // GS v 0 gửi toàn bộ bitmap trong 1 lệnh, không có LF giữa các strip
        // Điều này giúp loại bỏ hoàn toàn vấn đề line spacing giữa các bitmap
        // (Giống cách in phiếu bếp đã được fix)
        val useRasterBitmap = true

        val builder = HybridBillBuilder(
            paperWidth = paperWidth,
            useBitmapMode = useBitmapMode,
            useRasterBitmap = useRasterBitmap,
            fontScale = fontScale,
            lineSpacing = lineSpacing // Sử dụng lineSpacing từ printerConfig
        )

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
            } else if (billData.isReprint) {
                // Bill in lại - đánh dấu rõ ràng để tránh gian lận
                lineDouble("*** BẢN SAO ***", BitmapTextStyle(centerAlign = true))
                lineDouble("*** IN LẠI ***", BitmapTextStyle(centerAlign = true))
                doubleSeparator()

                // Hiển thị thời gian in lại
                billData.reprintTime?.let { reprintTime ->
                    val timeFormat = SimpleDateFormat("HH:mm:ss dd/MM/yyyy", Locale.getDefault())
                    lineCenter("Thời gian in lại: ${timeFormat.format(reprintTime)}")
                }
                billData.reprintReason?.let { reason ->
                    lineCenter("Lý do: $reason")
                }
                lineCenter("(Đây không phải bill gốc)")

                separator()
                lineDouble(template.billTitle, BitmapTextStyle(centerAlign = true))
                doubleSeparator()
            } else {
                // Bill chính thức
                lineDouble(template.billTitle, BitmapTextStyle(centerAlign = true))
                doubleSeparator()
            }

            // ============ ORDER INFO ============
            if (template.showOrderNumber) {
                line("Mã đơn: ${billData.displayNumber}")
            }
            if (template.showTableName && billData.tableName != null) {
                line("Bàn: ${billData.tableName}")
            }
            // Pager number (Thẻ rung)
            if (billData.pagerNumber != null) {
                lineBold("Thẻ rung: ${billData.pagerNumber}")
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

            // ============ ORDER NOTE - Ghi chú đơn hàng (theo config) ============
            if (template.showOrderNote && billData.orderNote != null && billData.orderNote.isNotBlank()) {
                lineItalic("Ghi chú: ${billData.orderNote}")
            }

            separator()

            // ============ ITEMS (format giống phiếu bếp - hiển thị giá tổng trên dòng đầu) ============
            billData.items.forEach { item ->
                // Tính topping total để biết giá gốc
                val toppingTotal = item.variants.sumOf { it.priceAdjustment } +
                                   item.toppings.sumOf { it.price * it.quantity }
                val basePrice = if (toppingTotal > 0 && item.originalPrice > 0) {
                    (item.originalPrice - toppingTotal).coerceAtLeast(0.0)
                } else {
                    item.originalPrice
                }

                // 1. Dòng đầu: Tên món + Số lượng + Giá TỔNG (giống phiếu bếp)
                val quantityPart = if (template.showQuantity) "x${item.quantity}" else ""
                val pricePart = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""

                if (quantityPart.isNotEmpty() && pricePart.isNotEmpty()) {
                    lineKeyValue(item.name, "$quantityPart  $pricePart", BitmapTextStyle(bold = true))
                } else if (quantityPart.isNotEmpty()) {
                    lineKeyValue(item.name, quantityPart, BitmapTextStyle(bold = true))
                } else if (pricePart.isNotEmpty()) {
                    lineKeyValue(item.name, pricePart, BitmapTextStyle(bold = true))
                } else {
                    lineBold(item.name)
                }

                // 2. Giá gốc bên trái (nếu có topping/variant có giá và showUnitPrice)
                if (template.showUnitPrice && basePrice > 0 && toppingTotal > 0) {
                    line("   ${formatCurrency(basePrice)}")
                }

                // 3. Variants - chỉ indent, không dùng bullet (chỉ toppings mới có "+")
                if (item.variants.isNotEmpty()) {
                    item.variants.forEach { variant ->
                        if (template.showUnitPrice && variant.priceAdjustment != 0.0) {
                            val adjustSign = if (variant.priceAdjustment > 0) "+" else ""
                            lineKeyValue("   ${variant.name}", "${adjustSign}${formatCurrency(variant.priceAdjustment)}")
                        } else {
                            line("   ${variant.name}")
                        }
                    }
                }

                // 4. Toppings - dùng "+" prefix
                if (item.toppings.isNotEmpty()) {
                    item.toppings.forEach { topping ->
                        val toppingPrice = topping.price * topping.quantity
                        if (template.showUnitPrice && toppingPrice > 0) {
                            if (topping.quantity > 1) {
                                lineKeyValue("   + ${topping.name} x${topping.quantity}", "+${formatCurrency(toppingPrice)}")
                            } else {
                                lineKeyValue("   + ${topping.name}", "+${formatCurrency(toppingPrice)}")
                            }
                        } else {
                            if (topping.quantity > 1) {
                                line("   + ${topping.name} x${topping.quantity}")
                            } else {
                                line("   + ${topping.name}")
                            }
                        }
                    }
                }

                // 5. Item code (optional)
                if (template.showItemCode && item.code != null) {
                    line("   Mã: ${item.code}")
                }

                // 6. Item note (optional) - in nghiêng để nổi bật
                if (template.showItemNote && item.note != null) {
                    lineItalic("   Ghi chú: ${item.note}")
                }

                // 7. Giảm giá trên món (nếu có)
                val hasItemDiscount = item.discountAmount > 0
                if (hasItemDiscount && template.showItemDiscount) {
                    val discountLabel = if (item.discountType == "percent" && item.discountPercent > 0) {
                        "   → Giảm ${item.discountPercent.toInt()}%:"
                    } else {
                        "   → Giảm:"
                    }
                    lineKeyValue(discountLabel, "-${formatCurrency(item.discountAmount)}")
                }
                // Bỏ dòng "Thành tiền" vì đã hiển thị giá tổng trên dòng đầu (giống phiếu bếp)
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

            // ============ PHỤ THU (CHI TIẾT) ============
            if (billData.surchargeItems.isNotEmpty()) {
                // Hiển thị từng món phụ thu
                billData.surchargeItems.forEach { item ->
                    val itemText = if (item.quantity > 1) {
                        "Phụ thu: ${item.name} x${item.quantity}"
                    } else {
                        "Phụ thu: ${item.name}"
                    }
                    lineKeyValue(itemText, "+${formatCurrency(item.totalAmount)}")
                }
            } else if (billData.surchargeAmount > 0) {
                // Fallback: nếu không có chi tiết, hiển thị tổng
                lineKeyValue("Phụ thu:", "+${formatCurrency(billData.surchargeAmount)}")
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
                    lineKeyValue("${template.vatLabel}:", formatCurrency(billData.vatAmount))
                }
                if (template.showPriceAfterVat) {
                    lineKeyValue("${template.priceAfterVatLabel}:", formatCurrency(billData.priceAfterVat))
                }
            } else if (template.showVat && billData.vatAmount > 0) {
                // Chỉ hiện VAT nếu không hiện chi tiết
                lineKeyValue("${template.vatLabel}:", formatCurrency(billData.vatAmount))
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
                // Bỏ feed(1) để tiết kiệm giấy
                val qrContent = when (template.qrCodeType) {
                    "order_id" -> billData.orderNumber
                    "custom" -> template.qrCodeContent ?: billData.orderNumber
                    else -> billData.orderNumber
                }
                qrCode(qrContent)
            }

            // ============ BARCODE (theo config) ============
            if (template.showBarcode) {
                // Bỏ feed(1) để tiết kiệm giấy
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
            // Feed đủ để footer không bị cắt (5 dòng để đảm bảo "Hẹn gặp lại" không bị mất)
            feed(5)
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
