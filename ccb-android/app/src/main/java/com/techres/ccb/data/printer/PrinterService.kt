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
        val CHARSET_PC1258 = byteArrayOf(0x1B, 0x74, 0x1E) // Vietnamese code page
        val CHARSET_UTF8 = byteArrayOf(0x1B, 0x74, 0x00) // UTF-8
    }

    /**
     * Test connection to printer
     */
    suspend fun testConnection(ip: String, port: Int = DEFAULT_PORT): PrinterResult {
        return withContext(Dispatchers.IO) {
            try {
                val socket = Socket()
                socket.connect(InetSocketAddress(ip, port), CONNECTION_TIMEOUT)
                socket.close()
                PrinterResult.Success("Kết nối thành công đến $ip:$port")
            } catch (e: IOException) {
                Log.e(TAG, "Connection failed: ${e.message}")
                PrinterResult.Error("Không thể kết nối: ${e.message}")
            } catch (e: Exception) {
                Log.e(TAG, "Error: ${e.message}")
                PrinterResult.Error("Lỗi: ${e.message}")
            }
        }
    }

    /**
     * Print test page
     */
    suspend fun printTestPage(
        ip: String,
        port: Int = DEFAULT_PORT,
        kitchenName: String,
        printerName: String?
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            var socket: Socket? = null
            var outputStream: OutputStream? = null

            try {
                // Connect
                socket = Socket()
                socket.connect(InetSocketAddress(ip, port), CONNECTION_TIMEOUT)
                outputStream = socket.getOutputStream()

                // Build test print content
                val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault())
                val currentTime = dateFormat.format(Date())

                // Initialize printer
                outputStream.write(EscPos.INIT)

                // Header - centered, double size
                outputStream.write(EscPos.ALIGN_CENTER)
                outputStream.write(EscPos.TEXT_DOUBLE)
                outputStream.write(EscPos.BOLD_ON)
                outputStream.write("** IN THU **\n".toByteArray(Charsets.UTF_8))
                outputStream.write(EscPos.BOLD_OFF)
                outputStream.write(EscPos.TEXT_NORMAL)

                outputStream.write(EscPos.LINE_FEED)

                // Kitchen name
                outputStream.write(EscPos.TEXT_DOUBLE_HEIGHT)
                outputStream.write(EscPos.BOLD_ON)
                outputStream.write("$kitchenName\n".toByteArray(Charsets.UTF_8))
                outputStream.write(EscPos.BOLD_OFF)
                outputStream.write(EscPos.TEXT_NORMAL)

                // Divider
                outputStream.write("--------------------------------\n".toByteArray(Charsets.UTF_8))

                // Printer info - left aligned
                outputStream.write(EscPos.ALIGN_LEFT)
                outputStream.write("May in: ${printerName ?: "N/A"}\n".toByteArray(Charsets.UTF_8))
                outputStream.write("IP: $ip\n".toByteArray(Charsets.UTF_8))
                outputStream.write("Port: $port\n".toByteArray(Charsets.UTF_8))
                outputStream.write("Thoi gian: $currentTime\n".toByteArray(Charsets.UTF_8))

                // Divider
                outputStream.write(EscPos.ALIGN_CENTER)
                outputStream.write("--------------------------------\n".toByteArray(Charsets.UTF_8))

                // Test characters
                outputStream.write(EscPos.ALIGN_LEFT)
                outputStream.write("Test ky tu:\n".toByteArray(Charsets.UTF_8))
                outputStream.write("ABCDEFGHIJKLMNOPQRSTUVWXYZ\n".toByteArray(Charsets.UTF_8))
                outputStream.write("abcdefghijklmnopqrstuvwxyz\n".toByteArray(Charsets.UTF_8))
                outputStream.write("0123456789\n".toByteArray(Charsets.UTF_8))
                outputStream.write("!@#\$%^&*()_+-=[]{}|;':\",./<>?\n".toByteArray(Charsets.UTF_8))

                // Vietnamese test (basic Latin without diacritics for compatibility)
                outputStream.write("\nTest tieng Viet (khong dau):\n".toByteArray(Charsets.UTF_8))
                outputStream.write("Xin chao! Ket noi thanh cong!\n".toByteArray(Charsets.UTF_8))

                // Footer
                outputStream.write(EscPos.ALIGN_CENTER)
                outputStream.write("--------------------------------\n".toByteArray(Charsets.UTF_8))
                outputStream.write(EscPos.BOLD_ON)
                outputStream.write("CCB POS - TechRes\n".toByteArray(Charsets.UTF_8))
                outputStream.write(EscPos.BOLD_OFF)
                outputStream.write("www.techres.vn\n".toByteArray(Charsets.UTF_8))

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
                try {
                    outputStream?.close()
                    socket?.close()
                } catch (e: Exception) {
                    Log.e(TAG, "Error closing: ${e.message}")
                }
            }
        }
    }

    /**
     * Print kitchen order ticket
     */
    suspend fun printKitchenTicket(
        ip: String,
        port: Int = DEFAULT_PORT,
        kitchenName: String,
        orderNumber: String,
        tableName: String?,
        items: List<KitchenOrderItem>,
        notes: String? = null
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            var socket: Socket? = null
            var outputStream: OutputStream? = null

            try {
                socket = Socket()
                socket.connect(InetSocketAddress(ip, port), CONNECTION_TIMEOUT)
                outputStream = socket.getOutputStream()

                val dateFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
                val currentTime = dateFormat.format(Date())

                // Initialize
                outputStream.write(EscPos.INIT)

                // Beep to alert kitchen
                outputStream.write(EscPos.BEEP)

                // Header
                outputStream.write(EscPos.ALIGN_CENTER)
                outputStream.write(EscPos.TEXT_DOUBLE)
                outputStream.write(EscPos.BOLD_ON)
                outputStream.write("$kitchenName\n".toByteArray(Charsets.UTF_8))
                outputStream.write(EscPos.BOLD_OFF)
                outputStream.write(EscPos.TEXT_NORMAL)

                // Order info
                outputStream.write("================================\n".toByteArray(Charsets.UTF_8))
                outputStream.write(EscPos.TEXT_DOUBLE_HEIGHT)
                outputStream.write("Don: $orderNumber\n".toByteArray(Charsets.UTF_8))
                if (tableName != null) {
                    outputStream.write("Ban: $tableName\n".toByteArray(Charsets.UTF_8))
                }
                outputStream.write(EscPos.TEXT_NORMAL)
                outputStream.write("Gio: $currentTime\n".toByteArray(Charsets.UTF_8))
                outputStream.write("================================\n".toByteArray(Charsets.UTF_8))

                // Items
                outputStream.write(EscPos.ALIGN_LEFT)
                outputStream.write(EscPos.TEXT_DOUBLE_HEIGHT)
                items.forEach { item ->
                    outputStream.write("${item.quantity}x ${item.name}\n".toByteArray(Charsets.UTF_8))
                    if (item.note != null) {
                        outputStream.write(EscPos.TEXT_NORMAL)
                        outputStream.write("   -> ${item.note}\n".toByteArray(Charsets.UTF_8))
                        outputStream.write(EscPos.TEXT_DOUBLE_HEIGHT)
                    }
                }
                outputStream.write(EscPos.TEXT_NORMAL)

                // Notes
                if (notes != null) {
                    outputStream.write("--------------------------------\n".toByteArray(Charsets.UTF_8))
                    outputStream.write(EscPos.BOLD_ON)
                    outputStream.write("Ghi chu: $notes\n".toByteArray(Charsets.UTF_8))
                    outputStream.write(EscPos.BOLD_OFF)
                }

                // Footer
                outputStream.write("================================\n".toByteArray(Charsets.UTF_8))

                // Feed and cut
                outputStream.write(EscPos.FEED_LINES_3)
                outputStream.write(EscPos.CUT_FEED)

                outputStream.flush()

                PrinterResult.Success("In order thành công!")

            } catch (e: Exception) {
                Log.e(TAG, "Print failed: ${e.message}")
                PrinterResult.Error("Lỗi in: ${e.message}")
            } finally {
                try {
                    outputStream?.close()
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
