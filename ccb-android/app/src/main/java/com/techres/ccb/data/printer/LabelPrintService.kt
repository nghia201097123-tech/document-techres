package com.techres.ccb.data.printer

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.util.Log
import com.techres.ccb.data.local.entity.KitchenEntity
import com.techres.ccb.data.local.entity.LabelSize
import com.techres.ccb.data.local.entity.PrinterProtocol
import com.techres.ccb.printer.core.EscPosCommands
import com.techres.ccb.printer.core.TsplCommands
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
 * Label Print Service - In tem/sticker cho đồ uống, trà sữa, cà phê
 *
 * Hỗ trợ 2 loại máy in:
 * 1. ESC/POS receipt printers (EPSON, BIXOLON, etc.)
 * 2. TSPL label printers (XPRINTER, TSC, GAINSCHA, etc.)
 *
 * Đảm bảo: Nền trắng, chữ đen cho tất cả các loại máy in
 */
object LabelPrintService {
    private const val TAG = "LabelPrintService"

    // DPI for most thermal printers
    private const val DPI = 203
    private const val DOTS_PER_MM = 8 // 203 DPI ≈ 8 dots/mm

    /**
     * Regex để match tất cả các ký tự whitespace Unicode và zero-width characters
     */
    private val UNICODE_WHITESPACE_REGEX = Regex("[\\s\\u00A0\\u2000-\\u200A\\u200B-\\u200D\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF]+")

    /**
     * Normalize text: loại bỏ tất cả Unicode whitespace thừa, newlines, và zero-width characters
     */
    private fun normalizeText(text: String): String {
        return text
            .replace("\n", " ")
            .replace("\r", " ")
            .replace(UNICODE_WHITESPACE_REGEX, " ")
            .trim()
    }

    /**
     * Data class cho thông tin in tem
     */
    data class LabelData(
        val itemName: String,           // Tên món (Trà sữa trân châu)
        val itemCode: String? = null,   // Mã món
        val quantity: Int = 1,          // Số lượng (sẽ in nhiều tem)
        val size: String? = null,       // Size (S, M, L, XL)
        val sugar: String? = null,      // Độ đường (0%, 30%, 50%, 70%, 100%)
        val ice: String? = null,        // Độ đá (Không đá, Ít đá, Bình thường, Full đá)
        val toppings: List<String> = emptyList(), // Danh sách topping
        val note: String? = null,       // Ghi chú đặc biệt
        val tableName: String? = null,  // Tên bàn
        val pagerNumber: Int? = null,   // Số thẻ rung (1-99)
        val orderNumber: String,        // Mã đơn hàng
        val orderTime: Date = Date(),   // Thời gian order
        val staffName: String? = null,  // Tên nhân viên
        val labelIndex: Int = 1,        // Thứ tự tem (1/3, 2/3, 3/3)
        val totalLabels: Int = 1,       // Tổng số tem
        val storeName: String? = null,  // Tên cửa hàng (hiển thị trên cùng)

        // ========== GIÁ TIỀN ==========
        val unitPrice: Double = 0.0,        // Giá đơn vị (chưa topping)
        val toppingPrices: List<Pair<String, Double>> = emptyList(), // Topping + giá
        val totalToppingPrice: Double = 0.0, // Tổng giá topping
        val totalPrice: Double = 0.0,       // Giá tổng (unitPrice + toppings) * quantity
        val discountAmount: Double = 0.0,   // Giảm giá (nếu có)
        val finalPrice: Double = 0.0,       // Giá cuối cùng sau giảm

        // ========== SPLITTING INFO ==========
        val isContinuation: Boolean = false,    // Là tem tiếp tục (khi split)
        val partIndex: Int = 1,                 // Phần thứ mấy (1, 2, 3...)
        val totalParts: Int = 1                 // Tổng số phần
    )

    // Default max toppings per label (fallback, will use config from kitchen)
    private const val DEFAULT_MAX_TOPPINGS_PER_LABEL = 4

    // Price formatter for VND
    private val priceFormatter = DecimalFormat("#,###")

    /**
     * Format price in VND format (e.g., 35,000đ)
     */
    private fun formatVND(price: Double): String {
        return if (price > 0) "${priceFormatter.format(price.toLong())}đ" else "0đ"
    }

