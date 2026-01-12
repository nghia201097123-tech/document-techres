package com.techres.ccb.data.printer

import android.util.Log
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
 * Supports ESC/POS protocol used by most thermal printers:
 * - Epson TM-T88, TM-T82, TM-P20, TM-U220
 * - Star Micronics TSP100, TSP654, SM-T300
 * - Bixolon SRP-350, SPP-R310, SPP-R200
 * - Citizen CT-S310, CT-E651, CMP-30
 * - Xprinter XP-N160II, XP-58IIH, XP-80
 * - HPRT TP806L, TP808, TP585
 * - Rongta RP80, RP58, RP330
 * - Zjiang ZJ-5890K, ZJ-8250
 * - MUNBYN IMP001, IMP002
 */
object PrinterService {
    private const val TAG = "PrinterService"
    private const val DEFAULT_PORT = 9100
    private const val CONNECTION_TIMEOUT = 5000 // 5 seconds

    // ESC/POS Commands
    object EscPos {
        // Initialize printer
        val INIT = byteArrayOf(0x1B, 0x40)

        // Text alignment
        val ALIGN_LEFT = byteArrayOf(0x1B, 0x61, 0x00)
        val ALIGN_CENTER = byteArrayOf(0x1B, 0x61, 0x01)
        val ALIGN_RIGHT = byteArrayOf(0x1B, 0x61, 0x02)

        // Text size
        val TEXT_NORMAL = byteArrayOf(0x1B, 0x21, 0x00)
        val TEXT_DOUBLE_HEIGHT = byteArrayOf(0x1B, 0x21, 0x10)
        val TEXT_DOUBLE_WIDTH = byteArrayOf(0x1B, 0x21, 0x20)
        val TEXT_DOUBLE = byteArrayOf(0x1B, 0x21, 0x30) // Both double

        // Text style
        val BOLD_ON = byteArrayOf(0x1B, 0x45, 0x01)
        val BOLD_OFF = byteArrayOf(0x1B, 0x45, 0x00)
        val UNDERLINE_ON = byteArrayOf(0x1B, 0x2D, 0x01)
        val UNDERLINE_OFF = byteArrayOf(0x1B, 0x2D, 0x00)

        // Paper control
        val LINE_FEED = byteArrayOf(0x0A)
        val FEED_LINES_3 = byteArrayOf(0x1B, 0x64, 0x03)
        val FEED_LINES_5 = byteArrayOf(0x1B, 0x64, 0x05)

        // Cut paper
        val CUT_FULL = byteArrayOf(0x1D, 0x56, 0x00) // Full cut
        val CUT_PARTIAL = byteArrayOf(0x1D, 0x56, 0x01) // Partial cut
        val CUT_FEED = byteArrayOf(0x1D, 0x56, 0x42, 0x00) // Feed and cut

        // Beep (for some printers)
        val BEEP = byteArrayOf(0x1B, 0x42, 0x03, 0x02) // Beep 3 times, 200ms each

        // Character set for Vietnamese (Code Page 1258 or UTF-8)
        val CHARSET_PC1258 = byteArrayOf(0x1B, 0x74, 0x1E) // Vietnamese code page (CP1258)
        val CHARSET_UTF8 = byteArrayOf(0x1B, 0x74, 0x00) // UTF-8

        // Multi-byte character mode (for Asian characters including Vietnamese)
        // Different printers use different commands - try multiple approaches
        val ENABLE_MULTIBYTE = byteArrayOf(0x1C, 0x26) // FS & - Enable Kanji/multi-byte mode
        val SELECT_UTF8_MODE = byteArrayOf(0x1C, 0x43, 0x00) // FS C 0 - Select UTF-8 encoding
        val SELECT_UTF8_MODE_ALT = byteArrayOf(0x1C, 0x2E) // FS . - Alternative UTF-8 mode

        // International character set
        val SELECT_INTL_CHARSET = byteArrayOf(0x1B, 0x52, 0x00) // ESC R 0 - USA charset as base

        // Combined Vietnamese initialization sequence
        // Tries multiple approaches for maximum compatibility
        fun getVietnameseInit(): ByteArray {
            return INIT + SELECT_INTL_CHARSET + ENABLE_MULTIBYTE + SELECT_UTF8_MODE
        }
    }

    /**
     * Convert text to bytes with Vietnamese support
     * Uses UTF-8 encoding which works with most modern thermal printers
     */
    private fun textToBytes(text: String): ByteArray {
        return text.toByteArray(Charsets.UTF_8)
    }

