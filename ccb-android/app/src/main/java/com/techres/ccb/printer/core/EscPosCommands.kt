package com.techres.ccb.printer.core

import android.graphics.Bitmap
import java.io.ByteArrayOutputStream
import java.nio.charset.Charset

/**
 * ESC/POS Commands - Chuẩn lệnh máy in nhiệt
 *
 * Hỗ trợ các hãng:
 * - Epson TM series
 * - Star Micronics
 * - Bixolon
 * - Citizen
 * - Sunmi
 * - XPrinter
 * - HPRT
 * - Goojprt
 * - ZJ/Zjiang
 * - Rongta
 * - MUNBYN
 * - POS-X
 */
object EscPosCommands {

    // ==================== CONTROL COMMANDS ====================

    /** Initialize printer / Reset */
    val INIT = byteArrayOf(0x1B, 0x40)

    /** Line feed */
    val LF = byteArrayOf(0x0A)

    /** Carriage return */
    val CR = byteArrayOf(0x0D)

    /** Horizontal tab */
    val HT = byteArrayOf(0x09)

    /** Form feed (next page) */
    val FF = byteArrayOf(0x0C)

    /** Cancel print data in buffer */
    val CANCEL = byteArrayOf(0x18)

    /** Enable real-time status transmission */
    val DLE_EOT_PRINTER = byteArrayOf(0x10, 0x04, 0x01)
    val DLE_EOT_OFFLINE = byteArrayOf(0x10, 0x04, 0x02)
    val DLE_EOT_ERROR = byteArrayOf(0x10, 0x04, 0x03)
    val DLE_EOT_PAPER = byteArrayOf(0x10, 0x04, 0x04)

    // ==================== PRINT MODE COMMANDS ====================

    /** Select print mode - Normal */
    val TEXT_NORMAL = byteArrayOf(0x1B, 0x21, 0x00)

    /** Select print mode - Bold */
    val TEXT_BOLD_ON = byteArrayOf(0x1B, 0x45, 0x01)
    val TEXT_BOLD_OFF = byteArrayOf(0x1B, 0x45, 0x00)

    /** Double strike (in đậm hơn) */
    val DOUBLE_STRIKE_ON = byteArrayOf(0x1B, 0x47, 0x01)
    val DOUBLE_STRIKE_OFF = byteArrayOf(0x1B, 0x47, 0x00)

    /** Underline */
    val UNDERLINE_OFF = byteArrayOf(0x1B, 0x2D, 0x00)
    val UNDERLINE_1DOT = byteArrayOf(0x1B, 0x2D, 0x01)
    val UNDERLINE_2DOT = byteArrayOf(0x1B, 0x2D, 0x02)

    /** Emphasized mode (in đậm) */
    val EMPHASIZED_ON = byteArrayOf(0x1B, 0x21, 0x08)
    val EMPHASIZED_OFF = byteArrayOf(0x1B, 0x21, 0x00)

    /** Double height */
    val DOUBLE_HEIGHT_ON = byteArrayOf(0x1B, 0x21, 0x10)

    /** Double width */
    val DOUBLE_WIDTH_ON = byteArrayOf(0x1B, 0x21, 0x20)

    /** Double height + width */
    val DOUBLE_SIZE = byteArrayOf(0x1B, 0x21, 0x30)

    /** Quadruple size */
    val QUAD_SIZE = byteArrayOf(0x1D, 0x21, 0x11)

    /** Reverse print (white on black) */
    val REVERSE_ON = byteArrayOf(0x1D, 0x42, 0x01)
    val REVERSE_OFF = byteArrayOf(0x1D, 0x42, 0x00)

    /** Upside down mode */
    val UPSIDE_DOWN_ON = byteArrayOf(0x1B, 0x7B, 0x01)
    val UPSIDE_DOWN_OFF = byteArrayOf(0x1B, 0x7B, 0x00)

    /** Rotate 90 degrees */
    val ROTATE_90_ON = byteArrayOf(0x1B, 0x56, 0x01)
    val ROTATE_90_OFF = byteArrayOf(0x1B, 0x56, 0x00)

    // ==================== ALIGNMENT ====================

    /** Align left */
    val ALIGN_LEFT = byteArrayOf(0x1B, 0x61, 0x00)

