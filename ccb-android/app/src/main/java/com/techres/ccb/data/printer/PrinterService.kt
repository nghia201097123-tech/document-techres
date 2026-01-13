package com.techres.ccb.data.printer

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.util.Log
import com.techres.ccb.printer.core.EscPosCommands
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.text.SimpleDateFormat
import java.util.*

/**
 * Printer Service for connecting to thermal printers via TCP/IP
 * Supports ESC/POS protocol with bitmap printing for Vietnamese text
 */
object PrinterService {
    private const val TAG = "PrinterService"
    private const val DEFAULT_PORT = 9100
    private const val CONNECTION_TIMEOUT = 5000 // 5 seconds

    // Paper width in pixels (for 80mm paper at 203 DPI)
    private const val PAPER_WIDTH_80MM = 576 // 80mm paper
    private const val PAPER_WIDTH_58MM = 384 // 58mm paper

    // ESC/POS Commands
    object EscPos {
        // Initialize printer
        val INIT = byteArrayOf(0x1B, 0x40)

        // Text alignment
        val ALIGN_LEFT = byteArrayOf(0x1B, 0x61, 0x00)
        val ALIGN_CENTER = byteArrayOf(0x1B, 0x61, 0x01)
        val ALIGN_RIGHT = byteArrayOf(0x1B, 0x61, 0x02)

        // Paper control
        val LINE_FEED = byteArrayOf(0x0A)
        val FEED_LINES_3 = byteArrayOf(0x1B, 0x64, 0x03)
        val FEED_LINES_5 = byteArrayOf(0x1B, 0x64, 0x05)

        // Cut paper
        val CUT_FULL = byteArrayOf(0x1D, 0x56, 0x00)
        val CUT_PARTIAL = byteArrayOf(0x1D, 0x56, 0x01)
        val CUT_FEED = byteArrayOf(0x1D, 0x56, 0x42, 0x00)

        // Beep
        val BEEP = byteArrayOf(0x1B, 0x42, 0x03, 0x02)

        // Line spacing
        val LINE_SPACING_DEFAULT = byteArrayOf(0x1B, 0x32) // Default line spacing
        val LINE_SPACING_SET = byteArrayOf(0x1B, 0x33, 0x00) // Set line spacing to 0
    }

    /**
     * Text style options for bitmap rendering
     */
    data class TextStyle(
        val fontSize: Float = 24f,
        val bold: Boolean = false,
        val centerAlign: Boolean = false,
        val doubleHeight: Boolean = false,
        val doubleWidth: Boolean = false
    )

    /**
     * Render text to bitmap with Vietnamese support using StaticLayout
     * StaticLayout handles complex text (diacritics, combining characters) better
     */
    private fun textToBitmap(
        text: String,
        style: TextStyle = TextStyle(),
        paperWidth: Int = PAPER_WIDTH_80MM
    ): Bitmap {
        // Use TextPaint for better text rendering
        val textPaint = TextPaint().apply {
            color = Color.BLACK
            textSize = style.fontSize * (if (style.doubleHeight || style.doubleWidth) 1.5f else 1f)
            isAntiAlias = true
            // Use SERIF font which has better Unicode/Vietnamese support
            typeface = if (style.bold) {
                Typeface.create(Typeface.SERIF, Typeface.BOLD)
            } else {
                Typeface.create(Typeface.SERIF, Typeface.NORMAL)
            }
            // Enable subpixel text for better rendering
            isSubpixelText = true
        }

        // Determine text alignment
        val alignment = if (style.centerAlign) {
            Layout.Alignment.ALIGN_CENTER
        } else {
            Layout.Alignment.ALIGN_NORMAL
        }

        // Create StaticLayout for proper text layout with Vietnamese support
        val staticLayout = StaticLayout.Builder
            .obtain(text, 0, text.length, textPaint, paperWidth)
            .setAlignment(alignment)
            .setLineSpacing(0f, 1.0f)
            .setIncludePad(true)
            .build()

        // Create bitmap with calculated height
        val height = staticLayout.height.coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(paperWidth, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)

        // Draw the text using StaticLayout
        staticLayout.draw(canvas)

        return bitmap
    }

