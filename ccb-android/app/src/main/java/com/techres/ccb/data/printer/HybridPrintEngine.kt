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
import java.io.ByteArrayOutputStream
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket

/**
 * Hybrid Print Engine - In tiếng Việt có dấu
 *
 * Phương pháp HYBRID:
 * - Tự động detect máy in có hỗ trợ UTF-8 Vietnamese không
 * - Nếu hỗ trợ → dùng ESC/POS text thuần (nhanh, nhẹ)
 * - Nếu không → fallback sang bitmap (chắc chắn hoạt động)
 *
 * @author TechRes
 */

// ==================== PRINTER CAPABILITY ====================

/**
 * Khả năng của máy in - lưu trữ kết quả detect
 */
data class PrinterCapability(
    val printerIp: String,
    val printerPort: Int = 9100,
    val supportVietnameseUtf8: Boolean = false,
    val supportBitmap: Boolean = true,
    val printerModel: String? = null,
    val testedAt: Long = System.currentTimeMillis()
) {
    companion object {
        // Cache capabilities để không phải test lại mỗi lần
        private val cache = mutableMapOf<String, PrinterCapability>()

        fun getCached(ip: String, port: Int): PrinterCapability? {
            val key = "$ip:$port"
            val cached = cache[key]
            // Cache valid trong 24 giờ
            if (cached != null && System.currentTimeMillis() - cached.testedAt < 24 * 60 * 60 * 1000) {
                return cached
            }
            return null
        }

        fun saveToCache(capability: PrinterCapability) {
            val key = "${capability.printerIp}:${capability.printerPort}"
            cache[key] = capability
        }

        fun clearCache() {
            cache.clear()
        }
    }
}

/**
 * Printer Detector - Kiểm tra khả năng máy in
 */
object PrinterCapabilityDetector {
    private const val TAG = "PrinterCapabilityDetector"

    // Danh sách máy in đã biết hỗ trợ Vietnamese UTF-8
    private val KNOWN_UTF8_PRINTERS = listOf(
        "EPSON TM-T88",
        "EPSON TM-T82",
        "EPSON TM-M30",
        "BIXOLON SRP-350",
        "BIXOLON SRP-330",
        "CITIZEN CT-S310",
        "CITIZEN CT-S601",
        "STAR TSP100",
        "STAR TSP650"
    )

    // Danh sách máy in giá rẻ thường KHÔNG hỗ trợ Vietnamese
    private val KNOWN_NO_UTF8_PRINTERS = listOf(
        "XPRINTER",
        "ZJ-",
        "ZJIANG",
        "POS-58",
        "POS-80",
        "GOOJPRT",
        "RONGTA",
        "MUNBYN"
    )

    /**
     * Detect khả năng máy in - trả về mặc định là KHÔNG hỗ trợ UTF-8
     * để đảm bảo in đúng 100%
     */
    fun detect(
        ip: String,
        port: Int = 9100,
        forceRecheck: Boolean = false
    ): PrinterCapability {
        // Kiểm tra cache trước
        if (!forceRecheck) {
            PrinterCapability.getCached(ip, port)?.let { return it }
        }

        // Mặc định: KHÔNG hỗ trợ UTF-8 Vietnamese → dùng bitmap
        // Đây là lựa chọn an toàn nhất
        val capability = PrinterCapability(
            printerIp = ip,
            printerPort = port,
            supportVietnameseUtf8 = false, // Mặc định false để đảm bảo an toàn
            supportBitmap = true
        )

        PrinterCapability.saveToCache(capability)
        return capability
    }

    /**
     * Set thủ công khả năng máy in (cho admin config)
     */
    fun setManualCapability(
        ip: String,
        port: Int = 9100,
        supportUtf8: Boolean
    ): PrinterCapability {
        val capability = PrinterCapability(
            printerIp = ip,
            printerPort = port,
            supportVietnameseUtf8 = supportUtf8,
            supportBitmap = true
        )
        PrinterCapability.saveToCache(capability)
        return capability
    }
}

// ==================== BITMAP TEXT RENDERER ====================

