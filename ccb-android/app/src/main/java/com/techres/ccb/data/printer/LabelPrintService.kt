package com.techres.ccb.data.printer

import android.util.Log
import com.techres.ccb.data.local.entity.KitchenEntity
import com.techres.ccb.printer.core.EscPosCommands
import com.techres.ccb.printer.core.TsplCommands
import com.techres.ccb.printer.core.TsplLabelBuilder
import com.techres.ccb.printer.core.TsplBitmapRenderer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.text.SimpleDateFormat
import java.util.*

/**
 * Label Print Service - In tem/sticker cho đồ uống, trà sữa, cà phê
 *
 * Hỗ trợ 2 loại máy in:
 * 1. ESC/POS receipt printers (EPSON, etc.)
 * 2. TSPL label printers (XPRINTER, TSC, etc.)
 *
 * Mỗi ly/món sẽ in 1 tem riêng biệt
 * Tem chứa: Tên món, Size, Topping, Ghi chú, Bàn, Mã đơn
 */
object LabelPrintService {
    private const val TAG = "LabelPrintService"

    /**
     * Printer type enum
     */
    enum class PrinterType {
        ESCPOS,     // ESC/POS receipt printers
        TSPL        // TSPL/TSC label printers (XPRINTER, etc.)
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
        val orderNumber: String,        // Mã đơn hàng
        val orderTime: Date = Date(),   // Thời gian order
        val staffName: String? = null,  // Tên nhân viên
        val labelIndex: Int = 1,        // Thứ tự tem (1/3, 2/3, 3/3)
        val totalLabels: Int = 1        // Tổng số tem
    )

