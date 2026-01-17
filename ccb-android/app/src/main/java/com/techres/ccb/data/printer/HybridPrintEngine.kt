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
    val fontFamily: Typeface = Typeface.DEFAULT,
    val lineSpacingMultiplier: Float = 0.4f // Giảm xuống 0.4 để khoảng cách giữa các dòng nhỏ nhất
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
     * Base: 80mm (576px) = 16f (giảm từ 20f để tiết kiệm giấy nhiều hơn)
     * Font size scale theo tỉ lệ pixel width
     */
    fun getBaseFontSize(paperWidthMm: Int): Float {
        val pixelWidth = getPixelWidth(paperWidthMm)
        // Base: 576px = 16f (giảm từ 20f), scale proportionally
        val scaledSize = 16f * pixelWidth / PAPER_WIDTH_80MM
        // Giới hạn min 12f, max 24f
        return scaledSize.coerceIn(12f, 24f)
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
     * Hỗ trợ cắt bỏ khoảng trắng thừa dựa trên lineSpacingMultiplier
     */
    fun renderText(
        text: String,
        style: BitmapTextStyle = BitmapTextStyle(),
        paperWidth: Int = PAPER_WIDTH_80MM
    ): Bitmap {
        // Kiểm tra text rỗng hoặc chỉ toàn whitespace
        if (text.isEmpty() || text.isBlank()) {
            return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888)
        }

        // Tính toán font size thực tế
        val actualFontSize = style.fontSize * when {
            style.doubleHeight && style.doubleWidth -> 2f
            style.doubleHeight || style.doubleWidth -> 1.5f
            else -> 1f
        }

        // Tạo TextPaint - disable anti-alias for crisp thermal printing
        val textPaint = TextPaint().apply {
            color = Color.BLACK
            textSize = actualFontSize
            // Disable anti-aliasing for sharper text on thermal printers
            // Anti-aliased text causes gray edges that don't print well
            isAntiAlias = false
            isSubpixelText = false
            // Use hinting for better character shapes
            hinting = android.graphics.Paint.HINTING_ON

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
            .setLineSpacing(0f, 1.0f) // Không dùng line spacing ở đây, sẽ crop sau
            .setIncludePad(false) // Bỏ padding thừa
            .build()

        // Tạo bitmap với chiều cao đầy đủ
        val fullHeight = staticLayout.height.coerceAtLeast(1)
        val fullBitmap = Bitmap.createBitmap(paperWidth, fullHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(fullBitmap)
        canvas.drawColor(Color.WHITE)

        // Vẽ text
        staticLayout.draw(canvas)

        // LUÔN crop bitmap để loại bỏ khoảng trắng thừa
        // lineSpacing chỉ ảnh hưởng đến lượng padding được giữ lại
        return cropBitmapVertical(fullBitmap, style.lineSpacingMultiplier)
    }

    /**
     * Crop bitmap theo chiều dọc để loại bỏ khoảng trắng thừa
     * @param bitmap Bitmap gốc
     * @param lineSpacing Hệ số (0.3-1.0): nhỏ hơn = crop nhiều hơn
     */
    private fun cropBitmapVertical(bitmap: Bitmap, lineSpacing: Float): Bitmap {
        val width = bitmap.width
        val height = bitmap.height

        // Tìm hàng đầu tiên và cuối cùng có pixel đen (content)
        var topRow = -1
        var bottomRow = -1

        // Scan từ trên xuống tìm hàng đầu tiên có content
        val pixels = IntArray(width)
        for (y in 0 until height) {
            bitmap.getPixels(pixels, 0, width, 0, y, width, 1)
            for (pixel in pixels) {
                // Kiểm tra nếu pixel không phải màu trắng (có content)
                // Color.WHITE = 0xFFFFFFFF = -1 as Int
                if (pixel != Color.WHITE && pixel != -1 && (pixel and 0xFF000000.toInt()) != 0) {
                    topRow = y
                    break
                }
            }
            if (topRow >= 0) break
        }

        // Nếu không tìm thấy content (bitmap trống), trả về bitmap 1x1
        if (topRow < 0) {
            bitmap.recycle()
            return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888)
        }

        // Scan từ dưới lên tìm hàng cuối cùng có content
        for (y in height - 1 downTo topRow) {
            bitmap.getPixels(pixels, 0, width, 0, y, width, 1)
            for (pixel in pixels) {
                if (pixel != Color.WHITE && pixel != -1 && (pixel and 0xFF000000.toInt()) != 0) {
                    bottomRow = y
                    break
                }
            }
            if (bottomRow >= 0) break
        }

        if (bottomRow < topRow) {
            bottomRow = topRow
        }

        // Tính chiều cao content thực sự
        val contentHeight = bottomRow - topRow + 1
        if (contentHeight <= 0 || contentHeight >= height) {
            return bitmap // Không cần crop
        }

        // Tính padding dựa trên lineSpacing - sử dụng FIXED padding tối thiểu
        // để đảm bảo không có khoảng trắng thừa với font lớn
        // lineSpacing có thể > 1.0 từ user config, nhưng ta vẫn giới hạn padding
        val paddingScale = lineSpacing.coerceIn(0.3f, 1.5f)

        // Padding cố định tối đa 1-2 pixels để tránh khoảng trắng thừa
        // Giảm từ 4 xuống 2 max để đảm bảo tight cropping với mọi font size
        val maxPadding = when {
            paddingScale <= 0.4f -> 1
            paddingScale <= 0.6f -> 1
            paddingScale <= 0.8f -> 2
            paddingScale <= 1.0f -> 2
            else -> 2  // Ngay cả với lineSpacing > 1.0, vẫn giới hạn padding tối đa 2px
        }

        val newTopPadding = maxPadding.coerceAtMost(topRow)
        val newBottomPadding = maxPadding.coerceAtMost(height - 1 - bottomRow)

        // Tính vị trí crop
        val cropTop = (topRow - newTopPadding).coerceAtLeast(0)
        val cropBottom = (bottomRow + newBottomPadding).coerceAtMost(height - 1)
        val newHeight = cropBottom - cropTop + 1

        if (newHeight >= height || newHeight <= 0) {
            return bitmap // Không cần crop
        }

        // Tạo bitmap mới với chiều cao đã crop
        val croppedBitmap = Bitmap.createBitmap(bitmap, 0, cropTop, width, newHeight)

        // Recycle bitmap gốc nếu đã tạo bitmap mới
        if (croppedBitmap != bitmap) {
            bitmap.recycle()
        }

        return croppedBitmap
    }

    /**
     * Render separator line - tối ưu chiều cao
     */
    fun renderSeparator(
        char: Char = '-',
        paperWidth: Int = PAPER_WIDTH_80MM,
        fontSize: Float = 16f // Giảm từ 24f xuống 16f để separator mỏng hơn
    ): Bitmap {
        // Create a paint to measure actual character width
        val measurePaint = TextPaint().apply {
            textSize = fontSize
            isAntiAlias = false
            typeface = Typeface.DEFAULT
        }

        // Measure actual width of the character
        val charWidth = measurePaint.measureText(char.toString())

        // Calculate how many characters fit in the paper width with some margin
        // Leave ~5% margin on each side to prevent wrapping
        val availableWidth = paperWidth * 0.9f
        val charCount = (availableWidth / charWidth).toInt().coerceAtLeast(10)

        // Sử dụng line spacing multiplier nhỏ hơn cho separator để tiết kiệm giấy
        return renderText(
            char.toString().repeat(charCount),
            BitmapTextStyle(fontSize = fontSize, centerAlign = true, lineSpacingMultiplier = 0.4f),
            paperWidth
        )
    }

    /**
     * Render key-value line (ví dụ: "Tên món dài...     x1  230.000đ")
     * Nếu key quá dài: xuống dòng, value luôn canh phải trên dòng đầu
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
            isAntiAlias = false
            isSubpixelText = false
            hinting = android.graphics.Paint.HINTING_ON
            typeface = if (style.bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        }

        val valueWidth = textPaint.measureText(value)
        val spaceCharWidth = textPaint.measureText(" ")
        val keyWidth = textPaint.measureText(key)

        // Cần ít nhất 2 khoảng trắng giữa key và value
        val minSpaceWidth = spaceCharWidth * 2
        val maxFirstLineKeyWidth = paperWidth - valueWidth - minSpaceWidth

        // Nếu key vừa trên 1 dòng
        if (keyWidth <= maxFirstLineKeyWidth) {
            val spaceWidth = paperWidth - keyWidth - valueWidth
            val spaces = " ".repeat((spaceWidth / spaceCharWidth).toInt().coerceAtLeast(1))
            return renderText("$key$spaces$value", style, paperWidth)
        }

        // Key quá dài - cần xuống dòng
        // Tìm vị trí cắt phù hợp cho dòng đầu (cắt theo từ nếu có thể)
        var firstLineEndIndex = key.length
        while (firstLineEndIndex > 0 && textPaint.measureText(key.substring(0, firstLineEndIndex)) > maxFirstLineKeyWidth) {
            firstLineEndIndex--
        }

        // Tìm điểm cắt theo từ (space) nếu có thể
        val lastSpaceIndex = key.substring(0, firstLineEndIndex).lastIndexOf(' ')
        if (lastSpaceIndex > firstLineEndIndex / 2) {
            firstLineEndIndex = lastSpaceIndex
        }

        val firstLinePart = key.substring(0, firstLineEndIndex).trimEnd()
        val remainingPart = key.substring(firstLineEndIndex).trimStart()

        // Tính khoảng trống cho dòng đầu
        val firstLineKeyWidth = textPaint.measureText(firstLinePart)
        val spaceWidth = paperWidth - firstLineKeyWidth - valueWidth
        val spaces = " ".repeat((spaceWidth / spaceCharWidth).toInt().coerceAtLeast(1))

        // Dòng đầu: key (phần đầu) + spaces + value (canh phải)
        val firstLine = "$firstLinePart$spaces$value"

        // Dòng còn lại: phần key chưa in (wrap tự động bởi StaticLayout)
        val fullText = if (remainingPart.isNotEmpty()) {
            "$firstLine\n$remainingPart"
        } else {
            firstLine
        }

        return renderText(fullText, style, paperWidth)
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
 *
 * Bitmap modes:
 * - useRasterBitmap = true: Dùng GS v 0 (raster) - tốt cho EPSON, BIXOLON
 * - useRasterBitmap = false: Dùng ESC * (bit image) - tốt cho XPRINTER, máy in giá rẻ Trung Quốc
 *
 * Font scale:
 * - fontScale = 0.85f: small (cỡ chữ nhỏ)
 * - fontScale = 1.0f: medium (mặc định)
 * - fontScale = 1.2f: large (cỡ chữ lớn)
 */
class HybridBillBuilder(
    private val paperWidth: Int = 80, // Khổ giấy (mm): 32, 44, 48, 57, 58, 76, 80, 110, 112
    private val useBitmapMode: Boolean = true, // Mặc định dùng bitmap để đảm bảo
    private val useRasterBitmap: Boolean = false, // false = ESC * (XPRINTER compatible), true = GS v 0 (EPSON)
    private val fontScale: Float = 1.0f, // Tỷ lệ font: 0.85 = small, 1.0 = medium, 1.2 = large
    private val lineSpacing: Float = 0.4f // Line spacing multiplier: 0.3-1.0, default 0.4 = tight
) {
    private val buffer = ByteArrayOutputStream()
    private val pixelWidth = BitmapTextRenderer.getPixelWidth(paperWidth)
    val lineWidth = BitmapTextRenderer.getLineWidth(paperWidth)

    // Font sizes scaled by paper width AND fontScale config
    private val effectiveFontScale = fontScale.coerceIn(0.5f, 2.0f)
    val baseFontSize = BitmapTextRenderer.getBaseFontSize(paperWidth) * effectiveFontScale
    val titleFontSize = BitmapTextRenderer.getTitleFontSize(paperWidth) * effectiveFontScale
    val totalFontSize = BitmapTextRenderer.getTotalFontSize(paperWidth) * effectiveFontScale

    // ESC/POS Commands
    private val ESC = 0x1B.toByte()
    private val GS = 0x1D.toByte()

    /**
     * Initialize printer
     */
    fun init(): HybridBillBuilder {
        // Cancel any pending print data in buffer first
        buffer.write(EscPosCommands.CANCEL)

        // Reset printer to default state (clears buffer, resets settings)
        buffer.write(EscPosCommands.INIT)

        // Wait a bit for printer to reset (add empty bytes as delay)
        // Some printers need time to process the INIT command

        // Set print area width to match paper width
        // GS W - Set print area width
        val widthL = (pixelWidth % 256).toByte()
        val widthH = (pixelWidth / 256).toByte()
        buffer.write(byteArrayOf(GS, 0x57, widthL, widthH))

        // Set left margin to 0 for proper alignment
        buffer.write(byteArrayOf(GS, 0x4C, 0x00, 0x00))

        // Set line spacing to 0 for bitmap mode (prevents gaps between bitmap lines)
        if (useBitmapMode) {
            buffer.write(byteArrayOf(ESC, 0x33, 0x00)) // ESC 3 0 - Set line spacing to 0
        }

        // Ensure left alignment by default
        buffer.write(EscPosCommands.ALIGN_LEFT)

        return this
    }

    /**
     * In text - tự động chọn bitmap hoặc text mode
     */
    fun line(text: String, style: BitmapTextStyle = BitmapTextStyle()): HybridBillBuilder {
        if (text.isEmpty()) {
            buffer.write(EscPosCommands.LF)
            return this
        }

        // Sử dụng baseFontSize nếu style dùng font mặc định (24f)
        // và luôn sử dụng lineSpacing từ builder
        val actualStyle = if (style.fontSize == 24f) {
            style.copy(fontSize = baseFontSize, lineSpacingMultiplier = lineSpacing)
        } else {
            style.copy(lineSpacingMultiplier = lineSpacing)
        }

        if (useBitmapMode) {
            // BITMAP MODE - Đảm bảo Vietnamese hiển thị đúng
            val bitmap = BitmapTextRenderer.renderText(text, actualStyle, pixelWidth)
            // Chọn chế độ in bitmap phù hợp với máy in
            val imageData = if (useRasterBitmap) {
                // GS v 0 - Raster bitmap (EPSON, BIXOLON, máy in cao cấp)
                EscPosCommands.printRasterBitmap(bitmap, pixelWidth)
            } else {
                // ESC * - Bit image (XPRINTER, máy in giá rẻ Trung Quốc)
                EscPosCommands.printBitmap(bitmap, 0) // 0 = left align
            }
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
    fun lineCenter(text: String, style: BitmapTextStyle = BitmapTextStyle()): HybridBillBuilder {
        return line(text, style.copy(centerAlign = true))
    }

    /**
     * In text căn phải
     */
    fun lineRight(text: String, style: BitmapTextStyle = BitmapTextStyle()): HybridBillBuilder {
        return line(text, style.copy(rightAlign = true))
    }

    /**
     * In text đậm
     */
    fun lineBold(text: String, style: BitmapTextStyle = BitmapTextStyle()): HybridBillBuilder {
        return line(text, style.copy(bold = true))
    }

    /**
     * In text lớn (title) - sử dụng titleFontSize
     */
    fun lineDouble(text: String, style: BitmapTextStyle = BitmapTextStyle()): HybridBillBuilder {
        return line(text, BitmapTextStyle(
            fontSize = titleFontSize,
            bold = true,
            centerAlign = style.centerAlign,
            rightAlign = style.rightAlign,
            lineSpacingMultiplier = lineSpacing
        ))
    }

    /**
     * In key-value (ví dụ: "Tổng tiền:" và "100,000đ")
     */
    fun lineKeyValue(key: String, value: String, style: BitmapTextStyle = BitmapTextStyle()): HybridBillBuilder {
        // Nếu bold thì dùng totalFontSize (cho dòng TỔNG)
        val fontSize = if (style.bold) totalFontSize else baseFontSize
        val actualStyle = BitmapTextStyle(fontSize = fontSize, bold = style.bold, lineSpacingMultiplier = lineSpacing)

        if (useBitmapMode) {
            val bitmap = BitmapTextRenderer.renderKeyValue(key, value, pixelWidth, actualStyle)
            val imageData = if (useRasterBitmap) {
                EscPosCommands.printRasterBitmap(bitmap, pixelWidth)
            } else {
                EscPosCommands.printBitmap(bitmap, 0)
            }
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
     * In key-value đậm (cho danh sách món với số lượng > 1)
     */
    fun lineKeyValueBold(key: String, value: String): HybridBillBuilder {
        val actualStyle = BitmapTextStyle(fontSize = totalFontSize, bold = true, lineSpacingMultiplier = lineSpacing)

        if (useBitmapMode) {
            val bitmap = BitmapTextRenderer.renderKeyValue(key, value, pixelWidth, actualStyle)
            val imageData = if (useRasterBitmap) {
                EscPosCommands.printRasterBitmap(bitmap, pixelWidth)
            } else {
                EscPosCommands.printBitmap(bitmap, 0)
            }
            buffer.write(imageData)
            bitmap.recycle()
        } else {
            applyTextStyle(actualStyle)
            val spaces = lineWidth - key.length - value.length
            val line = if (spaces > 0) {
                key + " ".repeat(spaces) + value
            } else {
                "$key $value"
            }
            buffer.write(line.toByteArray(Charsets.UTF_8))
            buffer.write(EscPosCommands.LF)
            resetTextStyle()
        }
        return this
    }

    /**
     * In separator (đường kẻ ngang) - tối ưu chiều cao để tiết kiệm giấy
     */
    fun separator(char: Char = '-'): HybridBillBuilder {
        if (useBitmapMode) {
            // Sử dụng font nhỏ hơn (0.7x base) để separator mỏng hơn, tiết kiệm giấy
            val separatorFontSize = (baseFontSize * 0.7f).coerceAtLeast(12f)
            val bitmap = BitmapTextRenderer.renderSeparator(char, pixelWidth, separatorFontSize)
            val imageData = if (useRasterBitmap) {
                EscPosCommands.printRasterBitmap(bitmap, pixelWidth)
            } else {
                EscPosCommands.printBitmap(bitmap, 0)
            }
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
     * Note: In bitmap mode, line spacing is set to 0, so we need to reset it before feeding
     */
    fun feed(lines: Int = 1): HybridBillBuilder {
        if (useBitmapMode) {
            // Reset line spacing to default before feeding (otherwise feed won't work properly)
            buffer.write(EscPosCommands.LINE_SPACING_DEFAULT)
        }
        buffer.write(EscPosCommands.feedLines(lines))
        if (useBitmapMode) {
            // Set line spacing back to 0 for subsequent bitmap prints
            buffer.write(byteArrayOf(ESC, 0x33, 0x00))
        }
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
        // Ensure line spacing is reset to default before cutting
        // This ensures any previous text is properly positioned
        if (useBitmapMode) {
            buffer.write(EscPosCommands.LINE_SPACING_DEFAULT)
        }
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
                var socket: Socket? = null
                var outputStream: java.io.OutputStream? = null
                try {
                    socket = Socket().apply {
                        reuseAddress = true
                        keepAlive = true
                        tcpNoDelay = true
                        setSoLinger(true, 2)
                    }
                    socket.connect(InetSocketAddress(ip, port), CONNECTION_TIMEOUT)

                    outputStream = socket.getOutputStream()
                    outputStream.write(billContent)
                    outputStream.flush()

                    // Đợi máy in xử lý xong bitmap data
                    kotlinx.coroutines.delay(300)

                    return@withContext PrinterResult.Success("In thành công!")

                } catch (e: Exception) {
                    lastError = e.message
                    Log.e(TAG, "Print attempt ${attempt + 1} failed: ${e.message}")

                    if (attempt < maxRetries - 1) {
                        kotlinx.coroutines.delay(500L * (attempt + 1))
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