/**
 * Style cho text khi render thành bitmap
 */
data class BitmapTextStyle(
    val fontSize: Float = 24f,
    val bold: Boolean = false,
    val italic: Boolean = false,
    val centerAlign: Boolean = false,
    val rightAlign: Boolean = false,
    val doubleHeight: Boolean = false,
    val doubleWidth: Boolean = false,
    val fontFamily: Typeface = Typeface.DEFAULT
)

/**
 * Bitmap Text Renderer - Chuyển text tiếng Việt thành hình ảnh
 */
object BitmapTextRenderer {
    private const val TAG = "BitmapTextRenderer"

    // Paper width in pixels (203 DPI = 8 dots/mm)
    // Printable width thường nhỏ hơn paper width khoảng 8-10mm do margins
    const val PAPER_WIDTH_32MM = 176   // 22mm printable
    const val PAPER_WIDTH_44MM = 272   // 34mm printable
    const val PAPER_WIDTH_48MM = 304   // 38mm printable
    const val PAPER_WIDTH_57MM = 376   // 47mm printable
    const val PAPER_WIDTH_58MM = 384   // 48mm printable
    const val PAPER_WIDTH_76MM = 528   // 66mm printable
    const val PAPER_WIDTH_80MM = 576   // 72mm printable
    const val PAPER_WIDTH_110MM = 800  // 100mm printable
    const val PAPER_WIDTH_112MM = 816  // 102mm printable

    /**
     * Chuyển đổi paper width (mm) thành pixel width
     */
    fun getPixelWidth(paperWidthMm: Int): Int = when (paperWidthMm) {
        32 -> PAPER_WIDTH_32MM
        44 -> PAPER_WIDTH_44MM
        48 -> PAPER_WIDTH_48MM
        57 -> PAPER_WIDTH_57MM
        58 -> PAPER_WIDTH_58MM
        76 -> PAPER_WIDTH_76MM
        80 -> PAPER_WIDTH_80MM
        110 -> PAPER_WIDTH_110MM
        112 -> PAPER_WIDTH_112MM
        else -> {
            // Tính toán cho kích thước không chuẩn (8 dots/mm, trừ ~10mm margin)
            ((paperWidthMm - 10) * 8).coerceAtLeast(176)
        }
    }

    /**
     * Tính số ký tự trên một dòng dựa trên paper width
     */
    fun getLineWidth(paperWidthMm: Int): Int = when (paperWidthMm) {
        32 -> 16
        44 -> 24
        48 -> 26
        57 -> 30
        58 -> 32
        76 -> 42
        80 -> 48
        110 -> 64
        112 -> 66
        else -> ((paperWidthMm - 10) * 8 / 12).coerceAtLeast(16) // ~12 pixels per char
    }

    /**
     * Tính font size phù hợp với khổ giấy
     * Base: 80mm (576px) = 24f
     * Font size scale theo tỉ lệ pixel width
     */
    fun getBaseFontSize(paperWidthMm: Int): Float {
        val pixelWidth = getPixelWidth(paperWidthMm)
        // Base: 576px = 24f, scale proportionally
        val scaledSize = 24f * pixelWidth / PAPER_WIDTH_80MM
        // Giới hạn min 16f, max 36f
        return scaledSize.coerceIn(16f, 36f)
    }

    /**
     * Tính font size cho title (lớn hơn base 1.5x)
     */
    fun getTitleFontSize(paperWidthMm: Int): Float {
        return getBaseFontSize(paperWidthMm) * 1.5f
    }

    /**
     * Tính font size cho total (lớn hơn base 1.2x)
     */
    fun getTotalFontSize(paperWidthMm: Int): Float {
        return getBaseFontSize(paperWidthMm) * 1.2f
    }

    /**
     * Render text thành bitmap với Vietnamese support
     */
    fun renderText(
        text: String,
        style: BitmapTextStyle = BitmapTextStyle(),
        paperWidth: Int = PAPER_WIDTH_80MM
    ): Bitmap {
        if (text.isEmpty()) {
            return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888)
        }

