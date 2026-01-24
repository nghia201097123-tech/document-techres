package com.techres.ccb.data.printer

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.util.Log
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import com.techres.ccb.printer.core.EscPosCommands
import java.io.ByteArrayOutputStream

/**
 * Single Canvas Bill Builder - Render toàn bộ bill trên 1 canvas duy nhất
 *
 * GIẢI PHÁP CHO VẤN ĐỀ JITTER:
 * - Thay vì render từng dòng riêng lẻ (gây GC pressure và jitter)
 * - Thu thập tất cả elements trước
 * - Render tất cả trên 1 canvas duy nhất
 * - Gửi 1 lần tới máy in
 *
 * LỢI ÍCH:
 * - Giảm GC pressure (chỉ tạo 1 bitmap lớn thay vì nhiều bitmap nhỏ)
 * - In mượt hơn (gửi 1 khối data liên tục)
 * - Line spacing chính xác và đồng nhất
 * - Tránh jitter do timing giữa các bitmap renders
 *
 * @author TechRes
 */
class SingleCanvasBillBuilder(
    private val paperWidth: Int = 80,
    private val fontScale: Float = 1.0f,
    private val lineSpacing: Float = 0.4f,
    private val separatorChar: Char = '-',
    private val doubleSeparatorChar: Char = '='
) {
    companion object {
        private const val TAG = "SingleCanvasBillBuilder"
    }

    // Pixel width based on paper size
    private val pixelWidth = BitmapTextRenderer.getPixelWidth(paperWidth)

    // Font sizes scaled by paper width AND fontScale config
    private val effectiveFontScale = fontScale.coerceIn(0.5f, 2.0f)
    val baseFontSize = BitmapTextRenderer.getBaseFontSize(paperWidth) * effectiveFontScale
    val titleFontSize = BitmapTextRenderer.getTitleFontSize(paperWidth) * effectiveFontScale
    val totalFontSize = BitmapTextRenderer.getTotalFontSize(paperWidth) * effectiveFontScale
    val lineWidth = BitmapTextRenderer.getLineWidth(paperWidth)

    // Elements to render (collected during build phase)
    private val elements = mutableListOf<PrintElement>()

    // Pre/Post commands (init, cut, beep, etc.)
    private val preCommands = ByteArrayOutputStream()
    private val postCommands = ByteArrayOutputStream()

    // ESC/POS Commands
    private val ESC = 0x1B.toByte()
    private val GS = 0x1D.toByte()

    /**
     * Sealed class đại diện cho các loại element cần in
     */
    sealed class PrintElement {
        abstract fun measureHeight(pixelWidth: Int): Int

        data class Text(
            val text: String,
            val fontSize: Float,
            val bold: Boolean = false,
            val italic: Boolean = false,
            val centerAlign: Boolean = false,
            val rightAlign: Boolean = false,
            val lineSpacing: Float = 0.4f
        ) : PrintElement() {
            override fun measureHeight(pixelWidth: Int): Int {
                if (text.isBlank()) return 0
                val paint = createTextPaint(fontSize, bold, italic)
                val layout = createStaticLayout(text, paint, pixelWidth, getAlignment(), lineSpacing)
                return layout.height + calculatePadding(layout.height, lineSpacing)
            }
        }

        data class KeyValue(
            val key: String,
            val value: String,
            val fontSize: Float,
            val bold: Boolean = false,
            val lineSpacing: Float = 0.4f,
            val fillChar: Char = ' ' // Ký tự fill giữa key và value (space hoặc dot)
        ) : PrintElement() {
            override fun measureHeight(pixelWidth: Int): Int {
                if (key.isBlank() && value.isBlank()) return 0
                val paint = createTextPaint(fontSize, bold, false)
                val fullText = buildKeyValueText(key, value, paint, pixelWidth, fillChar)
                val layout = createStaticLayout(fullText, paint, pixelWidth, Layout.Alignment.ALIGN_NORMAL, lineSpacing)
                return layout.height + calculatePadding(layout.height, lineSpacing)
            }
        }

        data class Separator(
            val char: Char,
            val fontSize: Float,
            val lineSpacing: Float = 0.4f
        ) : PrintElement() {
            override fun measureHeight(pixelWidth: Int): Int {
                val paint = createTextPaint(fontSize, false, false)
                val charWidth = paint.measureText(char.toString())
                val availableWidth = pixelWidth * 0.9f
                val charCount = (availableWidth / charWidth).toInt().coerceAtLeast(10)
                val text = char.toString().repeat(charCount)
                val layout = createStaticLayout(text, paint, pixelWidth, Layout.Alignment.ALIGN_CENTER, lineSpacing)
                return layout.height + calculatePadding(layout.height, lineSpacing)
            }
        }

        data class Feed(val lines: Int, val lineHeight: Float = 24f) : PrintElement() {
            override fun measureHeight(pixelWidth: Int): Int {
                // Render feed lines as blank space on canvas (not separate segment)
                // This eliminates jitter by keeping feed in the same canvas as footer
                return (lines * lineHeight * 1.5f).toInt()
            }
        }

        data class QrCode(val content: String, val size: Int = 6) : PrintElement() {
            override fun measureHeight(pixelWidth: Int): Int = 0 // Handled separately
        }

        data class Barcode(val content: String) : PrintElement() {
            override fun measureHeight(pixelWidth: Int): Int = 0 // Handled separately
        }

        /**
         * Table row với các cột có chiều rộng theo tỷ lệ phần trăm
         * Dùng pixel-based rendering để fill chính xác theo khổ giấy
         */
        data class TableRow(
            val columns: List<TableColumn>,
            val fontSize: Float,
            val bold: Boolean = false,
            val lineSpacing: Float = 0.4f,
            val separator: String = " " // Ký tự ngăn cách giữa các cột
        ) : PrintElement() {
            override fun measureHeight(pixelWidth: Int): Int {
                if (columns.isEmpty()) return 0
                val paint = createTextPaint(fontSize, bold, false)
                // Measure max height among all columns
                var maxHeight = 0
                val sepWidth = paint.measureText(separator)
                val totalSepWidth = sepWidth * (columns.size - 1).coerceAtLeast(0)
                val availableWidth = pixelWidth - totalSepWidth

                columns.forEach { col ->
                    val colWidth = (availableWidth * col.widthPercent / 100f).toInt()
                    val text = truncateTextToFit(col.text, paint, colWidth)
                    val layout = createStaticLayout(text, paint, colWidth.coerceAtLeast(1),
                        when (col.align) {
                            ColumnAlign.CENTER -> Layout.Alignment.ALIGN_CENTER
                            ColumnAlign.RIGHT -> Layout.Alignment.ALIGN_OPPOSITE
                            else -> Layout.Alignment.ALIGN_NORMAL
                        }, lineSpacing)
                    maxHeight = maxOf(maxHeight, layout.height)
                }
                return maxHeight + calculatePadding(maxHeight, lineSpacing)
            }

            companion object {
                fun truncateTextToFit(text: String, paint: TextPaint, maxWidth: Int): String {
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
        }

        data class TableColumn(
            val text: String,
            val widthPercent: Float, // Phần trăm chiều rộng (0-100)
            val align: ColumnAlign = ColumnAlign.LEFT
        )

        enum class ColumnAlign { LEFT, CENTER, RIGHT }

        companion object {
            fun createTextPaint(fontSize: Float, bold: Boolean, italic: Boolean): TextPaint {
                return TextPaint().apply {
                    color = Color.BLACK
                    textSize = fontSize
                    isAntiAlias = false
                    isSubpixelText = false
                    hinting = Paint.HINTING_ON
                    typeface = when {
                        bold && italic -> Typeface.create(Typeface.DEFAULT, Typeface.BOLD_ITALIC)
                        bold -> Typeface.DEFAULT_BOLD
                        italic -> Typeface.create(Typeface.DEFAULT, Typeface.ITALIC)
                        else -> Typeface.DEFAULT
                    }
                }
            }

            fun createStaticLayout(
                text: String,
                paint: TextPaint,
                width: Int,
                alignment: Layout.Alignment,
                lineSpacing: Float
            ): StaticLayout {
                val minInternalSpacing = 1.02f
                val userSpacingBoost = if (lineSpacing > 0.5f) {
                    (lineSpacing - 0.3f) / 0.7f * 0.08f
                } else 0f
                val internalLineSpacing = minInternalSpacing + userSpacingBoost

                return StaticLayout.Builder
                    .obtain(text, 0, text.length, paint, width)
                    .setAlignment(alignment)
                    .setLineSpacing(0f, internalLineSpacing)
                    .setIncludePad(false)
                    .build()
            }

            fun calculatePadding(contentHeight: Int, lineSpacing: Float): Int {
                val effectiveLineSpacing = lineSpacing.coerceIn(0.3f, 1.0f)
                val minRatio = 0.03f
                val maxRatio = 0.25f
                val paddingRatio = minRatio + (effectiveLineSpacing - 0.3f) / 0.7f * (maxRatio - minRatio)
                return (contentHeight * paddingRatio).toInt().coerceAtLeast(1) +
                        (contentHeight * 0.05f).toInt().coerceAtLeast(1) // top padding
            }

            fun buildKeyValueText(key: String, value: String, paint: TextPaint, paperWidth: Int, fillChar: Char = ' '): String {
                val valueWidth = paint.measureText(value)
                val fillCharWidth = paint.measureText(fillChar.toString())
                val keyWidth = paint.measureText(key)
                val minFillWidth = fillCharWidth * 2
                val maxFirstLineKeyWidth = paperWidth - valueWidth - minFillWidth

                return if (keyWidth <= maxFirstLineKeyWidth) {
                    val fillWidth = paperWidth - keyWidth - valueWidth
                    val fillCount = (fillWidth / fillCharWidth).toInt().coerceAtLeast(1)
                    val fill = fillChar.toString().repeat(fillCount)
                    "$key$fill$value"
                } else {
                    // Key too long - needs wrapping
                    var firstLineEndIndex = key.length
                    while (firstLineEndIndex > 0 && paint.measureText(key.substring(0, firstLineEndIndex)) > maxFirstLineKeyWidth) {
                        firstLineEndIndex--
                    }
                    val lastSpaceIndex = key.substring(0, firstLineEndIndex).lastIndexOf(' ')
                    if (lastSpaceIndex > firstLineEndIndex / 2) {
                        firstLineEndIndex = lastSpaceIndex
                    }

                    val firstLinePart = key.substring(0, firstLineEndIndex).trimEnd()
                    val remainingPart = key.substring(firstLineEndIndex).trimStart()
                    val firstLineKeyWidth = paint.measureText(firstLinePart)
                    val fillWidth = paperWidth - firstLineKeyWidth - valueWidth
                    val fillCount = (fillWidth / fillCharWidth).toInt().coerceAtLeast(1)
                    val fill = fillChar.toString().repeat(fillCount)
                    val firstLine = "$firstLinePart$fill$value"

                    if (remainingPart.isNotEmpty()) "$firstLine\n$remainingPart" else firstLine
                }
            }
        }

        protected fun getAlignment(): Layout.Alignment = when {
            this is Text && centerAlign -> Layout.Alignment.ALIGN_CENTER
            this is Text && rightAlign -> Layout.Alignment.ALIGN_OPPOSITE
            else -> Layout.Alignment.ALIGN_NORMAL
        }
    }

    // ==================== PUBLIC API ====================

    /**
     * Initialize printer
     */
    fun init(): SingleCanvasBillBuilder {
        preCommands.write(EscPosCommands.INIT)
        preCommands.write(byteArrayOf(ESC, 0x33, 0x00)) // Line spacing = 0
        preCommands.write(EscPosCommands.ALIGN_LEFT)
        return this
    }

    /**
     * In text thường
     */
    fun line(text: String, style: BitmapTextStyle = BitmapTextStyle()): SingleCanvasBillBuilder {
        if (text.isBlank()) return this
        val fontSize = if (style.fontSize == 24f) baseFontSize else style.fontSize
        elements.add(PrintElement.Text(
            text = text,
            fontSize = fontSize,
            bold = style.bold,
            italic = style.italic,
            centerAlign = style.centerAlign,
            rightAlign = style.rightAlign,
            lineSpacing = lineSpacing
        ))
        return this
    }

    /**
     * In text căn giữa
     */
    fun lineCenter(text: String, style: BitmapTextStyle = BitmapTextStyle()): SingleCanvasBillBuilder {
        return line(text, style.copy(centerAlign = true))
    }

    /**
     * In text căn phải
     */
    fun lineRight(text: String, style: BitmapTextStyle = BitmapTextStyle()): SingleCanvasBillBuilder {
        return line(text, style.copy(rightAlign = true))
    }

    /**
     * In text đậm
     */
    fun lineBold(text: String, style: BitmapTextStyle = BitmapTextStyle()): SingleCanvasBillBuilder {
        return line(text, style.copy(bold = true))
    }

    /**
     * In text nghiêng
     */
    fun lineItalic(text: String, style: BitmapTextStyle = BitmapTextStyle()): SingleCanvasBillBuilder {
        return line(text, style.copy(italic = true))
    }

    /**
     * In text đậm + nghiêng
     */
    fun lineBoldItalic(text: String, style: BitmapTextStyle = BitmapTextStyle()): SingleCanvasBillBuilder {
        return line(text, style.copy(bold = true, italic = true))
    }

    /**
     * In text lớn (title)
     */
    fun lineDouble(text: String, style: BitmapTextStyle = BitmapTextStyle()): SingleCanvasBillBuilder {
        if (text.isBlank()) return this
        elements.add(PrintElement.Text(
            text = text,
            fontSize = titleFontSize,
            bold = true,
            centerAlign = style.centerAlign,
            rightAlign = style.rightAlign,
            lineSpacing = lineSpacing
        ))
        return this
    }

    /**
     * In key-value
     */
    fun lineKeyValue(key: String, value: String, style: BitmapTextStyle = BitmapTextStyle(), dotFill: Boolean = false): SingleCanvasBillBuilder {
        if (key.isBlank() && value.isBlank()) return this
        val fontSize = if (style.bold) totalFontSize else baseFontSize
        elements.add(PrintElement.KeyValue(
            key = key,
            value = value,
            fontSize = fontSize,
            bold = style.bold,
            lineSpacing = lineSpacing,
            fillChar = if (dotFill) '.' else ' '
        ))
        return this
    }

    /**
     * In key-value đậm
     */
    fun lineKeyValueBold(key: String, value: String): SingleCanvasBillBuilder {
        return lineKeyValue(key, value, BitmapTextStyle(bold = true))
    }

    /**
     * In key-value với dấu chấm nối (dotted)
     * Ví dụ: Tên món...........Giá
     */
    fun lineKeyValueDotted(key: String, value: String, style: BitmapTextStyle = BitmapTextStyle()): SingleCanvasBillBuilder {
        return lineKeyValue(key, value, style, dotFill = true)
    }

    /**
     * In table row với các cột có chiều rộng theo tỷ lệ phần trăm
     * Sử dụng pixel-based rendering để fill chính xác theo khổ giấy
     *
     * @param columns Danh sách các cột (text, widthPercent, align)
     * @param style Style cho text
     * @param separator Ký tự ngăn cách giữa các cột (mặc định " ")
     */
    fun lineTable(
        columns: List<PrintElement.TableColumn>,
        style: BitmapTextStyle = BitmapTextStyle(),
        separator: String = " "
    ): SingleCanvasBillBuilder {
        if (columns.isEmpty()) return this
        val fontSize = if (style.bold) totalFontSize else baseFontSize
        elements.add(PrintElement.TableRow(
            columns = columns,
            fontSize = fontSize,
            bold = style.bold,
            lineSpacing = lineSpacing,
            separator = separator
        ))
        return this
    }

    /**
     * Helper để tạo TableColumn nhanh
     */
    fun tableColumn(text: String, widthPercent: Float, align: PrintElement.ColumnAlign = PrintElement.ColumnAlign.LEFT): PrintElement.TableColumn {
        return PrintElement.TableColumn(text, widthPercent, align)
    }

    /**
     * In separator - sử dụng separatorChar từ constructor (từ template config)
     */
    fun separator(char: Char = separatorChar): SingleCanvasBillBuilder {
        val separatorFontSize = (baseFontSize * 0.7f).coerceAtLeast(12f)
        elements.add(PrintElement.Separator(char, separatorFontSize, lineSpacing))
        return this
    }

    /**
     * In double separator - sử dụng doubleSeparatorChar từ constructor (từ template config)
     */
    fun doubleSeparator(char: Char = doubleSeparatorChar): SingleCanvasBillBuilder {
        return separator(char)
    }

    /**
     * Feed lines - rendered as blank space on canvas to prevent jitter
     */
    fun feed(lines: Int = 1): SingleCanvasBillBuilder {
        elements.add(PrintElement.Feed(lines, baseFontSize))
        return this
    }

    /**
     * In QR Code
     */
    fun qrCode(content: String, size: Int = 6): SingleCanvasBillBuilder {
        // Validate content - skip if empty or blank
        if (content.isBlank()) {
            Log.w(TAG, "QR code skipped: empty content")
            return this
        }
        elements.add(PrintElement.QrCode(content, size))
        return this
    }

    /**
     * In Barcode
     */
    fun barcode(content: String): SingleCanvasBillBuilder {
        elements.add(PrintElement.Barcode(content))
        return this
    }

    /**
     * Cắt giấy
     * QUAN TRỌNG: Phải feed giấy trước khi cắt để footer không bị dao cắt luôn
     * Khi dùng bitmap mode, khoảng trống trong bitmap không đủ - cần lệnh feed thật
     */
    fun cut(partial: Boolean = true): SingleCanvasBillBuilder {
        postCommands.write(EscPosCommands.LINE_SPACING_DEFAULT)
        // Feed 12 dòng (~30mm) để đảm bảo footer không bị cắt
        // Footer có 2 dòng (~6mm) + khoảng cách đầu in - dao cắt (~20mm) = 26mm
        // Thêm margin an toàn -> 30mm = 12 dòng
        postCommands.write(EscPosCommands.feedLines(12))
        postCommands.write(if (partial) EscPosCommands.CUT_PARTIAL else EscPosCommands.CUT_FULL)
        return this
    }

    /**
     * Mở ngăn kéo tiền
     */
    fun openCashDrawer(): SingleCanvasBillBuilder {
        postCommands.write(EscPosCommands.CASH_DRAWER_PIN2)
        return this
    }

    /**
     * Beep
     */
    fun beep(times: Int = 1): SingleCanvasBillBuilder {
        postCommands.write(EscPosCommands.beep(times, 2))
        return this
    }

    /**
     * Build bill thành danh sách Bitmap (cho Sunmi native printing)
     *
     * Trả về list các bitmap theo thứ tự cần in:
     * - Text batches được render thành bitmap
     * - QR code được render thành bitmap riêng
     *
     * @return List<Bitmap> - Danh sách các bitmap cần in (caller phải recycle sau khi dùng)
     */
    fun buildBitmaps(): List<Bitmap> {
        val startTime = System.currentTimeMillis()
        Log.d(TAG, "=== START BUILD BITMAPS (Single Canvas) ===")
        Log.d(TAG, "Total elements: ${elements.size}")

        val bitmaps = mutableListOf<Bitmap>()

        // Group elements into segments (text-batch between special elements)
        val segments = groupElementsIntoSegments()
        Log.d(TAG, "Grouped into ${segments.size} segments")

        // Render each segment
        segments.forEachIndexed { index, segment ->
            when (segment) {
                is Segment.TextBatch -> {
                    if (segment.elements.isNotEmpty()) {
                        val bitmap = renderTextBatchToBitmap(segment.elements)
                        if (bitmap != null) {
                            bitmaps.add(bitmap)
                            Log.d(TAG, "Segment $index: TextBatch bitmap ${bitmap.width}x${bitmap.height}")
                        }
                    }
                }
                is Segment.QrCodeSegment -> {
                    if (segment.content.isNotBlank()) {
                        val qrBitmap = renderQrSegmentToBitmap(segment)
                        if (qrBitmap != null) {
                            bitmaps.add(qrBitmap)
                            Log.d(TAG, "Segment $index: QRCode bitmap ${qrBitmap.width}x${qrBitmap.height}")
                        }
                    }
                }
                is Segment.BarcodeSegment -> {
                    // Barcode không hỗ trợ bitmap mode, skip
                    Log.d(TAG, "Segment $index: Barcode skipped in bitmap mode")
                }
                is Segment.FeedSegment -> {
                    // Feed segment không cần render bitmap riêng
                    Log.d(TAG, "Segment $index: Feed skipped in bitmap mode")
                }
            }
        }

        val elapsed = System.currentTimeMillis() - startTime
        Log.d(TAG, "=== BUILD BITMAPS COMPLETE ===")
        Log.d(TAG, "Total bitmaps: ${bitmaps.size}, Time: ${elapsed}ms")

        return bitmaps
    }

    /**
     * Render text batch thành Bitmap
     */
    private fun renderTextBatchToBitmap(batch: List<PrintElement>): Bitmap? {
        if (batch.isEmpty()) return null

        // Measure total height
        var totalHeight = 0
        val elementHeights = batch.map { element ->
            val height = element.measureHeight(pixelWidth)
            totalHeight += height
            height
        }

        if (totalHeight <= 0) return null

        // Create canvas
        val bitmap = Bitmap.createBitmap(pixelWidth, totalHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)

        // Render each element
        var currentY = 0f
        batch.forEachIndexed { index, element ->
            val height = elementHeights[index]
            if (height > 0) {
                renderElementOnCanvas(canvas, element, currentY)
                currentY += height
            }
        }

        return bitmap
    }

    /**
     * Render QR segment thành Bitmap full-width với QR căn giữa
     */
    private fun renderQrSegmentToBitmap(segment: Segment.QrCodeSegment): Bitmap? {
        val qrSize = (pixelWidth * 0.6).toInt().coerceIn(150, 300)

        // Check if URL or content
        val isQrImageUrl = segment.content.startsWith("https://qr.sepay.vn/") ||
                          segment.content.startsWith("https://img.vietqr.io/") ||
                          segment.content.startsWith("https://api.payos.vn/") ||
                          segment.content.startsWith("https://pay.payos.vn/")

        var qrBitmap: Bitmap? = null

        if (isQrImageUrl) {
            qrBitmap = downloadQrImageFromUrl(segment.content, qrSize)
            if (qrBitmap == null) {
                qrBitmap = generateQrCodeBitmap(segment.content, qrSize)
            }
        } else {
            qrBitmap = generateQrCodeBitmap(segment.content, qrSize)
        }

        if (qrBitmap != null) {
            val centeredBitmap = centerQrBitmap(qrBitmap, pixelWidth)
            qrBitmap.recycle()
            return centeredBitmap
        }

        return null
    }

    /**
     * Build thành byte array
     *
     * QUY TRÌNH SINGLE CANVAS RENDERING:
     * 1. Tách elements thành các nhóm: text-based và special (QR, Barcode, Feed)
     * 2. Tính tổng chiều cao cần thiết cho text-based elements
     * 3. Tạo 1 canvas duy nhất với chiều cao đó
     * 4. Render tất cả text-based elements lên canvas
     * 5. Convert canvas thành ESC/POS raster bitmap
     * 6. Xen kẽ special elements (QR, Barcode) đúng vị trí
     */
    fun build(): ByteArray {
        val startTime = System.currentTimeMillis()
        Log.d(TAG, "=== START BUILD (Single Canvas) ===")
        Log.d(TAG, "Total elements: ${elements.size}")

        val output = ByteArrayOutputStream()

        // 1. Write pre-commands (init, etc.)
        output.write(preCommands.toByteArray())

        // 2. Group elements into segments (text-batch between special elements)
        val segments = groupElementsIntoSegments()
        Log.d(TAG, "Grouped into ${segments.size} segments")

        // 3. Render each segment
        segments.forEachIndexed { index, segment ->
            when (segment) {
                is Segment.TextBatch -> {
                    if (segment.elements.isNotEmpty()) {
                        val bitmapData = renderTextBatchToSingleCanvas(segment.elements)
                        output.write(bitmapData)
                        Log.d(TAG, "Segment $index: TextBatch with ${segment.elements.size} elements, ${bitmapData.size} bytes")
                    }
                }
                is Segment.QrCodeSegment -> {
                    // Render QR code - support both URL images and generated QR
                    try {
                        // Skip empty content
                        if (segment.content.isBlank()) {
                            Log.w(TAG, "Segment $index: QRCode skipped (empty content)")
                        } else {
                            // QR size = 60% of paper width, capped between 150-300 pixels
                            // 58mm: pixelWidth=384, qrSize=230px
                            // 80mm: pixelWidth=576, qrSize=300px
                            val qrSize = (pixelWidth * 0.6).toInt().coerceIn(150, 300)

                            // Kiểm tra nếu content là URL hình ảnh QR
                            // Hỗ trợ: sepay.vn, vietqr.io, payos.vn
                            val isQrImageUrl = segment.content.startsWith("https://qr.sepay.vn/") ||
                                              segment.content.startsWith("https://img.vietqr.io/") ||
                                              segment.content.startsWith("https://api.payos.vn/") ||
                                              segment.content.startsWith("https://pay.payos.vn/")

                            var qrBitmap: Bitmap? = null

                            if (isQrImageUrl) {
                                // Tải hình ảnh QR từ URL (có logo ngân hàng)
                                Log.d(TAG, "Segment $index: Downloading QR image from URL")
                                qrBitmap = downloadQrImageFromUrl(segment.content, qrSize)

                                // Nếu download thất bại, fallback tạo QR từ URL content
                                // (sẽ tạo QR code chứa URL, user scan sẽ mở URL)
                                if (qrBitmap == null) {
                                    Log.w(TAG, "Segment $index: URL download failed, generating QR from URL content")
                                    qrBitmap = generateQrCodeBitmap(segment.content, qrSize)
                                }
                            } else {
                                // Generate QR code bằng ZXing (EMVCo data hoặc nội dung text)
                                qrBitmap = generateQrCodeBitmap(segment.content, qrSize)
                            }

                            if (qrBitmap != null) {
                                // Tạo bitmap full-width với QR code căn giữa
                                // ESC/POS ALIGN_CENTER không hoạt động với GS v 0 raster bitmap
                                val centeredBitmap = centerQrBitmap(qrBitmap, pixelWidth)
                                qrBitmap.recycle()

                                // In bitmap đã căn giữa (không scale vì đã đúng kích thước)
                                val qrData = EscPosCommands.printRasterBitmap(centeredBitmap, 0)
                                output.write(qrData)
                                Log.d(TAG, "Segment $index: QRCode centered (qr=${qrSize}, canvas=${centeredBitmap.width}x${centeredBitmap.height})")
                                centeredBitmap.recycle()
                            } else {
                                // Last resort: ESC/POS command (nhiều máy in không hỗ trợ)
                                Log.e(TAG, "Segment $index: All QR methods failed, trying ESC/POS command as last resort")
                                output.write(EscPosCommands.ALIGN_CENTER)
                                output.write(EscPosCommands.printQRCode(segment.content, segment.size))
                                output.write(EscPosCommands.ALIGN_LEFT)
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Segment $index: QRCode error: ${e.message}")
                        // Try ESC/POS as absolute last resort
                        try {
                            output.write(EscPosCommands.ALIGN_CENTER)
                            output.write(EscPosCommands.printQRCode(segment.content, segment.size))
                            output.write(EscPosCommands.ALIGN_LEFT)
                        } catch (e2: Exception) {
                            Log.e(TAG, "Segment $index: ESC/POS QR also failed: ${e2.message}")
                        }
                    }
                }
                is Segment.BarcodeSegment -> {
                    output.write(EscPosCommands.ALIGN_CENTER)
                    output.write(EscPosCommands.setBarcodeHeight(60))
                    output.write(EscPosCommands.setBarcodeWidth(2))
                    output.write(EscPosCommands.BarcodeTextPosition.BELOW)
                    output.write(EscPosCommands.printBarcode(EscPosCommands.BarcodeType.CODE128, segment.content))
                    output.write(EscPosCommands.ALIGN_LEFT)
                    Log.d(TAG, "Segment $index: Barcode")
                }
                is Segment.FeedSegment -> {
                    // DEPRECATED: Feed now rendered as blank space on canvas (included in TextBatch)
                    // This branch kept for backwards compatibility but should never be reached
                    // vì groupElementsIntoSegments() không còn tạo FeedSegment nữa
                    output.write(EscPosCommands.LINE_SPACING_DEFAULT)
                    output.write(EscPosCommands.feedLines(segment.lines))
                    output.write(byteArrayOf(ESC, 0x33, 0x00)) // Reset line spacing
                    Log.d(TAG, "Segment $index: Feed ${segment.lines} lines (DEPRECATED)")
                }
            }
        }

        // 4. Write post-commands (cut, beep, etc.)
        output.write(postCommands.toByteArray())

        val totalTime = System.currentTimeMillis() - startTime
        val result = output.toByteArray()
        Log.d(TAG, "=== BUILD COMPLETE ===")
        Log.d(TAG, "Total size: ${result.size} bytes, Time: ${totalTime}ms")

        return result
    }

    // ==================== INTERNAL ====================

    /**
     * Segment types for grouping
     */
    private sealed class Segment {
        data class TextBatch(val elements: List<PrintElement>) : Segment()
        data class QrCodeSegment(val content: String, val size: Int) : Segment()
        data class BarcodeSegment(val content: String) : Segment()
        data class FeedSegment(val lines: Int) : Segment()
    }

    /**
     * Group elements into segments
     * Text/KeyValue/Separator/Feed được gom thành TextBatch (Feed rendered as blank space)
     * QR/Barcode là segment riêng (vì dùng ESC/POS commands đặc biệt)
     *
     * QUAN TRỌNG: Feed được include trong TextBatch để tránh jitter ở footer
     * Trước đây Feed tạo segment riêng -> gây delay giữa footer và feed -> jitter
     */
    private fun groupElementsIntoSegments(): List<Segment> {
        val segments = mutableListOf<Segment>()
        val currentBatch = mutableListOf<PrintElement>()

        for (element in elements) {
            when (element) {
                // Text, KeyValue, TableRow, Separator, Feed đều gom vào TextBatch
                is PrintElement.Text, is PrintElement.KeyValue, is PrintElement.TableRow, is PrintElement.Separator, is PrintElement.Feed -> {
                    currentBatch.add(element)
                }
                is PrintElement.QrCode -> {
                    if (currentBatch.isNotEmpty()) {
                        segments.add(Segment.TextBatch(currentBatch.toList()))
                        currentBatch.clear()
                    }
                    segments.add(Segment.QrCodeSegment(element.content, element.size))
                }
                is PrintElement.Barcode -> {
                    if (currentBatch.isNotEmpty()) {
                        segments.add(Segment.TextBatch(currentBatch.toList()))
                        currentBatch.clear()
                    }
                    segments.add(Segment.BarcodeSegment(element.content))
                }
            }
        }

        // Add remaining batch
        if (currentBatch.isNotEmpty()) {
            segments.add(Segment.TextBatch(currentBatch.toList()))
        }

        return segments
    }

    /**
     * CORE: Render toàn bộ text batch lên 1 canvas duy nhất
     *
     * QUY TRÌNH:
     * 1. Đo chiều cao từng element
     * 2. Tạo 1 bitmap với tổng chiều cao
     * 3. Vẽ từng element lên canvas theo thứ tự
     * 4. Convert thành ESC/POS raster bitmap
     */
    private fun renderTextBatchToSingleCanvas(batch: List<PrintElement>): ByteArray {
        if (batch.isEmpty()) return ByteArray(0)

        // 1. Measure total height
        var totalHeight = 0
        val elementHeights = batch.map { element ->
            val height = element.measureHeight(pixelWidth)
            totalHeight += height
            height
        }

        if (totalHeight <= 0) return ByteArray(0)

        Log.d(TAG, "Single canvas: ${batch.size} elements, total height: ${totalHeight}px")

        // 2. Create single canvas
        val bitmap = Bitmap.createBitmap(pixelWidth, totalHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)

        // 3. Render each element at correct Y position
        var currentY = 0f
        batch.forEachIndexed { index, element ->
            val height = elementHeights[index]
            if (height > 0) {
                renderElementOnCanvas(canvas, element, currentY)
                currentY += height
            }
        }

        // 4. Convert to ESC/POS raster bitmap (GS v 0 - proven to work)
        val imageData = EscPosCommands.printRasterBitmap(bitmap, pixelWidth)
        bitmap.recycle()

        return imageData
    }

    /**
     * Render 1 element lên canvas tại vị trí Y cụ thể
     */
    private fun renderElementOnCanvas(canvas: Canvas, element: PrintElement, startY: Float) {
        when (element) {
            is PrintElement.Text -> renderTextOnCanvas(canvas, element, startY)
            is PrintElement.KeyValue -> renderKeyValueOnCanvas(canvas, element, startY)
            is PrintElement.TableRow -> renderTableRowOnCanvas(canvas, element, startY)
            is PrintElement.Separator -> renderSeparatorOnCanvas(canvas, element, startY)
            is PrintElement.Feed -> { /* Feed rendered as blank space - no drawing needed, height already reserved */ }
            else -> { /* QR, Barcode handled separately via special ESC/POS commands */ }
        }
    }

    private fun renderTextOnCanvas(canvas: Canvas, element: PrintElement.Text, startY: Float) {
        if (element.text.isBlank()) return

        val paint = PrintElement.createTextPaint(element.fontSize, element.bold, element.italic)
        val alignment = when {
            element.centerAlign -> Layout.Alignment.ALIGN_CENTER
            element.rightAlign -> Layout.Alignment.ALIGN_OPPOSITE
            else -> Layout.Alignment.ALIGN_NORMAL
        }
        val layout = PrintElement.createStaticLayout(element.text, paint, pixelWidth, alignment, element.lineSpacing)

        // Calculate top padding (5% for Vietnamese diacritics)
        val topPadding = (layout.height * 0.05f).coerceAtLeast(1f)

        canvas.save()
        canvas.translate(0f, startY + topPadding)
        layout.draw(canvas)
        canvas.restore()
    }

    private fun renderKeyValueOnCanvas(canvas: Canvas, element: PrintElement.KeyValue, startY: Float) {
        if (element.key.isBlank() && element.value.isBlank()) return

        val paint = PrintElement.createTextPaint(element.fontSize, element.bold, false)
        val fullText = PrintElement.buildKeyValueText(element.key, element.value, paint, pixelWidth, element.fillChar)
        val layout = PrintElement.createStaticLayout(fullText, paint, pixelWidth, Layout.Alignment.ALIGN_NORMAL, element.lineSpacing)

        val topPadding = (layout.height * 0.05f).coerceAtLeast(1f)

        canvas.save()
        canvas.translate(0f, startY + topPadding)
        layout.draw(canvas)
        canvas.restore()
    }

    /**
     * Render table row với pixel-based column widths
     * Mỗi cột được vẽ tại vị trí X chính xác dựa trên widthPercent
     */
    private fun renderTableRowOnCanvas(canvas: Canvas, element: PrintElement.TableRow, startY: Float) {
        if (element.columns.isEmpty()) return

        val paint = PrintElement.createTextPaint(element.fontSize, element.bold, false)
        val sepWidth = paint.measureText(element.separator)
        val totalSepWidth = sepWidth * (element.columns.size - 1).coerceAtLeast(0)
        val availableWidth = pixelWidth - totalSepWidth

        // Calculate row height (max of all columns)
        var maxHeight = 0
        element.columns.forEach { col ->
            val colWidth = (availableWidth * col.widthPercent / 100f).toInt().coerceAtLeast(1)
            val text = PrintElement.TableRow.truncateTextToFit(col.text, paint, colWidth)
            val alignment = when (col.align) {
                PrintElement.ColumnAlign.CENTER -> Layout.Alignment.ALIGN_CENTER
                PrintElement.ColumnAlign.RIGHT -> Layout.Alignment.ALIGN_OPPOSITE
                else -> Layout.Alignment.ALIGN_NORMAL
            }
            val layout = PrintElement.createStaticLayout(text, paint, colWidth, alignment, element.lineSpacing)
            maxHeight = maxOf(maxHeight, layout.height)
        }

        val topPadding = (maxHeight * 0.05f).coerceAtLeast(1f)

        // Render each column at correct X position
        var currentX = 0f
        element.columns.forEachIndexed { index, col ->
            val colWidth = (availableWidth * col.widthPercent / 100f).toInt().coerceAtLeast(1)
            val text = PrintElement.TableRow.truncateTextToFit(col.text, paint, colWidth)
            val alignment = when (col.align) {
                PrintElement.ColumnAlign.CENTER -> Layout.Alignment.ALIGN_CENTER
                PrintElement.ColumnAlign.RIGHT -> Layout.Alignment.ALIGN_OPPOSITE
                else -> Layout.Alignment.ALIGN_NORMAL
            }
            val layout = PrintElement.createStaticLayout(text, paint, colWidth, alignment, element.lineSpacing)

            canvas.save()
            canvas.translate(currentX, startY + topPadding)
            layout.draw(canvas)
            canvas.restore()

            currentX += colWidth

            // Draw separator if not last column
            if (index < element.columns.size - 1 && element.separator.isNotEmpty()) {
                canvas.drawText(element.separator, currentX, startY + topPadding + paint.textSize, paint)
                currentX += sepWidth
            }
        }
    }

    private fun renderSeparatorOnCanvas(canvas: Canvas, element: PrintElement.Separator, startY: Float) {
        val paint = PrintElement.createTextPaint(element.fontSize, false, false)
        val charWidth = paint.measureText(element.char.toString())
        val availableWidth = pixelWidth * 0.9f
        val charCount = (availableWidth / charWidth).toInt().coerceAtLeast(10)
        val text = element.char.toString().repeat(charCount)

        val layout = PrintElement.createStaticLayout(text, paint, pixelWidth, Layout.Alignment.ALIGN_CENTER, element.lineSpacing)

        val topPadding = (layout.height * 0.05f).coerceAtLeast(1f)

        canvas.save()
        canvas.translate(0f, startY + topPadding)
        layout.draw(canvas)
        canvas.restore()
    }

    /**
     * Generate QR code bitmap using ZXing library
     * @param content The content to encode in QR code
     * @param size The desired size of the QR code in pixels
     * @return Bitmap of the QR code, or null if generation fails
     *
     * OPTIMIZED FOR THERMAL PRINTING:
     * - Error Correction Level H (30%) - highest, best for thermal print degradation
     * - Margin 3 - adequate quiet zone for reliable scanning
     * - ARGB_8888 bitmap format - highest quality for printing
     */
    private fun generateQrCodeBitmap(content: String, size: Int): Bitmap? {
        return try {
            val hints = mapOf(
                EncodeHintType.CHARACTER_SET to "UTF-8",
                EncodeHintType.MARGIN to 3, // Adequate margin for thermal printing
                EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.H // 30% error correction - best for thermal
            )

            val qrCodeWriter = QRCodeWriter()
            val bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, size, size, hints)

            val width = bitMatrix.width
            val height = bitMatrix.height
            // Use ARGB_8888 for highest quality printing
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)

            for (x in 0 until width) {
                for (y in 0 until height) {
                    bitmap.setPixel(x, y, if (bitMatrix.get(x, y)) Color.BLACK else Color.WHITE)
                }
            }

            Log.d(TAG, "QR code bitmap generated: ${width}x${height}, content length: ${content.length}, error correction: H")
            bitmap
        } catch (e: Exception) {
            Log.e(TAG, "Failed to generate QR code bitmap: ${e.message}")
            null
        }
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
     * Tạo bitmap full-width với QR code căn giữa
     * ESC/POS ALIGN_CENTER không hoạt động với GS v 0 raster bitmap
     * nên phải căn giữa bằng cách thêm padding vào bitmap
     *
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
}
