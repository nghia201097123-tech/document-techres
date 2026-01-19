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
 * @author TechRes
 */
object HybridBillPrintService {
    private const val TAG = "HybridBillPrintService"
    private val currencyFormat = DecimalFormat("#,###")

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
     */
    suspend fun printBill(
        printerConfig: BillPrinterConfigEntity,
        template: BillTemplateEntity,
        billData: BillData
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            var lastError: String? = null

            // Xử lý riêng cho máy in Sunmi tích hợp
            if (printerConfig.connectionType == "sunmi") {
                return@withContext printViaSunmi(printerConfig, template, billData)
            }

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
     * Máy in Sunmi tích hợp luôn hỗ trợ UTF-8 và tiếng Việt tốt
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

            // Generate bill content - Sunmi hỗ trợ UTF-8 tốt, nhưng dùng bitmap để đảm bảo 100%
            val capability = PrinterCapability(
                printerIp = "sunmi_inner", // Dummy IP for internal printer
                printerPort = 0,
                supportVietnameseUtf8 = false, // Force bitmap mode cho Sunmi để đảm bảo tiếng Việt đẹp
                printerModel = adapter.getSunmiModel()
            )
            val billContent = generateHybridBill(config, template, billData, capability)

            // Gửi dữ liệu in
            val writeResult = adapter.write(billContent)
            if (writeResult is com.techres.ccb.printer.core.PrinterResult.Error) {
                return PrinterResult.Error("Lỗi gửi dữ liệu in: ${writeResult.message}")
            }

            // Cắt giấy nếu được bật
            if (config.cutPaper) {
                adapter.cutPaper()
            }

            // Mở ngăn kéo tiền nếu được bật
            if (config.openCashDrawer) {
                adapter.openCashDrawer()
            }

            // In nhiều bản nếu cấu hình
            repeat(config.numberOfCopies - 1) {
                delay(500)
                adapter.write(billContent)
                if (config.cutPaper) {
                    adapter.cutPaper()
                }
            }

            Log.d(TAG, "Sunmi print successful")
            PrinterResult.Success("In bill thành công!")
        } catch (e: Exception) {
            Log.e(TAG, "Sunmi print error: ${e.message}", e)
            PrinterResult.Error("Lỗi in Sunmi: ${e.message}")
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

        return generateBillFromConfig(paperWidth, fontSize, lineSpacing, template, billData, useBitmapMode)
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
        // ============ DEBUG LOGGING ============
        Log.d(TAG, "========== BILL DATA DEBUG ==========")
        Log.d(TAG, "paperWidth: ${paperWidth}mm, useBitmapMode: $useBitmapMode")

        // Order info
        Log.d(TAG, "orderNumber: ${billData.orderNumber}")
        Log.d(TAG, "tableName: ${billData.tableName}")
        Log.d(TAG, "staffName: ${billData.staffName}")
        Log.d(TAG, "customerName: ${billData.customerName}")
        Log.d(TAG, "checkInTime: ${billData.checkInTime}")
        Log.d(TAG, "checkOutTime: ${billData.checkOutTime}")

        // Items
        Log.d(TAG, "items count: ${billData.items.size}")
        billData.items.forEachIndexed { index, item ->
            Log.d(TAG, "--- Item $index ---")
            Log.d(TAG, "  name: ${item.name}")
            Log.d(TAG, "  code: ${item.code}")
            Log.d(TAG, "  quantity: ${item.quantity}")
            Log.d(TAG, "  originalPrice: ${item.originalPrice}")
            Log.d(TAG, "  unitPrice: ${item.unitPrice}")
            Log.d(TAG, "  totalPrice: ${item.totalPrice}")
            Log.d(TAG, "  discountAmount: ${item.discountAmount}")
            Log.d(TAG, "  discountPercent: ${item.discountPercent}")
            Log.d(TAG, "  discountType: ${item.discountType}")
            Log.d(TAG, "  note: ${item.note}")
            Log.d(TAG, "  variants: ${item.variants.map { "${it.name}:${it.priceAdjustment}" }}")
            Log.d(TAG, "  toppings: ${item.toppings.map { "${it.name}:${it.price}x${it.quantity}" }}")
        }

        // Discounts
        Log.d(TAG, "--- Discounts ---")
        Log.d(TAG, "subtotal: ${billData.subtotal}")
        Log.d(TAG, "itemDiscountAmount: ${billData.itemDiscountAmount}")
        Log.d(TAG, "billDiscountAmount: ${billData.billDiscountAmount}")
        Log.d(TAG, "billDiscountPercent: ${billData.billDiscountPercent}")
        Log.d(TAG, "couponDiscountAmount: ${billData.couponDiscountAmount}")
        Log.d(TAG, "couponCode: ${billData.couponCode}")
        Log.d(TAG, "voucherDiscountAmount: ${billData.voucherDiscountAmount}")
        Log.d(TAG, "voucherCode: ${billData.voucherCode}")
        Log.d(TAG, "totalDiscountAmount: ${billData.totalDiscountAmount}")
        Log.d(TAG, "totalItemDiscount (legacy): ${billData.totalItemDiscount}")
        Log.d(TAG, "discountAmount (legacy): ${billData.discountAmount}")
        Log.d(TAG, "discountPercent (legacy): ${billData.discountPercent}")

        // VAT & Total
        Log.d(TAG, "--- VAT & Total ---")
        Log.d(TAG, "surchargeAmount: ${billData.surchargeAmount}")
        Log.d(TAG, "serviceFee: ${billData.serviceFee}")
        Log.d(TAG, "serviceFeePercent: ${billData.serviceFeePercent}")
        Log.d(TAG, "vatRate: ${billData.vatRate}")
        Log.d(TAG, "vatAmount: ${billData.vatAmount}")
        Log.d(TAG, "priceBeforeVat: ${billData.priceBeforeVat}")
        Log.d(TAG, "priceAfterVat: ${billData.priceAfterVat}")
        Log.d(TAG, "totalAmount: ${billData.totalAmount}")

        // Payment
        Log.d(TAG, "--- Payment ---")
        Log.d(TAG, "paymentMethod: ${billData.paymentMethod}")
        Log.d(TAG, "receivedAmount: ${billData.receivedAmount}")
        Log.d(TAG, "changeAmount: ${billData.changeAmount}")

        // Template config
        Log.d(TAG, "--- Template Config ---")
        Log.d(TAG, "showItemDiscount: ${template.showItemDiscount}")
        Log.d(TAG, "showTotalItemDiscount: ${template.showTotalItemDiscount}")
        Log.d(TAG, "itemDiscountLabel: ${template.itemDiscountLabel}")
        Log.d(TAG, "showBillDiscount: ${template.showBillDiscount}")
        Log.d(TAG, "billDiscountLabel: ${template.billDiscountLabel}")
        Log.d(TAG, "showCouponDiscount: ${template.showCouponDiscount}")
        Log.d(TAG, "couponDiscountLabel: ${template.couponDiscountLabel}")
        Log.d(TAG, "showVoucherDiscount: ${template.showVoucherDiscount}")
        Log.d(TAG, "voucherDiscountLabel: ${template.voucherDiscountLabel}")
        Log.d(TAG, "showTotalDiscount: ${template.showTotalDiscount}")
        Log.d(TAG, "totalDiscountLabel: ${template.totalDiscountLabel}")
        Log.d(TAG, "showCheckInTime: ${template.showCheckInTime}")
        Log.d(TAG, "checkInLabel: ${template.checkInLabel}")
        Log.d(TAG, "showCheckOutTime: ${template.showCheckOutTime}")
        Log.d(TAG, "checkOutLabel: ${template.checkOutLabel}")
        // Printer config settings (from app settings)
        Log.d(TAG, "--- Printer Config (from app) ---")
        Log.d(TAG, "fontSize: $fontSize")
        Log.d(TAG, "lineSpacing: $lineSpacing")
        Log.d(TAG, "========== END BILL DATA DEBUG ==========")

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

            // ============ ORDER NOTE - Ghi chú đơn hàng (theo config) ============
            if (template.showOrderNote && billData.orderNote != null && billData.orderNote.isNotBlank()) {
                lineItalic("Ghi chú: ${billData.orderNote}")
            }

            separator()

            // Thêm một dòng trống nhỏ để đảm bảo món đầu tiên không bị cắt chữ
            // Đặc biệt cần thiết cho bill in lại từ lịch sử
            line(" ", BitmapTextStyle(fontSize = 4f, lineSpacingMultiplier = 0.3f))

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