        // Tính toán font size thực tế
        val actualFontSize = style.fontSize * when {
            style.doubleHeight && style.doubleWidth -> 2f
            style.doubleHeight || style.doubleWidth -> 1.5f
            else -> 1f
        }

        // Tạo TextPaint
        val textPaint = TextPaint().apply {
            color = Color.BLACK
            textSize = actualFontSize
            isAntiAlias = true
            isSubpixelText = true

            // Chọn typeface phù hợp
            typeface = when {
                style.bold && style.italic -> Typeface.create(style.fontFamily, Typeface.BOLD_ITALIC)
                style.bold -> Typeface.create(style.fontFamily, Typeface.BOLD)
                style.italic -> Typeface.create(style.fontFamily, Typeface.ITALIC)
                else -> style.fontFamily
            }
        }

        // Xác định alignment
        val alignment = when {
            style.centerAlign -> Layout.Alignment.ALIGN_CENTER
            style.rightAlign -> Layout.Alignment.ALIGN_OPPOSITE
            else -> Layout.Alignment.ALIGN_NORMAL
        }

        // Tạo StaticLayout để handle Vietnamese text đúng cách
        val staticLayout = StaticLayout.Builder
            .obtain(text, 0, text.length, textPaint, paperWidth)
            .setAlignment(alignment)
            .setLineSpacing(0f, 1.0f)
            .setIncludePad(true)
            .build()

        // Tạo bitmap
        val height = staticLayout.height.coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(paperWidth, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)

        // Vẽ text
        staticLayout.draw(canvas)

        return bitmap
    }

    /**
     * Render separator line
     */
    fun renderSeparator(
        char: Char = '-',
        paperWidth: Int = PAPER_WIDTH_80MM,
        fontSize: Float = 24f
    ): Bitmap {
        val charCount = (paperWidth / (fontSize * 0.6f)).toInt()
        return renderText(char.toString().repeat(charCount), BitmapTextStyle(fontSize = fontSize), paperWidth)
    }

    /**
     * Render key-value line (ví dụ: "Tổng tiền:     100,000đ")
     */
    fun renderKeyValue(
        key: String,
        value: String,
        paperWidth: Int = PAPER_WIDTH_80MM,
        style: BitmapTextStyle = BitmapTextStyle()
    ): Bitmap {
        val textPaint = TextPaint().apply {
            color = Color.BLACK
            textSize = style.fontSize
            isAntiAlias = true
            typeface = if (style.bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        }

        val keyWidth = textPaint.measureText(key)
        val valueWidth = textPaint.measureText(value)
        val spaceWidth = paperWidth - keyWidth - valueWidth

        // Tính số khoảng trắng cần thêm
        val spaceCharWidth = textPaint.measureText(" ")
        val spaces = if (spaceWidth > 0) " ".repeat((spaceWidth / spaceCharWidth).toInt()) else " "

        return renderText("$key$spaces$value", style, paperWidth)
    }
}

// ==================== HYBRID BILL BUILDER ====================

/**
 * Hybrid Bill Builder - Tự động chọn phương pháp in phù hợp
 *
 * Ưu tiên:
 * 1. Nếu máy in hỗ trợ UTF-8 Vietnamese → dùng text (nhanh)
 * 2. Nếu không → dùng bitmap (chắc chắn đúng)
 *
 * Hỗ trợ các khổ giấy: 32mm, 44mm, 48mm, 57mm, 58mm, 76mm, 80mm, 110mm, 112mm
 */