    /**
     * Test connection to printer with retry logic
     * @param maxRetries Số lần thử lại khi gặp Connection Refused
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

                    // Connection successful - clean close
                    try {
                        socket.shutdownOutput()
                        socket.close()
                    } catch (e: Exception) {
                        // Ignore close errors
                    }

                    return@withContext PrinterResult.Success("Kết nối thành công đến $ip:$port")

                } catch (e: IOException) {
                    lastError = e.message
                    Log.e(TAG, "Connection attempt $attempt failed: ${e.message}")

                    // Retry on Connection Refused
                    if ((e.message?.contains("ECONNREFUSED", ignoreCase = true) == true ||
                         e.message?.contains("Connection refused", ignoreCase = true) == true) &&
                        attempt < maxRetries) {
                        Log.d(TAG, "Connection refused, waiting before retry...")
                        kotlinx.coroutines.delay(500L * attempt) // Exponential backoff
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
     * Print test page with retry logic
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

                    // Connect with better socket options
                    socket = Socket().apply {
                        reuseAddress = true
                        keepAlive = true
                        tcpNoDelay = true
                        setSoLinger(true, 2)
                    }
                    socket.connect(InetSocketAddress(ip, port), CONNECTION_TIMEOUT)
                    outputStream = socket.getOutputStream()

                    // If we get here, connection is successful - break retry loop and print
                    break

                } catch (e: IOException) {
                    lastError = e.message
                    Log.e(TAG, "Print connection attempt $attempt failed: ${e.message}")

                    // Clean up failed socket
                    try {
                        outputStream?.close()
                        socket?.close()
                    } catch (ex: Exception) {}
                    socket = null
                    outputStream = null

                    // Retry on Connection Refused
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

            // Check if connection was established after retry loop
            if (socket == null || outputStream == null) {
                return@withContext PrinterResult.Error("Lỗi in: Không thể kết nối sau $maxRetries lần thử: $lastError")
            }

            try {

                // Build test print content
                val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault())
                val currentTime = dateFormat.format(Date())

                // Initialize printer with Vietnamese/UTF-8 support
                outputStream.write(EscPos.getVietnameseInit())

                // Header - centered, double size
                outputStream.write(EscPos.ALIGN_CENTER)
                outputStream.write(EscPos.TEXT_DOUBLE)
                outputStream.write(EscPos.BOLD_ON)
                outputStream.write(textToBytes("** IN THỬ **\n"))
                outputStream.write(EscPos.BOLD_OFF)
                outputStream.write(EscPos.TEXT_NORMAL)

                outputStream.write(EscPos.LINE_FEED)

                // Kitchen name
                outputStream.write(EscPos.TEXT_DOUBLE_HEIGHT)
                outputStream.write(EscPos.BOLD_ON)
                outputStream.write(textToBytes("$kitchenName\n"))
                outputStream.write(EscPos.BOLD_OFF)
                outputStream.write(EscPos.TEXT_NORMAL)

                // Divider
                outputStream.write(textToBytes("--------------------------------\n"))

                // Printer info - left aligned
                outputStream.write(EscPos.ALIGN_LEFT)
                outputStream.write(textToBytes("Máy in: ${printerName ?: "N/A"}\n"))
                outputStream.write(textToBytes("IP: $ip\n"))
                outputStream.write(textToBytes("Port: $port\n"))
                outputStream.write(textToBytes("Thời gian: $currentTime\n"))

                // Divider
                outputStream.write(EscPos.ALIGN_CENTER)
                outputStream.write(textToBytes("--------------------------------\n"))

                // Test characters
                outputStream.write(EscPos.ALIGN_LEFT)
                outputStream.write(textToBytes("Test ký tự:\n"))
                outputStream.write(textToBytes("ABCDEFGHIJKLMNOPQRSTUVWXYZ\n"))
                outputStream.write(textToBytes("abcdefghijklmnopqrstuvwxyz\n"))
                outputStream.write(textToBytes("0123456789\n"))
                outputStream.write(textToBytes("!@#\$%^&*()_+-=[]{}|;':\",./<>?\n"))

                // Vietnamese test WITH diacritics
                outputStream.write(textToBytes("\nTest tiếng Việt có dấu:\n"))
                outputStream.write(textToBytes("Xin chào! Kết nối thành công!\n"))
                outputStream.write(textToBytes("Cà phê, Phở, Bánh mì, Bún bò\n"))
                outputStream.write(textToBytes("ă â đ ê ô ơ ư\n"))
                outputStream.write(textToBytes("ẮẰẲẴẶẤẦẨẪẬĐẾỀỂỄỆỐỒỔỖỘỚỜỞỠỢỨỪỬỮỰ\n"))

                // Footer
                outputStream.write(EscPos.ALIGN_CENTER)
                outputStream.write(textToBytes("--------------------------------\n"))
                outputStream.write(EscPos.BOLD_ON)
                outputStream.write(textToBytes("CCB POS - TechRes\n"))
                outputStream.write(EscPos.BOLD_OFF)
                outputStream.write(textToBytes("www.techres.vn\n"))

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
                // Clean close with proper shutdown
                try {
                    outputStream?.flush()
                } catch (e: Exception) {}
                try {
                    socket?.shutdownOutput()
                } catch (e: Exception) {}
                try {
                    outputStream?.close()
                } catch (e: Exception) {}
                try {
                    socket?.close()
                } catch (e: Exception) {
                    Log.e(TAG, "Error closing: ${e.message}")
                }
            }
        }
    }

    /**
     * Print kitchen order ticket with retry logic
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

                    // Connect with better socket options
                    socket = Socket().apply {
                        reuseAddress = true
                        keepAlive = true
                        tcpNoDelay = true
                        setSoLinger(true, 2)
                    }
                    socket.connect(InetSocketAddress(ip, port), CONNECTION_TIMEOUT)
                    outputStream = socket.getOutputStream()

                    // If we get here, connection is successful - break retry loop and print
                    break

                } catch (e: IOException) {
                    lastError = e.message
                    Log.e(TAG, "Kitchen print connection attempt $attempt failed: ${e.message}")

                    // Clean up failed socket
                    try {
                        outputStream?.close()
                        socket?.close()
                    } catch (ex: Exception) {}
                    socket = null
                    outputStream = null

                    // Retry on Connection Refused
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

            // Check if connection was established after retry loop
            if (socket == null || outputStream == null) {
                return@withContext PrinterResult.Error("Lỗi in: Không thể kết nối sau $maxRetries lần thử: $lastError")
            }

            try {

                val dateFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
                val currentTime = dateFormat.format(Date())

                // Initialize with Vietnamese/UTF-8 support
                outputStream.write(EscPos.getVietnameseInit())

                // Beep to alert kitchen
                outputStream.write(EscPos.BEEP)

                // Header
                outputStream.write(EscPos.ALIGN_CENTER)
                outputStream.write(EscPos.TEXT_DOUBLE)
                outputStream.write(EscPos.BOLD_ON)
                outputStream.write(textToBytes("$kitchenName\n"))
                outputStream.write(EscPos.BOLD_OFF)
                outputStream.write(EscPos.TEXT_NORMAL)

                // Order info
                outputStream.write(textToBytes("================================\n"))
                outputStream.write(EscPos.TEXT_DOUBLE_HEIGHT)
                outputStream.write(textToBytes("Đơn: $orderNumber\n"))
                if (tableName != null) {
                    outputStream.write(textToBytes("Bàn: $tableName\n"))
                }
                outputStream.write(EscPos.TEXT_NORMAL)
                outputStream.write(textToBytes("Giờ: $currentTime\n"))
                outputStream.write(textToBytes("================================\n"))

                // Items
                outputStream.write(EscPos.ALIGN_LEFT)
                outputStream.write(EscPos.TEXT_DOUBLE_HEIGHT)
                items.forEach { item ->
                    outputStream.write(textToBytes("${item.quantity}x ${item.name}\n"))
                    if (item.note != null) {
                        outputStream.write(EscPos.TEXT_NORMAL)
                        outputStream.write(textToBytes("   -> ${item.note}\n"))
                        outputStream.write(EscPos.TEXT_DOUBLE_HEIGHT)
                    }
                }
                outputStream.write(EscPos.TEXT_NORMAL)

                // Notes
                if (notes != null) {
                    outputStream.write(textToBytes("--------------------------------\n"))
                    outputStream.write(EscPos.BOLD_ON)
                    outputStream.write(textToBytes("Ghi chú: $notes\n"))
                    outputStream.write(EscPos.BOLD_OFF)
                }

                // Footer
                outputStream.write(textToBytes("================================\n"))

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
                // Clean close with proper shutdown
                try {
                    outputStream?.flush()
                } catch (e: Exception) {}
                try {
                    socket?.shutdownOutput()
                } catch (e: Exception) {}
                try {
                    outputStream?.close()
                } catch (e: Exception) {}
                try {
                    socket?.close()
                } catch (e: Exception) {
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
