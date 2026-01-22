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
            val lineSpacing: Float = 0.4f
        ) : PrintElement() {
            override fun measureHeight(pixelWidth: Int): Int {
                if (key.isBlank() && value.isBlank()) return 0
                val paint = createTextPaint(fontSize, bold, false)
                val fullText = buildKeyValueText(key, value, paint, pixelWidth)
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

            fun buildKeyValueText(key: String, value: String, paint: TextPaint, paperWidth: Int): String {
                val valueWidth = paint.measureText(value)
                val spaceCharWidth = paint.measureText(" ")
                val keyWidth = paint.measureText(key)
                val minSpaceWidth = spaceCharWidth * 2
                val maxFirstLineKeyWidth = paperWidth - valueWidth - minSpaceWidth

                return if (keyWidth <= maxFirstLineKeyWidth) {
                    val spaceWidth = paperWidth - keyWidth - valueWidth
                    val spaces = " ".repeat((spaceWidth / spaceCharWidth).toInt().coerceAtLeast(1))
                    "$key$spaces$value"
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
                    val spaceWidth = paperWidth - firstLineKeyWidth - valueWidth
                    val spaces = " ".repeat((spaceWidth / spaceCharWidth).toInt().coerceAtLeast(1))
                    val firstLine = "$firstLinePart$spaces$value"

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
    fun lineKeyValue(key: String, value: String, style: BitmapTextStyle = BitmapTextStyle()): SingleCanvasBillBuilder {
        if (key.isBlank() && value.isBlank()) return this
        val fontSize = if (style.bold) totalFontSize else baseFontSize
        elements.add(PrintElement.KeyValue(
            key = key,
            value = value,
            fontSize = fontSize,
            bold = style.bold,
            lineSpacing = lineSpacing
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
        // Feed 7 dòng để đảm bảo footer không bị cắt (tăng từ 5 lên 7)
        postCommands.write(EscPosCommands.feedLines(7))
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
                        // Increase minimum size for better scannability when printed
                        // 80mm paper = 576px width, 58mm = 384px width
                        // Min 280px ensures readable QR even on low DPI thermal printers
                        val qrSize = (pixelWidth * 0.65).toInt().coerceIn(280, 380) // 65% of paper width

                        // Kiểm tra nếu content là URL hình ảnh QR (sepay.vn, vietqr.io)
                        val qrBitmap = if (segment.content.startsWith("https://qr.sepay.vn/") ||
                                           segment.content.startsWith("https://img.vietqr.io/")) {
                            // Tải hình ảnh QR từ URL (có logo ngân hàng)
                            Log.d(TAG, "Segment $index: Downloading QR image from URL")
                            downloadQrImageFromUrl(segment.content, qrSize)
                        } else {
                            // Generate QR code bằng ZXing
                            generateQrCodeBitmap(segment.content, qrSize)
                        }

                        if (qrBitmap != null) {
                            // Center align before printing
                            output.write(EscPosCommands.ALIGN_CENTER)
                            val qrData = EscPosCommands.printRasterBitmap(qrBitmap, qrBitmap.width)
                            output.write(qrData)
                            output.write(EscPosCommands.ALIGN_LEFT)
                            Log.d(TAG, "Segment $index: QRCode as bitmap (${qrBitmap.width}x${qrBitmap.height})")
                            qrBitmap.recycle()
                        } else {
                            Log.e(TAG, "Segment $index: QRCode bitmap failed, trying ESC/POS command")
                            // Fallback to ESC/POS command
                            output.write(EscPosCommands.ALIGN_CENTER)
                            output.write(EscPosCommands.printQRCode(segment.content, segment.size))
                            output.write(EscPosCommands.ALIGN_LEFT)
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Segment $index: QRCode error: ${e.message}, trying ESC/POS command")
                        // Fallback to ESC/POS command
                        output.write(EscPosCommands.ALIGN_CENTER)
                        output.write(EscPosCommands.printQRCode(segment.content, segment.size))
                        output.write(EscPosCommands.ALIGN_LEFT)
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
                // Text, KeyValue, Separator, Feed đều gom vào TextBatch
                is PrintElement.Text, is PrintElement.KeyValue, is PrintElement.Separator, is PrintElement.Feed -> {
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
        val fullText = PrintElement.buildKeyValueText(element.key, element.value, paint, pixelWidth)
        val layout = PrintElement.createStaticLayout(fullText, paint, pixelWidth, Layout.Alignment.ALIGN_NORMAL, element.lineSpacing)

        val topPadding = (layout.height * 0.05f).coerceAtLeast(1f)

        canvas.save()
        canvas.translate(0f, startY + topPadding)
        layout.draw(canvas)
        canvas.restore()
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
     */
    private fun downloadQrImageFromUrl(url: String, targetSize: Int): Bitmap? {
        return try {
            val connection = java.net.URL(url).openConnection() as java.net.HttpURLConnection
            connection.connectTimeout = 5000
            connection.readTimeout = 5000
            connection.doInput = true
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
                    Log.d(TAG, "Downloaded QR image: ${scaledBitmap.width}x${scaledBitmap.height}")
                    scaledBitmap
                } else {
                    Log.e(TAG, "Failed to decode QR image from URL")
                    null
                }
            } else {
                Log.e(TAG, "Failed to download QR image: HTTP ${connection.responseCode}")
                connection.disconnect()
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error downloading QR image: ${e.message}")
            null
        }
    }
}
