package com.techres.ccb.data.printer

import android.graphics.Bitmap
import android.util.Log
import com.techres.ccb.data.local.entity.BankAccountEntity
import com.techres.ccb.data.local.entity.BillPrinterConfigEntity
import com.techres.ccb.data.local.entity.BillTemplateEntity
import com.techres.ccb.data.local.entity.BillTemplateType
import com.techres.ccb.printer.adapter.SunmiPrinterAdapter
import com.techres.ccb.printer.adapter.UsbPrinterAdapter
import com.techres.ccb.printer.core.PrinterDevice
import com.techres.ccb.printer.core.ConnectionType
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
 * Hybrid Bill Print Service - In bill với tiếng Việt có dấu
 *
 * Sử dụng phương pháp HYBRID:
 * - Tự động detect máy in có hỗ trợ UTF-8 Vietnamese không
 * - Nếu có → dùng ESC/POS text thuần (nhanh, nhẹ)
 * - Nếu không → dùng BITMAP (đảm bảo 100% đúng)
 *
 * SINGLE CANVAS RENDERING (v2.0):
 * - Render toàn bộ bill trên 1 canvas duy nhất
 * - Giảm GC pressure và jitter
 * - In mượt hơn với line spacing đồng nhất
 *
 * @author TechRes
 */
object HybridBillPrintService {
    private const val TAG = "HybridBillPrintService"
    private val currencyFormat = DecimalFormat("#,###")

    // Flag to enable Single Canvas Rendering (default: true for better performance)
    private var useSingleCanvasRendering = true

    /**
     * Enable/disable Single Canvas Rendering mode
     * Single Canvas: render toàn bộ bill trên 1 bitmap (ít jitter, mượt hơn)
     * Legacy: render từng dòng riêng (compatible với máy in cũ)
     */
    fun setSingleCanvasMode(enabled: Boolean) {
        useSingleCanvasRendering = enabled
        Log.d(TAG, "Single Canvas Rendering: ${if (enabled) "ENABLED" else "DISABLED"}")
    }

    fun isSingleCanvasMode(): Boolean = useSingleCanvasRendering

    // Sunmi printer adapter instance (lazy init)
    private var sunmiAdapter: SunmiPrinterAdapter? = null

    // USB printer adapter instance (lazy init)
    private var usbAdapter: UsbPrinterAdapter? = null

    /**
     * Initialize Sunmi adapter (call from Application or PrinterModule)
     */
    fun initSunmiAdapter(adapter: SunmiPrinterAdapter) {
        sunmiAdapter = adapter
    }

    /**
     * Initialize USB adapter (call from Application or PrinterModule)
     */
    fun initUsbAdapter(adapter: UsbPrinterAdapter) {
        usbAdapter = adapter
    }

