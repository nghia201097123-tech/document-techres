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
import java.text.DecimalFormat
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
    private val priceFormatter = DecimalFormat("#,###")

    /**
     * Format price in VND format (e.g., 35,000đ)
     */
    private fun formatPrice(price: Double): String {
        return if (price > 0) "${priceFormatter.format(price.toLong())}đ" else "0đ"
    }

    /**
     * Data class cho món trong phiếu bếp
     */
    data class KitchenItem(
        val name: String,               // Tên món
        val quantity: Int,              // Số lượng
        val note: String? = null,       // Ghi chú riêng cho món
        val toppings: List<String> = emptyList(), // Topping names
        val toppingPrices: List<Pair<String, Double>> = emptyList(), // Topping với giá (giống tem)
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
     * Hỗ trợ:
     * - ticketPrintItemsSeparately: In từng món riêng biệt
     * - ticketCutAfterPrint: Cắt giấy sau khi in
     * - ticketCopies: Số bản in
     */
    suspend fun printTicket(
        kitchen: KitchenEntity,
        ticketData: KitchenTicketData
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            val ip = kitchen.printerIp
                ?: return@withContext PrinterResult.Error("Chưa cấu hình IP máy in cho ${kitchen.name}")

            val printSeparately = kitchen.ticketPrintItemsSeparately
            val copies = kitchen.ticketCopies.coerceIn(1, 5)

            Log.d(TAG, "=== Print ticket config ===")
            Log.d(TAG, "  printSeparately: $printSeparately")
            Log.d(TAG, "  cutAfterPrint: ${kitchen.ticketCutAfterPrint}")
            Log.d(TAG, "  copies: $copies")

            var totalPrinted = 0
            var lastError: String? = null

            if (printSeparately && ticketData.items.size > 1) {
                // In từng món riêng biệt
                Log.d(TAG, "Printing ${ticketData.items.size} items separately")
                ticketData.items.forEachIndexed { index, item ->
                    // Tạo ticket cho từng món
                    val singleItemTicket = ticketData.copy(items = listOf(item))
                    val ticketContent = generateTicketContent(kitchen, singleItemTicket)

                    // In số bản (copies)
                    for (copy in 1..copies) {
                        val result = printWithRetry(ip, kitchen.printerPort, ticketContent)
                        when (result) {
                            is PrinterResult.Success -> {
                                totalPrinted++
                                Log.d(TAG, "Item ${index + 1}/${ticketData.items.size} copy $copy/$copies: Success")
                            }
                            is PrinterResult.Error -> {
                                lastError = result.message
                                Log.w(TAG, "Item ${index + 1} copy $copy failed: ${result.message}")
                            }
                        }
                        // Delay giữa các bản in
                        if (copy < copies) delay(300)
                    }
                    // Delay giữa các món
                    if (index < ticketData.items.size - 1) delay(500)
                }
            } else {
                // In tất cả món trên 1 phiếu
                val ticketContent = generateTicketContent(kitchen, ticketData)

                // In số bản (copies)
                for (copy in 1..copies) {
                    val result = printWithRetry(ip, kitchen.printerPort, ticketContent)
                    when (result) {
                        is PrinterResult.Success -> {
                            totalPrinted++
                            Log.d(TAG, "Ticket copy $copy/$copies: Success")
                        }
                        is PrinterResult.Error -> {
                            lastError = result.message
                            Log.w(TAG, "Ticket copy $copy failed: ${result.message}")
                        }
                    }
                    // Delay giữa các bản in
                    if (copy < copies) delay(300)
                }
            }

            if (totalPrinted > 0) {
                PrinterResult.Success("Đã in $totalPrinted phiếu bếp")
            } else {
                PrinterResult.Error(lastError ?: "In phiếu bếp thất bại")
            }
        }
    }

    /**
     * In với retry logic
     */
    private suspend fun printWithRetry(
        ip: String,
        port: Int,
        content: ByteArray,
        maxRetries: Int = 3
    ): PrinterResult {
        var lastError: String? = null
        repeat(maxRetries) { attempt ->
            val result = printViaNetwork(ip, port, content)
            when (result) {
                is PrinterResult.Success -> return result
                is PrinterResult.Error -> {
                    lastError = result.message
                    Log.w(TAG, "Attempt ${attempt + 1} failed: ${result.message}")
                    if (attempt < maxRetries - 1) delay(1000)
                }
            }
        }
        return PrinterResult.Error(lastError ?: "In thất bại")
    }

    /**
     * Generate nội dung phiếu bếp - Thiết kế chuyên nghiệp
     * Sử dụng cấu hình từ web-dashboard:
     * - ticketPrintOrderNumber: Hiển thị mã đơn hàng
     * - ticketPrintTableName: Hiển thị tên bàn
     * - ticketPrintTime: Hiển thị thời gian
     * - ticketPrintStoreName: Hiển thị tên cửa hàng
     * - ticketStoreName: Tên cửa hàng custom
     * - ticketPrintNotes: Hiển thị ghi chú
     * - ticketFontSize: Cỡ chữ (small/medium/large)
     *
     * Layout:
     * ┌─────────────────────────────────┐
     * │       [TÊN CỬA HÀNG]            │  ← Nếu ticketPrintStoreName = true
     * │         *** BẾP BAR ***         │  ← Tên bếp (TO, ĐẬM)
     * │═════════════════════════════════│
     * │ !!! GẤP !!!                     │  ← Đơn gấp (nếu có)
     * │─────────────────────────────────│
     * │ BÀN: BÀN 5                      │  ← Nếu ticketPrintTableName = true
     * │ #GF-472          14:30 15/01    │  ← Nếu ticketPrintOrderNumber/Time = true
     * │ NV: Nguyễn Văn A                │  ← Nhân viên
     * │═════════════════════════════════│
     * │                                 │
     * │ 1. Trà sữa trân châu      x2    │  ← Món + SL
     * │    Size: L                      │
     * │    Đá: 50%                      │
     * │    + Trân châu đen              │  ← Topping
     * │    + Thạch dừa                  │  ← Topping (tất cả)
     * │    >> Ít đường                  │  ← Ghi chú món (nếu ticketPrintNotes = true)
     * │                                 │
     * │ 2. Cà phê sữa đá          x1    │
     * │    >> Không đá                  │
     * │─────────────────────────────────│
     * │ GHI CHÚ: Mang đi                │  ← Ghi chú chung (nếu ticketPrintNotes = true)
     * │═════════════════════════════════│
     * │ TỔNG: 3 MÓN                     │
     * └─────────────────────────────────┘
     */
    private fun generateTicketContent(
        kitchen: KitchenEntity,
        ticket: KitchenTicketData
    ): ByteArray {
        val paperWidth = kitchen.paperWidth
        val useBitmapMode = true
        val useRasterBitmap = false

        // ========== TICKET CONFIG FROM WEB-DASHBOARD ==========
        val showOrderNumber = kitchen.ticketPrintOrderNumber
        val showTableName = kitchen.ticketPrintTableName
        val showTime = kitchen.ticketPrintTime
        val showStoreName = kitchen.ticketPrintStoreName
        val storeName = kitchen.ticketStoreName
        val showNotes = kitchen.ticketPrintNotes
        val fontSize = kitchen.ticketFontSize // "small", "medium", "large"

        Log.d(TAG, "=== Generating ticket content ===")
        Log.d(TAG, "  - Paper width: ${paperWidth}mm")
        Log.d(TAG, "  - Kitchen: ${ticket.kitchenName}")
        Log.d(TAG, "  - Items count: ${ticket.items.size}")
        Log.d(TAG, "  === Ticket Config ===")
        Log.d(TAG, "  - showOrderNumber: $showOrderNumber")
        Log.d(TAG, "  - showTableName: $showTableName")
        Log.d(TAG, "  - showTime: $showTime")
        Log.d(TAG, "  - showStoreName: $showStoreName")
        Log.d(TAG, "  - storeName: $storeName")
        Log.d(TAG, "  - showNotes: $showNotes")
        Log.d(TAG, "  - fontSize: $fontSize")
        ticket.items.forEachIndexed { index, item ->
            Log.d(TAG, "  Item $index: ${item.name}")
            Log.d(TAG, "    - quantity: ${item.quantity}")
            Log.d(TAG, "    - options: ${item.options}")
            Log.d(TAG, "    - toppings (${item.toppings.size}): ${item.toppings}")
            Log.d(TAG, "    - note: ${item.note}")
        }

        // Font scale based on fontSize config
        val fontScale = when (fontSize) {
            "small" -> 0.85f
            "large" -> 1.2f
            else -> 1.0f // medium
        }

        val builder = HybridBillBuilder(paperWidth, useBitmapMode, useRasterBitmap, fontScale)

        builder.apply {
            init()

            // ═══════════════════════════════════════════
            // SECTION 1: HEADER - TÊN BẾP (luôn hiển thị đầu tiên, nổi bật)
            // ═══════════════════════════════════════════
            val kitchenHeader = "*** ${ticket.kitchenName.uppercase()} ***"
            lineDouble(kitchenHeader, BitmapTextStyle(centerAlign = true))

            // Loại phiếu (SỬA ĐƠN, HỦY ĐƠN) - gộp chung với đơn gấp
            when (ticket.ticketType) {
                "MODIFIED" -> {
                    lineBold("[ SỬA ĐƠN ]", BitmapTextStyle(centerAlign = true))
                }
                "CANCELLED" -> {
                    lineBold("[ HỦY ĐƠN ]", BitmapTextStyle(centerAlign = true))
                }
            }

            // Đơn gấp - hiển thị nổi bật
            if (ticket.isUrgent) {
                lineBold("!!! GẤP !!!", BitmapTextStyle(centerAlign = true))
            }

            separator('=')

            // ═══════════════════════════════════════════
            // SECTION 2: THÔNG TIN ĐƠN HÀNG (gọn gàng trên ít dòng)
            // ═══════════════════════════════════════════
            // Tên cửa hàng (nếu có) - cùng dòng với tên bàn
            if (showStoreName && !storeName.isNullOrBlank()) {
                line(storeName)
            }

            // Tên bàn (TO, ĐẬM, nổi bật) - nếu config cho phép
            if (showTableName) {
                ticket.tableName?.let {
                    lineBold("BÀN: $it")
                }
            }

            // Mã đơn + Thời gian (trên cùng 1 dòng) - theo config
            val timeFormat = SimpleDateFormat("HH:mm dd/MM", Locale.getDefault())
            val orderPart = if (showOrderNumber) "#${ticket.orderNumber}" else ""
            val timePart = if (showTime) timeFormat.format(ticket.orderTime) else ""

            if (orderPart.isNotEmpty() || timePart.isNotEmpty()) {
                if (orderPart.isNotEmpty() && timePart.isNotEmpty()) {
                    lineKeyValue(orderPart, timePart)
                } else if (orderPart.isNotEmpty()) {
                    line(orderPart)
                } else {
                    line(timePart)
                }
            }

            // Nhân viên
            ticket.staffName?.let {
                line("NV: $it")
            }

            separator('=')

            // ═══════════════════════════════════════════
            // SECTION 4: DANH SÁCH MÓN (tối ưu: bỏ dòng trống giữa các món để tiết kiệm giấy)
            // ═══════════════════════════════════════════
            ticket.items.forEachIndexed { index, item ->
                // Bỏ dòng trống để tiết kiệm giấy - các món vẫn rõ ràng nhờ số thứ tự

                // Số thứ tự + Tên món + Số lượng
                val qtyText = "x${item.quantity}"
                val itemLine = "${index + 1}. ${item.name}"

                // In tên món và số lượng trên cùng dòng
                if (item.quantity > 1) {
                    // Số lượng > 1: in đậm cả dòng
                    lineKeyValueBold(itemLine, qtyText)
                } else {
                    lineKeyValue(itemLine, qtyText, BitmapTextStyle(bold = true))
                }

                // Tùy chọn (Size, Đá, Đường...)
                item.options.forEach { (key, value) ->
                    line("   $key: $value")
                }

                // Topping - hiển thị tất cả toppings giống như in tem
                if (item.toppings.isNotEmpty() || item.toppingPrices.isNotEmpty()) {
                    val toppingCount = if (item.toppingPrices.isNotEmpty()) item.toppingPrices.size else item.toppings.size
                    Log.d(TAG, "  Printing $toppingCount toppings for ${item.name}")

                    // Hiển thị topping với giá nếu có (giống tem)
                    if (item.toppingPrices.isNotEmpty()) {
                        item.toppingPrices.forEach { (toppingName, toppingPrice) ->
                            if (toppingPrice > 0) {
                                lineKeyValue("   + $toppingName", "+${formatPrice(toppingPrice)}")
                            } else {
                                line("   + $toppingName")
                            }
                        }
                    } else {
                        item.toppings.forEach { topping ->
                            line("   + $topping")
                        }
                    }
                }

                // Ghi chú riêng cho món (nổi bật) - nếu config cho phép
                if (showNotes) {
                    item.note?.let {
                        lineBold("   >> $it")
                    }
                }
            }

            // ═══════════════════════════════════════════
            // SECTION 5: GHI CHÚ CHUNG (nếu config cho phép)
            // ═══════════════════════════════════════════
            if (showNotes) {
                ticket.note?.let {
                    separator('-')
                    lineBold("GHI CHÚ: $it")
                }
            }

            // ═══════════════════════════════════════════
            // SECTION 6: FOOTER
            // ═══════════════════════════════════════════
            separator('=')

            // Tổng số món
            val totalItems = ticket.items.sumOf { it.quantity }
            lineBold("TỔNG: $totalItems MÓN", BitmapTextStyle(centerAlign = true))

            // ═══════════════════════════════════════════
            // FEED, BEEP & CUT
            // Feed 4 dòng để đảm bảo dòng TỔNG MÓN không bị cắt mất
            // ═══════════════════════════════════════════
            feed(4)
            beep()
            // Cắt giấy dựa trên config
            if (kitchen.ticketCutAfterPrint) {
                cut()
            }
        }

        val content = builder.build()
        Log.d(TAG, "Ticket content generated: ${content.size} bytes")
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

        Log.d(TAG, "=== START PRINT TICKET ===")
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

            Log.d(TAG, "=== PRINT TICKET SUCCESS ===")
            PrinterResult.Success("In phiếu bếp thành công!")
        } catch (e: Exception) {
            Log.e(TAG, "=== PRINT TICKET FAILED ===")
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
