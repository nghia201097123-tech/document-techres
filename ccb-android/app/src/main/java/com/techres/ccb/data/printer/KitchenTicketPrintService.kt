package com.techres.ccb.data.printer

import android.util.Log
import com.techres.ccb.data.local.entity.KitchenEntity
import com.techres.ccb.printer.adapter.SunmiPrinterAdapter
import com.techres.ccb.printer.adapter.UsbPrinterAdapter
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
 * Hỗ trợ 2 loại máy in (TÁCH RIÊNG HOÀN TOÀN):
 * 1. MÁY IN SUNMI TÍCH HỢP (printerIp = "sunmi"): Sử dụng SunmiPrinterAdapter
 * 2. MÁY IN TCP/IP (printerIp = IP thực): Sử dụng Socket connection
 *
 * Phiếu chứa: Tên bếp, Bàn, Mã đơn, Danh sách món, Ghi chú
 */
object KitchenTicketPrintService {
    private const val TAG = "KitchenTicketPrint"
    private val priceFormatter = DecimalFormat("#,###")

    // Convention: printerIp = "sunmi" means use built-in Sunmi printer
    const val SUNMI_PRINTER_IP = "sunmi"

    // Sunmi adapter - phải được khởi tạo từ Application
    private var sunmiAdapter: SunmiPrinterAdapter? = null

    // USB adapter - phải được khởi tạo từ Application
    private var usbAdapter: UsbPrinterAdapter? = null

    /**
     * Khởi tạo Sunmi Adapter (gọi từ Application)
     */
    fun initSunmiAdapter(adapter: SunmiPrinterAdapter) {
        sunmiAdapter = adapter
        Log.d(TAG, "Sunmi adapter initialized: ${adapter.getSunmiModel()}")
    }

    /**
     * Khởi tạo USB Adapter (gọi từ Application)
     */
    fun initUsbAdapter(adapter: UsbPrinterAdapter) {
        usbAdapter = adapter
        Log.d(TAG, "USB adapter initialized")
    }

    /**
     * Regex để match tất cả các ký tự whitespace Unicode và zero-width characters
     * Bao gồm:
     * - \s: Standard whitespace (space, tab, newline, carriage return, etc.)
     * - \u00A0: Non-breaking space
     * - \u2000-\u200A: Various Unicode spaces (en quad, em quad, en space, em space, etc.)
     * - \u200B-\u200D: Zero-width characters (zero-width space, non-joiner, joiner)
     * - \u2028: Line separator
     * - \u2029: Paragraph separator
     * - \u202F: Narrow no-break space
     * - \u205F: Medium mathematical space
     * - \u3000: Ideographic space (CJK)
     * - \uFEFF: Byte order mark / Zero-width no-break space
     */
    private val UNICODE_WHITESPACE_REGEX = Regex("[\\s\\u00A0\\u2000-\\u200A\\u200B-\\u200D\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF]+")

