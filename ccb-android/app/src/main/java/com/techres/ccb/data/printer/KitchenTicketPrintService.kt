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
 * Kitchen Ticket Print Service - In phiếu bếp
 *
 * In danh sách các món cần chuẩn bị cho 1 bếp cụ thể
 * Phiếu chứa: Tên bếp, Bàn, Mã đơn, Danh sách món, Ghi chú
 */
object KitchenTicketPrintService {
    private const val TAG = "KitchenTicketPrint"

    /**
     * Data class cho món trong phiếu bếp
     */
    data class KitchenItem(
        val name: String,               // Tên món
        val quantity: Int,              // Số lượng
        val note: String? = null,       // Ghi chú riêng cho món
        val toppings: List<String> = emptyList(), // Topping
        val options: Map<String, String> = emptyMap() // Tùy chọn (Size, Đá, Đường...)
    )

    /**
     * Data class cho phiếu bếp
     */
    data class KitchenTicketData(
        val kitchenName: String,        // Tên bếp (BAR, BẾP CHÍNH, ...)
        val orderNumber: String,        // Mã đơn hàng
        val tableName: String?,         // Tên bàn
        val orderTime: Date = Date(),   // Thời gian order
        val staffName: String?,         // Nhân viên order
        val items: List<KitchenItem>,   // Danh sách món
        val note: String? = null,       // Ghi chú chung cho đơn
        val isUrgent: Boolean = false,  // Đơn gấp
        val ticketType: String = "NEW"  // NEW, MODIFIED, CANCELLED
    )

    /**
     * In phiếu bếp
     */
    suspend fun printTicket(
        kitchen: KitchenEntity,
        ticketData: KitchenTicketData
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            val ip = kitchen.printerIp
                ?: return@withContext PrinterResult.Error("Chưa cấu hình IP máy in cho ${kitchen.name}")

            val ticketContent = generateTicketContent(kitchen, ticketData)

            var lastError: String? = null

            // Retry logic
            repeat(3) { attempt ->
                val result = printViaNetwork(ip, kitchen.printerPort, ticketContent)
                when (result) {
                    is PrinterResult.Success -> return@withContext result
                    is PrinterResult.Error -> {
                        lastError = result.message
                        Log.w(TAG, "Attempt ${attempt + 1} failed: ${result.message}")
                        if (attempt < 2) delay(1000)
                    }
                }
            }

            PrinterResult.Error(lastError ?: "In phiếu bếp thất bại")
        }
    }

    /**
     * Generate nội dung phiếu bếp
     */
    private fun generateTicketContent(
        kitchen: KitchenEntity,
        ticket: KitchenTicketData
    ): ByteArray {
        val paperWidth = kitchen.paperWidth
        val useBitmapMode = true

        val builder = HybridBillBuilder(paperWidth, useBitmapMode)

        builder.apply {
            init()

            // ========== HEADER - TÊN BẾP ==========
            // Tên bếp TO, ĐẬM, GIỮA
            lineDouble(ticket.kitchenName.uppercase(), BitmapTextStyle(centerAlign = true))

            // Loại phiếu (NEW, MODIFIED, CANCELLED)
            when (ticket.ticketType) {
                "MODIFIED" -> {
                    doubleSeparator()
                    lineBold("*** SỬA ĐƠN ***", BitmapTextStyle(centerAlign = true))
                    doubleSeparator()
                }
                "CANCELLED" -> {
                    doubleSeparator()
                    lineBold("*** HỦY ĐƠN ***", BitmapTextStyle(centerAlign = true))
                    doubleSeparator()
                }
                else -> {
                    doubleSeparator()
                }
            }

            // Đánh dấu đơn gấp
            if (ticket.isUrgent) {
                lineBold("!!! GẤP !!!", BitmapTextStyle(centerAlign = true))
                separator()
            }

            // ========== THÔNG TIN ĐƠN ==========
            // Mã đơn + Thời gian
            val timeFormat = SimpleDateFormat("HH:mm dd/MM", Locale.getDefault())
            lineKeyValue("Đơn:", "#${ticket.orderNumber}")
            lineKeyValue("Giờ:", timeFormat.format(ticket.orderTime))

            // Bàn (nếu có)
            ticket.tableName?.let {
                lineBold("Bàn: $it")
            }

            // Nhân viên (nếu có)
            ticket.staffName?.let {
                line("NV: $it")
            }

            separator()

            // ========== DANH SÁCH MÓN ==========
            ticket.items.forEachIndexed { index, item ->
                // Số thứ tự + Tên món + Số lượng
                val itemLine = "${index + 1}. ${item.name}"
                lineBold(itemLine)

                // Số lượng (nổi bật nếu > 1)
                if (item.quantity > 1) {
                    lineBold("   SL: ${item.quantity}", BitmapTextStyle(bold = true))
                } else {
                    line("   SL: ${item.quantity}")
                }

                // Tùy chọn (Size, Đá, Đường...)
                item.options.forEach { (key, value) ->
                    line("   $key: $value")
                }

                // Topping
                item.toppings.forEach { topping ->
                    line("   + $topping")
                }

                // Ghi chú riêng cho món
                item.note?.let {
                    lineBold("   >> $it")
                }

                // Khoảng cách giữa các món
                if (index < ticket.items.size - 1) {
                    line("")
                }
            }

            // ========== GHI CHÚ CHUNG ==========
            ticket.note?.let {
                separator()
                lineBold("Ghi chú:")
                line(it)
            }

            // ========== FOOTER ==========
            doubleSeparator()

            // Tổng số món
            val totalItems = ticket.items.sumOf { it.quantity }
            lineKeyValue("Tổng:", "$totalItems món")

            // ========== FEED, BEEP & CUT ==========
            feed(4)

            // Beep để thông báo cho bếp
            beep()

            cut()
        }

        return builder.build()
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

        return try {
            socket = Socket()
            socket.connect(InetSocketAddress(ip, port), 5000)
            outputStream = socket.getOutputStream()

            outputStream.write(content)
            outputStream.flush()

            PrinterResult.Success("In phiếu bếp thành công!")
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
}
