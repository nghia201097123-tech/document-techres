package com.techres.ccb.data.printer

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.util.Log
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
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

// ==================== TABLE COLUMN STRUCTURES ====================

/**
 * Một cột trong table row với chiều rộng theo tỷ lệ phần trăm
 */
data class TableColumn(
    val text: String,
    val widthPercent: Float, // Phần trăm chiều rộng (0-100)
    val align: ColumnAlign = ColumnAlign.LEFT
)

/**
 * Căn lề cho cột trong table
 */
enum class ColumnAlign { LEFT, CENTER, RIGHT }

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
        // Internal line spacing cho text wrap (khi text dài xuống dòng)
        // Giảm xuống 1.02 để tiết kiệm giấy hơn mà vẫn đảm bảo không bị đè chữ
        val minInternalSpacing = 1.02f // Tối thiểu 102% - vừa đủ để không đè
        val userSpacingBoost = if (style.lineSpacingMultiplier > 0.5f) {
            (style.lineSpacingMultiplier - 0.3f) / 0.7f * 0.08f // Thêm tối đa 8% khi user chọn 100%
        } else 0f
        val internalLineSpacing = minInternalSpacing + userSpacingBoost
        val staticLayout = StaticLayout.Builder
            .obtain(text, 0, text.length, textPaint, paperWidth)
            .setAlignment(alignment)
            .setLineSpacing(0f, internalLineSpacing) // Đã giảm để tiết kiệm giấy
            .setIncludePad(false) // Bỏ padding thừa
            .build()

        // Tạo bitmap với chiều cao đầy đủ
        val fullHeight = staticLayout.height.coerceAtLeast(1)
        val fullBitmap = Bitmap.createBitmap(paperWidth, fullHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(fullBitmap)
        canvas.drawColor(Color.WHITE)

        // Vẽ text
        staticLayout.draw(canvas)

        // Crop bitmap và thêm padding dựa trên lineSpacing
        // lineSpacing ảnh hưởng đến khoảng cách giữa các dòng in
        return cropBitmapVertical(fullBitmap, style.lineSpacingMultiplier)
    }

    /**
     * Crop bitmap theo chiều dọc để loại bỏ khoảng trắng thừa
     * Thêm padding phía dưới dựa trên lineSpacing để tạo khoảng cách giữa các dòng
     * @param bitmap Bitmap gốc
     * @param lineSpacing Hệ số khoảng cách dòng (0.3 - 1.0), giá trị lớn hơn = khoảng cách lớn hơn
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
        if (contentHeight <= 0) {
            return bitmap // Không cần crop
        }

        // Tính padding phía dưới dựa trên lineSpacing VÀ contentHeight
        // lineSpacing: 0.3 = rất sát (tiết kiệm giấy), 1.0 = rộng (dễ đọc)
        // Giảm padding để tiết kiệm giấy hơn, đặc biệt với font lớn
        val effectiveLineSpacing = lineSpacing.coerceIn(0.3f, 1.0f)
        val minRatio = 0.03f // 3% của font height cho spacing tối thiểu (rất sát)
        val maxRatio = 0.25f // 25% của font height cho spacing tối đa
        val paddingRatio = minRatio + (effectiveLineSpacing - 0.3f) / 0.7f * (maxRatio - minRatio)
        val bottomPadding = (contentHeight * paddingRatio).toInt().coerceAtLeast(1)

        // Top padding để tránh cắt mất dấu tiếng Việt (ă, â, ê, ô, ơ, ư)
        // Giảm xuống 5% để tiết kiệm giấy hơn
        val topPadding = (contentHeight * 0.05f).toInt().coerceAtLeast(1) // 5% hoặc tối thiểu 1px

        // Crop content với top padding và bottom padding
        val cropTop = (topRow - topPadding).coerceAtLeast(0)
        val cropBottom = (bottomRow + 1).coerceAtMost(height)
        val actualContentHeight = cropBottom - cropTop
        val newHeight = actualContentHeight + bottomPadding

        // Tạo bitmap mới với padding
        val resultBitmap = Bitmap.createBitmap(width, newHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(resultBitmap)
        canvas.drawColor(Color.WHITE) // Fill với màu trắng

        // Copy content từ bitmap gốc (bao gồm top padding)
        val srcRect = android.graphics.Rect(0, cropTop, width, cropBottom)
        val dstRect = android.graphics.Rect(0, 0, width, actualContentHeight)
        canvas.drawBitmap(bitmap, srcRect, dstRect, null)

        // Recycle bitmap gốc
        bitmap.recycle()

        return resultBitmap
    }

    /**
     * Render separator line - tối ưu chiều cao
     */
    fun renderSeparator(
        char: Char = '-',
        paperWidth: Int = PAPER_WIDTH_80MM,
        fontSize: Float = 16f,
        lineSpacing: Float = 0.4f // Sử dụng lineSpacing từ config
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

        // Sử dụng lineSpacing từ config để đồng bộ với các dòng khác
        return renderText(
            char.toString().repeat(charCount),
            BitmapTextStyle(fontSize = fontSize, centerAlign = true, lineSpacingMultiplier = lineSpacing),
            paperWidth
        )
    }

    /**
     * Render key-value line (ví dụ: "Tên món dài...     x1  230.000đ")
     * Nếu key quá dài: xuống dòng, value luôn canh phải trên dòng đầu
     * @param fillChar Ký tự fill giữa key và value (mặc định ' ', dùng '.' cho dotted style)
     */
    fun renderKeyValue(
        key: String,
        value: String,
        paperWidth: Int = PAPER_WIDTH_80MM,
        style: BitmapTextStyle = BitmapTextStyle(),
        fillChar: Char = ' '
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
        val fillCharWidth = textPaint.measureText(fillChar.toString())
        val keyWidth = textPaint.measureText(key)

        // Cần ít nhất 2 fill characters giữa key và value
        val minFillWidth = fillCharWidth * 2
        val maxFirstLineKeyWidth = paperWidth - valueWidth - minFillWidth

        // Nếu key vừa trên 1 dòng
        if (keyWidth <= maxFirstLineKeyWidth) {
            val fillWidth = paperWidth - keyWidth - valueWidth
            val fillCount = (fillWidth / fillCharWidth).toInt().coerceAtLeast(1)
            val fill = fillChar.toString().repeat(fillCount)
            return renderText("$key$fill$value", style, paperWidth)
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
        val fillWidth = paperWidth - firstLineKeyWidth - valueWidth
        val fillCount = (fillWidth / fillCharWidth).toInt().coerceAtLeast(1)
        val fill = fillChar.toString().repeat(fillCount)

        // Dòng đầu: key (phần đầu) + fill + value (canh phải)
        val firstLine = "$firstLinePart$fill$value"

        // Dòng còn lại: phần key chưa in (wrap tự động bởi StaticLayout)
        val fullText = if (remainingPart.isNotEmpty()) {
            "$firstLine\n$remainingPart"
        } else {
            firstLine
        }

        return renderText(fullText, style, paperWidth)
    }

    /**
     * Render table row với các cột có chiều rộng theo tỷ lệ phần trăm
     * Sử dụng pixel-based rendering để fill chính xác theo khổ giấy
     */
    fun renderTableRow(
        columns: List<TableColumn>,
        paperWidth: Int = PAPER_WIDTH_80MM,
        style: BitmapTextStyle = BitmapTextStyle(),
        separator: String = ""
    ): Bitmap {
        if (columns.isEmpty()) {
            return Bitmap.createBitmap(paperWidth, 1, Bitmap.Config.RGB_565).apply {
                eraseColor(Color.WHITE)
            }
        }

        val textPaint = TextPaint().apply {
            color = Color.BLACK
            textSize = style.fontSize
            isAntiAlias = false
            isSubpixelText = false
            hinting = android.graphics.Paint.HINTING_ON
            typeface = if (style.bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        }

        val sepWidth = if (separator.isNotEmpty()) textPaint.measureText(separator) else 0f
        val totalSepWidth = sepWidth * (columns.size - 1).coerceAtLeast(0)
        val availableWidth = paperWidth - totalSepWidth

        // Measure max height of all columns
        var maxHeight = 0
        columns.forEach { col ->
            val colWidth = (availableWidth * col.widthPercent / 100f).toInt().coerceAtLeast(1)
            val text = truncateTextToFit(col.text, textPaint, colWidth)
            val alignment = when (col.align) {
                ColumnAlign.CENTER -> Layout.Alignment.ALIGN_CENTER
                ColumnAlign.RIGHT -> Layout.Alignment.ALIGN_OPPOSITE
                else -> Layout.Alignment.ALIGN_NORMAL
            }
            val layout = StaticLayout.Builder
                .obtain(text, 0, text.length, textPaint, colWidth)
                .setAlignment(alignment)
                .setLineSpacing(0f, 1.02f)
                .setIncludePad(false)
                .build()
            maxHeight = maxOf(maxHeight, layout.height)
        }

        // Add padding for Vietnamese diacritics
        val topPadding = (maxHeight * 0.05f).toInt().coerceAtLeast(1)
        val bottomPadding = (maxHeight * style.lineSpacingMultiplier * 0.3f).toInt().coerceAtLeast(1)
        val totalHeight = maxHeight + topPadding + bottomPadding

        // Create bitmap
        val bitmap = Bitmap.createBitmap(paperWidth, totalHeight.coerceAtLeast(1), Bitmap.Config.RGB_565)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)

        // Render each column at correct X position
        var currentX = 0f
        columns.forEachIndexed { index, col ->
            val colWidth = (availableWidth * col.widthPercent / 100f).toInt().coerceAtLeast(1)
            val text = truncateTextToFit(col.text, textPaint, colWidth)
            val alignment = when (col.align) {
                ColumnAlign.CENTER -> Layout.Alignment.ALIGN_CENTER
                ColumnAlign.RIGHT -> Layout.Alignment.ALIGN_OPPOSITE
                else -> Layout.Alignment.ALIGN_NORMAL
            }
            val layout = StaticLayout.Builder
                .obtain(text, 0, text.length, textPaint, colWidth)
                .setAlignment(alignment)
                .setLineSpacing(0f, 1.02f)
                .setIncludePad(false)
                .build()

            canvas.save()
            canvas.translate(currentX, topPadding.toFloat())
            layout.draw(canvas)
            canvas.restore()

            currentX += colWidth

            // Draw separator if not last column
            if (index < columns.size - 1 && separator.isNotEmpty()) {
                canvas.drawText(separator, currentX, topPadding + textPaint.textSize, textPaint)
                currentX += sepWidth
            }
        }

        return bitmap
    }

    /**
     * Truncate text to fit within maxWidth pixels
     */
    private fun truncateTextToFit(text: String, paint: TextPaint, maxWidth: Int): String {
        if (maxWidth <= 0) return ""
        val textWidth = paint.measureText(text)
        if (textWidth <= maxWidth) return text

        // Need to truncate
        var endIndex = text.length
        val ellipsis = "."
        val ellipsisWidth = paint.measureText(ellipsis)

        while (endIndex > 0) {
            val truncated = text.substring(0, endIndex) + ellipsis
            if (paint.measureText(truncated) <= maxWidth) {
                return truncated
            }
            endIndex--
        }
        return ellipsis
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
    private val lineSpacing: Float = 0.4f, // Line spacing multiplier: 0.3-1.0, default 0.4 = tight
    private val separatorChar: Char = '-', // Ký tự phân cách đơn (từ template config)
    private val doubleSeparatorChar: Char = '=' // Ký tự phân cách kép (từ template config)
) {
    companion object {
        private const val TAG = "HybridBillBuilder"
    }

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

    // Pre-rendered separators (lazy init để tránh render khi không cần)
    // Sử dụng separatorChar và doubleSeparatorChar từ constructor (từ template config)
    private val cachedSingleSeparator: ByteArray by lazy {
        prerenderSeparator(separatorChar)
    }
    private val cachedDoubleSeparator: ByteArray by lazy {
        prerenderSeparator(doubleSeparatorChar)
    }

    /**
     * Pre-render separator thành byte array để tái sử dụng
     * Chỉ gọi 1 lần khi cần, sau đó dùng lại từ cache
     */
    private fun prerenderSeparator(char: Char): ByteArray {
        if (!useBitmapMode) {
            // Text mode: trả về bytes trực tiếp
            val textBytes = ByteArrayOutputStream()
            textBytes.write(char.toString().repeat(lineWidth).toByteArray(Charsets.UTF_8))
            textBytes.write(EscPosCommands.LF)
            return textBytes.toByteArray()
        }

        // Bitmap mode: render 1 lần và cache
        val separatorFontSize = (baseFontSize * 0.7f).coerceAtLeast(12f)
        val bitmap = BitmapTextRenderer.renderSeparator(char, pixelWidth, separatorFontSize, lineSpacing)
        val imageData = if (useRasterBitmap) {
            EscPosCommands.printRasterBitmap(bitmap, pixelWidth)
        } else {
            EscPosCommands.printBitmap(bitmap, 0)
        }
        bitmap.recycle()
        return imageData
    }

    /**
     * Initialize printer
     * Giống kitchen ticket - đơn giản nhất có thể để tránh issues
     */
    fun init(): HybridBillBuilder {
        // Reset printer to default state (giống kitchen ticket - không CANCEL)
        buffer.write(EscPosCommands.INIT)

        // Set line spacing to 0 for bitmap mode (giống kitchen ticket)
        if (useBitmapMode) {
            buffer.write(byteArrayOf(ESC, 0x33, 0x00)) // ESC 3 0 - Set line spacing to 0
        }

        // Ensure left alignment by default
        buffer.write(EscPosCommands.ALIGN_LEFT)

        return this
    }

    /**
     * In text - tự động chọn bitmap hoặc text mode
     * KHÔNG in gì nếu text rỗng hoặc chỉ chứa whitespace
     */
    fun line(text: String, style: BitmapTextStyle = BitmapTextStyle()): HybridBillBuilder {
        // QUAN TRỌNG: Bỏ qua text rỗng hoặc chỉ whitespace để tránh khoảng trắng vô nghĩa
        if (text.isEmpty() || text.isBlank()) {
            return this // Không in gì cả, không có LF
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

            // Bỏ qua bitmap quá nhỏ (chỉ chứa whitespace sau khi crop)
            if (bitmap.height <= 2) {
                bitmap.recycle()
                return this
            }

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
     * In text nghiêng (italic) - dùng cho ghi chú
     */
    fun lineItalic(text: String, style: BitmapTextStyle = BitmapTextStyle()): HybridBillBuilder {
        return line(text, style.copy(italic = true))
    }

    /**
     * In text đậm + nghiêng - dùng cho ghi chú quan trọng
     */
    fun lineBoldItalic(text: String, style: BitmapTextStyle = BitmapTextStyle()): HybridBillBuilder {
        return line(text, style.copy(bold = true, italic = true))
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
     * @param fillChar Ký tự fill giữa key và value (mặc định ' ', dùng '.' cho dotted style)
     */
    fun lineKeyValue(key: String, value: String, style: BitmapTextStyle = BitmapTextStyle(), fillChar: Char = ' '): HybridBillBuilder {
        // Bỏ qua nếu cả key và value đều blank
        if (key.isBlank() && value.isBlank()) {
            return this
        }

        // Nếu bold thì dùng totalFontSize (cho dòng TỔNG)
        val fontSize = if (style.bold) totalFontSize else baseFontSize
        val actualStyle = BitmapTextStyle(fontSize = fontSize, bold = style.bold, lineSpacingMultiplier = lineSpacing)

        if (useBitmapMode) {
            val bitmap = BitmapTextRenderer.renderKeyValue(key, value, pixelWidth, actualStyle, fillChar)

            // Bỏ qua bitmap quá nhỏ
            if (bitmap.height <= 2) {
                bitmap.recycle()
                return this
            }

            val imageData = if (useRasterBitmap) {
                EscPosCommands.printRasterBitmap(bitmap, pixelWidth)
            } else {
                EscPosCommands.printBitmap(bitmap, 0)
            }
            buffer.write(imageData)
            bitmap.recycle()
        } else {
            val fillCount = lineWidth - key.length - value.length
            val line = if (fillCount > 0) {
                key + fillChar.toString().repeat(fillCount) + value
            } else {
                "$key $value"
            }
            buffer.write(line.toByteArray(Charsets.UTF_8))
            buffer.write(EscPosCommands.LF)
        }
        return this
    }

    /**
     * In key-value với dấu chấm nối (dotted style)
     * Sử dụng pixel-accurate dot filling để hiển thị hết khổ giấy
     */
    fun lineKeyValueDotted(key: String, value: String, style: BitmapTextStyle = BitmapTextStyle()): HybridBillBuilder {
        return lineKeyValue(key, value, style, '.')
    }

    /**
     * In table row với các cột có chiều rộng theo tỷ lệ phần trăm
     * Sử dụng pixel-based rendering để fill chính xác theo khổ giấy
     *
     * @param columns Danh sách các cột (text, widthPercent, align)
     * @param style Style cho text
     * @param separator Ký tự ngăn cách giữa các cột (mặc định "")
     */
    fun lineTable(
        columns: List<TableColumn>,
        style: BitmapTextStyle = BitmapTextStyle(),
        separator: String = ""
    ): HybridBillBuilder {
        if (columns.isEmpty()) return this

        val fontSize = if (style.bold) totalFontSize else baseFontSize
        val actualStyle = BitmapTextStyle(fontSize = fontSize, bold = style.bold, lineSpacingMultiplier = lineSpacing)

        if (useBitmapMode) {
            val bitmap = BitmapTextRenderer.renderTableRow(columns, pixelWidth, actualStyle, separator)

            if (bitmap.height <= 2) {
                bitmap.recycle()
                return this
            }

            val imageData = if (useRasterBitmap) {
                EscPosCommands.printRasterBitmap(bitmap, pixelWidth)
            } else {
                EscPosCommands.printBitmap(bitmap, 0)
            }
            buffer.write(imageData)
            bitmap.recycle()
        } else {
            // Fallback: text mode - use character-based approximation
            val totalPercent = columns.sumOf { it.widthPercent.toDouble() }.toFloat()
            val line = buildString {
                columns.forEachIndexed { index, col ->
                    val colCharWidth = ((col.widthPercent / totalPercent) * lineWidth).toInt().coerceAtLeast(1)
                    val text = if (col.text.length > colCharWidth) {
                        col.text.take(colCharWidth - 1) + "."
                    } else {
                        when (col.align) {
                            ColumnAlign.RIGHT -> col.text.padStart(colCharWidth)
                            ColumnAlign.CENTER -> col.text.padStart((colCharWidth + col.text.length) / 2).padEnd(colCharWidth)
                            else -> col.text.padEnd(colCharWidth)
                        }
                    }
                    append(text)
                    if (index < columns.size - 1) append(separator)
                }
            }
            buffer.write(line.toByteArray(Charsets.UTF_8))
            buffer.write(EscPosCommands.LF)
        }
        return this
    }

    /**
     * Helper để tạo TableColumn nhanh
     */
    fun tableColumn(text: String, widthPercent: Float, align: ColumnAlign = ColumnAlign.LEFT): TableColumn {
        return TableColumn(text, widthPercent, align)
    }

    /**
     * In key-value đậm (cho danh sách món với số lượng > 1)
     */
    fun lineKeyValueBold(key: String, value: String): HybridBillBuilder {
        // Bỏ qua nếu cả key và value đều blank
        if (key.isBlank() && value.isBlank()) {
            return this
        }

        val actualStyle = BitmapTextStyle(fontSize = totalFontSize, bold = true, lineSpacingMultiplier = lineSpacing)

        if (useBitmapMode) {
            val bitmap = BitmapTextRenderer.renderKeyValue(key, value, pixelWidth, actualStyle)

            // Bỏ qua bitmap quá nhỏ
            if (bitmap.height <= 2) {
                bitmap.recycle()
                return this
            }

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
     * In separator (đường kẻ ngang) - sử dụng pre-rendered cache để tránh jitter
     *
     * ĐÃ TỐI ƯU: Separator được render sẵn khi builder khởi tạo,
     * sau đó tái sử dụng từ cache. Điều này giúp:
     * - Tránh render bitmap nhiều lần gây jitter
     * - Giảm GC pressure do không tạo/recycle bitmap liên tục
     * - In mượt hơn vì data đã sẵn sàng
     */
    fun separator(char: Char = separatorChar): HybridBillBuilder {
        // Sử dụng cached data nếu char trùng với separatorChar hoặc doubleSeparatorChar
        val cachedData = when (char) {
            separatorChar -> cachedSingleSeparator
            doubleSeparatorChar -> cachedDoubleSeparator
            else -> null
        }

        if (cachedData != null) {
            // Dùng cached data - nhanh, không cần render
            buffer.write(cachedData)
        } else {
            // Fallback: render separator cho ký tự khác (hiếm khi dùng)
            if (useBitmapMode) {
                val separatorFontSize = (baseFontSize * 0.7f).coerceAtLeast(12f)
                val bitmap = BitmapTextRenderer.renderSeparator(char, pixelWidth, separatorFontSize, lineSpacing)
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
        }
        return this
    }

    /**
     * In double separator - sử dụng doubleSeparatorChar từ constructor (từ template config)
     * Dùng pre-rendered cache nếu char trùng với doubleSeparatorChar
     */
    fun doubleSeparator(char: Char = doubleSeparatorChar): HybridBillBuilder {
        if (char == doubleSeparatorChar) {
            // Dùng cached data
            buffer.write(cachedDoubleSeparator)
        } else {
            // Render mới cho ký tự khác
            separator(char)
        }
        return this
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
     * In QR Code - hỗ trợ cả URL hình ảnh và nội dung QR
     * Nếu content là URL (https://qr.sepay.vn/...) -> tải hình ảnh từ URL
     * Nếu không -> generate QR code bằng ZXing
     *
     * QR size được scale theo paperWidth:
     * - 58mm: pixelWidth=384, qrSize=230px (60% width, capped 150-300)
     * - 80mm: pixelWidth=576, qrSize=300px
     *
     * QR code được căn giữa bằng cách tạo bitmap full-width với QR ở giữa
     * (ESC/POS ALIGN_CENTER không hoạt động với GS v 0 raster bitmap)
     */
    fun qrCode(content: String, size: Int = 6): HybridBillBuilder {
        // Skip empty content
        if (content.isBlank()) {
            Log.w(TAG, "QR code skipped: empty content")
            return this
        }

        try {
            // QR size = 60% of paper width, capped between 150-300 pixels
            val qrSize = (pixelWidth * 0.6).toInt().coerceIn(150, 300)
            Log.d(TAG, "QR code: paperWidth-based pixelWidth=$pixelWidth, qrSize=$qrSize")

            // Kiểm tra nếu content là URL hình ảnh QR
            // Hỗ trợ: sepay.vn, vietqr.io, payos.vn
            val isQrImageUrl = content.startsWith("https://qr.sepay.vn/") ||
                              content.startsWith("https://img.vietqr.io/") ||
                              content.startsWith("https://api.payos.vn/") ||
                              content.startsWith("https://pay.payos.vn/")

            var qrBitmap: Bitmap? = null

            if (isQrImageUrl) {
                // Tải hình ảnh QR từ URL
                Log.d(TAG, "Downloading QR image from URL: $content")
                qrBitmap = downloadQrImageFromUrl(content, qrSize)

                // Nếu download thất bại, fallback tạo QR từ URL content
                if (qrBitmap == null) {
                    Log.w(TAG, "URL download failed, generating QR from URL content")
                    qrBitmap = generateQrCodeBitmap(content, qrSize)
                }
            } else {
                // Generate QR code bằng ZXing (EMVCo data hoặc nội dung text)
                Log.d(TAG, "Generating QR code with ZXing: $content")
                qrBitmap = generateQrCodeBitmap(content, qrSize)
            }

            if (qrBitmap != null) {
                // Tạo bitmap full-width với QR code căn giữa
                // ESC/POS ALIGN_CENTER không hoạt động với GS v 0 raster bitmap
                // nên phải căn giữa bằng cách thêm padding vào bitmap
                val centeredBitmap = centerQrBitmap(qrBitmap, pixelWidth)
                qrBitmap.recycle()

                // In bitmap đã căn giữa (không scale vì đã đúng kích thước)
                buffer.write(EscPosCommands.printRasterBitmap(centeredBitmap, 0))
                Log.d(TAG, "QR code printed centered: qr=${qrSize}x${qrSize}, canvas=${centeredBitmap.width}x${centeredBitmap.height}")
                centeredBitmap.recycle()
            } else {
                // Last resort: ESC/POS QR command (nhiều máy in không hỗ trợ)
                Log.e(TAG, "All QR methods failed, trying ESC/POS command as last resort")
                buffer.write(EscPosCommands.ALIGN_CENTER)
                buffer.write(EscPosCommands.printQRCode(content, size))
                buffer.write(EscPosCommands.ALIGN_LEFT)
            }
        } catch (e: Exception) {
            Log.e(TAG, "QR code error: ${e.message}")
            try {
                buffer.write(EscPosCommands.ALIGN_CENTER)
                buffer.write(EscPosCommands.printQRCode(content, size))
                buffer.write(EscPosCommands.ALIGN_LEFT)
            } catch (e2: Exception) {
                Log.e(TAG, "ESC/POS QR also failed: ${e2.message}")
            }
        }
        return this
    }

    /**
     * Tạo bitmap full-width với QR code căn giữa
     * @param qrBitmap QR code bitmap (nhỏ hơn targetWidth)
     * @param targetWidth Độ rộng của khổ giấy (pixels)
     * @return Bitmap mới với QR code căn giữa trên nền trắng
     */
    private fun centerQrBitmap(qrBitmap: Bitmap, targetWidth: Int): Bitmap {
        val qrWidth = qrBitmap.width
        val qrHeight = qrBitmap.height

        // Nếu QR đã bằng hoặc lớn hơn targetWidth, không cần căn giữa
        if (qrWidth >= targetWidth) {
            return qrBitmap.copy(Bitmap.Config.ARGB_8888, false)
        }

        // Tạo canvas với chiều rộng = targetWidth
        val centeredBitmap = Bitmap.createBitmap(targetWidth, qrHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(centeredBitmap)

        // Fill nền trắng
        canvas.drawColor(Color.WHITE)

        // Tính vị trí x để căn giữa QR
        val leftPadding = (targetWidth - qrWidth) / 2f

        // Vẽ QR code căn giữa
        canvas.drawBitmap(qrBitmap, leftPadding, 0f, null)

        return centeredBitmap
    }

    /**
     * Tải hình ảnh QR từ URL (sepay.vn, vietqr.io)
     * Hình ảnh đã có logo ngân hàng và VietQR branding
     * Có retry logic với 3 lần thử, timeout 8 giây
     */
    private fun downloadQrImageFromUrl(url: String, targetSize: Int): Bitmap? {
        val maxRetries = 3
        val connectTimeout = 8000 // Tăng từ 5s lên 8s
        val readTimeout = 10000   // Tăng từ 5s lên 10s

        for (attempt in 1..maxRetries) {
            try {
                Log.d(TAG, "Downloading QR image (attempt $attempt/$maxRetries): $url")
                val connection = java.net.URL(url).openConnection() as java.net.HttpURLConnection
                connection.connectTimeout = connectTimeout
                connection.readTimeout = readTimeout
                connection.doInput = true
                connection.setRequestProperty("User-Agent", "CCB-Android-POS")
                connection.connect()

                if (connection.responseCode == java.net.HttpURLConnection.HTTP_OK) {
                    val inputStream = connection.inputStream
                    val originalBitmap = android.graphics.BitmapFactory.decodeStream(inputStream)
                    inputStream.close()
                    connection.disconnect()

                    if (originalBitmap != null) {
                        // Scale bitmap to target size while maintaining aspect ratio
                        val scale = targetSize.toFloat() / originalBitmap.width.coerceAtLeast(originalBitmap.height)
                        val newWidth = (originalBitmap.width * scale).toInt()
                        val newHeight = (originalBitmap.height * scale).toInt()
                        val scaledBitmap = Bitmap.createScaledBitmap(originalBitmap, newWidth, newHeight, true)
                        if (scaledBitmap != originalBitmap) {
                            originalBitmap.recycle()
                        }
                        Log.d(TAG, "Downloaded QR image successfully: ${scaledBitmap.width}x${scaledBitmap.height}")
                        return scaledBitmap
                    } else {
                        Log.e(TAG, "Failed to decode QR image from URL (attempt $attempt)")
                    }
                } else {
                    Log.e(TAG, "HTTP error ${connection.responseCode} (attempt $attempt)")
                    connection.disconnect()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error downloading QR image (attempt $attempt): ${e.message}")
            }

            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
                try {
                    Thread.sleep((attempt * 500).toLong())
                } catch (e: InterruptedException) {
                    break
                }
            }
        }

        Log.e(TAG, "Failed to download QR image after $maxRetries attempts")
        return null
    }

    /**
     * Generate QR code bitmap using ZXing library (fallback)
     */
    private fun generateQrCodeBitmap(content: String, size: Int): Bitmap? {
        return try {
            val hints = mapOf(
                EncodeHintType.CHARACTER_SET to "UTF-8",
                EncodeHintType.MARGIN to 1
            )
            val qrCodeWriter = QRCodeWriter()
            val bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, size, size, hints)
            val width = bitMatrix.width
            val height = bitMatrix.height
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
            for (x in 0 until width) {
                for (y in 0 until height) {
                    bitmap.setPixel(x, y, if (bitMatrix.get(x, y)) Color.BLACK else Color.WHITE)
                }
            }
            bitmap
        } catch (e: Exception) {
            Log.e(TAG, "Failed to generate QR bitmap: ${e.message}")
            null
        }
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
     * QUAN TRỌNG: Phải feed giấy trước khi cắt để footer không bị dao cắt luôn
     *
     * FIX cho Sunmi T1: Thêm feed lines trước khi cut để đảm bảo footer không bị cắt
     */
    fun cut(partial: Boolean = true): HybridBillBuilder {
        // Ensure line spacing is reset to default before cutting
        // This ensures any previous text is properly positioned
        if (useBitmapMode) {
            buffer.write(EscPosCommands.LINE_SPACING_DEFAULT)
        }
        // FIX: Feed 16 dòng (~40mm) trước khi cắt để đảm bảo footer không bị cắt
        // Sunmi T1 có khoảng cách đầu in - dao cắt khoảng 20-25mm
        buffer.write(EscPosCommands.feedLines(16))
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