    /**
     * In tem cho 1 item (có thể in nhiều tem nếu quantity > 1)
     * Tự động detect protocol từ KitchenEntity
     * Tự động chia nhỏ tem nếu có quá nhiều topping
     */
    suspend fun printLabels(
        kitchen: KitchenEntity,
        labelData: LabelData
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            val ip = kitchen.printerIp
                ?: return@withContext PrinterResult.Error("Chưa cấu hình IP máy in cho ${kitchen.name}")

            val protocol = kitchen.getPrinterProtocolEnum()
            Log.d(TAG, "Printing with protocol: $protocol")

            var lastError: String? = null

            // Split label nếu có quá nhiều topping
            val maxToppings = kitchen.getEffectiveMaxToppings()
            val labelParts = splitLabelIfNeeded(labelData, kitchen.getLabelSize(), maxToppings)
            Log.d(TAG, "Label split into ${labelParts.size} parts")

            // In nhiều tem nếu quantity > 1
            for (i in 1..labelData.quantity) {
                // In tất cả các parts của label
                for ((partIndex, labelPart) in labelParts.withIndex()) {
                    val currentLabel = labelPart.copy(
                        labelIndex = i,
                        totalLabels = labelData.quantity,
                        partIndex = partIndex + 1,
                        totalParts = labelParts.size
                    )

                    val labelContent = when (protocol) {
                        PrinterProtocol.TSPL -> generateTsplLabel(kitchen, currentLabel)
                        PrinterProtocol.ESCPOS -> generateEscPosLabel(kitchen, currentLabel)
                    }

                    // Retry logic - use run block to properly break on success
                    var success = false
                    run retryLoop@{
                        repeat(3) { attempt ->
                            val result = printViaNetwork(ip, kitchen.printerPort, labelContent)
                            when (result) {
                                is PrinterResult.Success -> {
                                    success = true
                                    return@retryLoop // Break out of retry loop on success
                                }
                                is PrinterResult.Error -> {
                                    lastError = result.message
                                    Log.w(TAG, "Label $i part ${partIndex + 1} attempt ${attempt + 1} failed: ${result.message}")
                                    if (attempt < 2) delay(1000)
                                }
                            }
                        }
                    }

                    if (!success) {
                        return@withContext PrinterResult.Error(
                            lastError ?: "In tem thất bại cho ${labelData.itemName}"
                        )
                    }

                    // Delay giữa các parts
                    if (partIndex < labelParts.size - 1) {
                        delay(300)
                    }
                }

                // Delay giữa các tem (quantity)
                if (i < labelData.quantity) {
                    delay(500)
                }
            }

            val totalLabels = labelData.quantity * labelParts.size
            PrinterResult.Success("Đã in $totalLabels tem cho ${labelData.itemName}")
        }
    }

    /**
     * Split label into multiple parts if too many toppings
     * Mỗi phần sẽ có tối đa maxToppingsPerLabel topping
     *
     * Ví dụ: 10 toppings với max=4 -> 3 phần (4 + 4 + 2)
     * - Phần 1: toppings 1-4, có đầy đủ thông tin (size, đá, đường, giá)
     * - Phần 2: toppings 5-8, chỉ có tên món + toppings
     * - Phần 3: toppings 9-10, chỉ có tên món + toppings
     *
     * @param labelData Dữ liệu tem
     * @param labelSize Kích thước tem
     * @param maxToppingsPerLabel Số topping tối đa mỗi tem (từ config hoặc auto)
     */
    private fun splitLabelIfNeeded(
        labelData: LabelData,
        labelSize: LabelSize,
        maxToppingsPerLabel: Int = DEFAULT_MAX_TOPPINGS_PER_LABEL
    ): List<LabelData> {
        val toppings = labelData.toppings
        val toppingPrices = labelData.toppingPrices
        val effectiveMax = maxToppingsPerLabel.coerceAtLeast(1) // Ít nhất 1 topping/tem

        Log.d(TAG, "=== splitLabelIfNeeded ===")
        Log.d(TAG, "  Item: ${labelData.itemName}")
        Log.d(TAG, "  Total toppings: ${toppings.size}")
        Log.d(TAG, "  Toppings: $toppings")
        Log.d(TAG, "  ToppingPrices: ${toppingPrices.map { "${it.first}(${it.second})" }}")
        Log.d(TAG, "  Label size: ${labelSize.displayName}")
        Log.d(TAG, "  Max toppings per label: $effectiveMax")

        // Nếu ít topping, không cần split
        if (toppings.size <= effectiveMax) {
            Log.d(TAG, "  -> No split needed (${toppings.size} <= $effectiveMax)")
            return listOf(labelData)
        }

        val parts = mutableListOf<LabelData>()
        val toppingChunks = toppings.chunked(effectiveMax)
        val toppingPriceChunks = if (toppingPrices.isNotEmpty()) {
            toppingPrices.chunked(effectiveMax)
        } else {
            toppingChunks.map { emptyList() }
        }

        val totalParts = toppingChunks.size
        Log.d(TAG, "  -> Splitting into $totalParts parts")

        toppingChunks.forEachIndexed { index, chunk ->
            val isContinuation = index > 0
            val priceChunk = toppingPriceChunks.getOrElse(index) { emptyList() }
            val chunkTotalPrice = priceChunk.sumOf { it.second }

            Log.d(TAG, "  Part ${index + 1}/$totalParts: ${chunk.size} toppings: $chunk")

            parts.add(
                labelData.copy(
                    toppings = chunk,
                    toppingPrices = priceChunk,
                    totalToppingPrice = if (index == 0) labelData.totalToppingPrice else chunkTotalPrice,
                    isContinuation = isContinuation,
                    partIndex = index + 1,
                    totalParts = totalParts,
                    // Chỉ hiện giá đầy đủ ở tem đầu tiên
                    unitPrice = if (isContinuation) 0.0 else labelData.unitPrice,
                    totalPrice = if (isContinuation) 0.0 else labelData.totalPrice,
                    discountAmount = if (isContinuation) 0.0 else labelData.discountAmount,
                    finalPrice = if (isContinuation) 0.0 else labelData.finalPrice,
                    // Options chỉ hiện ở tem đầu
                    sugar = if (isContinuation) null else labelData.sugar,
                    ice = if (isContinuation) null else labelData.ice,
                    size = if (isContinuation) null else labelData.size
                )
            )
        }

        Log.d(TAG, "  -> Created ${parts.size} label parts")
        return parts
    }

    /**
     * In nhiều items
     */
    suspend fun printMultipleLabels(
        kitchen: KitchenEntity,
        items: List<LabelData>
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            Log.d(TAG, "=== printMultipleLabels ===")
            Log.d(TAG, "Received ${items.size} label items")
            items.forEachIndexed { index, item ->
                Log.d(TAG, "  [$index] ${item.itemName} qty=${item.quantity}")
            }

            var totalPrinted = 0
            var lastError: String? = null

            items.forEach { item ->
                Log.d(TAG, "Printing label for: ${item.itemName} x${item.quantity}")
                val result = printLabels(kitchen, item)
                when (result) {
                    is PrinterResult.Success -> {
                        totalPrinted += item.quantity
                        Log.d(TAG, "  -> Success, total printed so far: $totalPrinted")
                    }
                    is PrinterResult.Error -> {
                        lastError = result.message
                        Log.e(TAG, "  -> Error: ${result.message}")
                    }
                }
            }

            Log.d(TAG, "=== printMultipleLabels DONE: $totalPrinted labels ===")
            if (totalPrinted > 0) {
                PrinterResult.Success("Đã in $totalPrinted tem")
            } else {
                PrinterResult.Error(lastError ?: "Không in được tem nào")
            }
        }
    }

    // ==================== TSPL LABEL GENERATION ====================

    /**
     * Generate TSPL label - Theo mẫu chuẩn
     * Layout for normal label:
     * ┌─────────────────────────────┐
     * │ Store Name                  │
     * │ GF-472                  3/6 │
     * │ ─────────────────────────── │
     * │ Tên món (BOLD)              │
     * │ +Size L                     │
     * │ +50% Đá                     │
     * │ +30% Đường                  │
     * │ +Trân châu                  │
     * │ ─────────────────────────── │
     * │ Thành tiền:       45,000đ   │
     * │ ─────────────────────────── │
     * │ 02/01/2026 14:53            │
     * └─────────────────────────────┘
     *
     * Layout for continuation label (split):
     * ┌─────────────────────────────┐
     * │ ** TIẾP - PHẦN 2/3 **       │
     * │ GF-472                  3/6 │
     * │ ─────────────────────────── │
     * │ Tên món (BOLD)              │
     * │ +Topping 5                  │
     * │ +Topping 6                  │
     * │ +Topping 7                  │
     * │ +Topping 8                  │
     * │ ─────────────────────────── │
     * │ 02/01/2026 14:53            │
     * └─────────────────────────────┘
     */
    private fun generateTsplLabel(
        kitchen: KitchenEntity,
        label: LabelData
    ): ByteArray {
        val labelSize = kitchen.getLabelSize()
        val density = kitchen.printDensity
        val fontScale = kitchen.getEffectiveFontScale()
        val lineSpacing = kitchen.labelLineSpacing.coerceIn(0.8f, 1.5f)

        // Label printing configs
        val showStoreName = kitchen.labelPrintStoreName
        val showOrderNumber = kitchen.labelPrintOrderNumber
        val showTableName = kitchen.labelPrintTableName
        val showTime = kitchen.labelPrintTime
        val showPrice = kitchen.labelPrintPrice
        val storeName = kitchen.labelStoreName ?: label.storeName
        val labelReverse = kitchen.labelReverse

        // Calculate extra spacing based on lineSpacing multiplier (1.0 = no extra, 1.5 = 50% more)
        // Base spacing is proportional to label height
        val baseSpacing = (labelSize.heightMm * 0.3f).toInt() // ~3 pixels for 30mm label
        val lineSpacingExtra = ((lineSpacing - 1.0f) * baseSpacing * 2).toInt().coerceAtLeast(0)

        Log.d(TAG, "=== Generating TSPL label ===")
        Log.d(TAG, "  - Size: ${labelSize.widthMm}x${labelSize.heightMm}mm")
        Log.d(TAG, "  - Density: $density")
        Log.d(TAG, "  - Font scale: $fontScale")
        Log.d(TAG, "  - Line spacing: $lineSpacing (extra: $lineSpacingExtra px)")
        Log.d(TAG, "  - Item: ${label.itemName}")
        Log.d(TAG, "  - labelIndex: ${label.labelIndex}/${label.totalLabels}")
        Log.d(TAG, "  - partIndex: ${label.partIndex}/${label.totalParts}")
        Log.d(TAG, "  - isContinuation: ${label.isContinuation}")
        Log.d(TAG, "  - toppings: ${label.toppings}")
        Log.d(TAG, "  - showStoreName: $showStoreName, showOrderNumber: $showOrderNumber")
        Log.d(TAG, "  - showTableName: $showTableName, tableName: ${label.tableName}")
        Log.d(TAG, "  - showTime: $showTime, showPrice: $showPrice")
        Log.d(TAG, "  - labelReverse: $labelReverse")

        val output = ByteArrayOutputStream()

        // Label dimensions in dots
        val widthDots = labelSize.widthMm * DOTS_PER_MM
        val heightDots = labelSize.heightMm * DOTS_PER_MM
        val margin = 6
        val contentWidth = widthDots - (margin * 2)

        // Font sizes using new recommended values with user scale
        val fontSmall = calculateFontSize(labelSize, "small", fontScale)
        val fontNormal = calculateFontSize(labelSize, "normal", fontScale)
        val fontBold = calculateFontSize(labelSize, "bold", fontScale)

        // ========== SETUP COMMANDS ==========
        // DIRECTION: 0 = normal, 1 = reverse (rotated 180°)
        val direction = if (labelReverse) 1 else 0
        output.write("SIZE ${labelSize.widthMm} mm, ${labelSize.heightMm} mm\r\n".toByteArray())
        output.write("GAP ${labelSize.gapMm} mm, 0 mm\r\n".toByteArray())
        output.write("DIRECTION $direction\r\n".toByteArray())
        output.write("CLS\r\n".toByteArray())
        output.write("DENSITY $density\r\n".toByteArray())
        output.write("SPEED 4\r\n".toByteArray())

        var yPos = 4

        // ========== LINE 1: CONTINUATION INDICATOR or STORE NAME ==========
        if (label.isContinuation && label.totalParts > 1) {
            // Show continuation indicator for split labels
            val continuationText = "** TIẾP - PHẦN ${label.partIndex}/${label.totalParts} **"
            val continuationBitmap = renderTextBitmap(
                text = continuationText,
                width = contentWidth,
                fontSize = fontSmall,
                bold = true,
                centerAlign = true
            )
            output.write(bitmapToTspl(margin, yPos, continuationBitmap))
            yPos += continuationBitmap.height + lineSpacingExtra
            continuationBitmap.recycle()
        } else if (showStoreName && !storeName.isNullOrBlank()) {
            val storeBitmap = renderTextBitmap(
                text = storeName,
                width = contentWidth,
                fontSize = fontSmall,
                bold = false,
                centerAlign = false
            )
            output.write(bitmapToTspl(margin, yPos, storeBitmap))
            yPos += storeBitmap.height + lineSpacingExtra
            storeBitmap.recycle()
        }

        // ========== SMART LAYOUT: Gộp Bàn + Mã đơn trên cùng 1 dòng để tiết kiệm không gian ==========
        val hasTable = showTableName && !label.tableName.isNullOrBlank()
        val hasOrder = showOrderNumber

        // Index text (chỉ hiển thị khi không có bàn hoặc khi cần)
        val labelCountText = if (label.totalLabels > 1) "${label.labelIndex}/${label.totalLabels}" else ""
        val partText = if (label.totalParts > 1 && !label.isContinuation) "(P${label.partIndex}/${label.totalParts})" else ""
        val indexText = "$labelCountText $partText".trim()

        if (hasTable && hasOrder) {
            // SMART: Bàn bên trái + Mã đơn bên phải (trên cùng 1 dòng)
            val orderWithIndex = if (indexText.isNotEmpty()) "${label.orderNumber} $indexText" else label.orderNumber
            val headerBitmap = renderTwoColumnText(
                "Bàn: ${label.tableName}",
                orderWithIndex,
                contentWidth,
                fontSmall,
                bold = true
            )
            output.write(bitmapToTspl(margin, yPos, headerBitmap))
            yPos += headerBitmap.height + lineSpacingExtra
            headerBitmap.recycle()
        } else if (hasTable) {
            // Chỉ có bàn, không có mã đơn
            val tableBitmap = renderTextBitmap(
                text = "Bàn: ${label.tableName}",
                width = contentWidth,
                fontSize = fontSmall,
                bold = true,
                centerAlign = false
            )
            output.write(bitmapToTspl(margin, yPos, tableBitmap))
            yPos += tableBitmap.height + lineSpacingExtra
            tableBitmap.recycle()
        } else if (hasOrder) {
            // Chỉ có mã đơn, không có bàn (layout cũ)
            val orderHeaderBitmap = renderTwoColumnText(
                label.orderNumber,
                indexText,
                contentWidth,
                fontSmall,
                bold = false
            )
            output.write(bitmapToTspl(margin, yPos, orderHeaderBitmap))
            yPos += orderHeaderBitmap.height + lineSpacingExtra
            orderHeaderBitmap.recycle()
        }

        // ========== PAGER NUMBER (Thẻ rung) ==========
        if (label.pagerNumber != null) {
            val pagerBitmap = renderTextBitmap(
                text = "Thẻ: ${label.pagerNumber}",
                width = contentWidth,
                fontSize = fontBold,
                bold = true,
                centerAlign = true
            )
            output.write(bitmapToTspl(margin, yPos, pagerBitmap))
            yPos += pagerBitmap.height + lineSpacingExtra
            pagerBitmap.recycle()
        }

        // ========== SEPARATOR 1 ==========
        output.write("BAR $margin,$yPos,$contentWidth,1\r\n".toByteArray())
        yPos += 3

        // ========== PRODUCT NAME + TOTAL PRICE ==========
        if (showPrice && !label.isContinuation && label.finalPrice > 0) {
            // Tên món + Giá tổng (giống phiếu bếp)
            val itemNamePriceBitmap = renderTwoColumnText(
                label.itemName,
                formatVND(label.finalPrice),
                contentWidth,
                fontBold,
                bold = true
            )
            output.write(bitmapToTspl(margin, yPos, itemNamePriceBitmap))
            yPos += itemNamePriceBitmap.height + 1 + lineSpacingExtra
            itemNamePriceBitmap.recycle()

            // Giá gốc bên trái (nếu có topping/size có giá)
            if (label.unitPrice > 0 && label.totalToppingPrice > 0) {
                val basePriceBitmap = renderTextBitmap(
                    text = "   ${formatVND(label.unitPrice)}",
                    width = contentWidth,
                    fontSize = fontSmall,
                    bold = false,
                    centerAlign = false
                )
                output.write(bitmapToTspl(margin, yPos, basePriceBitmap))
                yPos += basePriceBitmap.height + lineSpacingExtra
                basePriceBitmap.recycle()
            }
        } else {
            // Chỉ tên món (không có giá)
            val itemNameBitmap = renderTextBitmap(
                text = label.itemName,
                width = contentWidth,
                fontSize = fontBold,
                bold = true,
                centerAlign = false
            )
            output.write(bitmapToTspl(margin, yPos, itemNameBitmap))
            yPos += itemNameBitmap.height + 1 + lineSpacingExtra
            itemNameBitmap.recycle()
        }

        // ========== SIZE với giá ==========
        // Tìm SIZE: từ options hoặc từ topping có tên chứa "size"
        var displayedSizeTopping: String? = null // Track topping đã hiển thị như SIZE

        val sizeValue = label.size
        val sizeToppingEntry = label.toppingPrices.find { it.first.lowercase().contains("size") }

        if (sizeValue != null) {
            // SIZE từ options - tìm giá từ toppingPrices
            val sizePrice = sizeToppingEntry?.second ?: 0.0
            displayedSizeTopping = sizeToppingEntry?.first // Mark this topping as displayed

            if (showPrice && sizePrice > 0) {
                val sizeBitmap = renderTwoColumnText(
                    "+ Size $sizeValue",
                    "+${formatVND(sizePrice)}",
                    contentWidth,
                    fontNormal,
                    bold = false
                )
                output.write(bitmapToTspl(margin, yPos, sizeBitmap))
                yPos += sizeBitmap.height + lineSpacingExtra
                sizeBitmap.recycle()
            } else {
                val sizeBitmap = renderTextBitmap(
                    text = "+ Size $sizeValue",
                    width = contentWidth,
                    fontSize = fontNormal,
                    bold = false,
                    centerAlign = false
                )
                output.write(bitmapToTspl(margin, yPos, sizeBitmap))
                yPos += sizeBitmap.height + lineSpacingExtra
                sizeBitmap.recycle()
            }
        } else if (sizeToppingEntry != null) {
            // Không có SIZE trong options nhưng có topping chứa "size" - hiển thị nó
            val (sizeName, sizePrice) = sizeToppingEntry
            displayedSizeTopping = sizeName

            if (showPrice && sizePrice > 0) {
                val sizeBitmap = renderTwoColumnText(
                    "+ $sizeName",
                    "+${formatVND(sizePrice)}",
                    contentWidth,
                    fontNormal,
                    bold = false
                )
                output.write(bitmapToTspl(margin, yPos, sizeBitmap))
                yPos += sizeBitmap.height + lineSpacingExtra
                sizeBitmap.recycle()
            } else {
                val sizeBitmap = renderTextBitmap(
                    text = "+ $sizeName",
                    width = contentWidth,
                    fontSize = fontNormal,
                    bold = false,
                    centerAlign = false
                )
                output.write(bitmapToTspl(margin, yPos, sizeBitmap))
                yPos += sizeBitmap.height + lineSpacingExtra
                sizeBitmap.recycle()
            }
        }

        // ========== ICE (không có giá) ==========
        label.ice?.let { ice ->
            val iceBitmap = renderTextBitmap(
                text = "• $ice",
                width = contentWidth,
                fontSize = fontNormal,
                bold = false,
                centerAlign = false
            )
            output.write(bitmapToTspl(margin, yPos, iceBitmap))
            yPos += iceBitmap.height + lineSpacingExtra
            iceBitmap.recycle()
        }

        // ========== SUGAR (không có giá) ==========
        label.sugar?.let { sugar ->
            val sugarBitmap = renderTextBitmap(
                text = "• $sugar",
                width = contentWidth,
                fontSize = fontNormal,
                bold = false,
                centerAlign = false
            )
            output.write(bitmapToTspl(margin, yPos, sugarBitmap))
            yPos += sugarBitmap.height + lineSpacingExtra
            sugarBitmap.recycle()
        }

        // ========== TOPPINGS với giá ==========
        if (label.toppingPrices.isNotEmpty()) {
            // Chỉ lọc bỏ topping đã hiển thị như SIZE (nếu có)
            val filteredToppings = label.toppingPrices.filter { (name, _) ->
                name != displayedSizeTopping
            }

            filteredToppings.forEach { (toppingName, toppingPrice) ->
                // Normalize topping name: loại bỏ tất cả Unicode whitespace thừa
                val normalizedName = normalizeText(toppingName)

                // Bỏ qua topping name rỗng
                if (normalizedName.isNotBlank()) {
                    if (showPrice && toppingPrice > 0) {
                        val toppingBitmap = renderTwoColumnText(
                            "+ $normalizedName",
                            "+${formatVND(toppingPrice)}",
                            contentWidth,
                            fontNormal,
                            bold = false
                        )
                        output.write(bitmapToTspl(margin, yPos, toppingBitmap))
                        yPos += toppingBitmap.height + lineSpacingExtra
                        toppingBitmap.recycle()
                    } else {
                        val toppingBitmap = renderTextBitmap(
                            text = "+ $normalizedName",
                            width = contentWidth,
                            fontSize = fontNormal,
                            bold = false,
                            centerAlign = false
                        )
                        output.write(bitmapToTspl(margin, yPos, toppingBitmap))
                        yPos += toppingBitmap.height + lineSpacingExtra
                        toppingBitmap.recycle()
                    }
                }
            }
        } else if (label.toppings.isNotEmpty()) {
            label.toppings.forEach { topping ->
                // Normalize topping name: loại bỏ tất cả Unicode whitespace thừa
                val normalizedTopping = normalizeText(topping)

                // Bỏ qua topping name rỗng
                if (normalizedTopping.isNotBlank()) {
                    val toppingBitmap = renderTextBitmap(
                        text = "+ $normalizedTopping",
                        width = contentWidth,
                        fontSize = fontNormal,
                        bold = false,
                        centerAlign = false
                    )
                    output.write(bitmapToTspl(margin, yPos, toppingBitmap))
                    yPos += toppingBitmap.height + lineSpacingExtra
                    toppingBitmap.recycle()
                }
            }
        }

        // ========== NOTE (in nghiêng để nổi bật) ==========
        label.note?.let { note ->
            val noteBitmap = renderTextBitmap(
                text = "* $note",
                width = contentWidth,
                fontSize = fontSmall,
                bold = false,
                centerAlign = false,
                italic = true
            )
            output.write(bitmapToTspl(margin, yPos, noteBitmap))
            yPos += noteBitmap.height + lineSpacingExtra
            noteBitmap.recycle()
        }

        // ========== DATE TIME (if enabled) ==========
        if (showTime) {
            yPos += 2
            output.write("BAR $margin,$yPos,$contentWidth,1\r\n".toByteArray())
            yPos += 3

            val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
            val dateBitmap = renderTextBitmap(
                text = dateFormat.format(label.orderTime),
                width = contentWidth,
                fontSize = fontSmall,
                bold = false,
                centerAlign = false
            )
            output.write(bitmapToTspl(margin, yPos, dateBitmap))
            dateBitmap.recycle()
        }

        // ========== PRINT ==========
        output.write("PRINT 1,1\r\n".toByteArray())

        val content = output.toByteArray()
        Log.d(TAG, "TSPL label generated: ${content.size} bytes")
        return content
    }

    /**
     * Calculate font size based on label size and scale factor
     *
     * @param labelSize Kích thước tem
     * @param fontType Loại font: "bold", "normal", "small"
     * @param fontScale Scale factor từ config (0.5 - 2.0)
     */
    private fun calculateFontSize(
        labelSize: LabelSize,
        fontType: String = "normal",
        fontScale: Float = 1.0f
    ): Float {
        val (fontBold, fontNormal, fontSmall) = labelSize.getRecommendedFontSizes()
        val baseFont = when (fontType) {
            "bold" -> fontBold
            "small" -> fontSmall
            else -> fontNormal
        }
        return baseFont * fontScale.coerceIn(0.5f, 2.0f)
    }

    /**
     * Legacy method for backward compatibility
     * @deprecated Use calculateFontSize(labelSize, fontType, fontScale) instead
     */
    private fun calculateFontSize(labelSize: LabelSize, scale: Float = 1.0f): Float {
        // Map old scale to font type
        return when {
            scale <= 0.7f -> calculateFontSize(labelSize, "small", 1.0f)
            scale >= 0.85f -> calculateFontSize(labelSize, "bold", 1.0f)
            else -> calculateFontSize(labelSize, "normal", 1.0f)
        }
    }

    /**
     * Convert bitmap to TSPL BITMAP command
     * XPRINTER TSPL: bit=1 means NO PRINT (white), bit=0 means PRINT (black)
     * This is INVERTED from standard TSPL!
     */
    private fun bitmapToTspl(x: Int, y: Int, bitmap: Bitmap): ByteArray {
        val output = ByteArrayOutputStream()

        val width = bitmap.width
        val height = bitmap.height
        val widthBytes = (width + 7) / 8

        // Get pixels
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

        // BITMAP command header
        val header = "BITMAP $x,$y,$widthBytes,$height,0,"
        output.write(header.toByteArray())

        // Convert to monochrome for XPRINTER
        // XPRINTER uses INVERTED logic: bit=1 = white (no print), bit=0 = black (print)
        val threshold = 128 // Standard threshold for better contrast
        for (row in 0 until height) {
            for (byteIndex in 0 until widthBytes) {
                var byte = 0
                for (bit in 0 until 8) {
                    val col = byteIndex * 8 + bit
                    if (col < width) {
                        val pixel = pixels[row * width + col]
                        // Calculate grayscale value
                        val r = (pixel shr 16) and 0xFF
                        val g = (pixel shr 8) and 0xFF
                        val b = pixel and 0xFF
                        val gray = (r + g + b) / 3

                        // INVERTED for XPRINTER:
                        // Light pixels (background) -> bit = 1 (no print = white)
                        // Dark pixels (text) -> bit = 0 (print = black)
                        if (gray >= threshold) {
                            byte = byte or (0x80 shr bit)
                        }
                    } else {
                        // Padding bits (outside bitmap) should be WHITE (bit = 1)
                        byte = byte or (0x80 shr bit)
                    }
                }
                output.write(byte)
            }
        }

        output.write("\r\n".toByteArray())
        return output.toByteArray()
    }

    /**
     * Render text to bitmap - WHITE background, BLACK text
     */
    private fun renderTextBitmap(
        text: String,
        width: Int,
        fontSize: Float = 20f,
        bold: Boolean = false,
        centerAlign: Boolean = false,
        italic: Boolean = false
    ): Bitmap {
        if (text.isEmpty()) {
            return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888).apply {
                eraseColor(Color.WHITE)
            }
        }

        val paint = TextPaint().apply {
            color = Color.BLACK  // BLACK text
            textSize = fontSize
            isAntiAlias = false  // No anti-aliasing for crisp thermal print
            typeface = when {
                bold && italic -> Typeface.create(Typeface.DEFAULT, Typeface.BOLD_ITALIC)
                bold -> Typeface.DEFAULT_BOLD
                italic -> Typeface.create(Typeface.DEFAULT, Typeface.ITALIC)
                else -> Typeface.DEFAULT
            }
        }

        val alignment = if (centerAlign) Layout.Alignment.ALIGN_CENTER else Layout.Alignment.ALIGN_NORMAL

        val layout = StaticLayout.Builder
            .obtain(text, 0, text.length, paint, width)
            .setAlignment(alignment)
            .setLineSpacing(0f, 0.9f) // Giảm line spacing để khoảng cách nhỏ hơn
            .setIncludePad(false) // Bỏ padding thừa
            .build()

        val height = layout.height.coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)  // WHITE background
        layout.draw(canvas)

        return bitmap
    }

    /**
     * Render two column text (left + right aligned) for price display
     * Example: "Đơn giá:"    "35,000đ"
     *
     * Xử lý tự động xuống dòng:
     * - Nếu left text vừa trên 1 dòng với right text -> hiển thị 1 dòng
     * - Nếu left text quá dài -> dòng 1 chứa phần text vừa được + right text canh phải,
     *   phần còn lại xuống dòng tiếp theo
     */
    private fun renderTwoColumnText(
        leftText: String,
        rightText: String,
        width: Int,
        fontSize: Float = 20f,
        bold: Boolean = false
    ): Bitmap {
        val paint = TextPaint().apply {
            color = Color.BLACK
            textSize = fontSize
            isAntiAlias = false
            typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        }

        val rightWidth = paint.measureText(rightText).toInt()
        val spaceWidth = paint.measureText(" ").toInt()
        val minPadding = spaceWidth * 2 // Tối thiểu 2 space giữa left và right
        val lineHeight = (paint.textSize * 1.05f).toInt().coerceAtLeast(1) // Giảm từ 1.3 xuống 1.05 để khoảng cách nhỏ nhất

        // Tính chiều rộng tối đa cho left text trên dòng đầu tiên
        val maxFirstLineLeftWidth = width - rightWidth - minPadding
        val leftWidth = paint.measureText(leftText).toInt()

        // Nếu left text vừa trên 1 dòng
        if (leftWidth <= maxFirstLineLeftWidth) {
            val bitmap = Bitmap.createBitmap(width, lineHeight, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            canvas.drawColor(Color.WHITE)

            // Draw left text
            canvas.drawText(leftText, 0f, paint.textSize, paint)

            // Draw right text (right-aligned)
            val rightX = (width - rightWidth).toFloat()
            canvas.drawText(rightText, rightX, paint.textSize, paint)

            return bitmap
        }

        // Left text quá dài - cần xuống dòng
        // Tìm điểm ngắt hợp lý cho dòng đầu tiên
        var firstLineEndIndex = leftText.length
        while (firstLineEndIndex > 0 && paint.measureText(leftText.substring(0, firstLineEndIndex)) > maxFirstLineLeftWidth) {
            firstLineEndIndex--
        }

        // Thử tìm điểm ngắt tại khoảng trắng (word boundary)
        val lastSpaceIndex = leftText.substring(0, firstLineEndIndex).lastIndexOf(' ')
        if (lastSpaceIndex > firstLineEndIndex / 2) {
            firstLineEndIndex = lastSpaceIndex
        }

        // Bảo đảm có ít nhất 1 ký tự trên dòng đầu
        if (firstLineEndIndex <= 0) {
            firstLineEndIndex = 1
        }

        val firstLinePart = leftText.substring(0, firstLineEndIndex).trimEnd()
        val remainingPart = leftText.substring(firstLineEndIndex).trimStart()

        // Tính số dòng cần cho phần còn lại
        val remainingLines = if (remainingPart.isNotEmpty()) {
            val remainingLayout = StaticLayout.Builder
                .obtain(remainingPart, 0, remainingPart.length, paint, width)
                .setAlignment(Layout.Alignment.ALIGN_NORMAL)
                .setLineSpacing(0f, 0.9f)
                .setIncludePad(false)
                .build()
            remainingLayout.lineCount
        } else {
            0
        }

        val totalHeight = lineHeight * (1 + remainingLines)
        val bitmap = Bitmap.createBitmap(width, totalHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)

        // Draw first line: left text part + right text (right-aligned)
        canvas.drawText(firstLinePart, 0f, paint.textSize, paint)
        val rightX = (width - rightWidth).toFloat()
        canvas.drawText(rightText, rightX, paint.textSize, paint)

        // Draw remaining lines (if any)
        if (remainingPart.isNotEmpty()) {
            val remainingLayout = StaticLayout.Builder
                .obtain(remainingPart, 0, remainingPart.length, paint, width)
                .setAlignment(Layout.Alignment.ALIGN_NORMAL)
                .setLineSpacing(0f, 0.9f)
                .setIncludePad(false)
                .build()

            canvas.save()
            canvas.translate(0f, lineHeight.toFloat())
            remainingLayout.draw(canvas)
            canvas.restore()
        }

        return bitmap
    }

    // ==================== ESC/POS LABEL GENERATION ====================

    /**
     * Generate ESC/POS label for receipt printers
     * Supports split labels when there are many toppings
     * Supports label reverse (180° rotation) via bitmap flip
     */
    private fun generateEscPosLabel(
        kitchen: KitchenEntity,
        label: LabelData
    ): ByteArray {
        val paperWidth = kitchen.paperWidth

        // Label printing configs
        val showStoreName = kitchen.labelPrintStoreName
        val showOrderNumber = kitchen.labelPrintOrderNumber
        val showTableName = kitchen.labelPrintTableName
        val showTime = kitchen.labelPrintTime
        val showPrice = kitchen.labelPrintPrice
        val storeName = kitchen.labelStoreName ?: label.storeName
        val labelReverse = kitchen.labelReverse

        Log.d(TAG, "=== Generating ESC/POS label ===")
        Log.d(TAG, "  - Paper width: ${paperWidth}mm")
        Log.d(TAG, "  - Item: ${label.itemName}")
        Log.d(TAG, "  - labelIndex: ${label.labelIndex}/${label.totalLabels}")
        Log.d(TAG, "  - partIndex: ${label.partIndex}/${label.totalParts}")
        Log.d(TAG, "  - isContinuation: ${label.isContinuation}")
        Log.d(TAG, "  - toppings (${label.toppings.size}): ${label.toppings}")
        Log.d(TAG, "  - showStoreName: $showStoreName, showOrderNumber: $showOrderNumber")
        Log.d(TAG, "  - showTableName: $showTableName, showTime: $showTime, showPrice: $showPrice")
        Log.d(TAG, "  - labelReverse: $labelReverse")

        // Note: For ESC/POS printers, labelReverse would need bitmap rotation which is complex
        // TSPL printers use DIRECTION command for reverse. ESC/POS can use upside-down mode in future.
        // Sử dụng GS v 0 (raster bitmap) để tránh khoảng trắng thừa giữa các dòng
        val builder = HybridBillBuilder(paperWidth, true, true)

        builder.apply {
            init()

            // Store name (if enabled)
            if (showStoreName && !storeName.isNullOrBlank() && !label.isContinuation) {
                lineCenter(storeName)
                separator('-')
            }

            // Nếu là tem tiếp theo (continuation), thêm indicator nổi bật
            if (label.isContinuation && label.totalParts > 1) {
                lineBold("** TIẾP - PHẦN ${label.partIndex}/${label.totalParts} **", BitmapTextStyle(centerAlign = true))
                separator('=')
            }

            // ========== TÊN MÓN + GIÁ TỔNG ==========
            if (showPrice && !label.isContinuation && label.finalPrice > 0) {
                lineKeyValueBold(label.itemName, formatVND(label.finalPrice))
                // Giá gốc bên trái (nếu có topping/size có giá)
                if (label.unitPrice > 0 && label.totalToppingPrice > 0) {
                    line("   ${formatVND(label.unitPrice)}")
                }
            } else {
                lineDouble(label.itemName, BitmapTextStyle(centerAlign = true))
            }

            // Hiển thị phần x/y ở tem đầu tiên nếu có nhiều phần
            if (!label.isContinuation && label.totalParts > 1) {
                lineCenter("(Phần ${label.partIndex}/${label.totalParts})")
            }

            // Table name (if enabled)
            if (showTableName) {
                label.tableName?.let {
                    separator('-')
                    lineBold("Bàn: $it")
                }
            }

            // Pager number (Thẻ rung)
            if (label.pagerNumber != null) {
                lineBold("Thẻ: ${label.pagerNumber}", BitmapTextStyle(centerAlign = true))
            }

            // ========== SIZE với giá ==========
            // Tìm SIZE: từ options hoặc từ topping có tên chứa "size"
            var displayedSizeTopping: String? = null
            val sizeValue = label.size
            val sizeToppingEntry = label.toppingPrices.find { it.first.lowercase().contains("size") }

            if (sizeValue != null) {
                // SIZE từ options - tìm giá từ toppingPrices
                val sizePrice = sizeToppingEntry?.second ?: 0.0
                displayedSizeTopping = sizeToppingEntry?.first

                if (showPrice && sizePrice > 0) {
                    lineKeyValue("+ Size $sizeValue", "+${formatVND(sizePrice)}")
                } else {
                    line("+ Size $sizeValue")
                }
            } else if (sizeToppingEntry != null) {
                // Không có SIZE trong options nhưng có topping chứa "size" - hiển thị nó
                val (sizeName, sizePrice) = sizeToppingEntry
                displayedSizeTopping = sizeName

                if (showPrice && sizePrice > 0) {
                    lineKeyValue("+ $sizeName", "+${formatVND(sizePrice)}")
                } else {
                    line("+ $sizeName")
                }
            }

            // ========== ICE & SUGAR (không có giá) ==========
            label.ice?.let { line("• $it") }
            label.sugar?.let { line("• $it") }

            // ========== TOPPINGS với giá ==========
            if (label.toppings.isNotEmpty() || label.toppingPrices.isNotEmpty()) {
                if (label.toppingPrices.isNotEmpty()) {
                    // Chỉ lọc bỏ topping đã hiển thị như SIZE (nếu có)
                    val filteredToppings = label.toppingPrices.filter { (name, _) ->
                        name != displayedSizeTopping
                    }
                    filteredToppings.forEach { (toppingName, toppingPrice) ->
                        // Normalize topping name: loại bỏ tất cả Unicode whitespace thừa
                        val normalizedName = normalizeText(toppingName)

                        // Bỏ qua topping name rỗng
                        if (normalizedName.isNotBlank()) {
                            if (showPrice && toppingPrice > 0) {
                                lineKeyValue("+ $normalizedName", "+${formatVND(toppingPrice)}")
                            } else {
                                line("+ $normalizedName")
                            }
                        }
                    }
                } else {
                    label.toppings.forEach { topping ->
                        // Normalize topping name: loại bỏ tất cả Unicode whitespace thừa
                        val normalizedTopping = normalizeText(topping)

                        // Bỏ qua topping name rỗng
                        if (normalizedTopping.isNotBlank()) {
                            line("+ $normalizedTopping")
                        }
                    }
                }
            }

            // ========== NOTE (in nghiêng để nổi bật) ==========
            label.note?.let {
                separator('-')
                lineItalic("* $it")
            }

            // ========== ORDER INFO + TIME (based on config) ==========
            if (showOrderNumber || showTime) {
                separator('-')
                val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                val orderPart = if (showOrderNumber) "#${label.orderNumber}" else ""
                val timePart = if (showTime) timeFormat.format(label.orderTime) else ""
                val orderInfo = listOf(orderPart, timePart).filter { it.isNotEmpty() }.joinToString(" - ")

                if (orderInfo.isNotEmpty()) {
                    val labelCount = if (label.totalLabels > 1) "${label.labelIndex}/${label.totalLabels}" else ""
                    if (labelCount.isNotEmpty()) {
                        lineKeyValue(orderInfo, labelCount)
                    } else {
                        lineCenter(orderInfo)
                    }
                }
            }

            feed(3)
            cut()
        }

        return builder.build()
    }

    // ==================== TEST FUNCTIONS ====================

    /**
     * Test print - Auto detect protocol
     */
    suspend fun printSimpleTest(
        ip: String,
        port: Int = 9100,
        protocol: PrinterProtocol = PrinterProtocol.TSPL,
        labelSize: LabelSize = LabelSize.SIZE_72x30
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            Log.d(TAG, "=== SIMPLE TEST ===")
            Log.d(TAG, "Protocol: $protocol")
            Log.d(TAG, "Target: $ip:$port")

            val content = when (protocol) {
                PrinterProtocol.TSPL -> buildTsplTestContent(labelSize)
                PrinterProtocol.ESCPOS -> buildEscPosTestContent()
            }

            Log.d(TAG, "Test content size: ${content.size} bytes")
            printViaNetwork(ip, port, content)
        }
    }

    /**
     * Build TSPL test content
     */
    private fun buildTsplTestContent(labelSize: LabelSize): ByteArray {
        val output = ByteArrayOutputStream()

        output.write("SIZE ${labelSize.widthMm} mm, ${labelSize.heightMm} mm\r\n".toByteArray())
        output.write("GAP ${labelSize.gapMm} mm, 0 mm\r\n".toByteArray())
        output.write("DIRECTION 0\r\n".toByteArray())
        output.write("CLS\r\n".toByteArray())
        output.write("DENSITY 8\r\n".toByteArray())

        // ASCII text using built-in fonts
        output.write("TEXT 50,20,\"3\",0,1,1,\"XPRINTER TEST\"\r\n".toByteArray())
        output.write("TEXT 50,60,\"2\",0,1,1,\"Label Printer OK!\"\r\n".toByteArray())
        output.write("TEXT 50,100,\"1\",0,1,1,\"1234567890\"\r\n".toByteArray())

        // Box outline
        val widthDots = labelSize.widthMm * DOTS_PER_MM
        val heightDots = labelSize.heightMm * DOTS_PER_MM
        output.write("BOX 10,10,${widthDots - 10},${heightDots - 10},2\r\n".toByteArray())

        // Line
        output.write("BAR 10,140,${widthDots - 20},2\r\n".toByteArray())

        // Date/time
        val dateStr = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(Date())
        output.write("TEXT 50,160,\"1\",0,1,1,\"$dateStr\"\r\n".toByteArray())

        output.write("PRINT 1,1\r\n".toByteArray())
        return output.toByteArray()
    }

    /**
     * Build ESC/POS test content
     */
    private fun buildEscPosTestContent(): ByteArray {
        val output = ByteArrayOutputStream()

        output.write(EscPosCommands.INIT)
        output.write(EscPosCommands.ALIGN_CENTER)
        output.write("=== PRINTER TEST ===\n".toByteArray())
        output.write("--------------------\n".toByteArray())
        output.write("Printer is working!\n".toByteArray())
        output.write("--------------------\n".toByteArray())
        output.write("1234567890\n".toByteArray())
        output.write("ABCDEFGHIJ\n".toByteArray())
        output.write("--------------------\n".toByteArray())

        val dateStr = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(Date())
        output.write("$dateStr\n".toByteArray())

        output.write(EscPosCommands.feedLines(4))
        output.write(EscPosCommands.CUT_PARTIAL)

        return output.toByteArray()
    }

    /**
     * Test TSPL protocol specifically
     */
    suspend fun printTsplSimpleTest(
        ip: String,
        port: Int = 9100,
        labelSize: LabelSize = LabelSize.SIZE_72x30
    ): PrinterResult {
        return printSimpleTest(ip, port, PrinterProtocol.TSPL, labelSize)
    }

    // ==================== NETWORK ====================

    /**
     * Print via network with chunked data
     */
    private suspend fun printViaNetwork(
        ip: String,
        port: Int,
        content: ByteArray,
        chunkSize: Int = 1024
    ): PrinterResult {
        var socket: Socket? = null
        var outputStream: OutputStream? = null

        Log.d(TAG, "=== PRINT ===")
        Log.d(TAG, "Target: $ip:$port")
        Log.d(TAG, "Size: ${content.size} bytes")

        return try {
            socket = Socket().apply {
                reuseAddress = true
                keepAlive = true
                tcpNoDelay = true
                setSoLinger(true, 2)
                sendBufferSize = 4096
            }

            socket.connect(InetSocketAddress(ip, port), 5000)
            Log.d(TAG, "Connected!")

            outputStream = socket.getOutputStream()

            // Send in chunks
            var offset = 0
            while (offset < content.size) {
                val remaining = content.size - offset
                val currentChunkSize = minOf(chunkSize, remaining)

                outputStream.write(content, offset, currentChunkSize)
                outputStream.flush()
                offset += currentChunkSize

                if (offset < content.size) {
                    delay(30)
                }
            }

            Log.d(TAG, "All data sent")
            delay(500)

            Log.d(TAG, "=== SUCCESS ===")
            PrinterResult.Success("OK")
        } catch (e: Exception) {
            Log.e(TAG, "=== FAILED ===", e)
            PrinterResult.Error("Lỗi in: ${e.message}")
        } finally {
            try {
                outputStream?.flush()
                socket?.shutdownOutput()
                delay(100)
                outputStream?.close()
                socket?.close()
            } catch (e: Exception) {
                Log.e(TAG, "Close error: ${e.message}")
            }
        }
    }
}
