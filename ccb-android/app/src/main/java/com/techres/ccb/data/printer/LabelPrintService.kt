package com.techres.ccb.data.printer

import android.util.Log
import com.techres.ccb.data.local.entity.KitchenEntity
import com.techres.ccb.printer.core.EscPosCommands
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
 * Mỗi ly/món sẽ in 1 tem riêng biệt
 * Tem chứa: Tên món, Size, Topping, Ghi chú, Bàn, Mã đơn
 */
object LabelPrintService {
    private const val TAG = "LabelPrintService"

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
        labelData: LabelData
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

                val labelContent = generateLabelContent(kitchen, currentLabel)

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
                    delay(300)
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

    /**
     * Generate nội dung tem
     */
    private fun generateLabelContent(
        kitchen: KitchenEntity,
        label: LabelData
    ): ByteArray {
        val paperWidth = kitchen.paperWidth
        val useBitmapMode = true // Luôn dùng bitmap cho tiếng Việt
        val useRasterBitmap = false // ESC * cho XPRINTER

        Log.d(TAG, "Generating label content:")
        Log.d(TAG, "  - Paper width: ${paperWidth}mm")
        Log.d(TAG, "  - Bitmap mode: $useBitmapMode")
        Log.d(TAG, "  - Raster bitmap: $useRasterBitmap (false = ESC *, true = GS v 0)")
        Log.d(TAG, "  - Item: ${label.itemName}")

        val builder = HybridBillBuilder(paperWidth, useBitmapMode, useRasterBitmap)

        builder.apply {
            init()

            // ========== TÊN MÓN (TO, ĐẬM, GIỮA) ==========
            lineDouble(label.itemName, BitmapTextStyle(centerAlign = true))

            // ========== SIZE (nếu có) ==========
            label.size?.let {
                lineBold("Size: $it", BitmapTextStyle(centerAlign = true))
            }

            // ========== THÔNG TIN BÀN ==========
            label.tableName?.let {
                separator('-')
                lineBold("Bàn: $it")
            }

            // ========== TÙY CHỌN ĐỒ UỐNG ==========
            if (label.sugar != null || label.ice != null) {
                separator('-')
                label.sugar?.let { line("Đường: $it") }
                label.ice?.let { line("Đá: $it") }
            }

            // ========== TOPPING ==========
            if (label.toppings.isNotEmpty()) {
                separator('-')
                line("Topping:")
                label.toppings.forEach { topping ->
                    line("  + $topping")
                }
            }

            // ========== GHI CHÚ ==========
            label.note?.let {
                separator('-')
                line("Ghi chú: $it")
            }

            // ========== MÃ ĐƠN + THỜI GIAN ==========
            separator('-')
            val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
            val orderInfo = "#${label.orderNumber} - ${timeFormat.format(label.orderTime)}"

            // Hiển thị số tem nếu có nhiều hơn 1
            if (label.totalLabels > 1) {
                lineKeyValue(orderInfo, "${label.labelIndex}/${label.totalLabels}")
            } else {
                lineCenter(orderInfo)
            }

            // ========== FEED & CUT ==========
            feed(3)
            cut()
        }

        val content = builder.build()
        Log.d(TAG, "Label content generated: ${content.size} bytes")
        return content
    }

    /**
     * In qua mạng TCP/IP
     */
    private suspend fun printViaNetwork(
        ip: String,
        port: Int,
        content: ByteArray
    ): PrinterResult {
        var socket: Socket? = null
        var outputStream: OutputStream? = null

        Log.d(TAG, "=== START PRINT ===")
        Log.d(TAG, "Target: $ip:$port")
        Log.d(TAG, "Content size: ${content.size} bytes")

        return try {
            Log.d(TAG, "Creating socket...")
            socket = Socket().apply {
                reuseAddress = true
                keepAlive = true
                tcpNoDelay = true
                setSoLinger(true, 2)
            }

            Log.d(TAG, "Connecting to $ip:$port...")
            socket.connect(InetSocketAddress(ip, port), 5000)
            Log.d(TAG, "Connected successfully!")

            outputStream = socket.getOutputStream()
            Log.d(TAG, "Got output stream, writing ${content.size} bytes...")

            outputStream.write(content)
            Log.d(TAG, "Write completed, flushing...")
            outputStream.flush()
            Log.d(TAG, "Flush completed!")

            // Đợi máy in xử lý xong bitmap data
            Log.d(TAG, "Waiting 500ms for printer to process...")
            delay(500)

            Log.d(TAG, "=== PRINT SUCCESS ===")
            PrinterResult.Success("OK")
        } catch (e: Exception) {
            Log.e(TAG, "=== PRINT FAILED ===")
            Log.e(TAG, "Error type: ${e.javaClass.simpleName}")
            Log.e(TAG, "Error message: ${e.message}")
            Log.e(TAG, "Stack trace:", e)
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
}