    /**
     * In bill với template và config
     *
     * Hỗ trợ 2 loại máy in:
     * 1. MÁY IN LIỀN THÂN (Sunmi built-in): connectionType = "sunmi"
     *    - Sử dụng Sunmi SDK (AIDL interface)
     *    - Không cần IP, tự động kết nối qua service
     *
     * 2. MÁY IN RỜI (Network printer): connectionType = "network"
     *    - Sử dụng TCP/IP socket (giống kitchen ticket)
     *    - Cần cấu hình IP và port
     *    - Hỗ trợ các máy: EPSON, BIXOLON, XPRINTER, v.v.
     */
    suspend fun printBill(
        printerConfig: BillPrinterConfigEntity,
        template: BillTemplateEntity,
        billData: BillData,
        paymentBankAccount: BankAccountEntity? = null, // Tài khoản ngân hàng cho QR thanh toán
        payosQrCode: String? = null // PayOS QR code URL (khi dùng PayOS thay VietQR)
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            var lastError: String? = null

            Log.d(TAG, "=== PRINT BILL ===")
            Log.d(TAG, "Connection type: ${printerConfig.connectionType}")
            Log.d(TAG, "Order: ${billData.displayNumber}, ${billData.items.size} items")
            if (paymentBankAccount != null) {
                val qrType = if (payosQrCode != null) "PayOS" else "VietQR"
                Log.d(TAG, "Payment QR ($qrType): ${paymentBankAccount.bankName} - ${paymentBankAccount.accountNumber}")
            }

            // ========== MÁY IN LIỀN THÂN (SUNMI) ==========
            if (printerConfig.connectionType == "sunmi") {
                Log.d(TAG, "Using SUNMI BUILT-IN printer")

                // Cảnh báo nếu config sunmi nhưng có IP -> có thể cấu hình sai
                if (!printerConfig.printerIp.isNullOrBlank()) {
                    Log.w(TAG, "⚠️ CẢNH BÁO: connectionType='sunmi' nhưng có IP '${printerConfig.printerIp}'")
                    Log.w(TAG, "⚠️ Nếu máy in rời (WiFi/LAN), hãy đổi connectionType='network' để in mượt hơn!")
                    Log.w(TAG, "⚠️ Sunmi adapter có thể gây giật khi in qua AIDL interface")
                }

                return@withContext printViaSunmi(printerConfig, template, billData, paymentBankAccount, payosQrCode)
            }

            // ========== MÁY IN USB ==========
            if (printerConfig.connectionType == "usb") {
                Log.d(TAG, "Using USB printer: ${printerConfig.printerUsbPath}")

                // USB printers use ESC/POS standard capability
                val capability = PrinterCapability(
                    printerIp = "usb://${printerConfig.printerUsbPath ?: "default"}",
                    printerPort = 0,
                    supportVietnameseUtf8 = false,
                    supportBitmap = true
                )

                // Generate bill content cho USB printer
                val billContent = generateHybridBill(printerConfig, template, billData, capability, paymentBankAccount, payosQrCode)

                // Retry logic
                val effectiveRetryCount = maxOf(printerConfig.retryCount, 1)
                Log.d(TAG, "USB Retry count: $effectiveRetryCount, Bill content: ${billContent.size} bytes")

                repeat(effectiveRetryCount) { attempt ->
                    Log.d(TAG, "USB Attempt ${attempt + 1}/$effectiveRetryCount...")
                    val result = printViaUsb(printerConfig, template, billContent)

                    when (result) {
                        is PrinterResult.Success -> {
                            Log.d(TAG, "USB Attempt ${attempt + 1} succeeded!")
                            return@withContext result
                        }
                        is PrinterResult.Error -> {
                            lastError = result.message
                            Log.w(TAG, "USB Attempt ${attempt + 1} failed: ${result.message}")
                            if (attempt < effectiveRetryCount - 1) {
                                delay(printerConfig.retryDelayMs.toLong())
                            }
                        }
                    }
                }

                return@withContext PrinterResult.Error(lastError ?: "In bill USB thất bại sau $effectiveRetryCount lần thử")
            }

            // ========== MÁY IN RỜI (NETWORK) ==========
            Log.d(TAG, "Using NETWORK printer: ${printerConfig.printerIp}:${printerConfig.printerPort}")

            // Detect printer capability for network printers
            val ip = printerConfig.printerIp ?: return@withContext PrinterResult.Error("Chưa cấu hình IP máy in")
            val capability = PrinterCapabilityDetector.detect(ip, printerConfig.printerPort)

            // Generate bill content với Hybrid builder
            // Sử dụng paperWidth, fontSize, lineSpacing từ printerConfig (user cài đặt trong app)
            val billContent = generateHybridBill(printerConfig, template, billData, capability, paymentBankAccount, payosQrCode)

            // Retry logic - đảm bảo ít nhất 1 lần thử
            val effectiveRetryCount = maxOf(printerConfig.retryCount, 1)
            Log.d(TAG, "Retry count: $effectiveRetryCount, Bill content: ${billContent.size} bytes")

            repeat(effectiveRetryCount) { attempt ->
                Log.d(TAG, "Attempt ${attempt + 1}/$effectiveRetryCount...")
                val result = printViaNetwork(printerConfig, template, billContent)

                when (result) {
                    is PrinterResult.Success -> {
                        Log.d(TAG, "Attempt ${attempt + 1} succeeded!")
                        return@withContext result
                    }
                    is PrinterResult.Error -> {
                        lastError = result.message
                        Log.w(TAG, "Attempt ${attempt + 1} failed: ${result.message}")
                        if (attempt < effectiveRetryCount - 1) {
                            delay(printerConfig.retryDelayMs.toLong())
                        }
                    }
                }
            }

            PrinterResult.Error(lastError ?: "In bill thất bại sau $effectiveRetryCount lần thử")
        }
    }

    /**
     * In bill qua Sunmi Built-in Printer
     *
     * Tính năng:
     * - Retry logic với configurable retry count và delay
     * - Kiểm tra trạng thái máy in trước khi in
     * - Error handling chi tiết với thông báo lỗi rõ ràng
     * - Tối ưu connection management
     * - SINGLE WRITE để đảm bảo in mượt
     *
     * Flow: connect → check status → generate bill → retry loop (write + delay) → complete
     */
    private suspend fun printViaSunmi(
        config: BillPrinterConfigEntity,
        template: BillTemplateEntity,
        billData: BillData,
        paymentBankAccount: BankAccountEntity? = null,
        payosQrCode: String? = null
    ): PrinterResult {
        val adapter = sunmiAdapter ?: return PrinterResult.Error("Sunmi adapter chưa được khởi tạo")

        Log.d(TAG, "=== START PRINT BILL (SUNMI) ===")
        Log.d(TAG, "Model: ${adapter.getSunmiModel()}")
        Log.d(TAG, "Copies: ${template.numberOfCopies}, Retry: ${config.retryCount}")

        // ========== BƯỚC 1: KẾT NỐI ĐẾN MÁY IN ==========
        val connectResult = connectToSunmiWithRetry(adapter, config.retryCount, config.retryDelayMs)
        if (connectResult is PrinterResult.Error) {
            return connectResult
        }

        return try {
            // ========== BƯỚC 2: KIỂM TRA TRẠNG THÁI MÁY IN ==========
            val statusCheck = checkSunmiPrinterStatus(adapter)
            if (statusCheck is PrinterResult.Error) {
                return statusCheck
            }

            // ========== BƯỚC 3: KIỂM TRA LOẠI KẾT NỐI ==========
            // Kiểm tra BinderProxy TRƯỚC khi quyết định paper width
            // (Sunmi T1 không xử lý đúng native Parcelable Bitmap qua AIDL)
            val isBinderProxy = adapter.isUsingBinderProxy()
            Log.d(TAG, "Sunmi using BinderProxy: $isBinderProxy")

            // ========== BƯỚC 4: XÁC ĐỊNH PAPER WIDTH ==========
            // Với BinderProxy (Sunmi T1): SỬ DỤNG USER CONFIG vì getPaperWidth() không đáng tin
            // Với non-BinderProxy: Có thể tin tưởng Sunmi reported width
            val sunmiPaperWidth = adapter.getPaperWidth()
            val effectiveConfig = if (isBinderProxy) {
                // BinderProxy mode: Luôn sử dụng user config
                Log.d(TAG, "BinderProxy mode: Using user config paperWidth=${config.paperWidth}mm (Sunmi reported: ${sunmiPaperWidth}mm)")
                config
            } else if (sunmiPaperWidth > 0 && sunmiPaperWidth != config.paperWidth) {
                // Non-BinderProxy: Có thể trust Sunmi's reported width
                Log.d(TAG, "Non-BinderProxy: Using Sunmi detected paperWidth=${sunmiPaperWidth}mm (user config: ${config.paperWidth}mm)")
                config.copy(paperWidth = sunmiPaperWidth)
            } else {
                Log.d(TAG, "Using user config paperWidth=${config.paperWidth}mm")
                config
            }

            if (isBinderProxy) {
                // ========== NATIVE BITMAP PRINTING (cho BinderProxy) ==========
                // Sử dụng Sunmi native printBitmap/printBitmapCustom thay vì ESC/POS
                // vì sendRAWData không hỗ trợ ESC/POS format trên Sunmi T1
                Log.d(TAG, "Using NATIVE BITMAP printing for Sunmi (BinderProxy mode)")

                // Generate bill bitmaps trực tiếp
                val bitmaps = generateSunmiBillBitmaps(effectiveConfig, template, billData, paymentBankAccount, payosQrCode)
                Log.d(TAG, "Generated ${bitmaps.size} bitmaps for Sunmi")

                // Sử dụng numberOfCopies từ config (user settings) thay vì template
                val numberOfCopies = config.numberOfCopies
                Log.d(TAG, "Config numberOfCopies: $numberOfCopies, cutPaper: ${config.cutPaper}")

                // In từng bản
                repeat(numberOfCopies) { copyIndex ->
                    Log.d(TAG, "Printing copy ${copyIndex + 1}/$numberOfCopies (native bitmap)...")

                    // In từng bitmap
                    bitmaps.forEachIndexed { bitmapIndex, bitmap ->
                        val printResult = printSunmiBitmapWithRetry(
                            adapter = adapter,
                            bitmap = bitmap,
                            bitmapIndex = bitmapIndex,
                            totalBitmaps = bitmaps.size,
                            retryCount = config.retryCount,
                            retryDelayMs = config.retryDelayMs
                        )

                        if (printResult is PrinterResult.Error) {
                            // Recycle all bitmaps before returning
                            bitmaps.forEach { it.recycle() }
                            return printResult
                        }
                    }

                    // Không cần feedPaper ở đây vì printBitmapViaTransact đã có lineWrap + commit
                    // adapter.feedPaper(3) - REMOVED to avoid double paper feeding

                    // Delay giữa các bản
                    if (copyIndex < numberOfCopies - 1) {
                        delay(500)
                    }
                }

                // Feed paper và cắt giấy nếu config cho phép
                // Bitmap đã có blank space ở cuối (~96 pixels = ~24mm)
                if (config.cutPaper) {
                    Log.d(TAG, "Cutting paper...")

                    // QUAN TRỌNG: Commit buffer để đảm bảo tất cả data đã được gửi đến printer
                    adapter.commitBuffer()

                    // Đợi ngắn cho printer xử lý xong buffer
                    adapter.waitForPrinterIdle(timeoutMs = 1500)
                    delay(200)

                    // Cắt giấy - thử native AIDL trước, fallback sang ESC/POS
                    val cutResult = adapter.cutPaperWithFallback()
                    Log.d(TAG, "Cut paper result: $cutResult")
                } else {
                    // Chỉ đẩy giấy ra để dễ xé
                    Log.d(TAG, "No auto-cut, feeding paper...")
                    adapter.feedLines(5)
                    adapter.commitBuffer()
                    adapter.waitForPrinterIdle(timeoutMs = 1000)
                }

                // Recycle bitmaps
                bitmaps.forEach { it.recycle() }

            } else {
                // ========== ESC/POS PRINTING (cho local service) ==========
                Log.d(TAG, "Using ESC/POS printing for Sunmi")

                val capability = PrinterCapability(
                    printerIp = "sunmi_inner",
                    printerPort = 0,
                    supportVietnameseUtf8 = false, // Force bitmap mode cho Sunmi
                    printerModel = adapter.getSunmiModel()
                )

                val billContent = generateHybridBill(effectiveConfig, template, billData, capability, paymentBankAccount, payosQrCode)
                Log.d(TAG, "Sunmi bill content size: ${billContent.size} bytes")

                // In từng bản với retry
                repeat(template.numberOfCopies) { copyIndex ->
                    Log.d(TAG, "Printing copy ${copyIndex + 1}/${template.numberOfCopies}...")

                    val printResult = printSunmiCopyWithRetry(
                        adapter = adapter,
                        content = billContent,
                        copyIndex = copyIndex,
                        totalCopies = template.numberOfCopies,
                        retryCount = config.retryCount,
                        retryDelayMs = config.retryDelayMs
                    )

                    if (printResult is PrinterResult.Error) {
                        return printResult
                    }

                    // Delay giữa các bản (không delay sau bản cuối)
                    if (copyIndex < template.numberOfCopies - 1) {
                        delay(300)
                    }
                }
            }

            Log.d(TAG, "=== SUNMI PRINT SUCCESS ===")
            Log.d(TAG, "Printed ${template.numberOfCopies} copies successfully")
            PrinterResult.Success("In bill thành công!")

        } catch (e: Exception) {
            Log.e(TAG, "=== SUNMI PRINT FAILED ===")
            Log.e(TAG, "Error: ${e.message}", e)
            PrinterResult.Error("Lỗi in Sunmi: ${e.message}")
        }
    }

    /**
     * Kết nối đến máy in Sunmi với retry logic
     *
     * QUAN TRỌNG: Sau khi kết nối thành công, gọi warmUpPrinter() để:
     * 1. Xóa buffer cũ (tránh in bill test từ session trước)
     * 2. Đảm bảo máy in sẵn sàng nhận lệnh mới
     */
    private suspend fun connectToSunmiWithRetry(
        adapter: SunmiPrinterAdapter,
        retryCount: Int,
        retryDelayMs: Int
    ): PrinterResult {
        var lastError: String? = null

        repeat(retryCount) { attempt ->
            Log.d(TAG, "Sunmi connect attempt ${attempt + 1}/$retryCount")

            val connectResult = adapter.connect()
            when (connectResult) {
                is com.techres.ccb.printer.core.PrinterResult.Success -> {
                    Log.d(TAG, "Sunmi connected successfully")
                    // Warm-up printer: clear old buffer và đảm bảo sẵn sàng
                    warmUpPrinter(adapter)
                    return PrinterResult.Success("Connected")
                }
                is com.techres.ccb.printer.core.PrinterResult.PartialSuccess -> {
                    Log.d(TAG, "Sunmi connected with partial success")
                    // Warm-up printer: clear old buffer và đảm bảo sẵn sàng
                    warmUpPrinter(adapter)
                    return PrinterResult.Success("Connected")
                }
                is com.techres.ccb.printer.core.PrinterResult.Error -> {
                    lastError = connectResult.message
                    Log.w(TAG, "Connect attempt ${attempt + 1} failed: ${connectResult.message}")

                    if (attempt < retryCount - 1) {
                        Log.d(TAG, "Waiting ${retryDelayMs}ms before retry...")
                        delay(retryDelayMs.toLong())
                    }
                }
            }
        }

        return PrinterResult.Error("Không thể kết nối máy in Sunmi sau $retryCount lần thử: $lastError")
    }

    /**
     * Warm-up printer sau khi kết nối
     *
     * Mục đích:
     * 1. Xóa bất kỳ data cũ trong buffer (tránh in bill test từ session trước)
     * 2. Đảm bảo máy in sẵn sàng nhận lệnh mới
     * 3. "Đánh thức" máy in nếu nó đang ở chế độ sleep
     */
    private suspend fun warmUpPrinter(adapter: SunmiPrinterAdapter) {
        try {
            Log.d(TAG, "Warming up Sunmi printer...")

            // Bước 1: Init printer để reset trạng thái
            adapter.initPrinter()

            // Bước 2: Commit buffer để xóa bất kỳ data cũ nào
            // Điều này sẽ flush buffer mà không in gì (vì không có data mới)
            adapter.commitBuffer()

            // Bước 3: Đợi một chút để máy in xử lý
            delay(100)

            Log.d(TAG, "Sunmi printer warmed up successfully")
        } catch (e: Exception) {
            // Không fail nếu warm-up thất bại, chỉ log warning
            Log.w(TAG, "Warm-up failed (non-fatal): ${e.message}")
        }
    }

    /**
     * Kiểm tra trạng thái máy in Sunmi trước khi in
     * Trả về lỗi chi tiết nếu máy in có vấn đề
     */
    private suspend fun checkSunmiPrinterStatus(adapter: SunmiPrinterAdapter): PrinterResult {
        return try {
            val status = adapter.getStatus()
            Log.d(TAG, "Sunmi status: online=${status.isOnline}, error=${status.hasError}, paper=${status.hasPaper}")

            when {
                !status.isOnline -> {
                    PrinterResult.Error("Máy in Sunmi không sẵn sàng. Vui lòng kiểm tra máy in.")
                }
                !status.hasPaper -> {
                    PrinterResult.Error("Máy in hết giấy. Vui lòng thêm giấy và thử lại.")
                }
                status.coverOpen -> {
                    PrinterResult.Error("Nắp máy in đang mở. Vui lòng đóng nắp và thử lại.")
                }
                status.hasError && status.errorMessage != null -> {
                    val errorMsg = mapSunmiErrorMessage(status.errorMessage!!)
                    PrinterResult.Error("Lỗi máy in: $errorMsg")
                }
                else -> {
                    Log.d(TAG, "Sunmi printer status OK")
                    PrinterResult.Success("OK")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to check Sunmi status: ${e.message}")
            // Không fail nếu không check được status, tiếp tục in
            PrinterResult.Success("Status check skipped")
        }
    }

    /**
     * Map Sunmi error message sang tiếng Việt
     */
    private fun mapSunmiErrorMessage(errorMessage: String): String {
        return when {
            errorMessage.contains("Out of paper", ignoreCase = true) -> "Hết giấy"
            errorMessage.contains("Overheated", ignoreCase = true) -> "Máy in quá nóng, vui lòng đợi nguội"
            errorMessage.contains("Cover open", ignoreCase = true) -> "Nắp máy in đang mở"
            errorMessage.contains("Paper cutter", ignoreCase = true) -> "Lỗi dao cắt giấy"
            errorMessage.contains("No printer", ignoreCase = true) -> "Không tìm thấy máy in"
            errorMessage.contains("Abnormal", ignoreCase = true) -> "Lỗi giao tiếp máy in"
            errorMessage.contains("Preparing", ignoreCase = true) -> "Máy in đang khởi động"
            else -> errorMessage
        }
    }

    /**
     * In 1 bản bill qua Sunmi với retry logic
     */
    private suspend fun printSunmiCopyWithRetry(
        adapter: SunmiPrinterAdapter,
        content: ByteArray,
        copyIndex: Int,
        totalCopies: Int,
        retryCount: Int,
        retryDelayMs: Int
    ): PrinterResult {
        var lastError: String? = null

        repeat(retryCount) { attempt ->
            // Kiểm tra status trước mỗi lần retry (trừ lần đầu)
            if (attempt > 0) {
                val statusCheck = checkSunmiPrinterStatus(adapter)
                if (statusCheck is PrinterResult.Error) {
                    return statusCheck
                }
            }

            Log.d(TAG, "Sunmi write attempt ${attempt + 1}/$retryCount for copy ${copyIndex + 1}/$totalCopies")

            // SINGLE WRITE: Gửi toàn bộ data trong 1 lần
            val writeResult = adapter.write(content)

            when (writeResult) {
                is com.techres.ccb.printer.core.PrinterResult.Success -> {
                    Log.d(TAG, "Copy ${copyIndex + 1} sent: ${content.size} bytes")

                    // Đợi máy in xử lý xong bitmap data
                    // Thời gian đợi tỷ lệ với kích thước data
                    val processingTime = calculateProcessingTime(content.size)
                    Log.d(TAG, "Waiting ${processingTime}ms for printer to process...")
                    delay(processingTime)

                    return PrinterResult.Success("OK")
                }
                is com.techres.ccb.printer.core.PrinterResult.PartialSuccess -> {
                    Log.d(TAG, "Copy ${copyIndex + 1} sent with partial success: ${content.size} bytes")
                    val processingTime = calculateProcessingTime(content.size)
                    delay(processingTime)
                    return PrinterResult.Success("OK")
                }
                is com.techres.ccb.printer.core.PrinterResult.Error -> {
                    lastError = writeResult.message
                    Log.w(TAG, "Write attempt ${attempt + 1} failed: ${writeResult.message}")

                    if (attempt < retryCount - 1) {
                        Log.d(TAG, "Waiting ${retryDelayMs}ms before retry...")
                        delay(retryDelayMs.toLong())
                    }
                }
            }
        }

        return PrinterResult.Error("Lỗi in bản ${copyIndex + 1}/$totalCopies sau $retryCount lần thử: $lastError")
    }

    /**
     * Tính toán thời gian đợi máy in xử lý dựa trên kích thước data
     * Bill lớn cần nhiều thời gian hơn
     */
    private fun calculateProcessingTime(contentSize: Int): Long {
        return when {
            contentSize < 10_000 -> 500L      // Bill nhỏ: 500ms
            contentSize < 30_000 -> 800L      // Bill trung bình: 800ms
            contentSize < 50_000 -> 1200L     // Bill lớn: 1.2s
            else -> 1500L                      // Bill rất lớn: 1.5s
        }
    }

    /**
     * Generate bitmaps cho Sunmi native printing
     * Sử dụng SingleCanvasBillBuilder.buildBitmaps() để tạo list bitmap
     */
    private fun generateSunmiBillBitmaps(
        config: BillPrinterConfigEntity,
        template: BillTemplateEntity,
        billData: BillData,
        paymentBankAccount: BankAccountEntity? = null,
        payosQrCode: String? = null
    ): List<Bitmap> {
        Log.d(TAG, "Generating Sunmi bill bitmaps: ${billData.displayNumber}, ${billData.items.size} items")

        // Sử dụng shared method để build nội dung bill vào builder
        val builder = buildBillContentToBuilder(
            config.paperWidth,
            config.fontSize,
            config.lineSpacing,
            template,
            billData,
            paymentBankAccount,
            payosQrCode
        )

        // Không cần cut/beep/openCashDrawer cho bitmap mode - sẽ xử lý riêng

        // Build to bitmaps (không bao gồm ESC/POS commands)
        return builder.buildBitmaps()
    }

    /**
     * Build nội dung bill vào SingleCanvasBillBuilder
     * Shared method được sử dụng bởi cả generateBillWithSingleCanvas và generateSunmiBillBitmaps
     */
    private fun buildBillContentToBuilder(
        paperWidth: Int,
        fontSize: String,
        lineSpacing: Float,
        template: BillTemplateEntity,
        billData: BillData,
        paymentBankAccount: BankAccountEntity? = null,
        payosQrCode: String? = null
    ): SingleCanvasBillBuilder {
        // Chuyển đổi fontSize từ string sang fontScale float
        val fontScale = when (fontSize) {
            "extra_small" -> 0.7f
            "small" -> 0.85f
            "large" -> 1.2f
            "extra_large" -> 1.4f
            else -> 1.0f // normal/medium
        }

        val builder = SingleCanvasBillBuilder(
            paperWidth = paperWidth,
            fontScale = fontScale,
            lineSpacing = lineSpacing,
            separatorChar = template.separatorChar.firstOrNull() ?: '-',
            doubleSeparatorChar = template.doubleSeparatorChar.firstOrNull() ?: '='
        )

        builder.apply {
            init()

            // ============ HEADER ============
            lineDouble(template.storeName, BitmapTextStyle(centerAlign = true))

            template.storeAddress?.let { lineCenter(it) }
            template.storePhone?.let { lineCenter("ĐT: $it") }
            template.taxCode?.let { lineCenter("MST: $it") }
            template.headerText?.let { lineCenter(it) }

            doubleSeparator()

            // ============ BILL TITLE ============
            if (billData.isTemporaryBill) {
                lineDouble("*** BILL TẠM ***", BitmapTextStyle(centerAlign = true))
                doubleSeparator()
                lineCenter("Lần in thứ: ${billData.printCount}")
                billData.printTime?.let { printTime ->
                    val timeFormat = SimpleDateFormat("HH:mm:ss dd/MM/yyyy", Locale.getDefault()).apply {
                        timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
                    }
                    lineCenter("Thời gian in: ${timeFormat.format(printTime)}")
                }
                lineCenter("(Chưa thanh toán)")
                separator()
            } else if (billData.isReprint) {
                lineDouble("*** BẢN SAO ***", BitmapTextStyle(centerAlign = true))
                lineDouble("*** IN LẠI ***", BitmapTextStyle(centerAlign = true))
                doubleSeparator()
                billData.reprintTime?.let { reprintTime ->
                    val timeFormat = SimpleDateFormat("HH:mm:ss dd/MM/yyyy", Locale.getDefault()).apply {
                        timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
                    }
                    lineCenter("Thời gian in lại: ${timeFormat.format(reprintTime)}")
                }
                billData.reprintReason?.let { reason ->
                    lineCenter("Lý do: $reason")
                }
                lineCenter("(Đây không phải bill gốc)")
                separator()
                lineDouble(template.billTitle, BitmapTextStyle(centerAlign = true))
                doubleSeparator()
            } else {
                lineDouble(template.billTitle, BitmapTextStyle(centerAlign = true))
                doubleSeparator()
            }

            // ============ ORDER INFO ============
            if (template.showOrderNumber) {
                line("Mã đơn: ${billData.displayNumber}")
            }
            if (template.showTableName && billData.tableName != null) {
                line("Bàn: ${billData.tableName}")
            }
            if (billData.pagerNumber != null) {
                lineBold("Thẻ rung: ${billData.pagerNumber}")
            }
            if (template.showStaffName && billData.staffName != null) {
                line("NV: ${billData.staffName}")
            }
            if (template.showCustomerName && billData.customerName != null) {
                line("Khách hàng: ${billData.customerName}")
            }
            if (template.showDateTime) {
                val dateFormat = SimpleDateFormat(template.dateFormat, Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
                }
                line("Giờ: ${dateFormat.format(billData.orderDate)}")
            }

            // ============ TIME TRACKING ============
            if (template.showCheckInTime && billData.checkInTime != null) {
                val timeFormat = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
                }
                line("${template.checkInLabel}: ${timeFormat.format(billData.checkInTime)}")
            }
            if (template.showCheckOutTime && billData.checkOutTime != null) {
                val timeFormat = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
                }
                line("${template.checkOutLabel}: ${timeFormat.format(billData.checkOutTime)}")
            }

            // ============ ORDER NOTE ============
            if (template.showOrderNote && billData.orderNote != null && billData.orderNote.isNotBlank()) {
                lineItalic("Ghi chú: ${billData.orderNote}")
            }

            separator()

            // ============ ITEMS (theo itemDisplayLayout) ============
            renderItemsByLayout(template, billData)

            separator()

            // ============ TOTALS ============
            if (template.showSubtotal) {
                val itemCount = billData.items.size
                lineKeyValue("Tạm tính ($itemCount món):", formatCurrency(billData.subtotal))
            }

            // ============ 4 LOẠI GIẢM GIÁ ============
            if (template.showTotalItemDiscount && billData.itemDiscountAmount > 0) {
                lineKeyValue("${template.itemDiscountLabel}:", "-${formatCurrency(billData.itemDiscountAmount)}")
            }

            if (template.showBillDiscount && billData.billDiscountAmount > 0) {
                val billDiscountText = if (template.showDiscountPercent && billData.billDiscountPercent > 0) {
                    "${template.billDiscountLabel} (${billData.billDiscountPercent.toInt()}%):"
                } else {
                    "${template.billDiscountLabel}:"
                }
                lineKeyValue(billDiscountText, "-${formatCurrency(billData.billDiscountAmount)}")
            }

            if (template.showCouponDiscount && billData.couponDiscountAmount > 0) {
                val couponText = if (billData.couponCode != null) {
                    "${template.couponDiscountLabel} (${billData.couponCode}):"
                } else {
                    "${template.couponDiscountLabel}:"
                }
                lineKeyValue(couponText, "-${formatCurrency(billData.couponDiscountAmount)}")
            }

            if (template.showVoucherDiscount && billData.voucherDiscountAmount > 0) {
                val voucherText = if (billData.voucherCode != null) {
                    "${template.voucherDiscountLabel} (${billData.voucherCode}):"
                } else {
                    "${template.voucherDiscountLabel}:"
                }
                lineKeyValue(voucherText, "-${formatCurrency(billData.voucherDiscountAmount)}")
            }

            if (template.showTotalDiscount && billData.totalDiscountAmount > 0) {
                lineKeyValue("${template.totalDiscountLabel}:", "-${formatCurrency(billData.totalDiscountAmount)}")
            }

            // ============ PHỤ THU ============
            if (billData.surchargeItems.isNotEmpty()) {
                billData.surchargeItems.forEach { item ->
                    val itemText = if (item.quantity > 1) {
                        "Phụ thu: ${item.name} x${item.quantity}"
                    } else {
                        "Phụ thu: ${item.name}"
                    }
                    lineKeyValue(itemText, "+${formatCurrency(item.totalAmount)}")
                }
            } else if (billData.surchargeAmount > 0) {
                lineKeyValue("Phụ thu:", "+${formatCurrency(billData.surchargeAmount)}")
            }

            // ============ PHÍ DỊCH VỤ ============
            if (template.showServiceFee && billData.serviceFee > 0) {
                val serviceFeeText = if (billData.serviceFeePercent > 0) {
                    "Phí dịch vụ (${billData.serviceFeePercent.toInt()}%):"
                } else {
                    "Phí dịch vụ:"
                }
                lineKeyValue(serviceFeeText, formatCurrency(billData.serviceFee))
            }

            // ============ VAT INFO ============
            if (template.showVatDetails) {
                if (template.showPriceBeforeVat) {
                    lineKeyValue("${template.priceBeforeVatLabel}:", formatCurrency(billData.priceBeforeVat))
                }
                if (template.showVat && billData.vatAmount > 0) {
                    lineKeyValue("${template.vatLabel}:", formatCurrency(billData.vatAmount))
                }
                if (template.showPriceAfterVat) {
                    lineKeyValue("${template.priceAfterVatLabel}:", formatCurrency(billData.priceAfterVat))
                }
            } else if (template.showVat && billData.vatAmount > 0) {
                lineKeyValue("${template.vatLabel}:", formatCurrency(billData.vatAmount))
            }

            doubleSeparator()

            // ============ TOTAL ============
            if (billData.isTemporaryBill) {
                lineKeyValue("TỔNG TẠM TÍNH:", formatCurrency(billData.totalAmount), BitmapTextStyle(bold = true))
            } else {
                lineKeyValue("TỔNG CỘNG:", formatCurrency(billData.totalAmount), BitmapTextStyle(bold = true))
            }

            // ============ PAYMENT INFO ============
            if (!billData.isTemporaryBill) {
                if (template.showPaymentMethod) {
                    lineKeyValue("Thanh toán:", billData.paymentMethod)
                }
                if (template.showReceivedAmount && billData.receivedAmount > 0) {
                    lineKeyValue("Tiền khách:", formatCurrency(billData.receivedAmount))
                }
                if (template.showChangeAmount && billData.changeAmount > 0) {
                    lineKeyValue("Tiền thừa:", formatCurrency(billData.changeAmount))
                }
            }

            // ============ QR CODE ============
            if (paymentBankAccount != null) {
                separator()
                val isPayOS = payosQrCode != null && paymentBankAccount.paymentPartner == "payos"
                lineCenter(if (isPayOS) "THANH TOÁN QR" else "THANH TOÁN CHUYỂN KHOẢN")
                lineCenter("Ngân hàng: ${paymentBankAccount.bankName}")
                lineCenter("STK: ${paymentBankAccount.accountNumber}")
                lineCenter("Chủ TK: ${paymentBankAccount.accountName}")
                lineCenter("Số tiền: ${formatCurrency(billData.totalAmount)}")
                val transferContent = paymentBankAccount.generateTransferContent(billData.orderNumber)
                lineCenter("Nội dung: $transferContent")
                feed(1)

                val qrContent = if (isPayOS) {
                    Log.d(TAG, "Using PayOS QR code (length: ${payosQrCode!!.length})")
                    payosQrCode
                } else {
                    val vietQrContent = generateVietQrContent(
                        bankCode = paymentBankAccount.bankCode,
                        accountNumber = paymentBankAccount.accountNumber,
                        amount = billData.totalAmount.toLong(),
                        description = transferContent,
                        accountName = paymentBankAccount.accountName
                    )
                    Log.d(TAG, "SePayVN QR URL: $vietQrContent (length: ${vietQrContent.length})")
                    vietQrContent
                }
                qrCode(qrContent, size = 4)
            } else if (template.showQrCode) {
                when (template.qrCodeType) {
                    "order_id" -> qrCode(billData.orderNumber)
                    "custom" -> qrCode(template.qrCodeContent ?: billData.orderNumber)
                    else -> qrCode(billData.orderNumber)
                }
            }

            // ============ WIFI INFO ============
            if (template.showWifiInfo && template.wifiName != null) {
                separator()
                lineCenter("WiFi: ${template.wifiName} / ${template.wifiPassword ?: ""}")
            }

            // ============ FOOTER ============
            separator()
            if (billData.isTemporaryBill) {
                lineCenter("*** ĐÂY LÀ BILL TẠM ***")
                lineCenter("Vui lòng thanh toán tại quầy")
                lineCenter("để nhận hóa đơn chính thức")
            } else {
                lineCenter(template.thankYouMessage)
                lineCenter(template.comebackMessage)
                template.footerText?.let { lineCenter(it) }
            }

            // Feed giấy để nội dung bill không bị cắt
            // Tăng từ 3 lên 5 dòng để đảm bảo footer không bị dao cắt
            feed(5)
        }

        return builder
    }

    /**
     * In 1 bitmap qua Sunmi với retry logic
     *
     * QUAN TRỌNG: Sử dụng ESC/POS format thay vì native printBitmap
     * vì Sunmi T1's AIDL interface không xử lý đúng Parcelable Bitmap,
     * dẫn đến in ra giấy trắng.
     *
     * Phương pháp: Convert bitmap -> ESC/POS raster format -> sendRAWData
     * Sử dụng GS v 0 (raster bit image) thay vì ESC * (bit image mode)
     * vì GS v 0 tương thích tốt hơn với Sunmi built-in printer.
     *
     * CRITICAL: Sử dụng writeRawOnly() để gửi data liên tục không bị reset buffer.
     * - initPrinter() chỉ gọi 1 lần đầu
     * - writeRawOnly() gửi data KHÔNG init/commit
     * - commitBuffer() gọi 1 lần cuối
     */
    private suspend fun printSunmiBitmapWithRetry(
        adapter: SunmiPrinterAdapter,
        bitmap: Bitmap,
        bitmapIndex: Int,
        totalBitmaps: Int,
        retryCount: Int,
        retryDelayMs: Int
    ): PrinterResult {
        var lastError: String? = null

        Log.d(TAG, "Printing bitmap ${bitmapIndex + 1}/$totalBitmaps via native printBitmap (${bitmap.width}x${bitmap.height})")

        repeat(retryCount) { attempt ->
            // Kiểm tra status trước mỗi lần retry (trừ lần đầu)
            if (attempt > 0) {
                val statusCheck = checkSunmiPrinterStatus(adapter)
                if (statusCheck is PrinterResult.Error) {
                    return statusCheck
                }
            }

            Log.d(TAG, "Sunmi native printBitmap attempt ${attempt + 1}/$retryCount for bitmap ${bitmapIndex + 1}/$totalBitmaps")

            // Sử dụng native printBitmap method của Sunmi
            // Method này sẽ tự động convert bitmap sang grayscale và gọi printBitmapCustom
            val printResult = adapter.printBitmap(bitmap)

            when (printResult) {
                is com.techres.ccb.printer.core.PrinterResult.Success -> {
                    Log.d(TAG, "Bitmap ${bitmapIndex + 1} printed successfully via native printBitmap (${bitmap.width}x${bitmap.height})")

                    // Đợi máy in xử lý bitmap
                    val processingTime = calculateBitmapProcessingTime(bitmap)
                    Log.d(TAG, "Waiting ${processingTime}ms for bitmap processing...")
                    delay(processingTime)

                    return PrinterResult.Success("OK")
                }
                is com.techres.ccb.printer.core.PrinterResult.PartialSuccess -> {
                    Log.d(TAG, "Bitmap ${bitmapIndex + 1} printed with partial success")
                    val processingTime = calculateBitmapProcessingTime(bitmap)
                    delay(processingTime)
                    return PrinterResult.Success("OK")
                }
                is com.techres.ccb.printer.core.PrinterResult.Error -> {
                    lastError = printResult.message
                    Log.w(TAG, "Native printBitmap attempt ${attempt + 1} failed: ${printResult.message}")

                    if (attempt < retryCount - 1) {
                        Log.d(TAG, "Waiting ${retryDelayMs}ms before retry...")
                        delay(retryDelayMs.toLong())
                    }
                }
            }
        }

        return PrinterResult.Error("Lỗi in bitmap ${bitmapIndex + 1}/$totalBitmaps sau $retryCount lần thử: $lastError")
    }

    /**
     * Tính toán thời gian đợi máy in xử lý bitmap dựa trên kích thước
     * LƯU Ý: Giảm delay tối thiểu vì Sunmi tự queue lệnh theo thứ tự,
     * không cần đợi lâu giữa các bitmap
     */
    private fun calculateBitmapProcessingTime(bitmap: Bitmap): Long {
        val pixelCount = bitmap.width * bitmap.height
        return when {
            pixelCount < 100_000 -> 50L      // Bitmap nhỏ: 50ms
            pixelCount < 300_000 -> 100L     // Bitmap trung bình: 100ms
            pixelCount < 500_000 -> 150L     // Bitmap lớn: 150ms
            else -> 200L                      // Bitmap rất lớn: 200ms
        }
    }

    /**
     * In bill qua Network (TCP/IP)
     *
     * SINGLE WRITE (giống phiếu bếp - đã proven hoạt động tốt):
     * - Gửi toàn bộ data trong 1 lệnh write duy nhất
     * - tcpNoDelay = true: Gửi ngay, không đợi Nagle buffer
     * - Delay sau khi gửi để máy in xử lý
     *
     * Mỗi bản copy được in trong kết nối riêng để đảm bảo ổn định
     */
    private suspend fun printViaNetwork(
        config: BillPrinterConfigEntity,
        template: BillTemplateEntity,
        billContent: ByteArray
    ): PrinterResult {
        val ip = config.printerIp ?: return PrinterResult.Error("Chưa cấu hình IP máy in")

        // Sử dụng numberOfCopies từ config (user settings trong app) thay vì template (web-dashboard)
        // Đảm bảo ít nhất 1 bản được in
        val numberOfCopies = maxOf(config.numberOfCopies, 1)
        Log.d(TAG, "=== PRINT VIA NETWORK ===")
        Log.d(TAG, "IP: $ip:${config.printerPort}")
        Log.d(TAG, "Config numberOfCopies: ${config.numberOfCopies}, Template numberOfCopies: ${template.numberOfCopies}")
        Log.d(TAG, "Effective copies: $numberOfCopies")
        Log.d(TAG, "Bill content size: ${billContent.size} bytes")

        // In từng bản trong kết nối riêng
        repeat(numberOfCopies) { copyIndex ->
            Log.d(TAG, "Printing copy ${copyIndex + 1}/$numberOfCopies...")
            val result = printSingleCopy(ip, config.printerPort, config.connectionTimeoutMs, billContent)
            if (result is PrinterResult.Error) {
                Log.e(TAG, "Copy ${copyIndex + 1} failed: ${result.message}")
                return result
            }
            Log.d(TAG, "Copy ${copyIndex + 1} completed successfully")
            // Delay giữa các bản
            if (copyIndex < numberOfCopies - 1) {
                delay(300)
            }
        }

        Log.d(TAG, "=== PRINT VIA NETWORK COMPLETED: $numberOfCopies copies ===")
        return PrinterResult.Success("In bill thành công!")
    }

    /**
     * In bill qua USB Printer
     *
     * Hỗ trợ các máy in USB ESC/POS:
     * - Epson TM-T88, TM-T82
     * - Star TSP143, TSP654
     * - Bixolon SRP-350, SRP-380
     * - Xprinter XP-N160II
     * - Và các máy in USB khác hỗ trợ ESC/POS
     *
     * Flow: get adapter → connect → write bill → disconnect
     */
    private suspend fun printViaUsb(
        config: BillPrinterConfigEntity,
        template: BillTemplateEntity,
        billContent: ByteArray
    ): PrinterResult {
        val adapter = usbAdapter ?: return PrinterResult.Error("USB adapter chưa được khởi tạo")

        val usbPath = config.printerUsbPath

        // Sử dụng numberOfCopies từ config
        val numberOfCopies = maxOf(config.numberOfCopies, 1)
        Log.d(TAG, "=== PRINT VIA USB ===")
        Log.d(TAG, "USB Path: ${usbPath ?: "auto-detect"}")
        Log.d(TAG, "Effective copies: $numberOfCopies")
        Log.d(TAG, "Bill content size: ${billContent.size} bytes")

        try {
            // Tìm và kết nối USB printer
            val connectedPrinters = adapter.getConnectedPrinters()
            Log.d(TAG, "Found ${connectedPrinters.size} USB printers")

            // Nếu có cấu hình usbPath thì tìm theo path, nếu không thì dùng máy in USB đầu tiên
            val targetPrinter = if (!usbPath.isNullOrBlank()) {
                connectedPrinters.find { it.address == usbPath || it.id == usbPath }
                    ?: connectedPrinters.firstOrNull()
            } else {
                connectedPrinters.firstOrNull()
            } ?: return PrinterResult.Error("Không tìm thấy máy in USB. Hãy kiểm tra kết nối cáp USB.")

            Log.d(TAG, "Using USB printer: ${targetPrinter.name} (${targetPrinter.address})")

            // Đăng ký receiver để xử lý permission
            adapter.registerReceiver()

            // Kết nối
            val connectResult = adapter.connect(targetPrinter)
            if (connectResult is PrinterResult.Error) {
                Log.e(TAG, "USB connect failed: ${connectResult.message}")
                return connectResult
            }

            // In từng bản
            repeat(numberOfCopies) { copyIndex ->
                Log.d(TAG, "Printing USB copy ${copyIndex + 1}/$numberOfCopies...")

                val writeResult = adapter.write(billContent)
                if (writeResult is PrinterResult.Error) {
                    Log.e(TAG, "USB write failed: ${writeResult.message}")
                    adapter.disconnect()
                    return writeResult
                }

                Log.d(TAG, "USB copy ${copyIndex + 1} completed")

                // Delay giữa các bản
                if (copyIndex < numberOfCopies - 1) {
                    delay(500)
                }
            }

            // Ngắt kết nối
            adapter.disconnect()

            Log.d(TAG, "=== PRINT VIA USB COMPLETED: $numberOfCopies copies ===")
            return PrinterResult.Success("In bill USB thành công!")

        } catch (e: Exception) {
            Log.e(TAG, "USB print error: ${e.message}", e)
            try {
                adapter.disconnect()
            } catch (ignored: Exception) {}
            return PrinterResult.Error("Lỗi in USB: ${e.message}")
        }
    }

    /**
     * In 1 bản bill qua Network
     *
     * SINGLE WRITE (giống phiếu bếp - đã proven hoạt động tốt):
     * - Gửi toàn bộ data trong 1 lệnh write duy nhất
     * - tcpNoDelay = true để gửi ngay, không buffer
     * - Delay sau khi gửi xong để máy in xử lý
     *
     * Flow: connect → single write → flush → delay → close
     */
    private suspend fun printSingleCopy(
        ip: String,
        port: Int,
        timeoutMs: Int,
        content: ByteArray
    ): PrinterResult {
        var socket: Socket? = null
        var outputStream: OutputStream? = null

        Log.d(TAG, "=== START PRINT BILL (NETWORK - SINGLE WRITE) ===")
        Log.d(TAG, "Target: $ip:$port")
        Log.d(TAG, "Content size: ${content.size} bytes")

        return try {
            Log.d(TAG, "Creating socket...")
            socket = Socket().apply {
                reuseAddress = true
                keepAlive = true
                // tcpNoDelay = true: Gửi ngay, không đợi Nagle buffer (giống phiếu bếp)
                tcpNoDelay = true
                setSoLinger(true, 2)
            }

            Log.d(TAG, "Connecting to $ip:$port...")
            socket.connect(InetSocketAddress(ip, port), timeoutMs)
            Log.d(TAG, "Connected successfully!")

            outputStream = socket.getOutputStream()
            Log.d(TAG, "Got output stream, writing ${content.size} bytes...")

            // SINGLE WRITE: Gửi toàn bộ data trong 1 lần (giống phiếu bếp)
            outputStream.write(content)
            Log.d(TAG, "Write completed, flushing...")
            outputStream.flush()
            Log.d(TAG, "Flush completed!")

            // Đợi máy in xử lý xong bitmap data
            // Bill có nhiều content hơn phiếu bếp nên cần thời gian lâu hơn
            Log.d(TAG, "Waiting 800ms for printer to process...")
            delay(800)

            Log.d(TAG, "=== PRINT BILL SUCCESS (SINGLE WRITE) ===")
            PrinterResult.Success("OK")
        } catch (e: Exception) {
            Log.e(TAG, "=== PRINT BILL FAILED ===")
            Log.e(TAG, "Error type: ${e.javaClass.simpleName}")
            Log.e(TAG, "Error message: ${e.message}")
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

    /**
     * Generate bill content với Hybrid approach
     * Sử dụng paperWidth, fontSize, lineSpacing từ printerConfig (user cài đặt trong app)
     * Các config hiển thị (labels, show flags) từ template (web dashboard)
     */
    private fun generateHybridBill(
        printerConfig: BillPrinterConfigEntity,
        template: BillTemplateEntity,
        billData: BillData,
        capability: PrinterCapability,
        paymentBankAccount: BankAccountEntity? = null,
        payosQrCode: String? = null
    ): ByteArray {
        // Luôn dùng bitmap mode để đảm bảo tiếng Việt hiển thị đúng
        val useBitmapMode = !capability.supportVietnameseUtf8

        // Sử dụng settings từ printerConfig (user đã cài đặt trong app)
        // printerConfig chứa: paperWidth, fontSize, lineSpacing, numberOfCopies, cutPaper, etc.
        val paperWidth = printerConfig.paperWidth
        val fontSize = printerConfig.fontSize
        val lineSpacing = printerConfig.lineSpacing

        Log.d(TAG, "Bill settings from printerConfig: paperWidth=${paperWidth}mm, fontSize=$fontSize, lineSpacing=$lineSpacing")

        // Sử dụng Single Canvas Rendering nếu được bật (mặc định ON)
        return if (useSingleCanvasRendering && useBitmapMode) {
            Log.d(TAG, "Using SINGLE CANVAS RENDERING mode")
            generateBillWithSingleCanvas(paperWidth, fontSize, lineSpacing, template, billData, paymentBankAccount, payosQrCode)
        } else {
            Log.d(TAG, "Using LEGACY per-line rendering mode")
            generateBillFromConfig(paperWidth, fontSize, lineSpacing, template, billData, useBitmapMode, paymentBankAccount, payosQrCode)
        }
    }

    /**
     * Generate bill sử dụng Single Canvas Rendering
     *
     * SINGLE CANVAS RENDERING:
     * - Render toàn bộ bill trên 1 canvas/bitmap duy nhất
     * - Giảm GC pressure (chỉ tạo 1 bitmap lớn thay vì nhiều bitmap nhỏ)
     * - In mượt hơn (gửi 1 khối data liên tục)
     * - Line spacing chính xác và đồng nhất
     * - Tránh jitter do timing giữa các bitmap renders
     */
    private fun generateBillWithSingleCanvas(
        paperWidth: Int,
        fontSize: String,
        lineSpacing: Float,
        template: BillTemplateEntity,
        billData: BillData,
        paymentBankAccount: BankAccountEntity? = null,
        payosQrCode: String? = null
    ): ByteArray {
        Log.d(TAG, "Generating bill with SINGLE CANVAS: ${billData.displayNumber}, ${billData.items.size} items")

        // Sử dụng shared method để build nội dung bill vào builder
        val builder = buildBillContentToBuilder(
            paperWidth, fontSize, lineSpacing, template, billData, paymentBankAccount, payosQrCode
        )

        // Thêm barcode nếu cần (chỉ cho ESC/POS, không hỗ trợ trong bitmap mode)
        builder.apply {
            if (template.showBarcode) {
                barcode(billData.orderNumber)
            }

            // ============ PRINTER ACTIONS ============
            feed(2) // Thêm feed để nội dung không bị cắt
            if (template.cutPaper) {
                cut()
            }
            if (template.openCashDrawer) {
                openCashDrawer()
            }
            if (template.beepAfterPrint) {
                beep()
            }
        }

        return builder.build()
    }

    /**
     * Generate bill theo đúng config
     * paperWidth, fontSize, lineSpacing: Lấy từ printerConfig (được user chọn trong app)
     * template: Chứa các config hiển thị labels, show flags (từ web dashboard)
     *
     * Format y chang web-dashboard preview:
     * - 4 loại giảm giá với label từ template config
     * - Time tracking (giờ vào/ra)
     * - Variants và toppings riêng biệt
     */
    private fun generateBillFromConfig(
        paperWidth: Int,
        fontSize: String,
        lineSpacing: Float,
        template: BillTemplateEntity,
        billData: BillData,
        useBitmapMode: Boolean,
        paymentBankAccount: BankAccountEntity? = null,
        payosQrCode: String? = null
    ): ByteArray {
        // Minimal logging for performance (chi tiết logging đã được disable để in mượt hơn)
        Log.d(TAG, "Generating bill: ${billData.displayNumber}, ${billData.items.size} items, $paperWidth mm, bitmap=$useBitmapMode")

        // Chuyển đổi fontSize từ string sang fontScale float
        // Sử dụng fontSize từ printerConfig (user đã chọn trong app)
        val fontScale = when (fontSize) {
            "extra_small" -> 0.7f
            "small" -> 0.85f
            "large" -> 1.2f
            "extra_large" -> 1.4f
            else -> 1.0f // normal/medium
        }

        // Sử dụng GS v 0 (raster bitmap) thay vì ESC * để tránh khoảng trắng thừa
        // GS v 0 gửi toàn bộ bitmap trong 1 lệnh, không có LF giữa các strip
        // Điều này giúp loại bỏ hoàn toàn vấn đề line spacing giữa các bitmap
        // (Giống cách in phiếu bếp đã được fix)
        val useRasterBitmap = true

        val builder = HybridBillBuilder(
            paperWidth = paperWidth,
            useBitmapMode = useBitmapMode,
            useRasterBitmap = useRasterBitmap,
            fontScale = fontScale,
            lineSpacing = lineSpacing, // Sử dụng lineSpacing từ template (web-dashboard)
            separatorChar = template.separatorChar.firstOrNull() ?: '-',
            doubleSeparatorChar = template.doubleSeparatorChar.firstOrNull() ?: '='
        )

        builder.apply {
            init()

            // ============ HEADER ============
            lineDouble(template.storeName, BitmapTextStyle(centerAlign = true))

            template.storeAddress?.let { lineCenter(it) }
            template.storePhone?.let { lineCenter("ĐT: $it") }
            template.taxCode?.let { lineCenter("MST: $it") }
            template.headerText?.let { lineCenter(it) }

            doubleSeparator()

            // ============ BILL TITLE - Phân biệt bill tạm và bill chính thức ============
            if (billData.isTemporaryBill) {
                // Bill tạm - hiển thị khác biệt
                lineDouble("*** BILL TẠM ***", BitmapTextStyle(centerAlign = true))
                doubleSeparator()

                // Hiển thị thông tin lần in và thời gian
                lineCenter("Lần in thứ: ${billData.printCount}")
                billData.printTime?.let { printTime ->
                    val timeFormat = SimpleDateFormat("HH:mm:ss dd/MM/yyyy", Locale.getDefault()).apply {
                        timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
                    }
                    lineCenter("Thời gian in: ${timeFormat.format(printTime)}")
                }
                lineCenter("(Chưa thanh toán)")

                separator()
            } else if (billData.isReprint) {
                // Bill in lại - đánh dấu rõ ràng để tránh gian lận
                lineDouble("*** BẢN SAO ***", BitmapTextStyle(centerAlign = true))
                lineDouble("*** IN LẠI ***", BitmapTextStyle(centerAlign = true))
                doubleSeparator()

                // Hiển thị thời gian in lại
                billData.reprintTime?.let { reprintTime ->
                    val timeFormat = SimpleDateFormat("HH:mm:ss dd/MM/yyyy", Locale.getDefault()).apply {
                        timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
                    }
                    lineCenter("Thời gian in lại: ${timeFormat.format(reprintTime)}")
                }
                billData.reprintReason?.let { reason ->
                    lineCenter("Lý do: $reason")
                }
                lineCenter("(Đây không phải bill gốc)")

                separator()
                lineDouble(template.billTitle, BitmapTextStyle(centerAlign = true))
                doubleSeparator()
            } else {
                // Bill chính thức
                lineDouble(template.billTitle, BitmapTextStyle(centerAlign = true))
                doubleSeparator()
            }

            // ============ ORDER INFO ============
            if (template.showOrderNumber) {
                line("Mã đơn: ${billData.displayNumber}")
            }
            if (template.showTableName && billData.tableName != null) {
                line("Bàn: ${billData.tableName}")
            }
            // Pager number (Thẻ rung)
            if (billData.pagerNumber != null) {
                lineBold("Thẻ rung: ${billData.pagerNumber}")
            }
            if (template.showStaffName && billData.staffName != null) {
                line("NV: ${billData.staffName}")
            }
            if (template.showCustomerName && billData.customerName != null) {
                line("Khách hàng: ${billData.customerName}")
            }
            if (template.showDateTime) {
                val dateFormat = SimpleDateFormat(template.dateFormat, Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
                }
                line("Giờ: ${dateFormat.format(billData.orderDate)}")
            }

            // ============ TIME TRACKING (theo config) ============
            if (template.showCheckInTime && billData.checkInTime != null) {
                val timeFormat = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
                }
                line("${template.checkInLabel}: ${timeFormat.format(billData.checkInTime)}")
            }
            if (template.showCheckOutTime && billData.checkOutTime != null) {
                val timeFormat = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
                }
                line("${template.checkOutLabel}: ${timeFormat.format(billData.checkOutTime)}")
            }

            // ============ ORDER NOTE - Ghi chú đơn hàng (theo config) ============
            if (template.showOrderNote && billData.orderNote != null && billData.orderNote.isNotBlank()) {
                lineItalic("Ghi chú: ${billData.orderNote}")
            }

            separator()

            // ============ ITEMS (theo itemDisplayLayout) ============
            renderItemsByLayout(template, billData)

            separator()

            // ============ TOTALS - TỔNG KẾT ============
            // 1. Tạm tính với số lượng món
            if (template.showSubtotal) {
                val itemCount = billData.items.size
                lineKeyValue("Tạm tính ($itemCount món):", formatCurrency(billData.subtotal))
            }

            // ============ 4 LOẠI GIẢM GIÁ (theo đúng config web-dashboard) ============
            // 1. Giảm giá món (Item Discount) - dùng label từ template
            if (template.showTotalItemDiscount && billData.itemDiscountAmount > 0) {
                lineKeyValue("${template.itemDiscountLabel}:", "-${formatCurrency(billData.itemDiscountAmount)}")
            }

            // 2. Giảm giá hóa đơn (Bill Discount) - dùng label từ template
            if (template.showBillDiscount && billData.billDiscountAmount > 0) {
                val billDiscountText = if (template.showDiscountPercent && billData.billDiscountPercent > 0) {
                    "${template.billDiscountLabel} (${billData.billDiscountPercent.toInt()}%):"
                } else {
                    "${template.billDiscountLabel}:"
                }
                lineKeyValue(billDiscountText, "-${formatCurrency(billData.billDiscountAmount)}")
            }

            // 3. Coupon - dùng label từ template + mã coupon
            if (template.showCouponDiscount && billData.couponDiscountAmount > 0) {
                val couponText = if (billData.couponCode != null) {
                    "${template.couponDiscountLabel} (${billData.couponCode}):"
                } else {
                    "${template.couponDiscountLabel}:"
                }
                lineKeyValue(couponText, "-${formatCurrency(billData.couponDiscountAmount)}")
            }

            // 4. Voucher - dùng label từ template + mã voucher
            if (template.showVoucherDiscount && billData.voucherDiscountAmount > 0) {
                val voucherText = if (billData.voucherCode != null) {
                    "${template.voucherDiscountLabel} (${billData.voucherCode}):"
                } else {
                    "${template.voucherDiscountLabel}:"
                }
                lineKeyValue(voucherText, "-${formatCurrency(billData.voucherDiscountAmount)}")
            }

            // 5. Tổng giảm giá (nếu có nhiều loại giảm giá)
            if (template.showTotalDiscount && billData.totalDiscountAmount > 0) {
                lineKeyValue("${template.totalDiscountLabel}:", "-${formatCurrency(billData.totalDiscountAmount)}")
            }

            // ============ PHỤ THU (CHI TIẾT) ============
            if (billData.surchargeItems.isNotEmpty()) {
                // Hiển thị từng món phụ thu
                billData.surchargeItems.forEach { item ->
                    val itemText = if (item.quantity > 1) {
                        "Phụ thu: ${item.name} x${item.quantity}"
                    } else {
                        "Phụ thu: ${item.name}"
                    }
                    lineKeyValue(itemText, "+${formatCurrency(item.totalAmount)}")
                }
            } else if (billData.surchargeAmount > 0) {
                // Fallback: nếu không có chi tiết, hiển thị tổng
                lineKeyValue("Phụ thu:", "+${formatCurrency(billData.surchargeAmount)}")
            }

            // ============ PHÍ DỊCH VỤ ============
            if (template.showServiceFee && billData.serviceFee > 0) {
                val serviceFeeText = if (billData.serviceFeePercent > 0) {
                    "Phí dịch vụ (${billData.serviceFeePercent.toInt()}%):"
                } else {
                    "Phí dịch vụ:"
                }
                lineKeyValue(serviceFeeText, formatCurrency(billData.serviceFee))
            }

            // ============ VAT INFO (theo config) ============
            if (template.showVatDetails) {
                if (template.showPriceBeforeVat) {
                    lineKeyValue("${template.priceBeforeVatLabel}:", formatCurrency(billData.priceBeforeVat))
                }
                if (template.showVat && billData.vatAmount > 0) {
                    lineKeyValue("${template.vatLabel}:", formatCurrency(billData.vatAmount))
                }
                if (template.showPriceAfterVat) {
                    lineKeyValue("${template.priceAfterVatLabel}:", formatCurrency(billData.priceAfterVat))
                }
            } else if (template.showVat && billData.vatAmount > 0) {
                // Chỉ hiện VAT nếu không hiện chi tiết
                lineKeyValue("${template.vatLabel}:", formatCurrency(billData.vatAmount))
            }

            doubleSeparator()

            // ============ TOTAL - TỔNG CỘNG ============
            // Font size sẽ được tự động scale trong lineKeyValue với bold = true
            if (billData.isTemporaryBill) {
                lineKeyValue("TỔNG TẠM TÍNH:", formatCurrency(billData.totalAmount), BitmapTextStyle(bold = true))
            } else {
                lineKeyValue("TỔNG CỘNG:", formatCurrency(billData.totalAmount), BitmapTextStyle(bold = true))
            }

            // ============ PAYMENT INFO (chỉ hiển thị cho bill chính thức) ============
            if (!billData.isTemporaryBill) {
                if (template.showPaymentMethod) {
                    lineKeyValue("Thanh toán:", billData.paymentMethod)
                }
                if (template.showReceivedAmount && billData.receivedAmount > 0) {
                    lineKeyValue("Tiền khách:", formatCurrency(billData.receivedAmount))
                }
                if (template.showChangeAmount && billData.changeAmount > 0) {
                    lineKeyValue("Tiền thừa:", formatCurrency(billData.changeAmount))
                }
            }

            // ============ QR CODE ============
            // Nếu có paymentBankAccount -> luôn in QR thanh toán (cho cả bill tạm và bill chính thức)
            // Ngược lại -> in QR theo cài đặt template
            if (paymentBankAccount != null) {
                // Có tài khoản ngân hàng - LUÔN in QR code thanh toán
                separator()
                val isPayOS = payosQrCode != null && paymentBankAccount.paymentPartner == "payos"
                lineCenter(if (isPayOS) "THANH TOÁN QR" else "THANH TOÁN CHUYỂN KHOẢN", BitmapTextStyle(bold = true))
                lineCenter("Ngân hàng: ${paymentBankAccount.bankName}")
                lineCenter("STK: ${paymentBankAccount.accountNumber}")
                lineCenter("Chủ TK: ${paymentBankAccount.accountName}")
                lineCenter("Số tiền: ${formatCurrency(billData.totalAmount)}")
                val transferContent = paymentBankAccount.generateTransferContent(billData.orderNumber)
                lineCenter("Nội dung: $transferContent")
                feed(1)

                // Sử dụng PayOS QR nếu có, ngược lại dùng VietQR
                val qrContent = if (isPayOS) {
                    Log.d(TAG, "Using PayOS QR code (length: ${payosQrCode!!.length})")
                    payosQrCode
                } else {
                    // Tạo VietQR content sử dụng SePayVN
                    val vietQrContent = generateVietQrContent(
                        bankCode = paymentBankAccount.bankCode,
                        accountNumber = paymentBankAccount.accountNumber,
                        amount = billData.totalAmount.toLong(),
                        description = transferContent,
                        accountName = paymentBankAccount.accountName
                    )
                    vietQrContent
                }
                qrCode(qrContent, size = 4)
            } else if (template.showQrCode) {
                // Không có bank account - in QR theo cài đặt template
                when (template.qrCodeType) {
                    "order_id" -> qrCode(billData.orderNumber)
                    "custom" -> qrCode(template.qrCodeContent ?: billData.orderNumber)
                    else -> qrCode(billData.orderNumber)
                }
            }

            // ============ BARCODE (theo config) ============
            if (template.showBarcode) {
                // Bỏ feed(1) để tiết kiệm giấy
                barcode(billData.orderNumber)
            }

            // ============ WIFI INFO (theo config) ============
            if (template.showWifiInfo && template.wifiName != null) {
                separator()
                lineCenter("WiFi: ${template.wifiName} / ${template.wifiPassword ?: ""}")
            }

            // ============ FOOTER ============
            separator()
            if (billData.isTemporaryBill) {
                // Footer cho bill tạm
                lineCenter("*** ĐÂY LÀ BILL TẠM ***")
                lineCenter("Vui lòng thanh toán tại quầy")
                lineCenter("để nhận hóa đơn chính thức")
            } else {
                // Footer cho bill chính thức
                lineCenter(template.thankYouMessage)
                lineCenter(template.comebackMessage)
                template.footerText?.let { lineCenter(it) }
            }

            // ============ PRINTER ACTIONS ============
            // Feed đủ để footer không bị cắt (5 dòng để đảm bảo "Hẹn gặp lại" không bị mất)
            feed(5)
            if (template.cutPaper) {
                cut()
            }
            if (template.openCashDrawer) {
                openCashDrawer()
            }
            if (template.beepAfterPrint) {
                beep()
            }
        }

        return builder.build()
    }

    /**
     * Format currency (VND)
     */
    private fun formatCurrency(amount: Double): String {
        return "${currencyFormat.format(amount)}đ"
    }

    private fun formatCurrency(amount: Long): String {
        return "${currencyFormat.format(amount)}đ"
    }

    /**
     * Generate VietQR content for payment QR code
     *
     * Sử dụng VietQR URL format - đơn giản và tương thích với tất cả app ngân hàng
     * Khi scan QR, app ngân hàng sẽ mở URL và tự động điền thông tin chuyển khoản
     *
     * @param bankBin BIN code của ngân hàng (970407 cho Techcombank, 970436 cho Vietcombank, etc.)
     * @param accountNumber Số tài khoản
     * @param amount Số tiền (VND)
     * @param description Nội dung chuyển khoản
     * @param accountName Tên chủ tài khoản (optional)
     */
    private fun generateVietQrContent(
        bankCode: String,
        accountNumber: String,
        amount: Long,
        description: String,
        accountName: String = ""
    ): String {
        // Sử dụng SePayVN QR URL format
        // Format: https://qr.sepay.vn/img?bank={BANK_CODE}&acc={ACCOUNT}&template=compact&amount={AMOUNT}&des={DESCRIPTION}

        // Lấy tên ngân hàng từ bank code
        val bankName = getBankNameFromCode(bankCode)

        // Chỉ lấy mã đơn hàng từ description (bỏ tiếng Việt có dấu)
        val orderCode = description.replace(Regex("[^A-Za-z0-9#-]"), "").take(25)

        // Xây dựng URL theo format sepay.vn
        return "https://qr.sepay.vn/img?bank=$bankName&acc=$accountNumber&template=compact&amount=$amount&des=$orderCode"
    }

    /**
     * Map bank code to bank name for SePayVN
     */
    private fun getBankNameFromCode(bankCode: String): String {
        return when (bankCode.uppercase()) {
            "TCB", "TECHCOMBANK" -> "Techcombank"
            "VCB", "VIETCOMBANK" -> "Vietcombank"
            "BIDV" -> "BIDV"
            "VTB", "VIETINBANK", "CTG" -> "Vietinbank"
            "ACB" -> "ACB"
            "MB", "MBBANK", "MBB" -> "MBBank"
            "TPB", "TPBANK" -> "TPBank"
            "STB", "SACOMBANK" -> "Sacombank"
            "HDB", "HDBANK" -> "HDBank"
            "VPB", "VPBANK" -> "VPBank"
            "SHB" -> "SHB"
            "MSB", "MARITIMEBANK" -> "MSB"
            "EIB", "EXIMBANK" -> "Eximbank"
            "LPB", "LIENVIETPOSTBANK" -> "LienVietPostBank"
            "OCB" -> "OCB"
            "NAB", "NAMABANK" -> "NamABank"
            "NCB" -> "NCB"
            "SEAB", "SEABANK" -> "SeABank"
            "ABB", "ABBANK" -> "ABBank"
            "BAB", "BACABANK" -> "BacABank"
            "PGB", "PGBANK" -> "PGBank"
            "VIB" -> "VIB"
            "KLB", "KIENLONGBANK" -> "KienLongBank"
            "SCB" -> "SCB"
            "AGRIBANK", "AGR" -> "Agribank"
            "VBSP" -> "VBSP"
            else -> bankCode // Fallback to original code
        }
    }

    /**
     * Map bank code to VietQR BIN code
     * BIN code được sử dụng trong VietQR URL format
     *
     * Danh sách BIN code phổ biến: https://www.vietqr.io/danh-sach-ngan-hang
     */
    private fun getBankBinFromCode(bankCode: String): String? {
        return when (bankCode.uppercase()) {
            // Ngân hàng thương mại cổ phần
            "TCB", "TECHCOMBANK" -> "970407"
            "VCB", "VIETCOMBANK" -> "970436"
            "BIDV" -> "970418"
            "VTB", "VIETINBANK" -> "970415"
            "ACB" -> "970416"
            "MB", "MBBANK", "MBB" -> "970422"
            "TPB", "TPBANK" -> "970423"
            "STB", "SACOMBANK" -> "970403"
            "HDB", "HDBANK" -> "970437"
            "VPB", "VPBANK" -> "970432"
            "SHB" -> "970443"
            "MSB", "MARITIMEBANK" -> "970426"
            "EIB", "EXIMBANK" -> "970431"
            "LPB", "LIENVIETPOSTBANK" -> "970449"
            "OCB" -> "970448"
            "NAB", "NAMABANK" -> "970428"
            "NCB" -> "970419"
            "SEAB", "SEABANK" -> "970440"
            "ABB", "ABBANK" -> "970425"
            "BAB", "BACABANK" -> "970409"
            "PGB", "PGBANK" -> "970430"
            "VIB" -> "970441"
            "KLB", "KIENLONGBANK" -> "970452"
            "SCB" -> "970429"
            "VBSP" -> "970405"
            "AGRIBANK", "AGR" -> "970405"

            // Ví điện tử
            "MOMO" -> "momo"
            "ZALOPAY" -> "zalopay"
            "VNPAY" -> "vnpay"

            else -> null
        }
    }

    /**
     * In riêng mã QR thanh toán cho khách hàng
     *
     * Phiếu QR thanh toán gồm:
     * - Tiêu đề "THANH TOÁN CHUYỂN KHOẢN"
     * - Thông tin ngân hàng
     * - Số tiền cần thanh toán
     * - Mã QR thanh toán (có logo ngân hàng từ SePayVN)
     * - Nội dung chuyển khoản
     */
    suspend fun printPaymentQrCode(
        printerConfig: BillPrinterConfigEntity,
        bankAccount: BankAccountEntity,
        amount: Long,
        orderNumber: String,
        storeName: String = "",
        copies: Int = 1
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            Log.d(TAG, "=== PRINT PAYMENT QR CODE ===")
            Log.d(TAG, "Bank: ${bankAccount.bankName} - ${bankAccount.accountNumber}")
            Log.d(TAG, "Amount: $amount, Order: $orderNumber")

            // Tạo nội dung chuyển khoản
            val transferContent = bankAccount.generateTransferContent(orderNumber)

            // Tạo URL QR code từ SePayVN
            val qrUrl = generateVietQrContent(
                bankCode = bankAccount.bankCode,
                accountNumber = bankAccount.accountNumber,
                amount = amount,
                description = transferContent,
                accountName = bankAccount.accountName
            )
            Log.d(TAG, "QR URL: $qrUrl")

            // Compute font scale from fontSize setting
            val fontScale = when (printerConfig.fontSize) {
                "extra_small" -> 0.7f
                "small" -> 0.85f
                "normal" -> 1.0f
                "large" -> 1.15f
                "extra_large" -> 1.3f
                else -> 1.0f
            }

            // Build phiếu QR thanh toán
            val builder = HybridBillBuilder(
                paperWidth = printerConfig.paperWidth,
                useBitmapMode = true,
                useRasterBitmap = false, // Default: use ESC * for better compatibility
                fontScale = fontScale,
                lineSpacing = printerConfig.lineSpacing
            )

            val content = builder.apply {
                init()

                // Chỉ in mã QR thanh toán (tiết kiệm giấy)
                feed(1)
                qrCode(qrUrl, size = 8)
                feed(6) // Đủ khoảng cách để QR không bị cắt
                cut()
            }.build()

            // In phiếu
            if (printerConfig.connectionType == "sunmi") {
                // Sunmi built-in printer
                val adapter = sunmiAdapter
                if (adapter == null) {
                    return@withContext PrinterResult.Error("Sunmi adapter chưa được khởi tạo")
                }

                repeat(copies) { copy ->
                    val result = adapter.write(content)
                    if (result is PrinterResult.Error) {
                        Log.e(TAG, "Sunmi print error: ${result.message}")
                        return@withContext result
                    }
                    if (copy < copies - 1) delay(500)
                }
                PrinterResult.Success("In QR thanh toán thành công!")
            } else {
                // Network printer
                val ip = printerConfig.printerIp
                val port = printerConfig.printerPort

                if (ip.isNullOrBlank()) {
                    return@withContext PrinterResult.Error("Chưa cấu hình IP máy in")
                }

                repeat(copies) { copy ->
                    val result = printToNetworkPrinter(ip, port, content)
                    if (result is PrinterResult.Error) {
                        return@withContext result
                    }
                    if (copy < copies - 1) delay(500)
                }
                PrinterResult.Success("In QR thanh toán thành công!")
            }
        }
    }

    /**
     * In mã QR PayOS cho thanh toán
     *
     * Phiếu QR PayOS gồm:
     * - Mã QR chứa EMVCo data từ PayOS
     * - Khi quét bằng app ngân hàng sẽ thanh toán trực tiếp
     *
     * @param qrData EMVCo QR data (not checkout URL) - this is what banking apps scan
     */
    suspend fun printPayosQrCode(
        printerConfig: BillPrinterConfigEntity,
        qrData: String,
        amount: Long,
        orderCode: Long,
        copies: Int = 1
    ): PrinterResult {
        return withContext(Dispatchers.IO) {
            Log.d(TAG, "=== PRINT PAYOS QR CODE ===")
            Log.d(TAG, "QR Data (EMVCo): ${qrData.take(50)}...")
            Log.d(TAG, "Amount: $amount, OrderCode: $orderCode")

            // Compute font scale from fontSize setting
            val fontScale = when (printerConfig.fontSize) {
                "extra_small" -> 0.7f
                "small" -> 0.85f
                "normal" -> 1.0f
                "large" -> 1.15f
                "extra_large" -> 1.3f
                else -> 1.0f
            }

            // Build phiếu QR PayOS
            val builder = HybridBillBuilder(
                paperWidth = printerConfig.paperWidth,
                useBitmapMode = true,
                useRasterBitmap = false,
                fontScale = fontScale,
                lineSpacing = printerConfig.lineSpacing
            )

            val content = builder.apply {
                init()

                // In mã QR PayOS (EMVCo data - app ngân hàng scan trực tiếp)
                feed(1)
                qrCode(qrData, size = 8)
                feed(6) // Đủ khoảng cách để QR không bị cắt
                cut()
            }.build()

            // In phiếu
            if (printerConfig.connectionType == "sunmi") {
                // Sunmi built-in printer
                val adapter = sunmiAdapter
                if (adapter == null) {
                    return@withContext PrinterResult.Error("Sunmi adapter chưa được khởi tạo")
                }

                repeat(copies) { copy ->
                    val result = adapter.write(content)
                    if (result is PrinterResult.Error) {
                        Log.e(TAG, "Sunmi print error: ${result.message}")
                        return@withContext result
                    }
                    if (copy < copies - 1) delay(500)
                }
                PrinterResult.Success("In QR PayOS thành công!")
            } else {
                // Network printer
                val ip = printerConfig.printerIp
                val port = printerConfig.printerPort

                if (ip.isNullOrBlank()) {
                    return@withContext PrinterResult.Error("Chưa cấu hình IP máy in")
                }

                repeat(copies) { copy ->
                    val result = printToNetworkPrinter(ip, port, content)
                    if (result is PrinterResult.Error) {
                        return@withContext result
                    }
                    if (copy < copies - 1) delay(500)
                }
                PrinterResult.Success("In QR PayOS thành công!")
            }
        }
    }

    /**
     * In QR thanh toán qua network printer
     */
    private suspend fun printToNetworkPrinter(
        ip: String,
        port: Int,
        content: ByteArray,
        maxRetries: Int = 3
    ): PrinterResult {
        var lastError: String? = null

        repeat(maxRetries) { attempt ->
            var socket: Socket? = null
            var outputStream: OutputStream? = null
            try {
                socket = Socket().apply {
                    reuseAddress = true
                    keepAlive = true
                    tcpNoDelay = true
                    setSoLinger(true, 2)
                }
                socket.connect(InetSocketAddress(ip, port), 5000)

                outputStream = socket.getOutputStream()
                outputStream.write(content)
                outputStream.flush()

                delay(300)

                return PrinterResult.Success("In thành công!")

            } catch (e: Exception) {
                lastError = e.message
                Log.e(TAG, "Print attempt ${attempt + 1} failed: ${e.message}")

                if (attempt < maxRetries - 1) {
                    delay(500L * (attempt + 1))
                }
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

        return PrinterResult.Error("Lỗi in: $lastError")
    }

    // ============ ITEM LAYOUT RENDERING HELPERS ============

    /**
     * Render items theo layout type được chọn
     * Hỗ trợ 15 layouts:
     * - standard: Tên món + xSL + Giá (mặc định)
     * - compact: Tên món xSL Giá (thu gọn, không indent)
     * - detailed: Chi tiết với đơn giá và thành tiền riêng
     * - two_line: Dòng 1: Tên món, Dòng 2: SL x Đơn giá = Thành tiền
     * - price_right: Tên món bên trái, giá căn phải
     * - with_index: Có số thứ tự: 1. Tên món xSL Giá
     * - grouped: Nhóm theo category (nếu có)
     * - grid_2_col: 2 cột (món ngắn)
     * - minimal: Chỉ tên và số lượng
     * - dotted: Dấu chấm nối tên và giá
     * - boxed: Có viền box cho mỗi món
     * - table: Bảng Món | SL | Giá
     * - table_stt: Bảng STT | Món | SL | Giá
     * - table_qty_first: Bảng SL | Món | Giá
     * - table_full: Bảng STT | Món | SL | Đơn giá | Thành tiền
     */
    private fun SingleCanvasBillBuilder.renderItemsByLayout(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        Log.d(TAG, "Rendering items with layout: ${template.itemDisplayLayout}")
        when (template.itemDisplayLayout) {
            "compact" -> renderItemsCompact(template, billData)
            "detailed" -> renderItemsDetailed(template, billData)
            "two_line" -> renderItemsTwoLine(template, billData)
            "price_right" -> renderItemsPriceRight(template, billData)
            "with_index" -> renderItemsWithIndex(template, billData)
            "grouped" -> renderItemsGrouped(template, billData)
            "grid_2_col" -> renderItemsGrid2Col(template, billData)
            "minimal" -> renderItemsMinimal(template, billData)
            "dotted" -> renderItemsDotted(template, billData)
            "boxed" -> renderItemsBoxed(template, billData)
            "table" -> renderItemsAsTable(template, billData)
            "table_stt" -> renderItemsAsTableWithSTT(template, billData)
            "table_qty_first" -> renderItemsAsTableQtyFirst(template, billData)
            "table_full" -> renderItemsAsTableFull(template, billData)
            else -> renderItemsStandard(template, billData) // standard
        }
    }

    /**
     * Layout: STANDARD (mặc định)
     * Format: Tên món     xSL  Giá
     */
    private fun SingleCanvasBillBuilder.renderItemsStandard(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEach { item ->
            val toppingTotal = item.variants.sumOf { it.priceAdjustment } +
                    item.toppings.sumOf { it.price * it.quantity }
            val basePrice = if (toppingTotal > 0 && item.originalPrice > 0) {
                (item.originalPrice - toppingTotal).coerceAtLeast(0.0)
            } else {
                item.originalPrice
            }

            val quantityPart = if (template.showQuantity) "x${item.quantity}" else ""
            val pricePart = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""

            if (quantityPart.isNotEmpty() && pricePart.isNotEmpty()) {
                lineKeyValue(item.name, "$quantityPart  $pricePart", BitmapTextStyle(bold = true))
            } else if (quantityPart.isNotEmpty()) {
                lineKeyValue(item.name, quantityPart, BitmapTextStyle(bold = true))
            } else if (pricePart.isNotEmpty()) {
                lineKeyValue(item.name, pricePart, BitmapTextStyle(bold = true))
            } else {
                lineBold(item.name)
            }

            // Giá gốc nếu có topping
            if (template.showUnitPrice && basePrice > 0 && toppingTotal > 0) {
                line("   ${formatCurrency(basePrice)}")
            }

            // Variants
            renderItemVariants(template, item)

            // Toppings
            renderItemToppings(template, item)

            // Item code, note, discount
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: TABLE
     * Format: Món        | SL | Giá
     * Sử dụng lineTable với pixel-based column widths để fill chính xác theo khổ giấy
     */
    private fun SingleCanvasBillBuilder.renderItemsAsTable(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        // Column widths in percentage (total = 100%)
        val namePercent = 62f
        val qtyPercent = 10f
        val pricePercent = 28f

        // Header row
        lineTable(listOf(
            tableColumn("Món", namePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.LEFT),
            tableColumn("SL", qtyPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.CENTER),
            tableColumn("Giá", pricePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.RIGHT)
        ), BitmapTextStyle(bold = true))
        separator()

        // Data rows
        billData.items.forEach { item ->
            val qty = if (template.showQuantity) "${item.quantity}" else ""
            val price = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""

            lineTable(listOf(
                tableColumn(item.name, namePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.LEFT),
                tableColumn(qty, qtyPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.CENTER),
                tableColumn(price, pricePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.RIGHT)
            ))

            // Variants, Toppings, Extras
            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: TABLE_STT
     * Format: STT | Món        | SL | Giá
     * Sử dụng lineTable với pixel-based column widths để fill chính xác theo khổ giấy
     */
    private fun SingleCanvasBillBuilder.renderItemsAsTableWithSTT(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        // Column widths in percentage (total = 100%)
        val sttPercent = 10f
        val namePercent = 52f
        val qtyPercent = 10f
        val pricePercent = 28f

        // Header row
        lineTable(listOf(
            tableColumn("STT", sttPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.CENTER),
            tableColumn("Món", namePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.LEFT),
            tableColumn("SL", qtyPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.CENTER),
            tableColumn("Giá", pricePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.RIGHT)
        ), BitmapTextStyle(bold = true))
        separator()

        // Data rows
        billData.items.forEachIndexed { index, item ->
            val qty = if (template.showQuantity) "${item.quantity}" else ""
            val price = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""

            lineTable(listOf(
                tableColumn("${index + 1}", sttPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.CENTER),
                tableColumn(item.name, namePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.LEFT),
                tableColumn(qty, qtyPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.CENTER),
                tableColumn(price, pricePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.RIGHT)
            ))

            // Variants, Toppings, Extras (indented)
            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: TABLE_QTY_FIRST
     * Format: SL | Món        | Giá
     * Sử dụng lineTable với pixel-based column widths để fill chính xác theo khổ giấy
     */
    private fun SingleCanvasBillBuilder.renderItemsAsTableQtyFirst(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        // Column widths in percentage (total = 100%)
        val qtyPercent = 10f
        val namePercent = 62f
        val pricePercent = 28f

        // Header row
        lineTable(listOf(
            tableColumn("SL", qtyPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.CENTER),
            tableColumn("Món", namePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.LEFT),
            tableColumn("Giá", pricePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.RIGHT)
        ), BitmapTextStyle(bold = true))
        separator()

        // Data rows
        billData.items.forEach { item ->
            val qty = if (template.showQuantity) "${item.quantity}" else ""
            val price = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""

            lineTable(listOf(
                tableColumn(qty, qtyPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.CENTER),
                tableColumn(item.name, namePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.LEFT),
                tableColumn(price, pricePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.RIGHT)
            ))

            // Variants, Toppings, Extras
            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: TABLE_FULL
     * Format: STT | Món | SL | Đ.Giá | T.Tiền
     * Sử dụng lineTable với pixel-based column widths để fill chính xác theo khổ giấy
     */
    private fun SingleCanvasBillBuilder.renderItemsAsTableFull(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        // Column widths in percentage (total = 100%)
        val sttPercent = 8f
        val namePercent = 34f
        val qtyPercent = 8f
        val unitPricePercent = 25f
        val totalPricePercent = 25f

        // Header row
        lineTable(listOf(
            tableColumn("STT", sttPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.CENTER),
            tableColumn("Món", namePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.LEFT),
            tableColumn("SL", qtyPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.CENTER),
            tableColumn("Đ.Giá", unitPricePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.RIGHT),
            tableColumn("T.Tiền", totalPricePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.RIGHT)
        ), BitmapTextStyle(bold = true))
        separator()

        // Data rows
        billData.items.forEachIndexed { index, item ->
            val qty = if (template.showQuantity) "${item.quantity}" else ""
            val unitPrice = formatCurrency(item.originalPrice / item.quantity.coerceAtLeast(1))
            val totalPrice = formatCurrency(item.totalPrice)

            lineTable(listOf(
                tableColumn("${index + 1}", sttPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.CENTER),
                tableColumn(item.name, namePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.LEFT),
                tableColumn(qty, qtyPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.CENTER),
                tableColumn(unitPrice, unitPricePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.RIGHT),
                tableColumn(totalPrice, totalPricePercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.RIGHT)
            ))

            // Variants, Toppings, Extras
            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Helper: Render item variants
     */
    private fun SingleCanvasBillBuilder.renderItemVariants(
        template: BillTemplateEntity,
        item: BillItem
    ) {
        if (item.variants.isNotEmpty()) {
            item.variants.forEach { variant ->
                if (template.showUnitPrice && variant.priceAdjustment != 0.0) {
                    val adjustSign = if (variant.priceAdjustment > 0) "+" else ""
                    lineKeyValue("   ${variant.name}", "${adjustSign}${formatCurrency(variant.priceAdjustment)}")
                } else {
                    line("   ${variant.name}")
                }
            }
        }
    }

    /**
     * Helper: Render item toppings
     */
    private fun SingleCanvasBillBuilder.renderItemToppings(
        template: BillTemplateEntity,
        item: BillItem
    ) {
        if (item.toppings.isNotEmpty()) {
            item.toppings.forEach { topping ->
                val toppingPrice = topping.price * topping.quantity
                if (template.showUnitPrice && toppingPrice > 0) {
                    if (topping.quantity > 1) {
                        lineKeyValue("   + ${topping.name} x${topping.quantity}", "+${formatCurrency(toppingPrice)}")
                    } else {
                        lineKeyValue("   + ${topping.name}", "+${formatCurrency(toppingPrice)}")
                    }
                } else {
                    if (topping.quantity > 1) {
                        line("   + ${topping.name} x${topping.quantity}")
                    } else {
                        line("   + ${topping.name}")
                    }
                }
            }
        }
    }

    /**
     * Helper: Render item extras (code, note, discount)
     */
    private fun SingleCanvasBillBuilder.renderItemExtras(
        template: BillTemplateEntity,
        item: BillItem
    ) {
        if (template.showItemCode && item.code != null) {
            line("   Mã: ${item.code}")
        }

        if (template.showItemNote && item.note != null) {
            lineItalic("   Ghi chú: ${item.note}")
        }

        val hasItemDiscount = item.discountAmount > 0
        if (hasItemDiscount && template.showItemDiscount) {
            val discountLabel = if (item.discountType == "percent" && item.discountPercent > 0) {
                "   → Giảm ${item.discountPercent.toInt()}%:"
            } else {
                "   → Giảm:"
            }
            lineKeyValue(discountLabel, "-${formatCurrency(item.discountAmount)}")
        }
    }

    // ============================================================================
    // ADDITIONAL LAYOUT IMPLEMENTATIONS FOR SingleCanvasBillBuilder
    // ============================================================================

    /**
     * Layout: COMPACT - Thu gọn, không indent
     * Format: Tên món xSL Giá (tất cả trên 1 dòng)
     */
    private fun SingleCanvasBillBuilder.renderItemsCompact(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEach { item ->
            val parts = mutableListOf<String>()
            parts.add(item.name)
            if (template.showQuantity) parts.add("x${item.quantity}")
            if (template.showUnitPrice) parts.add(formatCurrency(item.totalPrice))
            line(parts.joinToString(" "))

            // Ghi chú ngắn gọn
            if (template.showItemNote && item.note != null) {
                line("  ${item.note}")
            }
        }
    }

    /**
     * Layout: DETAILED - Chi tiết với đơn giá và thành tiền
     * Format:
     *   Tên món
     *   Đơn giá: xxx  x SL = Thành tiền
     */
    private fun SingleCanvasBillBuilder.renderItemsDetailed(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEach { item ->
            lineBold(item.name)

            val unitPrice = item.originalPrice / item.quantity.coerceAtLeast(1)
            if (template.showUnitPrice && template.showQuantity) {
                line("   ${formatCurrency(unitPrice)} x ${item.quantity} = ${formatCurrency(item.totalPrice)}")
            } else if (template.showUnitPrice) {
                lineKeyValue("   Thành tiền:", formatCurrency(item.totalPrice))
            }

            // Variants
            renderItemVariants(template, item)
            // Toppings
            renderItemToppings(template, item)
            // Extras
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: TWO_LINE - 2 dòng
     * Dòng 1: Tên món
     * Dòng 2: SL x Đơn giá = Thành tiền (căn phải)
     */
    private fun SingleCanvasBillBuilder.renderItemsTwoLine(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEach { item ->
            lineBold(item.name)

            val unitPrice = item.originalPrice / item.quantity.coerceAtLeast(1)
            val priceLine = if (template.showQuantity && template.showUnitPrice) {
                "${item.quantity} x ${formatCurrency(unitPrice)} = ${formatCurrency(item.totalPrice)}"
            } else if (template.showUnitPrice) {
                formatCurrency(item.totalPrice)
            } else if (template.showQuantity) {
                "SL: ${item.quantity}"
            } else ""

            if (priceLine.isNotEmpty()) {
                lineRight(priceLine)
            }

            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: PRICE_RIGHT - Giá căn phải
     * Format: Tên món...................Giá
     */
    private fun SingleCanvasBillBuilder.renderItemsPriceRight(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEach { item ->
            val qty = if (template.showQuantity) " x${item.quantity}" else ""
            val price = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""
            lineKeyValue("${item.name}$qty", price, BitmapTextStyle(bold = true))

            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: WITH_INDEX - Có số thứ tự
     * Format: 1. Tên món xSL Giá
     */
    private fun SingleCanvasBillBuilder.renderItemsWithIndex(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEachIndexed { index, item ->
            val qty = if (template.showQuantity) "x${item.quantity}" else ""
            val price = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""
            val rightPart = listOf(qty, price).filter { it.isNotEmpty() }.joinToString("  ")
            lineKeyValue("${index + 1}. ${item.name}", rightPart, BitmapTextStyle(bold = true))

            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: GROUPED - Nhóm theo category
     * Format:
     *   [Category 1]
     *   - Món 1 xSL Giá
     *   - Món 2 xSL Giá
     *   [Category 2]
     *   ...
     */
    private fun SingleCanvasBillBuilder.renderItemsGrouped(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        // Group items by category
        val groupedItems = billData.items.groupBy { it.categoryName ?: "Khác" }

        groupedItems.forEach { (category, items) ->
            // Category header
            lineBold("[$category]")

            items.forEach { item ->
                val qty = if (template.showQuantity) "x${item.quantity}" else ""
                val price = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""
                val rightPart = listOf(qty, price).filter { it.isNotEmpty() }.joinToString("  ")
                lineKeyValue("  ${item.name}", rightPart)

                renderItemVariants(template, item)
                renderItemToppings(template, item)
                renderItemExtras(template, item)
            }
        }
    }

    /**
     * Layout: GRID_2_COL - 2 cột (cho món ngắn tên)
     * Format: Món1 xSL Giá | Món2 xSL Giá
     * Sử dụng lineTable với pixel-based column widths để fill chính xác theo khổ giấy
     */
    private fun SingleCanvasBillBuilder.renderItemsGrid2Col(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        // Each column takes 48% (leaving 4% for separator in the middle)
        val colPercent = 48f
        val sepPercent = 4f

        // Within each column: name 55%, qty 15%, price 30%
        val nameInColPercent = 55f
        val qtyInColPercent = 15f
        val priceInColPercent = 30f

        // Format item text for grid display
        fun formatItemText(item: BillItem): String {
            val qty = if (template.showQuantity) " x${item.quantity}" else ""
            val price = if (template.showUnitPrice) " ${formatCurrency(item.totalPrice)}" else ""
            return "${item.name}$qty$price"
        }

        // Process items in pairs using lineTable
        val items = billData.items
        var i = 0
        while (i < items.size) {
            val item1 = items[i]
            val item2 = if (i + 1 < items.size) items[i + 1] else null

            if (item2 != null) {
                // Two items in one row
                lineTable(listOf(
                    tableColumn(formatItemText(item1), colPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.LEFT),
                    tableColumn("|", sepPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.CENTER),
                    tableColumn(formatItemText(item2), colPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.LEFT)
                ))
                i += 2
            } else {
                // Single item takes half the width
                lineTable(listOf(
                    tableColumn(formatItemText(item1), colPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.LEFT),
                    tableColumn("", sepPercent + colPercent, SingleCanvasBillBuilder.PrintElement.ColumnAlign.LEFT)
                ))
                i += 1
            }
        }

        // Show extras for all items (simplified for grid layout)
        billData.items.forEach { item ->
            if (template.showItemNote && item.note != null) {
                line("  * ${item.name}: ${item.note}")
            }
        }
    }

    /**
     * Layout: MINIMAL - Tối giản, chỉ tên và số lượng
     * Format: Tên món (SL)
     */
    private fun SingleCanvasBillBuilder.renderItemsMinimal(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEach { item ->
            val qty = if (template.showQuantity) " (${item.quantity})" else ""
            line("${item.name}$qty")
        }
    }

    /**
     * Layout: DOTTED - Dấu chấm nối
     * Format: Tên món........xSL.......Giá
     * Sử dụng lineKeyValueDotted để fill chính xác theo pixel width
     */
    private fun SingleCanvasBillBuilder.renderItemsDotted(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEach { item ->
            val qty = if (template.showQuantity) "x${item.quantity}" else ""
            val price = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""
            val rightPart = "$qty $price".trim()
            // Sử dụng lineKeyValueDotted để fill chính xác theo pixel width
            lineKeyValueDotted(item.name, rightPart, BitmapTextStyle(bold = true))

            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: BOXED - Có viền box
     * Format:
     *   ┌─────────────────────────┐
     *   │ Tên món      xSL   Giá │
     *   └─────────────────────────┘
     */
    private fun SingleCanvasBillBuilder.renderItemsBoxed(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEach { item ->
            val qty = if (template.showQuantity) "x${item.quantity}" else ""
            val price = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""

            // Top border
            separator()

            // Item content
            lineKeyValue(item.name, "$qty  $price", BitmapTextStyle(bold = true))

            // Variants & Toppings
            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)

            // Bottom border
            separator()
        }
    }

    // ============================================================================
    // EXTENSION FUNCTIONS FOR HybridBillBuilder (for generateBillFromConfig)
    // ============================================================================

    /**
     * Render items theo itemDisplayLayout từ template
     * Hỗ trợ 15 layouts (giống SingleCanvasBillBuilder)
     */
    private fun HybridBillBuilder.renderItemsByLayout(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        Log.d(TAG, "HybridBillBuilder rendering items with layout: ${template.itemDisplayLayout}")
        when (template.itemDisplayLayout) {
            "compact" -> renderItemsCompact(template, billData)
            "detailed" -> renderItemsDetailed(template, billData)
            "two_line" -> renderItemsTwoLine(template, billData)
            "price_right" -> renderItemsPriceRight(template, billData)
            "with_index" -> renderItemsWithIndex(template, billData)
            "grouped" -> renderItemsGrouped(template, billData)
            "grid_2_col" -> renderItemsGrid2Col(template, billData)
            "minimal" -> renderItemsMinimal(template, billData)
            "dotted" -> renderItemsDotted(template, billData)
            "boxed" -> renderItemsBoxed(template, billData)
            "table" -> renderItemsAsTable(template, billData)
            "table_stt" -> renderItemsAsTableWithSTT(template, billData)
            "table_qty_first" -> renderItemsAsTableQtyFirst(template, billData)
            "table_full" -> renderItemsAsTableFull(template, billData)
            else -> renderItemsStandard(template, billData) // standard
        }
    }

    /**
     * Layout: STANDARD (mặc định) for HybridBillBuilder
     */
    private fun HybridBillBuilder.renderItemsStandard(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEach { item ->
            val toppingTotal = item.variants.sumOf { it.priceAdjustment } +
                    item.toppings.sumOf { it.price * it.quantity }
            val basePrice = if (toppingTotal > 0 && item.originalPrice > 0) {
                (item.originalPrice - toppingTotal).coerceAtLeast(0.0)
            } else {
                item.originalPrice
            }

            val quantityPart = if (template.showQuantity) "x${item.quantity}" else ""
            val pricePart = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""

            if (quantityPart.isNotEmpty() && pricePart.isNotEmpty()) {
                lineKeyValue(item.name, "$quantityPart  $pricePart", BitmapTextStyle(bold = true))
            } else if (quantityPart.isNotEmpty()) {
                lineKeyValue(item.name, quantityPart, BitmapTextStyle(bold = true))
            } else if (pricePart.isNotEmpty()) {
                lineKeyValue(item.name, pricePart, BitmapTextStyle(bold = true))
            } else {
                lineBold(item.name)
            }

            // Giá gốc nếu có topping
            if (template.showUnitPrice && basePrice > 0 && toppingTotal > 0) {
                line("   ${formatCurrency(basePrice)}")
            }

            // Variants, toppings, extras
            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: TABLE - Bảng đơn giản: Món | SL | Giá
     * Sử dụng lineTable với pixel-based column widths để fill chính xác theo khổ giấy
     */
    private fun HybridBillBuilder.renderItemsAsTable(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        // Column widths in percentage (total = 100%)
        val namePercent = 62f
        val qtyPercent = 10f
        val pricePercent = 28f

        // Header row
        lineTable(listOf(
            tableColumn("Món", namePercent, ColumnAlign.LEFT),
            tableColumn("SL", qtyPercent, ColumnAlign.CENTER),
            tableColumn("Giá", pricePercent, ColumnAlign.RIGHT)
        ), BitmapTextStyle(bold = true))
        separator()

        // Data rows
        billData.items.forEach { item ->
            val qty = if (template.showQuantity) "${item.quantity}" else ""
            val price = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""

            lineTable(listOf(
                tableColumn(item.name, namePercent, ColumnAlign.LEFT),
                tableColumn(qty, qtyPercent, ColumnAlign.CENTER),
                tableColumn(price, pricePercent, ColumnAlign.RIGHT)
            ))

            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: TABLE_STT - Bảng có STT: STT | Món | SL | Giá
     * Sử dụng lineTable với pixel-based column widths để fill chính xác theo khổ giấy
     */
    private fun HybridBillBuilder.renderItemsAsTableWithSTT(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        // Column widths in percentage (total = 100%)
        val sttPercent = 10f
        val namePercent = 52f
        val qtyPercent = 10f
        val pricePercent = 28f

        // Header row
        lineTable(listOf(
            tableColumn("STT", sttPercent, ColumnAlign.CENTER),
            tableColumn("Món", namePercent, ColumnAlign.LEFT),
            tableColumn("SL", qtyPercent, ColumnAlign.CENTER),
            tableColumn("Giá", pricePercent, ColumnAlign.RIGHT)
        ), BitmapTextStyle(bold = true))
        separator()

        // Data rows
        billData.items.forEachIndexed { index, item ->
            val qty = if (template.showQuantity) "${item.quantity}" else ""
            val price = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""

            lineTable(listOf(
                tableColumn("${index + 1}", sttPercent, ColumnAlign.CENTER),
                tableColumn(item.name, namePercent, ColumnAlign.LEFT),
                tableColumn(qty, qtyPercent, ColumnAlign.CENTER),
                tableColumn(price, pricePercent, ColumnAlign.RIGHT)
            ))

            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: TABLE_QTY_FIRST - Bảng SL đầu: SL | Món | Giá
     * Sử dụng lineTable với pixel-based column widths để fill chính xác theo khổ giấy
     */
    private fun HybridBillBuilder.renderItemsAsTableQtyFirst(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        // Column widths in percentage (total = 100%)
        val qtyPercent = 10f
        val namePercent = 62f
        val pricePercent = 28f

        // Header row
        lineTable(listOf(
            tableColumn("SL", qtyPercent, ColumnAlign.CENTER),
            tableColumn("Món", namePercent, ColumnAlign.LEFT),
            tableColumn("Giá", pricePercent, ColumnAlign.RIGHT)
        ), BitmapTextStyle(bold = true))
        separator()

        // Data rows
        billData.items.forEach { item ->
            val qty = if (template.showQuantity) "${item.quantity}" else ""
            val price = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""

            lineTable(listOf(
                tableColumn(qty, qtyPercent, ColumnAlign.CENTER),
                tableColumn(item.name, namePercent, ColumnAlign.LEFT),
                tableColumn(price, pricePercent, ColumnAlign.RIGHT)
            ))

            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: TABLE_FULL - Bảng đầy đủ: STT | Món | SL | Đơn giá | Thành tiền
     * Sử dụng lineTable với pixel-based column widths để fill chính xác theo khổ giấy
     */
    private fun HybridBillBuilder.renderItemsAsTableFull(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        // Column widths in percentage (total = 100%)
        val sttPercent = 8f
        val namePercent = 34f
        val qtyPercent = 8f
        val unitPricePercent = 25f
        val totalPricePercent = 25f

        // Header row
        lineTable(listOf(
            tableColumn("STT", sttPercent, ColumnAlign.CENTER),
            tableColumn("Món", namePercent, ColumnAlign.LEFT),
            tableColumn("SL", qtyPercent, ColumnAlign.CENTER),
            tableColumn("Đ.Giá", unitPricePercent, ColumnAlign.RIGHT),
            tableColumn("T.Tiền", totalPricePercent, ColumnAlign.RIGHT)
        ), BitmapTextStyle(bold = true))
        separator()

        // Data rows
        billData.items.forEachIndexed { index, item ->
            val qty = if (template.showQuantity) "${item.quantity}" else ""
            val unitPrice = formatCurrency(item.originalPrice / item.quantity.coerceAtLeast(1))
            val totalPrice = formatCurrency(item.totalPrice)

            lineTable(listOf(
                tableColumn("${index + 1}", sttPercent, ColumnAlign.CENTER),
                tableColumn(item.name, namePercent, ColumnAlign.LEFT),
                tableColumn(qty, qtyPercent, ColumnAlign.CENTER),
                tableColumn(unitPrice, unitPricePercent, ColumnAlign.RIGHT),
                tableColumn(totalPrice, totalPricePercent, ColumnAlign.RIGHT)
            ))

            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Helper: Render item variants for HybridBillBuilder
     */
    private fun HybridBillBuilder.renderItemVariants(
        template: BillTemplateEntity,
        item: BillItem
    ) {
        if (item.variants.isNotEmpty()) {
            item.variants.forEach { variant ->
                if (template.showUnitPrice && variant.priceAdjustment != 0.0) {
                    val adjustSign = if (variant.priceAdjustment > 0) "+" else ""
                    lineKeyValue("   ${variant.name}", "${adjustSign}${formatCurrency(variant.priceAdjustment)}")
                } else {
                    line("   ${variant.name}")
                }
            }
        }
    }

    /**
     * Helper: Render item toppings for HybridBillBuilder
     */
    private fun HybridBillBuilder.renderItemToppings(
        template: BillTemplateEntity,
        item: BillItem
    ) {
        if (item.toppings.isNotEmpty()) {
            item.toppings.forEach { topping ->
                val toppingPrice = topping.price * topping.quantity
                if (template.showUnitPrice && toppingPrice > 0) {
                    if (topping.quantity > 1) {
                        lineKeyValue("   + ${topping.name} x${topping.quantity}", "+${formatCurrency(toppingPrice)}")
                    } else {
                        lineKeyValue("   + ${topping.name}", "+${formatCurrency(toppingPrice)}")
                    }
                } else {
                    if (topping.quantity > 1) {
                        line("   + ${topping.name} x${topping.quantity}")
                    } else {
                        line("   + ${topping.name}")
                    }
                }
            }
        }
    }

    /**
     * Helper: Render item extras for HybridBillBuilder
     */
    private fun HybridBillBuilder.renderItemExtras(
        template: BillTemplateEntity,
        item: BillItem
    ) {
        if (template.showItemCode && item.code != null) {
            line("   Mã: ${item.code}")
        }

        if (template.showItemNote && item.note != null) {
            lineItalic("   Ghi chú: ${item.note}")
        }

        val hasItemDiscount = item.discountAmount > 0
        if (hasItemDiscount && template.showItemDiscount) {
            val discountLabel = if (item.discountType == "percent" && item.discountPercent > 0) {
                "   → Giảm ${item.discountPercent.toInt()}%:"
            } else {
                "   → Giảm:"
            }
            lineKeyValue(discountLabel, "-${formatCurrency(item.discountAmount)}")
        }
    }

    // ============================================================================
    // ADDITIONAL LAYOUT IMPLEMENTATIONS FOR HybridBillBuilder
    // ============================================================================

    /**
     * Layout: COMPACT - Thu gọn, không indent
     */
    private fun HybridBillBuilder.renderItemsCompact(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEach { item ->
            val parts = mutableListOf<String>()
            parts.add(item.name)
            if (template.showQuantity) parts.add("x${item.quantity}")
            if (template.showUnitPrice) parts.add(formatCurrency(item.totalPrice))
            line(parts.joinToString(" "))

            if (template.showItemNote && item.note != null) {
                line("  ${item.note}")
            }
        }
    }

    /**
     * Layout: DETAILED - Chi tiết với đơn giá và thành tiền
     */
    private fun HybridBillBuilder.renderItemsDetailed(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEach { item ->
            lineBold(item.name)

            val unitPrice = item.originalPrice / item.quantity.coerceAtLeast(1)
            if (template.showUnitPrice && template.showQuantity) {
                line("   ${formatCurrency(unitPrice)} x ${item.quantity} = ${formatCurrency(item.totalPrice)}")
            } else if (template.showUnitPrice) {
                lineKeyValue("   Thành tiền:", formatCurrency(item.totalPrice))
            }

            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: TWO_LINE - 2 dòng
     */
    private fun HybridBillBuilder.renderItemsTwoLine(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEach { item ->
            lineBold(item.name)

            val unitPrice = item.originalPrice / item.quantity.coerceAtLeast(1)
            val priceLine = if (template.showQuantity && template.showUnitPrice) {
                "${item.quantity} x ${formatCurrency(unitPrice)} = ${formatCurrency(item.totalPrice)}"
            } else if (template.showUnitPrice) {
                formatCurrency(item.totalPrice)
            } else if (template.showQuantity) {
                "SL: ${item.quantity}"
            } else ""

            if (priceLine.isNotEmpty()) {
                lineRight(priceLine)
            }

            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: PRICE_RIGHT - Giá căn phải
     */
    private fun HybridBillBuilder.renderItemsPriceRight(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEach { item ->
            val qty = if (template.showQuantity) " x${item.quantity}" else ""
            val price = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""
            lineKeyValue("${item.name}$qty", price, BitmapTextStyle(bold = true))

            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: WITH_INDEX - Có số thứ tự
     */
    private fun HybridBillBuilder.renderItemsWithIndex(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEachIndexed { index, item ->
            val qty = if (template.showQuantity) "x${item.quantity}" else ""
            val price = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""
            val rightPart = listOf(qty, price).filter { it.isNotEmpty() }.joinToString("  ")
            lineKeyValue("${index + 1}. ${item.name}", rightPart, BitmapTextStyle(bold = true))

            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: GROUPED - Nhóm theo category
     */
    private fun HybridBillBuilder.renderItemsGrouped(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        val groupedItems = billData.items.groupBy { it.categoryName ?: "Khác" }

        groupedItems.forEach { (category, items) ->
            lineBold("[$category]")

            items.forEach { item ->
                val qty = if (template.showQuantity) "x${item.quantity}" else ""
                val price = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""
                val rightPart = listOf(qty, price).filter { it.isNotEmpty() }.joinToString("  ")
                lineKeyValue("  ${item.name}", rightPart)

                renderItemVariants(template, item)
                renderItemToppings(template, item)
                renderItemExtras(template, item)
            }
        }
    }

    /**
     * Layout: GRID_2_COL - 2 cột
     * Sử dụng lineTable với pixel-based column widths để fill chính xác theo khổ giấy
     */
    private fun HybridBillBuilder.renderItemsGrid2Col(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        // Each column takes 48% (leaving 4% for separator in the middle)
        val colPercent = 48f
        val sepPercent = 4f

        // Format item text for grid display
        fun formatItemText(item: BillItem): String {
            val qty = if (template.showQuantity) " x${item.quantity}" else ""
            val price = if (template.showUnitPrice) " ${formatCurrency(item.totalPrice)}" else ""
            return "${item.name}$qty$price"
        }

        // Process items in pairs using lineTable
        val items = billData.items
        var i = 0
        while (i < items.size) {
            val item1 = items[i]
            val item2 = if (i + 1 < items.size) items[i + 1] else null

            if (item2 != null) {
                // Two items in one row
                lineTable(listOf(
                    tableColumn(formatItemText(item1), colPercent, ColumnAlign.LEFT),
                    tableColumn("|", sepPercent, ColumnAlign.CENTER),
                    tableColumn(formatItemText(item2), colPercent, ColumnAlign.LEFT)
                ))
                i += 2
            } else {
                // Single item takes half the width
                lineTable(listOf(
                    tableColumn(formatItemText(item1), colPercent, ColumnAlign.LEFT),
                    tableColumn("", sepPercent + colPercent, ColumnAlign.LEFT)
                ))
                i += 1
            }
        }

        billData.items.forEach { item ->
            if (template.showItemNote && item.note != null) {
                line("  * ${item.name}: ${item.note}")
            }
        }
    }

    /**
     * Layout: MINIMAL - Tối giản
     */
    private fun HybridBillBuilder.renderItemsMinimal(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEach { item ->
            val qty = if (template.showQuantity) " (${item.quantity})" else ""
            line("${item.name}$qty")
        }
    }

    /**
     * Layout: DOTTED - Dấu chấm nối
     * Sử dụng lineKeyValueDotted để pixel-accurate dot filling hiển thị hết khổ giấy
     */
    private fun HybridBillBuilder.renderItemsDotted(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEach { item ->
            val qty = if (template.showQuantity) "x${item.quantity}" else ""
            val price = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""
            val rightPart = "$qty $price".trim()
            // Sử dụng lineKeyValueDotted với pixel-accurate dot filling
            lineKeyValueDotted(item.name, rightPart, BitmapTextStyle(bold = true))

            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
        }
    }

    /**
     * Layout: BOXED - Có viền box
     */
    private fun HybridBillBuilder.renderItemsBoxed(
        template: BillTemplateEntity,
        billData: BillData
    ) {
        billData.items.forEach { item ->
            val qty = if (template.showQuantity) "x${item.quantity}" else ""
            val price = if (template.showUnitPrice) formatCurrency(item.totalPrice) else ""

            separator()
            lineKeyValue(item.name, "$qty  $price", BitmapTextStyle(bold = true))
            renderItemVariants(template, item)
            renderItemToppings(template, item)
            renderItemExtras(template, item)
            separator()
        }
    }
}