class HybridBillBuilder(
    private val paperWidth: Int = 80, // Khổ giấy (mm): 32, 44, 48, 57, 58, 76, 80, 110, 112
    private val useBitmapMode: Boolean = true // Mặc định dùng bitmap để đảm bảo
) {
    private val buffer = ByteArrayOutputStream()
    private val pixelWidth = BitmapTextRenderer.getPixelWidth(paperWidth)
    val lineWidth = BitmapTextRenderer.getLineWidth(paperWidth)

    // Font sizes scaled by paper width
    private val baseFontSize = BitmapTextRenderer.getBaseFontSize(paperWidth)
    private val titleFontSize = BitmapTextRenderer.getTitleFontSize(paperWidth)
    private val totalFontSize = BitmapTextRenderer.getTotalFontSize(paperWidth)

    // Default style với font size đã scale
    private val defaultStyle get() = BitmapTextStyle(fontSize = baseFontSize)

    // ESC/POS Commands
    private val ESC = 0x1B.toByte()
    private val GS = 0x1D.toByte()

    /**
     * Initialize printer
     */
    fun init(): HybridBillBuilder {
        buffer.write(EscPosCommands.INIT)
        // Set line spacing to 0 for bitmap mode
        if (useBitmapMode) {
            buffer.write(byteArrayOf(ESC, 0x33, 0x00)) // ESC 3 0 - Set line spacing to 0
        }
        return this
    }

    /**
     * In text - tự động chọn bitmap hoặc text mode
     * Sử dụng font size đã scale theo paper width
     */
    fun line(text: String, style: BitmapTextStyle? = null): HybridBillBuilder {
        if (text.isEmpty()) {
            buffer.write(EscPosCommands.LF)
            return this
        }

        // Merge với default style để có font size đã scale
        val actualStyle = style?.copy(fontSize = style.fontSize.takeIf { it != 24f } ?: baseFontSize)
            ?: defaultStyle

        if (useBitmapMode) {
            // BITMAP MODE - Đảm bảo Vietnamese hiển thị đúng
            val bitmap = BitmapTextRenderer.renderText(text, actualStyle, pixelWidth)
            val imageData = EscPosCommands.printRasterBitmap(bitmap)
            buffer.write(imageData)
            bitmap.recycle()
        } else {
            // TEXT MODE - Chỉ dùng khi máy in hỗ trợ UTF-8 Vietnamese
            applyTextStyle(actualStyle)
            buffer.write(text.toByteArray(Charsets.UTF_8))
            buffer.write(EscPosCommands.LF)
            resetTextStyle()
        }
        return this
    }

    /**
     * In text căn giữa
     */
    fun lineCenter(text: String, style: BitmapTextStyle? = null): HybridBillBuilder {
        val baseStyle = style ?: defaultStyle
        return line(text, baseStyle.copy(centerAlign = true))
    }

    /**
     * In text căn phải
     */
    fun lineRight(text: String, style: BitmapTextStyle? = null): HybridBillBuilder {
        val baseStyle = style ?: defaultStyle
        return line(text, baseStyle.copy(rightAlign = true))
    }

    /**
     * In text đậm
     */
    fun lineBold(text: String, style: BitmapTextStyle? = null): HybridBillBuilder {
        val baseStyle = style ?: defaultStyle
        return line(text, baseStyle.copy(bold = true))
    }

    /**
     * In text lớn (double size) - sử dụng titleFontSize
     */
    fun lineDouble(text: String, style: BitmapTextStyle? = null): HybridBillBuilder {
        val titleStyle = BitmapTextStyle(
            fontSize = titleFontSize,
            bold = true,
            centerAlign = style?.centerAlign ?: false,
            rightAlign = style?.rightAlign ?: false
        )
        return line(text, titleStyle)
    }

    /**
     * In key-value (ví dụ: "Tổng tiền:" và "100,000đ")
     * Sử dụng font size đã scale
     * Nếu bold = true, sử dụng totalFontSize (lớn hơn cho dòng tổng)
     */
    fun lineKeyValue(key: String, value: String, style: BitmapTextStyle? = null): HybridBillBuilder {
        // Nếu bold thì dùng totalFontSize, không thì dùng baseFontSize
        val fontSize = if (style?.bold == true) totalFontSize else baseFontSize
        val actualStyle = style?.copy(fontSize = fontSize)
            ?: defaultStyle

        if (useBitmapMode) {
            val bitmap = BitmapTextRenderer.renderKeyValue(key, value, pixelWidth, actualStyle)
            val imageData = EscPosCommands.printRasterBitmap(bitmap)
            buffer.write(imageData)
            bitmap.recycle()
        } else {
            val spaces = lineWidth - key.length - value.length
            val line = if (spaces > 0) {
                key + " ".repeat(spaces) + value
            } else {
                "$key $value"
            }
            buffer.write(line.toByteArray(Charsets.UTF_8))
            buffer.write(EscPosCommands.LF)
        }
        return this
    }

    /**
     * In separator (đường kẻ ngang)
     */
    fun separator(char: Char = '-'): HybridBillBuilder {
        if (useBitmapMode) {
            val bitmap = BitmapTextRenderer.renderSeparator(char, pixelWidth, baseFontSize)
            val imageData = EscPosCommands.printRasterBitmap(bitmap)
            buffer.write(imageData)
            bitmap.recycle()
        } else {
            buffer.write(char.toString().repeat(lineWidth).toByteArray(Charsets.UTF_8))
            buffer.write(EscPosCommands.LF)
        }
        return this
    }

    /**
     * In double separator (===)
     */
    fun doubleSeparator(): HybridBillBuilder {
        return separator('=')
    }

    /**
     * Feed lines
     */
    fun feed(lines: Int = 1): HybridBillBuilder {
        buffer.write(EscPosCommands.feedLines(lines))
        return this
    }

    /**
     * In QR Code
     */
    fun qrCode(content: String, size: Int = 6): HybridBillBuilder {
        buffer.write(EscPosCommands.ALIGN_CENTER)
        buffer.write(EscPosCommands.printQRCode(content, size))
        buffer.write(EscPosCommands.ALIGN_LEFT)
        return this
    }

    /**
     * In Barcode
     */
    fun barcode(content: String): HybridBillBuilder {
        buffer.write(EscPosCommands.ALIGN_CENTER)
        buffer.write(EscPosCommands.setBarcodeHeight(60))
        buffer.write(EscPosCommands.setBarcodeWidth(2))
        buffer.write(EscPosCommands.BarcodeTextPosition.BELOW)
        buffer.write(EscPosCommands.printBarcode(EscPosCommands.BarcodeType.CODE128, content))
        buffer.write(EscPosCommands.ALIGN_LEFT)
        return this
    }

    /**
     * Cắt giấy
     */
    fun cut(partial: Boolean = true): HybridBillBuilder {
        buffer.write(if (partial) EscPosCommands.CUT_PARTIAL else EscPosCommands.CUT_FULL)
        return this
    }

    /**
     * Mở ngăn kéo tiền
     */
    fun openCashDrawer(): HybridBillBuilder {
        buffer.write(EscPosCommands.CASH_DRAWER_PIN2)
        return this
    }

    /**
     * Beep
     */
    fun beep(times: Int = 1): HybridBillBuilder {
        buffer.write(EscPosCommands.beep(times, 2))
        return this
    }

    /**
     * Build thành byte array
     */
    fun build(): ByteArray = buffer.toByteArray()

    // ==================== PRIVATE HELPERS ====================

    private fun applyTextStyle(style: BitmapTextStyle) {
        if (style.centerAlign) buffer.write(EscPosCommands.ALIGN_CENTER)
        else if (style.rightAlign) buffer.write(EscPosCommands.ALIGN_RIGHT)
        else buffer.write(EscPosCommands.ALIGN_LEFT)

        if (style.bold) buffer.write(EscPosCommands.TEXT_BOLD_ON)

        if (style.doubleHeight && style.doubleWidth) {
            buffer.write(EscPosCommands.DOUBLE_SIZE)
        } else if (style.doubleHeight) {
            buffer.write(EscPosCommands.DOUBLE_HEIGHT_ON)
        } else if (style.doubleWidth) {
            buffer.write(EscPosCommands.DOUBLE_WIDTH_ON)
        }
    }

    private fun resetTextStyle() {
        buffer.write(EscPosCommands.TEXT_NORMAL)
        buffer.write(EscPosCommands.TEXT_BOLD_OFF)
        buffer.write(EscPosCommands.ALIGN_LEFT)
    }
}