    /** Align center */
    val ALIGN_CENTER = byteArrayOf(0x1B, 0x61, 0x01)

    /** Align right */
    val ALIGN_RIGHT = byteArrayOf(0x1B, 0x61, 0x02)

    // ==================== CHARACTER SIZE ====================

    /** Select character size (width x height multiplier) */
    fun selectCharacterSize(width: Int, height: Int): ByteArray {
        val n = ((width - 1) shl 4) or (height - 1)
        return byteArrayOf(0x1D, 0x21, n.toByte())
    }

    /** Set character spacing */
    fun setCharacterSpacing(spacing: Int): ByteArray {
        return byteArrayOf(0x1B, 0x20, spacing.toByte())
    }

    // ==================== LINE SPACING ====================

    /** Default line spacing */
    val LINE_SPACING_DEFAULT = byteArrayOf(0x1B, 0x32)

    /** Set line spacing to n/180 inch */
    fun setLineSpacing(n: Int): ByteArray {
        return byteArrayOf(0x1B, 0x33, n.toByte())
    }

    // ==================== PAPER FEED ====================

    /** Feed n lines */
    fun feedLines(n: Int): ByteArray {
        return byteArrayOf(0x1B, 0x64, n.toByte())
    }

    /** Feed n dots */
    fun feedDots(n: Int): ByteArray {
        return byteArrayOf(0x1B, 0x4A, n.toByte())
    }

    /** Feed and cut */
    val FEED_AND_CUT = byteArrayOf(0x1D, 0x56, 0x41, 0x03)

    // ==================== PAPER CUT ====================

    /** Full cut */
    val CUT_FULL = byteArrayOf(0x1D, 0x56, 0x00)

    /** Partial cut */
    val CUT_PARTIAL = byteArrayOf(0x1D, 0x56, 0x01)

    /** Cut with feed */
    fun cutWithFeed(feedLines: Int): ByteArray {
        return byteArrayOf(0x1D, 0x56, 0x42, feedLines.toByte())
    }

    // ==================== CASH DRAWER ====================

    /** Open cash drawer - Pin 2 */
    val CASH_DRAWER_PIN2 = byteArrayOf(0x1B, 0x70, 0x00, 0x32, 0x32)

    /** Open cash drawer - Pin 5 */
    val CASH_DRAWER_PIN5 = byteArrayOf(0x1B, 0x70, 0x01, 0x32, 0x32)

    /** Open cash drawer with timing control */
    fun openCashDrawer(pin: Int = 0, onTime: Int = 50, offTime: Int = 50): ByteArray {
        return byteArrayOf(0x1B, 0x70, pin.toByte(), onTime.toByte(), offTime.toByte())
    }

    // ==================== BEEPER ====================

    /** Beep sound */
    val BEEP = byteArrayOf(0x1B, 0x42, 0x03, 0x02)

    /** Custom beep (times, duration) */
    fun beep(times: Int, duration: Int): ByteArray {
        return byteArrayOf(0x1B, 0x42, times.toByte(), duration.toByte())
    }

    // ==================== CHARACTER SET ====================

    /** Select international character set */
    object CharacterSet {
        val USA = byteArrayOf(0x1B, 0x52, 0x00)
        val FRANCE = byteArrayOf(0x1B, 0x52, 0x01)
        val GERMANY = byteArrayOf(0x1B, 0x52, 0x02)
        val UK = byteArrayOf(0x1B, 0x52, 0x03)
        val DENMARK = byteArrayOf(0x1B, 0x52, 0x04)
        val SWEDEN = byteArrayOf(0x1B, 0x52, 0x05)
        val ITALY = byteArrayOf(0x1B, 0x52, 0x06)
        val SPAIN = byteArrayOf(0x1B, 0x52, 0x07)
        val JAPAN = byteArrayOf(0x1B, 0x52, 0x08)
        val NORWAY = byteArrayOf(0x1B, 0x52, 0x09)
        val LATIN_AMERICA = byteArrayOf(0x1B, 0x52, 0x0F)
    }

