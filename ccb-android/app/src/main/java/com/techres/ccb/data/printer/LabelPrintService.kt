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
        val orderNumber: String,        // Mã đơn hàng
        val orderTime: Date = Date(),   // Thời gian order
        val staffName: String? = null,  // Tên nhân viên
        val labelIndex: Int = 1,        // Thứ tự tem (1/3, 2/3, 3/3)
        val totalLabels: Int = 1        // Tổng số tem
    )

    /**
     * In tem cho 1 item (có thể in nhiều tem nếu quantity > 1)
     * Tự động detect protocol từ KitchenEntity
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

            // In nhiều tem nếu quantity > 1
            for (i in 1..labelData.quantity) {
                val currentLabel = labelData.copy(
                    labelIndex = i,
                    totalLabels = labelData.quantity
                )

                val labelContent = when (protocol) {
                    PrinterProtocol.TSPL -> generateTsplLabel(kitchen, currentLabel)
                    PrinterProtocol.ESCPOS -> generateEscPosLabel(kitchen, currentLabel)
                }

                // Retry logic
                var success = false
                repeat(3) { attempt ->
                    val result = printViaNetwork(ip, kitchen.printerPort, labelContent)
                    when (result) {
                        is PrinterResult.Success -> {
                            success = true
                            return@repeat
                        }
                        is PrinterResult.Error -> {
                            lastError = result.message
                            Log.w(TAG, "Label $i attempt ${attempt + 1} failed: ${result.message}")
                            if (attempt < 2) delay(1000)
                        }
                    }
                }

                if (!success) {
                    return@withContext PrinterResult.Error(
                        lastError ?: "In tem thất bại cho ${labelData.itemName}"
                    )
                }

                // Delay giữa các tem
                if (i < labelData.quantity) {
                    delay(500)
                }
            }

            PrinterResult.Success("Đã in ${labelData.quantity} tem cho ${labelData.itemName}")
        }
    }

    /**
     * In nhiều items
     */
    suspend fun printMultipleLabels(
        kitchen: KitchenEntity,
        items: List<LabelData>
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            var totalPrinted = 0
            var lastError: String? = null

            items.forEach { item ->
                val result = printLabels(kitchen, item)
                when (result) {
                    is PrinterResult.Success -> totalPrinted += item.quantity
                    is PrinterResult.Error -> lastError = result.message
                }
            }

            if (totalPrinted > 0) {
                PrinterResult.Success("Đã in $totalPrinted tem")
            } else {
                PrinterResult.Error(lastError ?: "Không in được tem nào")
            }
        }
    }

    // ==================== TSPL LABEL GENERATION ====================

    /**
     * Generate TSPL label - Nền trắng, chữ đen
     */
    private fun generateTsplLabel(
        kitchen: KitchenEntity,
        label: LabelData
    ): ByteArray {
        val labelSize = kitchen.getLabelSize()
        val density = kitchen.printDensity

        Log.d(TAG, "Generating TSPL label:")
        Log.d(TAG, "  - Size: ${labelSize.widthMm}x${labelSize.heightMm}mm")
        Log.d(TAG, "  - Gap: ${labelSize.gapMm}mm")
        Log.d(TAG, "  - Density: $density")
        Log.d(TAG, "  - Item: ${label.itemName}")

        val output = ByteArrayOutputStream()

        // Label dimensions in dots
        val widthDots = labelSize.widthMm * DOTS_PER_MM
        val heightDots = labelSize.heightMm * DOTS_PER_MM

        // ========== SETUP COMMANDS ==========
        output.write("SIZE ${labelSize.widthMm} mm, ${labelSize.heightMm} mm\r\n".toByteArray())
        output.write("GAP ${labelSize.gapMm} mm, 0 mm\r\n".toByteArray())
        output.write("DIRECTION 0\r\n".toByteArray())
        output.write("CLS\r\n".toByteArray()) // Clear buffer - ensures white background
        output.write("DENSITY $density\r\n".toByteArray())
        output.write("SPEED 4\r\n".toByteArray())

        var yPos = 8

        // ========== TÊN MÓN (BITMAP for Vietnamese) ==========
        val itemNameBitmap = renderTextBitmap(
            text = label.itemName,
            width = widthDots - 16,
            fontSize = calculateFontSize(labelSize, 1.2f),
            bold = true,
            centerAlign = true
        )
        output.write(bitmapToTspl(8, yPos, itemNameBitmap))
        yPos += itemNameBitmap.height + 4
        itemNameBitmap.recycle()

        // ========== SIZE ==========
        label.size?.let { size ->
            val sizeBitmap = renderTextBitmap(
                text = "Size: $size",
                width = widthDots - 16,
                fontSize = calculateFontSize(labelSize, 0.9f),
                bold = true,
                centerAlign = true
            )
            output.write(bitmapToTspl(8, yPos, sizeBitmap))
            yPos += sizeBitmap.height + 2
            sizeBitmap.recycle()
        }

        // ========== LINE SEPARATOR ==========
        output.write("BAR 8,$yPos,${widthDots - 16},2\r\n".toByteArray())
        yPos += 6

        // ========== TABLE NAME ==========
        label.tableName?.let { table ->
            val tableBitmap = renderTextBitmap(
                text = "Bàn: $table",
                width = widthDots - 16,
                fontSize = calculateFontSize(labelSize, 0.85f),
                bold = true,
                centerAlign = false
            )
            output.write(bitmapToTspl(8, yPos, tableBitmap))
            yPos += tableBitmap.height + 2
            tableBitmap.recycle()
        }

        // ========== SUGAR & ICE ==========
        if (label.sugar != null || label.ice != null) {
            val optionsText = buildString {
                label.sugar?.let { append("Đường: $it  ") }
                label.ice?.let { append("Đá: $it") }
            }
            val optionsBitmap = renderTextBitmap(
                text = optionsText,
                width = widthDots - 16,
                fontSize = calculateFontSize(labelSize, 0.75f),
                bold = false,
                centerAlign = false
            )
            output.write(bitmapToTspl(8, yPos, optionsBitmap))
            yPos += optionsBitmap.height + 2
            optionsBitmap.recycle()
        }

        // ========== TOPPINGS ==========
        if (label.toppings.isNotEmpty()) {
            val toppingText = "Topping: " + label.toppings.joinToString(", ")
            val toppingBitmap = renderTextBitmap(
                text = toppingText,
                width = widthDots - 16,
                fontSize = calculateFontSize(labelSize, 0.7f),
                bold = false,
                centerAlign = false
            )
            output.write(bitmapToTspl(8, yPos, toppingBitmap))
            yPos += toppingBitmap.height + 2
            toppingBitmap.recycle()
        }

        // ========== NOTE ==========
        label.note?.let { note ->
            val noteBitmap = renderTextBitmap(
                text = "Ghi chú: $note",
                width = widthDots - 16,
                fontSize = calculateFontSize(labelSize, 0.7f),
                bold = false,
                centerAlign = false
            )
            output.write(bitmapToTspl(8, yPos, noteBitmap))
            yPos += noteBitmap.height + 2
            noteBitmap.recycle()
        }

        // ========== ORDER INFO (at bottom) ==========
        val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
        val orderInfo = if (label.totalLabels > 1) {
            "#${label.orderNumber} - ${timeFormat.format(label.orderTime)} (${label.labelIndex}/${label.totalLabels})"
        } else {
            "#${label.orderNumber} - ${timeFormat.format(label.orderTime)}"
        }

        val orderBitmap = renderTextBitmap(
            text = orderInfo,
            width = widthDots - 16,
            fontSize = calculateFontSize(labelSize, 0.65f),
            bold = false,
            centerAlign = true
        )
        val orderYPos = heightDots - orderBitmap.height - 8
        output.write(bitmapToTspl(8, orderYPos, orderBitmap))
        orderBitmap.recycle()

        // ========== PRINT ==========
        output.write("PRINT 1,1\r\n".toByteArray())

        val content = output.toByteArray()
        Log.d(TAG, "TSPL label generated: ${content.size} bytes")
        return content
    }

    /**
     * Calculate font size based on label size
     */
    private fun calculateFontSize(labelSize: LabelSize, scale: Float = 1.0f): Float {
        // Base font size for 72x30mm label
        val baseFontSize = when {
            labelSize.heightMm <= 30 -> 18f
            labelSize.heightMm <= 50 -> 22f
            else -> 26f
        }
        return baseFontSize * scale
    }

    /**
     * Convert bitmap to TSPL BITMAP command
     * Ensures white background (0) and black text (1)
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

        // Convert to monochrome: WHITE background (0), BLACK text (1)
        val threshold = 180 // Higher threshold = more black (better for text)
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

                        // Black text on white background
                        // If gray < threshold, it's dark (text) -> set bit to 1
                        if (gray < threshold) {
                            byte = byte or (0x80 shr bit)
                        }
                        // White background -> bit stays 0
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
        centerAlign: Boolean = false
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
            typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        }

        val alignment = if (centerAlign) Layout.Alignment.ALIGN_CENTER else Layout.Alignment.ALIGN_NORMAL

        val layout = StaticLayout.Builder
            .obtain(text, 0, text.length, paint, width)
            .setAlignment(alignment)
            .setLineSpacing(0f, 1.0f)
            .setIncludePad(true)
            .build()

        val height = layout.height.coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)  // WHITE background
        layout.draw(canvas)

        return bitmap
    }

    // ==================== ESC/POS LABEL GENERATION ====================

    /**
     * Generate ESC/POS label for receipt printers
     */
    private fun generateEscPosLabel(
        kitchen: KitchenEntity,
        label: LabelData
    ): ByteArray {
        val paperWidth = kitchen.paperWidth

        Log.d(TAG, "Generating ESC/POS label:")
        Log.d(TAG, "  - Paper width: ${paperWidth}mm")
        Log.d(TAG, "  - Item: ${label.itemName}")

        val builder = HybridBillBuilder(paperWidth, true, false)

        builder.apply {
            init()
            lineDouble(label.itemName, BitmapTextStyle(centerAlign = true))

            label.size?.let {
                lineBold("Size: $it", BitmapTextStyle(centerAlign = true))
            }

            label.tableName?.let {
                separator('-')
                lineBold("Bàn: $it")
            }

            if (label.sugar != null || label.ice != null) {
                separator('-')
                label.sugar?.let { line("Đường: $it") }
                label.ice?.let { line("Đá: $it") }
            }

            if (label.toppings.isNotEmpty()) {
                separator('-')
                line("Topping:")
                label.toppings.forEach { topping ->
                    line("  + $topping")
                }
            }

            label.note?.let {
                separator('-')
                line("Ghi chú: $it")
            }

            separator('-')
            val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
            val orderInfo = "#${label.orderNumber} - ${timeFormat.format(label.orderTime)}"

            if (label.totalLabels > 1) {
                lineKeyValue(orderInfo, "${label.labelIndex}/${label.totalLabels}")
            } else {
                lineCenter(orderInfo)
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