// ==================== HYBRID PRINT SERVICE ====================

/**
 * Hybrid Print Service - Service in với auto-detect
 */
object HybridPrintService {
    private const val TAG = "HybridPrintService"
    private const val CONNECTION_TIMEOUT = 5000

    /**
     * In bill với Hybrid approach
     */
    suspend fun printBill(
        ip: String,
        port: Int = 9100,
        billContent: ByteArray,
        maxRetries: Int = 3
    ): PrinterResult {
        return kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            var lastError: String? = null

            repeat(maxRetries) { attempt ->
                try {
                    val socket = Socket().apply {
                        reuseAddress = true
                        tcpNoDelay = true
                    }
                    socket.connect(InetSocketAddress(ip, port), CONNECTION_TIMEOUT)

                    val outputStream = socket.getOutputStream()
                    outputStream.write(billContent)
                    outputStream.flush()

                    outputStream.close()
                    socket.close()

                    return@withContext PrinterResult.Success("In thành công!")

                } catch (e: Exception) {
                    lastError = e.message
                    Log.e(TAG, "Print attempt ${attempt + 1} failed: ${e.message}")

                    if (attempt < maxRetries - 1) {
                        kotlinx.coroutines.delay(500L * (attempt + 1))
                    }
                }
            }

            PrinterResult.Error("Lỗi in: $lastError")
        }
    }

    /**
     * In test page với Vietnamese
     */
    suspend fun printTestVietnamese(
        ip: String,
        port: Int = 9100,
        storeName: String = "CỬA HÀNG TEST",
        paperWidth: Int = 80
    ): PrinterResult {
        // Detect printer capability
        val capability = PrinterCapabilityDetector.detect(ip, port)

        // Build test content với Hybrid builder
        val builder = HybridBillBuilder(
            paperWidth = paperWidth,
            useBitmapMode = !capability.supportVietnameseUtf8 // Dùng bitmap nếu không hỗ trợ UTF-8
        )

        val content = builder.apply {
            init()

            // Header
            lineDouble(storeName, BitmapTextStyle(centerAlign = true))
            lineCenter("*** IN THỬ TIẾNG VIỆT ***")
            doubleSeparator()

            // Info
            line("Thời gian: ${java.text.SimpleDateFormat("dd/MM/yyyy HH:mm:ss").format(java.util.Date())}")
            line("IP máy in: $ip:$port")
            line("Chế độ: ${if (!capability.supportVietnameseUtf8) "BITMAP (đảm bảo)" else "TEXT (nhanh)"}")
            separator()

            // Vietnamese test
            lineBold("TEST TIẾNG VIỆT CÓ DẤU:")
            line("Xin chào! Chúc bạn một ngày tốt lành!")
            line("Cà phê sữa đá - Phở bò tái - Bánh mì")
            line("Bún bò Huế - Cơm tấm sườn bì chả")
            separator()

            // All Vietnamese characters
            lineBold("TẤT CẢ KÝ TỰ VIỆT:")
            line("Chữ hoa: Ă Â Đ Ê Ô Ơ Ư")
            line("Chữ thường: ă â đ ê ô ơ ư")
            line("Dấu sắc: Á Ắ Ấ É Ế Í Ó Ố Ớ Ú Ứ Ý")
            line("Dấu huyền: À Ằ Ầ È Ề Ì Ò Ồ Ờ Ù Ừ Ỳ")
            line("Dấu hỏi: Ả Ẳ Ẩ Ẻ Ể Ỉ Ỏ Ổ Ở Ủ Ử Ỷ")
            line("Dấu ngã: Ã Ẵ Ẫ Ẽ Ễ Ĩ Õ Ỗ Ỡ Ũ Ữ Ỹ")
            line("Dấu nặng: Ạ Ặ Ậ Ẹ Ệ Ị Ọ Ộ Ợ Ụ Ự Ỵ")
            doubleSeparator()

            // Footer
            lineCenter("Nếu bạn đọc được dòng này")
            lineCenter("Máy in đã hỗ trợ tiếng Việt!")
            lineCenter("✓ THÀNH CÔNG ✓", BitmapTextStyle(bold = true))

            feed(3)
            cut()
        }.build()

        return printBill(ip, port, content)
    }
}