    /** Select code page */
    object CodePage {
        val PC437 = byteArrayOf(0x1B, 0x74, 0x00)    // USA, Standard Europe
        val KATAKANA = byteArrayOf(0x1B, 0x74, 0x01)
        val PC850 = byteArrayOf(0x1B, 0x74, 0x02)    // Multilingual
        val PC860 = byteArrayOf(0x1B, 0x74, 0x03)    // Portuguese
        val PC863 = byteArrayOf(0x1B, 0x74, 0x04)    // Canadian-French
        val PC865 = byteArrayOf(0x1B, 0x74, 0x05)    // Nordic
        val WPC1252 = byteArrayOf(0x1B, 0x74, 0x10)  // Latin 1
        val PC866 = byteArrayOf(0x1B, 0x74, 0x11)    // Cyrillic #2
        val PC852 = byteArrayOf(0x1B, 0x74, 0x12)    // Latin 2
        val UTF8 = byteArrayOf(0x1B, 0x74, 0xFF.toByte()) // Some printers
        val TCVN3 = byteArrayOf(0x1B, 0x74, 0x1E)    // Vietnamese TCVN3
        val VISCII = byteArrayOf(0x1B, 0x74, 0x1F)   // Vietnamese VISCII
    }

    // ==================== BARCODE ====================

    /** Barcode types */
    object BarcodeType {
        const val UPC_A = 0x00
        const val UPC_E = 0x01
        const val EAN13 = 0x02
        const val EAN8 = 0x03
        const val CODE39 = 0x04
        const val ITF = 0x05
        const val CODABAR = 0x06
        const val CODE93 = 0x48
        const val CODE128 = 0x49
    }

    /** Set barcode height */
    fun setBarcodeHeight(height: Int): ByteArray {
        return byteArrayOf(0x1D, 0x68, height.toByte())
    }

    /** Set barcode width */
    fun setBarcodeWidth(width: Int): ByteArray {
        // width: 1-6, default 3
        return byteArrayOf(0x1D, 0x77, width.toByte())
    }

    /** Set barcode text position */
    object BarcodeTextPosition {
        val NO_PRINT = byteArrayOf(0x1D, 0x48, 0x00)
        val ABOVE = byteArrayOf(0x1D, 0x48, 0x01)
        val BELOW = byteArrayOf(0x1D, 0x48, 0x02)
        val ABOVE_AND_BELOW = byteArrayOf(0x1D, 0x48, 0x03)
    }

    /** Print barcode */
    fun printBarcode(type: Int, data: String): ByteArray {
        val dataBytes = data.toByteArray()
        return byteArrayOf(0x1D, 0x6B, type.toByte()) +
               byteArrayOf(dataBytes.size.toByte()) +
               dataBytes
    }

    // ==================== QR CODE ====================

    /** Print QR Code */
    fun printQRCode(data: String, moduleSize: Int = 4, errorCorrection: Int = 48): ByteArray {
        val output = ByteArrayOutputStream()

        // QR Code model (Model 2)
        output.write(byteArrayOf(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00))

        // QR Code module size
        output.write(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, moduleSize.toByte()))