    /**
     * In tem cho 1 item (có thể in nhiều tem nếu quantity > 1)
     */
    suspend fun printLabels(
        kitchen: KitchenEntity,
        labelData: LabelData,
        printerType: PrinterType = PrinterType.TSPL // Default to TSPL for label printers
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            val ip = kitchen.printerIp
                ?: return@withContext PrinterResult.Error("Chưa cấu hình IP máy in cho ${kitchen.name}")

            var lastError: String? = null

            // In nhiều tem nếu quantity > 1
            for (i in 1..labelData.quantity) {
                val currentLabel = labelData.copy(
                    labelIndex = i,
                    totalLabels = labelData.quantity
                )

                val labelContent = when (printerType) {
                    PrinterType.TSPL -> generateTsplLabelContent(kitchen, currentLabel)
                    PrinterType.ESCPOS -> generateEscPosLabelContent(kitchen, currentLabel)
                }

                // Retry logic
                var success = false
                repeat(3) { attempt ->
                    val result = printViaNetworkChunked(ip, kitchen.printerPort, labelContent)
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
     * In nhiều items (mỗi item có thể có quantity > 1)
     */
    suspend fun printMultipleLabels(
        kitchen: KitchenEntity,
        items: List<LabelData>,
        printerType: PrinterType = PrinterType.TSPL
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            var totalPrinted = 0
            var lastError: String? = null

            items.forEach { item ->
                val result = printLabels(kitchen, item, printerType)
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
     * Generate TSPL label content for XPRINTER and TSC label printers
     */
    private fun generateTsplLabelContent(
        kitchen: KitchenEntity,
        label: LabelData
    ): ByteArray {
        Log.d(TAG, "Generating TSPL label content:")
        Log.d(TAG, "  - Paper width: ${kitchen.paperWidth}mm")
        Log.d(TAG, "  - Printer type: TSPL")
        Log.d(TAG, "  - Item: ${label.itemName}")

        val output = java.io.ByteArrayOutputStream()

        // Label size: 72mm x 30mm (from self-test printout)
        val labelWidth = 72
        val labelHeight = 30

        // DPI = 203, so 8 dots per mm
        val dotsPerMm = 8

        // Setup commands
        output.write("SIZE $labelWidth mm, $labelHeight mm\r\n".toByteArray())
        output.write("GAP 3 mm, 0 mm\r\n".toByteArray())
        output.write("DIRECTION 0\r\n".toByteArray())
        output.write("CLS\r\n".toByteArray())
        output.write("DENSITY 8\r\n".toByteArray())
        output.write("SPEED 4\r\n".toByteArray())

        // Calculate positions
        val labelWidthDots = labelWidth * dotsPerMm  // 576 dots
        val labelHeightDots = labelHeight * dotsPerMm // 240 dots

        var yPos = 8 // Start Y position in dots

        // ========== TÊN MÓN (BITMAP for Vietnamese) ==========
        val itemNameBitmap = TsplBitmapRenderer.renderText(
            text = label.itemName,
            width = labelWidthDots - 16,
            fontSize = 28f,
            bold = true,
            centerAlign = true
        )
        output.write(TsplCommands.bitmap(8, yPos, itemNameBitmap))
        yPos += itemNameBitmap.height + 4
        itemNameBitmap.recycle()

        // ========== SIZE (if available) ==========
        label.size?.let { size ->
            val sizeBitmap = TsplBitmapRenderer.renderText(
                text = "Size: $size",
                width = labelWidthDots - 16,
                fontSize = 20f,
                bold = true,
                centerAlign = true
            )
            output.write(TsplCommands.bitmap(8, yPos, sizeBitmap))
            yPos += sizeBitmap.height + 2
            sizeBitmap.recycle()
        }

        // ========== LINE SEPARATOR ==========
        output.write("BAR 8,$yPos,${labelWidthDots - 16},2\r\n".toByteArray())
        yPos += 6

        // ========== TABLE NAME ==========
        label.tableName?.let { table ->
            val tableBitmap = TsplBitmapRenderer.renderText(
                text = "Ban: $table",
                width = labelWidthDots - 16,
                fontSize = 18f,
                bold = true,
                centerAlign = false
            )
            output.write(TsplCommands.bitmap(8, yPos, tableBitmap))
            yPos += tableBitmap.height + 2
            tableBitmap.recycle()
        }

        // ========== SUGAR & ICE OPTIONS ==========
        if (label.sugar != null || label.ice != null) {
            val optionsText = buildString {
                label.sugar?.let { append("Duong: $it  ") }
                label.ice?.let { append("Da: $it") }
            }
            val optionsBitmap = TsplBitmapRenderer.renderText(
                text = optionsText,
                width = labelWidthDots - 16,
                fontSize = 16f,
                bold = false,
                centerAlign = false
            )
            output.write(TsplCommands.bitmap(8, yPos, optionsBitmap))
            yPos += optionsBitmap.height + 2
            optionsBitmap.recycle()
        }

        // ========== TOPPINGS ==========
        if (label.toppings.isNotEmpty()) {
            val toppingText = "Topping: " + label.toppings.joinToString(", ")
            val toppingBitmap = TsplBitmapRenderer.renderText(
                text = toppingText,
                width = labelWidthDots - 16,
                fontSize = 14f,
                bold = false,
                centerAlign = false
            )
            output.write(TsplCommands.bitmap(8, yPos, toppingBitmap))
            yPos += toppingBitmap.height + 2
            toppingBitmap.recycle()
        }

        // ========== NOTE ==========
        label.note?.let { note ->
            val noteBitmap = TsplBitmapRenderer.renderText(
                text = "Ghi chu: $note",
                width = labelWidthDots - 16,
                fontSize = 14f,
                bold = false,
                centerAlign = false
            )
            output.write(TsplCommands.bitmap(8, yPos, noteBitmap))
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

        // Put order info at bottom of label
        val orderBitmap = TsplBitmapRenderer.renderText(
            text = orderInfo,
            width = labelWidthDots - 16,
            fontSize = 14f,
            bold = false,
            centerAlign = true
        )
        val orderYPos = labelHeightDots - orderBitmap.height - 8
        output.write(TsplCommands.bitmap(8, orderYPos, orderBitmap))
        orderBitmap.recycle()

        // ========== PRINT COMMAND ==========
        output.write("PRINT 1,1\r\n".toByteArray())

        val content = output.toByteArray()
        Log.d(TAG, "TSPL label content generated: ${content.size} bytes")
        return content
    }

    /**
     * Generate ESC/POS label content (for receipt printers)
     */
    private fun generateEscPosLabelContent(
        kitchen: KitchenEntity,
        label: LabelData
    ): ByteArray {
        val paperWidth = kitchen.paperWidth
        val useBitmapMode = true
        val useRasterBitmap = false

        Log.d(TAG, "Generating ESC/POS label content:")
        Log.d(TAG, "  - Paper width: ${paperWidth}mm")
        Log.d(TAG, "  - Item: ${label.itemName}")

        val builder = HybridBillBuilder(paperWidth, useBitmapMode, useRasterBitmap)

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

    // ==================== SIMPLE TEST FUNCTIONS ====================

    /**
     * Simple TSPL test - Test if XPRINTER can receive TSPL commands
     */
    suspend fun printTsplSimpleTest(
        ip: String,
        port: Int = 9100
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            Log.d(TAG, "=== TSPL SIMPLE TEST ===")
            Log.d(TAG, "Target: $ip:$port")

            val content = buildTsplSimpleTestContent()
            Log.d(TAG, "TSPL test content size: ${content.size} bytes")
            Log.d(TAG, "TSPL commands:\n${String(content)}")

            printViaNetworkChunked(ip, port, content)
        }
    }

    /**
     * Build TSPL simple test content
     */
    private fun buildTsplSimpleTestContent(): ByteArray {
        val output = java.io.ByteArrayOutputStream()

        // Label size 72mm x 30mm (from self-test)
        output.write("SIZE 72 mm, 30 mm\r\n".toByteArray())
        output.write("GAP 3 mm, 0 mm\r\n".toByteArray())
        output.write("DIRECTION 0\r\n".toByteArray())
        output.write("CLS\r\n".toByteArray())
        output.write("DENSITY 8\r\n".toByteArray())

        // Print text using built-in fonts (no Vietnamese - ASCII only)
        output.write("TEXT 50,20,\"3\",0,1,1,\"XPRINTER TEST\"\r\n".toByteArray())
        output.write("TEXT 50,60,\"2\",0,1,1,\"Label Printer OK!\"\r\n".toByteArray())
        output.write("TEXT 50,100,\"1\",0,1,1,\"1234567890\"\r\n".toByteArray())
        output.write("TEXT 50,130,\"1\",0,1,1,\"ABCDEFGHIJ\"\r\n".toByteArray())

        // Draw a box
        output.write("BOX 20,10,550,220,2\r\n".toByteArray())

        // Draw a line
        output.write("BAR 20,160,530,2\r\n".toByteArray())

        // Print date/time
        val dateStr = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(Date())
        output.write("TEXT 50,180,\"1\",0,1,1,\"$dateStr\"\r\n".toByteArray())

        // Print 1 copy
        output.write("PRINT 1,1\r\n".toByteArray())

        return output.toByteArray()
    }

    /**
     * Simple ESC/POS text test - No bitmap, just text commands
     */
    suspend fun printSimpleTest(
        ip: String,
        port: Int = 9100
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            Log.d(TAG, "=== SIMPLE TEXT TEST ===")
            Log.d(TAG, "Target: $ip:$port")

            // Try TSPL first (since we know it's a label printer)
            Log.d(TAG, "Trying TSPL commands...")
            val tsplResult = printTsplSimpleTest(ip, port)

            if (tsplResult is PrinterResult.Success) {
                return@withContext tsplResult
            }

            // If TSPL fails, try ESC/POS
            Log.d(TAG, "TSPL failed, trying ESC/POS...")
            val escPosContent = buildEscPosSimpleTestContent()
            printViaNetworkChunked(ip, port, escPosContent)
        }
    }

    /**
     * Build ESC/POS simple test content
     */
    private fun buildEscPosSimpleTestContent(): ByteArray {
        val output = java.io.ByteArrayOutputStream()

        output.write(EscPosCommands.INIT)
        output.write(EscPosCommands.ALIGN_CENTER)
        output.write("=== XPRINTER TEST ===\n".toByteArray())
        output.write("--------------------\n".toByteArray())
        output.write("Printer is working!\n".toByteArray())
        output.write("IP: Connected OK\n".toByteArray())
        output.write("--------------------\n".toByteArray())
        output.write("1234567890\n".toByteArray())
        output.write("ABCDEFGHIJ\n".toByteArray())
        output.write("abcdefghij\n".toByteArray())
        output.write("--------------------\n".toByteArray())
        output.write(EscPosCommands.feedLines(4))
        output.write(EscPosCommands.CUT_PARTIAL)

        return output.toByteArray()
    }

    // ==================== NETWORK PRINT ====================

    /**
     * In qua mạng với chunked data
     */
    private suspend fun printViaNetworkChunked(
        ip: String,
        port: Int,
        content: ByteArray,
        chunkSize: Int = 1024
    ): PrinterResult {
        var socket: Socket? = null
        var outputStream: OutputStream? = null

        Log.d(TAG, "=== START CHUNKED PRINT ===")
        Log.d(TAG, "Target: $ip:$port")
        Log.d(TAG, "Content size: ${content.size} bytes, chunk size: $chunkSize")

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

            // Send data in chunks
            var offset = 0
            var chunkNum = 0
            while (offset < content.size) {
                val remaining = content.size - offset
                val currentChunkSize = minOf(chunkSize, remaining)

                outputStream.write(content, offset, currentChunkSize)
                outputStream.flush()

                chunkNum++
                offset += currentChunkSize

                Log.d(TAG, "Sent chunk $chunkNum: $currentChunkSize bytes (total: $offset/${content.size})")

                // Small delay between chunks
                if (offset < content.size) {
                    delay(50)
                }
            }

            Log.d(TAG, "All chunks sent, waiting for printer...")
            delay(500)

            Log.d(TAG, "=== PRINT SUCCESS ===")
            PrinterResult.Success("OK")
        } catch (e: Exception) {
            Log.e(TAG, "=== PRINT FAILED ===", e)
            PrinterResult.Error("Lỗi in: ${e.message}")
        } finally {
            try {
                outputStream?.flush()
                socket?.shutdownOutput()
                delay(100)
                outputStream?.close()
                socket?.close()
                Log.d(TAG, "Connection closed")
            } catch (e: Exception) {
                Log.e(TAG, "Close error: ${e.message}")
            }
        }
    }
}