    /**
     * Normalize text: loại bỏ tất cả Unicode whitespace thừa, newlines, và zero-width characters
     * Thay thế bằng single space và trim
     */
    private fun normalizeText(text: String): String {
        return text
            .replace("\n", " ")
            .replace("\r", " ")
            .replace(UNICODE_WHITESPACE_REGEX, " ")
            .trim()
    }

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
        val price: Double = 0.0,        // Giá món (để in khi ticketPrintPrice = true)
        val note: String? = null,       // Ghi chú riêng cho món
        val toppings: List<String> = emptyList(), // Topping names
        val toppingPrices: List<Triple<String, Double, Int>> = emptyList(), // Topping với giá và số lượng (name, price, quantity)
        val options: Map<String, String> = emptyMap() // Tùy chọn (Size, Đá, Đường...)
    )

    /**
     * Data class cho phiếu bếp
     */
    data class KitchenTicketData(
        val kitchenName: String,        // Tên bếp (BAR, BẾP CHÍNH, ...)
        val orderNumber: String,        // Mã đơn hàng gốc (cho kỹ thuật)
        val dailyOrderNumber: Int = 0,  // Số thứ tự trong ngày (0001-9999)
        val tableName: String?,         // Tên bàn
        val pagerNumber: Int? = null,   // Số thẻ rung (1-99)
        val orderTime: Date = Date(),   // Thời gian order
        val staffName: String?,         // Nhân viên order
        val items: List<KitchenItem>,   // Danh sách món
        val note: String? = null,       // Ghi chú chung cho đơn
        val isUrgent: Boolean = false,  // Đơn gấp
        val ticketType: String = "NEW"  // NEW, MODIFIED, CANCELLED
    ) {
        // Format daily order number for display: #0001, #0002, ...
        val displayNumber: String
            get() = "#${dailyOrderNumber.toString().padStart(4, '0')}"
    }

    /**
     * In phiếu bếp - ĐIỂM VÀO CHÍNH
     *
     * Tự động chọn phương thức in dựa trên printerIp:
     * - printerIp = "sunmi" → In qua máy in Sunmi tích hợp
     * - printerIp = IP thực → In qua TCP/IP
     *
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
            Log.d(TAG, "=== PRINT TICKET ===")
            Log.d(TAG, "Kitchen: ${kitchen.name}")
            Log.d(TAG, "Connection type: ${kitchen.connectionType}")

            // ========== PHÂN LUỒNG: SUNMI vs USB vs TCP/IP ==========
            return@withContext when (kitchen.connectionType) {
                "sunmi" -> {
                    Log.d(TAG, ">>> Routing to SUNMI printer <<<")
                    printTicketViaSunmi(kitchen, ticketData)
                }
                "usb" -> {
                    Log.d(TAG, ">>> Routing to USB printer <<<")
                    printTicketViaUsb(kitchen, ticketData)
                }
                else -> {
                    // Network (default)
                    val printerIp = kitchen.printerIp
                        ?: return@withContext PrinterResult.Error("Chưa cấu hình IP máy in cho ${kitchen.name}")
                    Log.d(TAG, ">>> Routing to TCP/IP printer: $printerIp:${kitchen.printerPort} <<<")
                    printTicketViaNetwork(kitchen, ticketData)
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SUNMI PRINTING - HOÀN TOÀN RIÊNG BIỆT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * In phiếu bếp qua máy in Sunmi tích hợp
     *
     * Flow riêng biệt, KHÔNG dùng chung code với TCP/IP:
     * 1. Kết nối Sunmi adapter
     * 2. Generate bitmap content
     * 3. In qua AIDL interface
     * 4. Cắt giấy nếu cần
     */
    private suspend fun printTicketViaSunmi(
        kitchen: KitchenEntity,
        ticketData: KitchenTicketData
    ): PrinterResult {
        val adapter = sunmiAdapter
            ?: return PrinterResult.Error("Sunmi adapter chưa được khởi tạo")

        Log.d(TAG, "=== START PRINT TICKET (SUNMI) ===")
        Log.d(TAG, "Model: ${adapter.getSunmiModel()}")

        val printSeparately = kitchen.ticketPrintItemsSeparately
        val copies = kitchen.ticketCopies.coerceIn(1, 5)

        Log.d(TAG, "  printSeparately: $printSeparately")
        Log.d(TAG, "  cutAfterPrint: ${kitchen.ticketCutAfterPrint}")
        Log.d(TAG, "  copies: $copies")

        return try {
            // Kết nối Sunmi printer
            val connectResult = adapter.connect()
            if (connectResult is PrinterResult.Error) {
                return connectResult
            }

            // Generate và in content
            var totalPrinted = 0

            if (printSeparately && ticketData.items.size > 1) {
                // In từng món riêng biệt
                ticketData.items.forEach { item ->
                    val singleItemTicket = ticketData.copy(items = listOf(item))
                    repeat(copies) {
                        val result = printSingleTicketSunmi(adapter, kitchen, singleItemTicket)
                        if (result is PrinterResult.Success) totalPrinted++
                    }
                }
            } else {
                // In tất cả món trên 1 phiếu
                repeat(copies) {
                    val result = printSingleTicketSunmi(adapter, kitchen, ticketData)
                    if (result is PrinterResult.Success) totalPrinted++
                }
            }

            Log.d(TAG, "=== SUNMI PRINT COMPLETE: $totalPrinted tickets ===")
            if (totalPrinted > 0) {
                PrinterResult.Success("Đã in $totalPrinted phiếu bếp (Sunmi)")
            } else {
                PrinterResult.Error("Không in được phiếu nào")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sunmi print error: ${e.message}", e)
            PrinterResult.Error("Lỗi in Sunmi: ${e.message}")
        }
    }

    /**
     * In 1 phiếu qua Sunmi (nội bộ)
     * Sử dụng native printBitmap API cho Sunmi T1 (BinderProxy mode)
     */
    private suspend fun printSingleTicketSunmi(
        adapter: SunmiPrinterAdapter,
        kitchen: KitchenEntity,
        ticketData: KitchenTicketData
    ): PrinterResult {
        return try {
            // Kiểm tra xem có phải BinderProxy (Sunmi T1) không
            val isBinderProxy = adapter.isUsingBinderProxy()
            Log.d(TAG, "Sunmi BinderProxy mode: $isBinderProxy")

            if (isBinderProxy) {
                // SUNMI T1 (BinderProxy): Sử dụng native bitmap printing
                val bitmaps = generateTicketBitmaps(kitchen, ticketData)
                Log.d(TAG, "Generated ${bitmaps.size} bitmaps for Sunmi T1")

                // In từng bitmap qua native API
                bitmaps.forEachIndexed { index, bitmap ->
                    Log.d(TAG, "Printing bitmap ${index + 1}/${bitmaps.size}: ${bitmap.width}x${bitmap.height}")
                    val result = adapter.printBitmap(bitmap)
                    bitmap.recycle() // Recycle ngay sau khi in
                    if (result is PrinterResult.Error) {
                        // Recycle các bitmap còn lại
                        bitmaps.drop(index + 1).forEach { it.recycle() }
                        return result
                    }
                }

                // Commit và cắt giấy
                adapter.commitBuffer()
                if (kitchen.ticketCutAfterPrint) {
                    adapter.cutPaperWithFallback()
                }
            } else {
                // NON-BINDERPROXY: Có thể dùng ESC/POS
                val content = generateTicketContent(kitchen, ticketData)
                val writeResult = adapter.write(content)
                if (writeResult is PrinterResult.Error) {
                    return writeResult
                }
                adapter.commitBuffer()
                if (kitchen.ticketCutAfterPrint) {
                    adapter.cutPaperWithFallback()
                }
            }

            // Delay nhỏ giữa các bản
            delay(200)

            PrinterResult.Success("OK")
        } catch (e: Exception) {
            Log.e(TAG, "Sunmi single ticket error: ${e.message}", e)
            PrinterResult.Error("Lỗi: ${e.message}")
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // USB PRINTING - HOÀN TOÀN RIÊNG BIỆT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * In phiếu bếp qua USB
     *
     * Flow tương tự TCP/IP nhưng dùng USB connection:
     * 1. Generate ESC/POS content
     * 2. Kết nối USB printer
     * 3. Gửi data qua USB
     */
    private suspend fun printTicketViaUsb(
        kitchen: KitchenEntity,
        ticketData: KitchenTicketData
    ): PrinterResult {
        val adapter = usbAdapter
            ?: return PrinterResult.Error("USB adapter chưa được khởi tạo")

        val printSeparately = kitchen.ticketPrintItemsSeparately
        val copies = kitchen.ticketCopies.coerceIn(1, 5)

        Log.d(TAG, "=== START PRINT TICKET (USB) ===")
        Log.d(TAG, "  printSeparately: $printSeparately")
        Log.d(TAG, "  cutAfterPrint: ${kitchen.ticketCutAfterPrint}")
        Log.d(TAG, "  copies: $copies")

        return try {
            // Tìm USB printer
            val connectedPrinters = adapter.getConnectedPrinters()
            Log.d(TAG, "Found ${connectedPrinters.size} USB printers")

            if (connectedPrinters.isEmpty()) {
                val debugInfo = adapter.getUsbDebugInfo()
                Log.e(TAG, "No USB printers found!")
                return PrinterResult.Error("Không tìm thấy máy in USB.\n\n$debugInfo")
            }

            // Tìm printer theo usbPath hoặc dùng cái đầu tiên
            val usbPath = kitchen.printerUsbPath
            val targetPrinter = if (!usbPath.isNullOrBlank()) {
                connectedPrinters.find { it.address == usbPath || it.id == usbPath }
                    ?: connectedPrinters.firstOrNull()
            } else {
                connectedPrinters.firstOrNull()
            } ?: return PrinterResult.Error("Không tìm thấy máy in USB phù hợp")

            Log.d(TAG, "Using USB printer: ${targetPrinter.name} (${targetPrinter.address})")

            // Đăng ký receiver và kết nối
            adapter.registerReceiver()
            val connectResult = adapter.connect(targetPrinter)
            if (connectResult is PrinterResult.Error) {
                return connectResult
            }

            try {
                // Generate và in content
                if (printSeparately && ticketData.items.size > 1) {
                    // In từng món riêng biệt
                    ticketData.items.forEach { item ->
                        val singleItemTicket = ticketData.copy(items = listOf(item))
                        repeat(copies) {
                            val content = generateTicketContent(kitchen, singleItemTicket)
                            adapter.write(content)
                            delay(200)
                        }
                    }
                } else {
                    // In tất cả món trên 1 phiếu
                    repeat(copies) {
                        val content = generateTicketContent(kitchen, ticketData)
                        adapter.write(content)
                        delay(200)
                    }
                }

                adapter.disconnect()
                PrinterResult.Success("In phiếu thành công qua USB")

            } catch (e: Exception) {
                adapter.disconnect()
                throw e
            }

        } catch (e: Exception) {
            Log.e(TAG, "USB printing error: ${e.message}", e)
            PrinterResult.Error("Lỗi in USB: ${e.message}")
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TCP/IP PRINTING - HOÀN TOÀN RIÊNG BIỆT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * In phiếu bếp qua TCP/IP (máy in rời)
     *
     * Flow riêng biệt, KHÔNG dùng chung code với Sunmi:
     * 1. Generate ESC/POS content
     * 2. Batch tất cả copies vào 1 byte array
     * 3. Gửi qua Socket trong 1 connection duy nhất
     *
     * TỐI ƯU: Gộp tất cả nội dung để tránh giật khi in
     */
    private suspend fun printTicketViaNetwork(
        kitchen: KitchenEntity,
        ticketData: KitchenTicketData
    ): PrinterResult {
        val ip = kitchen.printerIp ?: return PrinterResult.Error("Chưa có IP máy in")

        Log.d(TAG, "=== START PRINT TICKET (TCP/IP) ===")
        Log.d(TAG, "Target: $ip:${kitchen.printerPort}")

        val printSeparately = kitchen.ticketPrintItemsSeparately
        val copies = kitchen.ticketCopies.coerceIn(1, 5)

        Log.d(TAG, "  printSeparately: $printSeparately")
        Log.d(TAG, "  cutAfterPrint: ${kitchen.ticketCutAfterPrint}")
        Log.d(TAG, "  copies: $copies")

        // ========== BATCHED CONTENT GENERATION ==========
        // Gộp tất cả nội dung vào 1 byte array để gửi trong 1 connection
        // Tránh jerky behavior do mở/đóng nhiều connection
        val batchedContent = java.io.ByteArrayOutputStream()
        var totalTickets = 0

        if (printSeparately && ticketData.items.size > 1) {
            // In từng món riêng biệt - gộp tất cả items × copies
            Log.d(TAG, "Batching ${ticketData.items.size} items × $copies copies")
            ticketData.items.forEach { item ->
                val singleItemTicket = ticketData.copy(items = listOf(item))
                val ticketContent = generateTicketContent(kitchen, singleItemTicket)

                // Ghi copies lần cho mỗi item
                repeat(copies) {
                    batchedContent.write(ticketContent)
                    totalTickets++
                }
            }
        } else {
            // In tất cả món trên 1 phiếu - gộp copies lần
            val ticketContent = generateTicketContent(kitchen, ticketData)
            Log.d(TAG, "Batching 1 ticket × $copies copies")

            repeat(copies) {
                batchedContent.write(ticketContent)
                totalTickets++
            }
        }

        val allContent = batchedContent.toByteArray()
        Log.d(TAG, "Total batched content: ${allContent.size} bytes ($totalTickets tickets)")

        // ========== SINGLE CONNECTION PRINT ==========
        val result = printWithRetryNetwork(ip, kitchen.printerPort, allContent)

        return when (result) {
            is PrinterResult.Success -> {
                Log.d(TAG, "=== TCP/IP PRINT SUCCESS: $totalTickets tickets ===")
                PrinterResult.Success("Đã in $totalTickets phiếu bếp")
            }
            is PrinterResult.Error -> {
                Log.e(TAG, "=== TCP/IP PRINT FAILED: ${result.message} ===")
                result
            }
        }
    }

    /**
     * In với retry logic cho TCP/IP
     * Sử dụng exponential backoff để tránh flood máy in
     */
    private suspend fun printWithRetryNetwork(
        ip: String,
        port: Int,
        content: ByteArray,
        maxRetries: Int = 3
    ): PrinterResult {
        var lastError: String? = null
        repeat(maxRetries) { attempt ->
            Log.d(TAG, "TCP/IP Print attempt ${attempt + 1}/$maxRetries...")
            val result = sendToNetworkPrinter(ip, port, content)
            when (result) {
                is PrinterResult.Success -> {
                    Log.d(TAG, "Attempt ${attempt + 1} succeeded!")
                    return result
                }
                is PrinterResult.Error -> {
                    lastError = result.message
                    Log.w(TAG, "Attempt ${attempt + 1} failed: ${result.message}")
                    if (attempt < maxRetries - 1) {
                        // Exponential backoff: 500ms, 1000ms, 2000ms
                        val delayMs = 500L * (1 shl attempt)
                        Log.d(TAG, "Waiting ${delayMs}ms before retry...")
                        delay(delayMs)
                    }
                }
            }
        }
        return PrinterResult.Error(lastError ?: "In thất bại sau $maxRetries lần thử")
    }

    /**
     * Gửi data đến máy in TCP/IP (nội bộ)
     * SINGLE WRITE để tránh giật
     */
    private suspend fun sendToNetworkPrinter(
        ip: String,
        port: Int,
        content: ByteArray
    ): PrinterResult {
        var socket: Socket? = null
        var outputStream: OutputStream? = null

        Log.d(TAG, "=== TCP/IP SEND ===")
        Log.d(TAG, "Target: $ip:$port")
        Log.d(TAG, "Content size: ${content.size} bytes")

        return try {
            socket = Socket().apply {
                reuseAddress = true
                keepAlive = true
                tcpNoDelay = true
                setSoLinger(true, 2)
            }

            socket.connect(InetSocketAddress(ip, port), 5000)
            Log.d(TAG, "Connected!")

            outputStream = socket.getOutputStream()

            // SINGLE WRITE: Gửi toàn bộ batched content trong 1 lần
            outputStream.write(content)
            outputStream.flush()
            Log.d(TAG, "Write completed!")

            // Đợi máy in xử lý - thời gian tỷ lệ với kích thước content
            val baseDelay = 500L
            val sizeDelay = (content.size / 10240) * 100L
            val totalDelay = (baseDelay + sizeDelay).coerceIn(500L, 2000L)
            Log.d(TAG, "Waiting ${totalDelay}ms for printer...")
            delay(totalDelay)

            Log.d(TAG, "=== TCP/IP SEND SUCCESS ===")
            PrinterResult.Success("OK")
        } catch (e: Exception) {
            Log.e(TAG, "TCP/IP error: ${e.message}", e)
            PrinterResult.Error("Lỗi kết nối: ${e.message}")
        } finally {
            try {
                outputStream?.flush()
                socket?.shutdownOutput()
                outputStream?.close()
                socket?.close()
            } catch (e: Exception) {
                Log.e(TAG, "Close error: ${e.message}")
            }
        }
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
    /**
     * Generate ticket bitmaps cho Sunmi T1 native printing
     * Sử dụng HybridBillBuilder với enableBitmapCollection() mode
     */
    private fun generateTicketBitmaps(
        kitchen: KitchenEntity,
        ticket: KitchenTicketData
    ): List<android.graphics.Bitmap> {
        Log.d(TAG, "=== Generate ticket BITMAPS for Sunmi T1 ===")

        val builder = createTicketBuilder(kitchen)
            .enableBitmapCollection() // QUAN TRỌNG: Bật chế độ thu thập bitmap

        // Build content (không bao gồm feed/beep/cut - sẽ xử lý riêng cho Sunmi)
        buildTicketContentToBuilder(builder, kitchen, ticket, includeCutCommands = false)

        return builder.buildBitmaps()
    }

    /**
     * Generate ticket ESC/POS content cho TCP/IP printing
     */
    private fun generateTicketContent(
        kitchen: KitchenEntity,
        ticket: KitchenTicketData
    ): ByteArray {
        Log.d(TAG, "=== Generate ticket ESC/POS for TCP/IP ===")

        val builder = createTicketBuilder(kitchen)

        // Build content (bao gồm feed/beep/cut)
        buildTicketContentToBuilder(builder, kitchen, ticket, includeCutCommands = true)

        val content = builder.build()
        Log.d(TAG, "Ticket content generated: ${content.size} bytes")
        return content
    }

    /**
     * Tạo HybridBillBuilder với config từ kitchen
     */
    private fun createTicketBuilder(kitchen: KitchenEntity): HybridBillBuilder {
        val paperWidth = kitchen.paperWidth
        val useBitmapMode = true
        val useRasterBitmap = true

        // Font scale based on fontSize config
        val fontScale = when (kitchen.ticketFontSize) {
            "extra_small" -> 0.7f
            "small" -> 0.85f
            "large" -> 1.2f
            "extra_large" -> 1.4f
            else -> 1.0f // medium (default)
        }

        val ticketLineSpacing = kitchen.ticketLineSpacing.coerceIn(0.3f, 1.0f)

        return HybridBillBuilder(paperWidth, useBitmapMode, useRasterBitmap, fontScale, ticketLineSpacing)
    }

    /**
     * Build ticket content vào builder
     * Shared giữa generateTicketContent và generateTicketBitmaps
     */
    private fun buildTicketContentToBuilder(
        builder: HybridBillBuilder,
        kitchen: KitchenEntity,
        ticket: KitchenTicketData,
        includeCutCommands: Boolean = true
    ) {
        // ========== TICKET CONFIG FROM WEB-DASHBOARD ==========
        val showOrderNumber = kitchen.ticketPrintOrderNumber
        val showTableName = kitchen.ticketPrintTableName
        val showTime = kitchen.ticketPrintTime
        val showStoreName = kitchen.ticketPrintStoreName
        val storeName = kitchen.ticketStoreName
        val showNotes = kitchen.ticketPrintNotes
        val showPrice = kitchen.ticketPrintPrice

        Log.d(TAG, "  - Paper width: ${kitchen.paperWidth}mm")
        Log.d(TAG, "  - Kitchen: ${ticket.kitchenName}")
        Log.d(TAG, "  - Items count: ${ticket.items.size}")

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
            // SECTION 2: THÔNG TIN ĐƠN HÀNG (thiết kế thông minh - gộp dòng để tránh đè layout)
            // ═══════════════════════════════════════════
            // Tên cửa hàng (nếu có)
            if (showStoreName && !storeName.isNullOrBlank()) {
                line(storeName)
            }

            // SMART LAYOUT: Gộp Bàn + Mã đơn trên dòng trái, Thẻ rung luôn căn phải
            val timeFormat = SimpleDateFormat("HH:mm dd/MM", Locale.getDefault()).apply {
                timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
            }
            val hasTable = showTableName && !ticket.tableName.isNullOrBlank()
            val hasOrder = showOrderNumber
            val hasTime = showTime
            val hasStaff = !ticket.staffName.isNullOrBlank()
            val hasPager = ticket.pagerNumber != null

            // Pager text: "Thẻ: X" - luôn căn phải
            val pagerText = if (hasPager) "Thẻ: ${ticket.pagerNumber}" else ""

            if (hasTable && hasOrder) {
                // Bàn bên trái (bold), Mã đơn bên phải
                lineKeyValueBold("BÀN: ${ticket.tableName}", ticket.displayNumber)
            } else if (hasTable) {
                // Chỉ có bàn
                lineBold("BÀN: ${ticket.tableName}")
            } else if (hasOrder && hasTime) {
                // Không có bàn: Mã đơn + Thời gian
                lineKeyValue(ticket.displayNumber, timeFormat.format(ticket.orderTime))
            } else if (hasOrder) {
                line(ticket.displayNumber)
            }

            // Thẻ rung luôn hiển thị trên dòng riêng, căn phải (nếu có)
            if (hasPager) {
                lineKeyValueBold("", pagerText)
            }

            // SMART LAYOUT: Gộp Thời gian + Nhân viên trên cùng 1 dòng (nếu có bàn)
            if (hasTable) {
                // Đã có bàn + mã đơn ở trên, giờ gộp time + staff
                val timePart = if (hasTime) timeFormat.format(ticket.orderTime) else ""
                val staffPart = if (hasStaff) "NV: ${ticket.staffName}" else ""

                if (timePart.isNotEmpty() && staffPart.isNotEmpty()) {
                    lineKeyValue(timePart, staffPart)
                } else if (timePart.isNotEmpty()) {
                    line(timePart)
                } else if (staffPart.isNotEmpty()) {
                    line(staffPart)
                }
            } else {
                // Không có bàn: hiển thị staff riêng (time đã gộp với order ở trên)
                if (hasStaff) {
                    line("NV: ${ticket.staffName}")
                }
            }

            separator('=')

            // ═══════════════════════════════════════════
            // SECTION 4: DANH SÁCH MÓN (tối ưu: bỏ dòng trống giữa các món để tiết kiệm giấy)
            // ═══════════════════════════════════════════
            ticket.items.forEachIndexed { index, item ->
                // Bỏ dòng trống để tiết kiệm giấy - các món vẫn rõ ràng nhờ số thứ tự

                // Tính giá gốc = giá tổng - tổng giá topping
                val toppingTotal = item.toppingPrices.sumOf { it.second }
                val basePrice = if (item.price > 0 && toppingTotal > 0) {
                    (item.price - toppingTotal).coerceAtLeast(0.0)
                } else {
                    0.0
                }

                // Số thứ tự + Tên món + Số lượng + Giá TỔNG (trên dòng header)
                val itemLine = "${index + 1}. ${item.name}"
                val rightPart = if (showPrice && item.price > 0) {
                    "x${item.quantity}  ${formatPrice(item.price)}"
                } else {
                    "x${item.quantity}"
                }

                // In tên món, số lượng và giá TỔNG trên cùng dòng
                if (item.quantity > 1) {
                    lineKeyValueBold(itemLine, rightPart)
                } else {
                    lineKeyValue(itemLine, rightPart, BitmapTextStyle(bold = true))
                }

                // Hiển thị giá gốc bên trái (nếu có topping và showPrice)
                if (showPrice && basePrice > 0 && toppingTotal > 0) {
                    line("   ${formatPrice(basePrice)}")
                }

                // Tùy chọn (Size, Đá, Đường...) - hiển thị dạng "• Size L" thay vì "Size: L"
                // Chỉ hiển thị options không có trong toppingPrices (tránh trùng lặp)
                val toppingNames = item.toppingPrices.map { it.first.lowercase() }
                item.options.forEach { (key, value) ->
                    // Normalize key và value: loại bỏ tất cả Unicode whitespace thừa
                    val normalizedKey = normalizeText(key)
                    val normalizedValue = normalizeText(value)

                    // Bỏ qua nếu key hoặc value rỗng
                    if (normalizedKey.isNotBlank() && normalizedValue.isNotBlank()) {
                        val optionText = "$normalizedKey $normalizedValue"
                        // Bỏ qua nếu đã có trong toppingPrices (ví dụ: "Size L" đã có giá trong toppingPrices)
                        if (!toppingNames.any { it.contains(normalizedKey.lowercase()) || it.contains(normalizedValue.lowercase()) }) {
                            line("   • $optionText")
                        }
                    }
                }

                // Topping - hiển thị tất cả toppings giống như in tem (với số lượng nếu > 1)
                if (item.toppings.isNotEmpty() || item.toppingPrices.isNotEmpty()) {
                    val toppingCount = if (item.toppingPrices.isNotEmpty()) item.toppingPrices.size else item.toppings.size
                    Log.d(TAG, "  Printing $toppingCount toppings for ${item.name}")

                    // Hiển thị topping - chỉ hiển thị giá nếu showPrice = true
                    if (item.toppingPrices.isNotEmpty()) {
                        item.toppingPrices.forEach { (toppingName, toppingPrice, toppingQty) ->
                            // Normalize topping name: loại bỏ tất cả Unicode whitespace thừa
                            val normalizedName = normalizeText(toppingName)

                            // Bỏ qua topping name rỗng
                            if (normalizedName.isNotBlank()) {
                                // Hiển thị số lượng nếu > 1 (số lượng đặt sau tên topping)
                                val displayName = if (toppingQty > 1) {
                                    "$normalizedName x$toppingQty"
                                } else {
                                    normalizedName
                                }
                                val totalToppingPrice = toppingPrice * toppingQty

                                if (showPrice && totalToppingPrice > 0) {
                                    // Hiển thị topping với giá khi config bật
                                    lineKeyValue("   + $displayName", "+${formatPrice(totalToppingPrice)}")
                                } else {
                                    // Chỉ hiển thị tên topping khi config tắt hoặc giá = 0
                                    line("   + $displayName")
                                }
                            }
                        }
                    } else {
                        item.toppings.forEach { topping ->
                            // Normalize topping name: loại bỏ tất cả Unicode whitespace thừa
                            val normalizedTopping = normalizeText(topping)

                            // Bỏ qua topping name rỗng
                            if (normalizedTopping.isNotBlank()) {
                                line("   + $normalizedTopping")
                            }
                        }
                    }
                }

                // Ghi chú riêng cho món (nổi bật, in nghiêng đậm) - nếu config cho phép
                if (showNotes) {
                    item.note?.let {
                        lineBoldItalic("   >> $it")
                    }
                }
            }

            // ═══════════════════════════════════════════
            // SECTION 5: GHI CHÚ CHUNG (nếu config cho phép)
            // ═══════════════════════════════════════════
            if (showNotes) {
                ticket.note?.let {
                    separator('─')
                    lineBoldItalic("GHI CHÚ: $it")
                }
            }

            // ═══════════════════════════════════════════
            // SECTION 6: FOOTER - Tổng số món (chỉ 1 gạch phía trên)
            // ═══════════════════════════════════════════
            separator('─')

            // Tổng số món
            val totalItems = ticket.items.sumOf { it.quantity }
            lineBold("TỔNG: $totalItems MÓN", BitmapTextStyle(centerAlign = true))

            // ═══════════════════════════════════════════
            // FEED, BEEP & CUT (chỉ cho TCP/IP, không dùng cho Sunmi bitmap mode)
            // ═══════════════════════════════════════════
            if (includeCutCommands) {
                // Feed 6 dòng để đảm bảo dòng TỔNG MÓN không bị cắt mất
                feed(6)
                beep()
                // Cắt giấy dựa trên config
                if (kitchen.ticketCutAfterPrint) {
                    cut()
                }
            }
        }
    }

}