        // QR Code error correction level (L=48, M=49, Q=50, H=51)
        output.write(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, errorCorrection.toByte()))

        // Store QR Code data
        val dataBytes = data.toByteArray(Charsets.UTF_8)
        val storeLen = dataBytes.size + 3
        val pL = (storeLen % 256).toByte()
        val pH = (storeLen / 256).toByte()
        output.write(byteArrayOf(0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30))
        output.write(dataBytes)

        // Print QR Code
        output.write(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30))

        return output.toByteArray()
    }

    // ==================== IMAGE / BITMAP ====================

    /**
     * Convert Bitmap to ESC/POS format using ESC * command
     * Compatible with XPRINTER and most Chinese thermal printers
     *
     * ESC * m nL nH - Select bit image mode
     * m = 0: 8-dot single-density (max 256 dots)
     * m = 1: 8-dot double-density (max 512 dots)
     * m = 32: 24-dot single-density
     * m = 33: 24-dot double-density (best quality, recommended)
     */
    fun printBitmap(bitmap: Bitmap, align: Int = 0): ByteArray {
        val output = ByteArrayOutputStream()

        // Align
        output.write(byteArrayOf(0x1B, 0x61, align.toByte()))

        val width = bitmap.width
        val height = bitmap.height

        // Max width depends on paper size, don't scale down unnecessarily
        // 80mm paper = 576 dots, 58mm paper = 384 dots
        val maxWidth = 576
        val scaledBitmap = if (width > maxWidth) {
            val scale = maxWidth.toFloat() / width
            Bitmap.createScaledBitmap(bitmap, maxWidth, (height * scale).toInt(), true)
        } else {
            bitmap
        }

        val w = scaledBitmap.width
        val h = scaledBitmap.height

        // Convert to monochrome with higher threshold for better text
        val pixels = IntArray(w * h)
        scaledBitmap.getPixels(pixels, 0, w, 0, 0, w, h)
        val threshold = 180

        // Set line spacing to 0 for bitmap printing (no gaps between lines)
        output.write(byteArrayOf(0x1B, 0x33, 0x00))

        // Use 24-dot mode (m=33) for better quality and wider support
        // Print 24 rows at a time
        val rowsPerStrip = 24
        var y = 0

        while (y < h) {
            val stripHeight = minOf(rowsPerStrip, h - y)

            // ESC * 33 nL nH - 24-dot double-density
            // nL = width % 256, nH = width / 256
            val nL = (w % 256).toByte()
            val nH = (w / 256).toByte()
            output.write(byteArrayOf(0x1B, 0x2A, 33, nL, nH))

            // Send pixel data for this strip
            // Each column needs 3 bytes (24 bits) in 24-dot mode
            for (x in 0 until w) {
                for (k in 0 until 3) { // 3 bytes per column
                    var columnByte = 0
                    for (b in 0 until 8) {
                        val row = y + k * 8 + b
                        if (row < h) {
                            val pixel = pixels[row * w + x]
                            val gray = (((pixel shr 16) and 0xFF) +
                                       ((pixel shr 8) and 0xFF) +
                                       (pixel and 0xFF)) / 3
                            if (gray < threshold) {
                                columnByte = columnByte or (0x80 shr b)
                            }
                        }
                    }
                    output.write(columnByte)
                }
            }

            // Line feed after each strip
            output.write(LF)
            y += rowsPerStrip
        }

        // KHÔNG khôi phục line spacing về default để tránh khoảng trắng thừa giữa các bitmap
        // Line spacing sẽ được kiểm soát bởi HybridBillBuilder
        // output.write(byteArrayOf(0x1B, 0x32)) // ESC 2 - Đã bỏ

        if (scaledBitmap != bitmap) {
            scaledBitmap.recycle()
        }

        return output.toByteArray()
    }

    /**
     * Print raster bitmap (better quality for some printers)
     * @param bitmap The bitmap to print
     * @param targetWidth Target width in pixels (should match paper width). Default 0 means no scaling.
     */
    fun printRasterBitmap(bitmap: Bitmap, targetWidth: Int = 0): ByteArray {
        val output = ByteArrayOutputStream()

        // Đặt line spacing = 0 trước khi in bitmap để đảm bảo không có khoảng trắng thừa
        // sau khi bitmap in xong (một số máy in tự động thêm LF sau GS v 0)
        output.write(byteArrayOf(0x1B, 0x33, 0x00)) // ESC 3 0 - Line spacing = 0

        val width = bitmap.width
        val height = bitmap.height

        // Only scale if targetWidth is specified and different from bitmap width
        val scaledBitmap = if (targetWidth > 0 && width != targetWidth) {
            val scale = targetWidth.toFloat() / width
            Bitmap.createScaledBitmap(bitmap, targetWidth, (height * scale).toInt(), true)
        } else {
            bitmap
        }

        val w = scaledBitmap.width
        val h = scaledBitmap.height
        val widthBytes = (w + 7) / 8

        // GS v 0 - Print raster bit image
        // Mode 0 = normal, không tự động LF sau khi in
        val xL = (widthBytes % 256).toByte()
        val xH = (widthBytes / 256).toByte()
        val yL = (h % 256).toByte()
        val yH = (h / 256).toByte()

        output.write(byteArrayOf(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH))

        val pixels = IntArray(w * h)
        scaledBitmap.getPixels(pixels, 0, w, 0, 0, w, h)

        // Use a higher threshold (180) for better anti-aliased text rendering
        // This ensures text edges are crisp and not broken
        val threshold = 180

        for (y in 0 until h) {
            for (xByte in 0 until widthBytes) {
                var byte = 0
                for (bit in 0 until 8) {
                    val x = xByte * 8 + bit
                    if (x < w) {
                        val pixel = pixels[y * w + x]
                        val gray = (((pixel shr 16) and 0xFF) +
                                   ((pixel shr 8) and 0xFF) +
                                   (pixel and 0xFF)) / 3
                        // Print as black if gray value is below threshold
                        if (gray < threshold) {
                            byte = byte or (0x80 shr bit)
                        }
                    }
                }
                output.write(byte)
            }
        }

        if (scaledBitmap != bitmap) {
            scaledBitmap.recycle()
        }

        return output.toByteArray()
    }

    // ==================== TABLE / COLUMNS ====================

    /** Set horizontal tab positions */
    fun setTabPositions(vararg positions: Int): ByteArray {
        val output = ByteArrayOutputStream()
        output.write(0x1B)
        output.write(0x44)
        positions.forEach { output.write(it) }
        output.write(0x00)
        return output.toByteArray()
    }

    /** Set left margin */
    fun setLeftMargin(dots: Int): ByteArray {
        val nL = (dots % 256).toByte()
        val nH = (dots / 256).toByte()
        return byteArrayOf(0x1D, 0x4C, nL, nH)
    }

    /** Set print area width */
    fun setPrintAreaWidth(dots: Int): ByteArray {
        val nL = (dots % 256).toByte()
        val nH = (dots / 256).toByte()
        return byteArrayOf(0x1D, 0x57, nL, nH)
    }

    // ==================== PRINTER SPECIFIC ====================

    /**
     * Sunmi specific commands
     */
    object Sunmi {
        // Sunmi inner printer has some specific commands
        val INIT_SUNMI = byteArrayOf(0x1B, 0x40)

        // Label mode (if supported)
        val LABEL_MODE_ON = byteArrayOf(0x1B, 0x73, 0x01)
        val LABEL_MODE_OFF = byteArrayOf(0x1B, 0x73, 0x00)
    }

    /**
     * Epson specific commands
     */
    object Epson {
        // Standard mode
        val STANDARD_MODE = byteArrayOf(0x1B, 0x53)

        // Page mode
        val PAGE_MODE = byteArrayOf(0x1B, 0x4C)
    }

    /**
     * Star Micronics specific commands
     */
    object Star {
        // Initialize
        val INIT = byteArrayOf(0x1B, 0x40)

        // Star specific cut
        val PARTIAL_CUT = byteArrayOf(0x1B, 0x64, 0x02)
        val FULL_CUT = byteArrayOf(0x1B, 0x64, 0x03)
    }
}