    /**
     * Convert bitmap to ESC/POS format using the existing EscPosCommands
     * Uses printBitmap which has been tested to work with Vietnamese text
     */
    private fun bitmapToEscPos(bitmap: Bitmap): ByteArray {
        // Use the existing printBitmap function from EscPosCommands
        // which has been proven to work with the user's printers
        return EscPosCommands.printBitmap(bitmap, 0) // 0 = left align
    }

    /**
     * Print text as bitmap image using ESC/POS commands
     */
    private fun printTextAsBitmap(
        outputStream: OutputStream,
        text: String,
        style: TextStyle = TextStyle(),
        paperWidth: Int = PAPER_WIDTH_80MM
    ) {
        if (text.isBlank()) return
        val bitmap = textToBitmap(text, style, paperWidth)
        val imageData = bitmapToEscPos(bitmap)
        outputStream.write(imageData)
        bitmap.recycle()
    }

    /**
     * Print a divider line
     */
    private fun printDivider(outputStream: OutputStream, char: Char = '-', length: Int = 32) {
        printTextAsBitmap(outputStream, char.toString().repeat(length))
    }

    /**
     * Test connection to printer with retry logic
     */
    suspend fun testConnection(
        ip: String,
        port: Int = DEFAULT_PORT,
        maxRetries: Int = 3
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            var lastError: String? = null

            for (attempt in 1..maxRetries) {
                try {
                    Log.d(TAG, "Connection attempt $attempt/$maxRetries to $ip:$port")

                    val socket = Socket().apply {
                        reuseAddress = true
                        keepAlive = true
                        tcpNoDelay = true
                        setSoLinger(true, 2)
                    }
                    socket.connect(InetSocketAddress(ip, port), CONNECTION_TIMEOUT)

                    try {
                        socket.shutdownOutput()
                        socket.close()
                    } catch (e: Exception) {}

                    return@withContext PrinterResult.Success("Kết nối thành công đến $ip:$port")

                } catch (e: IOException) {
                    lastError = e.message
                    Log.e(TAG, "Connection attempt $attempt failed: ${e.message}")

                    if ((e.message?.contains("ECONNREFUSED", ignoreCase = true) == true ||
                         e.message?.contains("Connection refused", ignoreCase = true) == true) &&
                        attempt < maxRetries) {
                        Log.d(TAG, "Connection refused, waiting before retry...")
                        kotlinx.coroutines.delay(500L * attempt)
                        continue
                    }

                    return@withContext PrinterResult.Error("Không thể kết nối: ${e.message}")
                } catch (e: Exception) {
                    Log.e(TAG, "Error: ${e.message}")
                    return@withContext PrinterResult.Error("Lỗi: ${e.message}")
                }
            }

            PrinterResult.Error("Không thể kết nối sau $maxRetries lần thử: $lastError")
        }
    }

    /**
     * Print test page with Vietnamese text support
     */
    suspend fun printTestPage(
        ip: String,
        port: Int = DEFAULT_PORT,
        kitchenName: String,
        printerName: String?,
        maxRetries: Int = 3
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            var socket: Socket? = null
            var outputStream: OutputStream? = null
            var lastError: String? = null

            for (attempt in 1..maxRetries) {
                try {
                    Log.d(TAG, "Print attempt $attempt/$maxRetries to $ip:$port")

                    socket = Socket().apply {
                        reuseAddress = true
                        keepAlive = true
                        tcpNoDelay = true
                        setSoLinger(true, 2)
                    }
                    socket.connect(InetSocketAddress(ip, port), CONNECTION_TIMEOUT)
                    outputStream = socket.getOutputStream()
                    break

                } catch (e: IOException) {
                    lastError = e.message
                    Log.e(TAG, "Print connection attempt $attempt failed: ${e.message}")

                    try {
                        outputStream?.close()
                        socket?.close()
                    } catch (ex: Exception) {}
                    socket = null
                    outputStream = null

                    if ((e.message?.contains("ECONNREFUSED", ignoreCase = true) == true ||
                         e.message?.contains("Connection refused", ignoreCase = true) == true) &&
                        attempt < maxRetries) {
                        Log.d(TAG, "Connection refused, waiting before retry...")
                        kotlinx.coroutines.delay(500L * attempt)
                        continue
                    }

                    return@withContext PrinterResult.Error("Lỗi in: ${e.message}")
                }
            }

            if (socket == null || outputStream == null) {
                return@withContext PrinterResult.Error("Lỗi in: Không thể kết nối sau $maxRetries lần thử: $lastError")
            }

            try {
                val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault())
                val currentTime = dateFormat.format(Date())

                // Initialize printer
                outputStream.write(EscPos.INIT)
                outputStream.write(EscPos.LINE_SPACING_SET)

                // Header - centered, large
                printTextAsBitmap(
                    outputStream,
                    "** IN THỬ **",
                    TextStyle(fontSize = 32f, bold = true, centerAlign = true)
                )

                // Kitchen name
                printTextAsBitmap(
                    outputStream,
                    kitchenName,
                    TextStyle(fontSize = 28f, bold = true, centerAlign = true)
                )

                printDivider(outputStream)

                // Printer info
                printTextAsBitmap(outputStream, "Máy in: ${printerName ?: "N/A"}")
                printTextAsBitmap(outputStream, "IP: $ip")
                printTextAsBitmap(outputStream, "Port: $port")
                printTextAsBitmap(outputStream, "Thời gian: $currentTime")

                printDivider(outputStream)

                // Test characters
                printTextAsBitmap(outputStream, "Test ký tự:")
                printTextAsBitmap(outputStream, "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
                printTextAsBitmap(outputStream, "abcdefghijklmnopqrstuvwxyz")
                printTextAsBitmap(outputStream, "0123456789")

                // Vietnamese test WITH diacritics
                printTextAsBitmap(outputStream, "\nTest tiếng Việt có dấu:", TextStyle(bold = true))
                printTextAsBitmap(outputStream, "Xin chào! Kết nối thành công!")
                printTextAsBitmap(outputStream, "Cà phê, Phở, Bánh mì, Bún bò")
                printTextAsBitmap(outputStream, "ă â đ ê ô ơ ư")
                printTextAsBitmap(outputStream, "ẮẰẲẴẶẤẦẨẪẬĐ")
                printTextAsBitmap(outputStream, "ẾỀỂỄỆỐỒỔỖỘ")
                printTextAsBitmap(outputStream, "ỚỜỞỠỢỨỪỬỮỰ")

                printDivider(outputStream)

                // Footer
                printTextAsBitmap(
                    outputStream,
                    "CCB POS - TechRes",
                    TextStyle(bold = true, centerAlign = true)
                )
                printTextAsBitmap(
                    outputStream,
                    "www.techres.vn",
                    TextStyle(centerAlign = true)
                )

                // Feed and cut
                outputStream.write(EscPos.FEED_LINES_5)
                outputStream.write(EscPos.CUT_FEED)
                outputStream.flush()

                PrinterResult.Success("In thử thành công!")

            } catch (e: IOException) {
                Log.e(TAG, "Print failed: ${e.message}")
                PrinterResult.Error("Lỗi in: ${e.message}")
            } catch (e: Exception) {
                Log.e(TAG, "Error: ${e.message}")
                PrinterResult.Error("Lỗi: ${e.message}")
            } finally {
                try { outputStream?.flush() } catch (e: Exception) {}
                try { socket?.shutdownOutput() } catch (e: Exception) {}
                try { outputStream?.close() } catch (e: Exception) {}
                try { socket?.close() } catch (e: Exception) {
                    Log.e(TAG, "Error closing: ${e.message}")
                }
            }
        }
    }

    /**
     * Print kitchen order ticket with Vietnamese support
     */
    suspend fun printKitchenTicket(
        ip: String,
        port: Int = DEFAULT_PORT,
        kitchenName: String,
        orderNumber: String,
        tableName: String?,
        items: List<KitchenOrderItem>,
        notes: String? = null,
        maxRetries: Int = 3
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            var socket: Socket? = null
            var outputStream: OutputStream? = null
            var lastError: String? = null

            for (attempt in 1..maxRetries) {
                try {
                    Log.d(TAG, "Kitchen print attempt $attempt/$maxRetries to $ip:$port")

                    socket = Socket().apply {
                        reuseAddress = true
                        keepAlive = true
                        tcpNoDelay = true
                        setSoLinger(true, 2)
                    }
                    socket.connect(InetSocketAddress(ip, port), CONNECTION_TIMEOUT)
                    outputStream = socket.getOutputStream()
                    break

                } catch (e: IOException) {
                    lastError = e.message
                    Log.e(TAG, "Kitchen print connection attempt $attempt failed: ${e.message}")

                    try {
                        outputStream?.close()
                        socket?.close()
                    } catch (ex: Exception) {}
                    socket = null
                    outputStream = null

                    if ((e.message?.contains("ECONNREFUSED", ignoreCase = true) == true ||
                         e.message?.contains("Connection refused", ignoreCase = true) == true) &&
                        attempt < maxRetries) {
                        Log.d(TAG, "Connection refused, waiting before retry...")
                        kotlinx.coroutines.delay(500L * attempt)
                        continue
                    }

                    return@withContext PrinterResult.Error("Lỗi in: ${e.message}")
                }
            }

            if (socket == null || outputStream == null) {
                return@withContext PrinterResult.Error("Lỗi in: Không thể kết nối sau $maxRetries lần thử: $lastError")
            }

            try {
                val dateFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
                val currentTime = dateFormat.format(Date())

                // Initialize
                outputStream.write(EscPos.INIT)
                outputStream.write(EscPos.LINE_SPACING_SET)

                // Beep to alert kitchen
                outputStream.write(EscPos.BEEP)

                // Header - Kitchen name
                printTextAsBitmap(
                    outputStream,
                    kitchenName,
                    TextStyle(fontSize = 32f, bold = true, centerAlign = true)
                )

                printDivider(outputStream, '=')

                // Order info
                printTextAsBitmap(
                    outputStream,
                    "Đơn: $orderNumber",
                    TextStyle(fontSize = 28f, bold = true)
                )
                if (tableName != null) {
                    printTextAsBitmap(
                        outputStream,
                        "Bàn: $tableName",
                        TextStyle(fontSize = 28f, bold = true)
                    )
                }
                printTextAsBitmap(outputStream, "Giờ: $currentTime")

                printDivider(outputStream, '=')

                // Items - larger font for kitchen visibility
                items.forEach { item ->
                    printTextAsBitmap(
                        outputStream,
                        "${item.quantity}x ${item.name}",
                        TextStyle(fontSize = 28f, bold = true)
                    )
                    if (item.note != null) {
                        printTextAsBitmap(
                            outputStream,
                            "   → ${item.note}",
                            TextStyle(fontSize = 22f)
                        )
                    }
                }

                // Notes
                if (notes != null) {
                    printDivider(outputStream)
                    printTextAsBitmap(
                        outputStream,
                        "Ghi chú: $notes",
                        TextStyle(bold = true)
                    )
                }

                printDivider(outputStream, '=')

                // Feed and cut
                outputStream.write(EscPos.FEED_LINES_3)
                outputStream.write(EscPos.CUT_FEED)
                outputStream.flush()

                PrinterResult.Success("In order thành công!")

            } catch (e: IOException) {
                Log.e(TAG, "Kitchen print failed: ${e.message}")
                PrinterResult.Error("Lỗi in: ${e.message}")
            } catch (e: Exception) {
                Log.e(TAG, "Kitchen print error: ${e.message}")
                PrinterResult.Error("Lỗi: ${e.message}")
            } finally {
                try { outputStream?.flush() } catch (e: Exception) {}
                try { socket?.shutdownOutput() } catch (e: Exception) {}
                try { outputStream?.close() } catch (e: Exception) {}
                try { socket?.close() } catch (e: Exception) {
                    Log.e(TAG, "Error closing: ${e.message}")
                }
            }
        }
    }
}

sealed class PrinterResult {
    data class Success(val message: String) : PrinterResult()
    data class Error(val message: String) : PrinterResult()
}

data class KitchenOrderItem(
    val name: String,
    val quantity: Int,
    val note: String? = null
)