/**
 * ESC/POS Command Builder - Fluent API
 */
class EscPosBuilder {
    private val buffer = ByteArrayOutputStream()
    private var charset: Charset = Charsets.UTF_8

    fun init(): EscPosBuilder {
        buffer.write(EscPosCommands.INIT)
        return this
    }

    fun charset(charset: Charset): EscPosBuilder {
        this.charset = charset
        return this
    }

    fun charset(charsetName: String): EscPosBuilder {
        this.charset = Charset.forName(charsetName)
        return this
    }

    fun codePage(codePage: ByteArray): EscPosBuilder {
        buffer.write(codePage)
        return this
    }

    fun text(text: String): EscPosBuilder {
        buffer.write(text.toByteArray(charset))
        return this
    }

    fun line(text: String = ""): EscPosBuilder {
        buffer.write(text.toByteArray(charset))
        buffer.write(EscPosCommands.LF)
        return this
    }

    fun newLine(count: Int = 1): EscPosBuilder {
        repeat(count) { buffer.write(EscPosCommands.LF) }
        return this
    }

    fun feed(lines: Int): EscPosBuilder {
        buffer.write(EscPosCommands.feedLines(lines))
        return this
    }

    fun alignLeft(): EscPosBuilder {
        buffer.write(EscPosCommands.ALIGN_LEFT)
        return this
    }

    fun alignCenter(): EscPosBuilder {
        buffer.write(EscPosCommands.ALIGN_CENTER)
        return this
    }

    fun alignRight(): EscPosBuilder {
        buffer.write(EscPosCommands.ALIGN_RIGHT)
        return this
    }

    fun bold(on: Boolean = true): EscPosBuilder {
        buffer.write(if (on) EscPosCommands.TEXT_BOLD_ON else EscPosCommands.TEXT_BOLD_OFF)
        return this
    }

    fun underline(mode: Int = 1): EscPosBuilder {
        buffer.write(when (mode) {
            0 -> EscPosCommands.UNDERLINE_OFF
            1 -> EscPosCommands.UNDERLINE_1DOT
            else -> EscPosCommands.UNDERLINE_2DOT
        })
        return this
    }

    fun doubleHeight(): EscPosBuilder {
        buffer.write(EscPosCommands.DOUBLE_HEIGHT_ON)
        return this
    }

    fun doubleWidth(): EscPosBuilder {
        buffer.write(EscPosCommands.DOUBLE_WIDTH_ON)
        return this
    }

    fun doubleSize(): EscPosBuilder {
        buffer.write(EscPosCommands.DOUBLE_SIZE)
        return this
    }

    fun normal(): EscPosBuilder {
        buffer.write(EscPosCommands.TEXT_NORMAL)
        return this
    }

    fun size(width: Int, height: Int): EscPosBuilder {
        buffer.write(EscPosCommands.selectCharacterSize(width, height))
        return this
    }

    fun reverse(on: Boolean = true): EscPosBuilder {
        buffer.write(if (on) EscPosCommands.REVERSE_ON else EscPosCommands.REVERSE_OFF)
        return this
    }

    fun separator(char: Char = '-', length: Int = 32): EscPosBuilder {
        return line(char.toString().repeat(length))
    }

    fun doubleSeparator(length: Int = 32): EscPosBuilder {
        return line("=".repeat(length))
    }

    fun twoColumns(left: String, right: String, width: Int = 32): EscPosBuilder {
        val spaces = width - left.length - right.length
        val line = if (spaces > 0) {
            left + " ".repeat(spaces) + right
        } else {
            "$left  $right"
        }
        return line(line)
    }

    fun threeColumns(left: String, center: String, right: String, width: Int = 32): EscPosBuilder {
        val leftWidth = width / 3
        val rightWidth = width / 3
        val centerWidth = width - leftWidth - rightWidth

        val leftPadded = left.take(leftWidth).padEnd(leftWidth)
        val centerPadded = center.take(centerWidth).padStart((centerWidth + center.length) / 2).padEnd(centerWidth)
        val rightPadded = right.take(rightWidth).padStart(rightWidth)

        return line(leftPadded + centerPadded + rightPadded)
    }

    fun barcode(type: Int, data: String, height: Int = 60, width: Int = 3): EscPosBuilder {
        buffer.write(EscPosCommands.setBarcodeHeight(height))
        buffer.write(EscPosCommands.setBarcodeWidth(width))
        buffer.write(EscPosCommands.BarcodeTextPosition.BELOW)
        buffer.write(EscPosCommands.printBarcode(type, data))
        return this
    }

    fun qrCode(data: String, size: Int = 4): EscPosBuilder {
        buffer.write(EscPosCommands.printQRCode(data, size))
        return this
    }

    fun image(bitmap: Bitmap): EscPosBuilder {
        buffer.write(EscPosCommands.printRasterBitmap(bitmap))
        return this
    }

    fun cut(partial: Boolean = false): EscPosBuilder {
        buffer.write(if (partial) EscPosCommands.CUT_PARTIAL else EscPosCommands.CUT_FULL)
        return this
    }

    fun cutWithFeed(lines: Int = 3): EscPosBuilder {
        buffer.write(EscPosCommands.cutWithFeed(lines))
        return this
    }

    fun openCashDrawer(pin: Int = 0): EscPosBuilder {
        buffer.write(EscPosCommands.openCashDrawer(pin))
        return this
    }

    fun beep(times: Int = 1, duration: Int = 2): EscPosBuilder {
        buffer.write(EscPosCommands.beep(times, duration))
        return this
    }

    fun raw(bytes: ByteArray): EscPosBuilder {
        buffer.write(bytes)
        return this
    }

    fun build(): ByteArray = buffer.toByteArray()

    fun clear(): EscPosBuilder {
        buffer.reset()
        return this
    }
}

/**
 * Extension function để tạo builder
 */
fun escPos(block: EscPosBuilder.() -> Unit): ByteArray {
    return EscPosBuilder().apply(block).build()
}
