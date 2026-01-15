package com.techres.ccb.printer.core

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import java.io.ByteArrayOutputStream

/**
 * TSPL/TSPL2 Commands - For TSC compatible label printers (XPRINTER, etc.)
 *
 * TSPL is a text-based command language for label printers.
 * Commands are ASCII text followed by CRLF (\r\n)
 *
 * Supported printers:
 * - XPRINTER label printers
 * - TSC label printers
 * - GAINSCHA label printers
 * - Most Chinese label printers
 */
object TsplCommands {
    private const val CRLF = "\r\n"

    // ==================== SETUP COMMANDS ====================

    /**
     * Set label size
     * @param widthMm Label width in mm
     * @param heightMm Label height in mm
     */
    fun size(widthMm: Int, heightMm: Int): String {
        return "SIZE $widthMm mm, $heightMm mm$CRLF"
    }

    /**
     * Set gap between labels
     * @param gapMm Gap distance in mm
     * @param offsetMm Offset in mm (usually 0)
     */
    fun gap(gapMm: Int, offsetMm: Int = 0): String {
        return "GAP $gapMm mm, $offsetMm mm$CRLF"
    }

    /**
     * Set print direction
     * @param direction 0 = normal, 1 = 180 degree rotation
     */
    fun direction(direction: Int): String {
        return "DIRECTION $direction$CRLF"
    }

    /**
     * Set print density (darkness)
     * @param density 0-15, default is 8
     */
    fun density(density: Int): String {
        return "DENSITY ${density.coerceIn(0, 15)}$CRLF"
    }

    /**
     * Set print speed
     * @param speed 1-4
     */
    fun speed(speed: Int): String {
        return "SPEED ${speed.coerceIn(1, 4)}$CRLF"
    }

    /**
     * Set reference point (origin)
     * @param x X offset in dots
     * @param y Y offset in dots
     */
    fun reference(x: Int, y: Int): String {
        return "REFERENCE $x, $y$CRLF"
    }

    /**
     * Set code page for text encoding
     * @param codepage Code page (437, 850, 852, UTF-8, etc.)
     */
    fun codepage(codepage: String): String {
        return "CODEPAGE $codepage$CRLF"
    }

    // ==================== CLEAR / BUFFER ====================

    /**
     * Clear image buffer
     */
    fun cls(): String {
        return "CLS$CRLF"
    }

    // ==================== TEXT COMMANDS ====================

    /**
     * Print text at position
     * @param x X position in dots (8 dots/mm for 203 DPI)
     * @param y Y position in dots
     * @param font Font name: "1"-"5" for device fonts, or "TSS24.BF2" for Chinese
     * @param rotation 0, 90, 180, 270
     * @param xMul X scale multiplier (1-10)
     * @param yMul Y scale multiplier (1-10)
     * @param content Text content
     */
    fun text(
        x: Int,
        y: Int,
        font: String = "3",
        rotation: Int = 0,
        xMul: Int = 1,
        yMul: Int = 1,
        content: String
    ): String {
        // Escape quotes in content
        val escapedContent = content.replace("\"", "\\\"")
        return "TEXT $x,$y,\"$font\",$rotation,$xMul,$yMul,\"$escapedContent\"$CRLF"
    }

    /**
     * Print text block (auto word wrap)
     */
    fun block(
        x: Int,
        y: Int,
        width: Int,
        height: Int,
        font: String = "3",
        rotation: Int = 0,
        xMul: Int = 1,
        yMul: Int = 1,
        content: String
    ): String {
        val escapedContent = content.replace("\"", "\\\"")
        return "BLOCK $x,$y,$width,$height,\"$font\",$rotation,$xMul,$yMul,\"$escapedContent\"$CRLF"
    }

    // ==================== GRAPHICS COMMANDS ====================

    /**
     * Draw a box (rectangle outline)
     */
    fun box(x: Int, y: Int, xEnd: Int, yEnd: Int, thickness: Int = 1): String {
        return "BOX $x,$y,$xEnd,$yEnd,$thickness$CRLF"
    }

    /**
     * Draw a horizontal line
     */
    fun bar(x: Int, y: Int, width: Int, height: Int): String {
        return "BAR $x,$y,$width,$height$CRLF"
    }

    /**
     * Draw a diagonal line
     */
    fun diagonal(x: Int, y: Int, width: Int, height: Int, thickness: Int = 1): String {
        return "DIAGONAL $x,$y,$width,$height,$thickness$CRLF"
    }

    /**
     * Reverse a region (black <-> white)
     */
    fun reverse(x: Int, y: Int, width: Int, height: Int): String {
        return "REVERSE $x,$y,$width,$height$CRLF"
    }

    // ==================== BARCODE COMMANDS ====================

    /**
     * Print 1D barcode
     * @param x X position
     * @param y Y position
     * @param codeType "128", "39", "93", "EAN13", "EAN8", "UPCA", etc.
     * @param height Bar height in dots
     * @param readable 0 = no text, 1 = text below, 2 = text above, 3 = both
     * @param rotation 0, 90, 180, 270
     * @param narrow Narrow bar width (1-10)
     * @param wide Wide bar width (1-10)
     * @param content Barcode data
     */
    fun barcode(
        x: Int,
        y: Int,
        codeType: String,
        height: Int = 50,
        readable: Int = 1,
        rotation: Int = 0,
        narrow: Int = 2,
        wide: Int = 2,
        content: String
    ): String {
        return "BARCODE $x,$y,\"$codeType\",$height,$readable,$rotation,$narrow,$wide,\"$content\"$CRLF"
    }

    /**
     * Print QR code
     */
    fun qrcode(
        x: Int,
        y: Int,
        eccLevel: String = "L", // L, M, Q, H
        cellWidth: Int = 6,
        mode: String = "A", // A = auto
        rotation: Int = 0,
        content: String
    ): String {
        return "QRCODE $x,$y,$eccLevel,$cellWidth,$mode,$rotation,\"$content\"$CRLF"
    }

    // ==================== BITMAP COMMANDS ====================

    /**
     * Print bitmap image
     * @param x X position in dots
     * @param y Y position in dots
     * @param bitmap Bitmap to print
     * @param mode 0 = OVERWRITE, 1 = OR, 2 = XOR
     *
     * BITMAP command format:
     * BITMAP x,y,width_bytes,height,mode,data...
     * width_bytes = (pixel_width + 7) / 8
     */
    fun bitmap(x: Int, y: Int, bitmap: Bitmap, mode: Int = 0): ByteArray {
        val output = ByteArrayOutputStream()

        val width = bitmap.width
        val height = bitmap.height
        val widthBytes = (width + 7) / 8

        // Get pixels
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

        // BITMAP command header
        val header = "BITMAP $x,$y,$widthBytes,$height,$mode,"
        output.write(header.toByteArray())

        // Convert to monochrome bitmap data
        val threshold = 180
        for (row in 0 until height) {
            for (byteIndex in 0 until widthBytes) {
                var byte = 0
                for (bit in 0 until 8) {
                    val col = byteIndex * 8 + bit
                    if (col < width) {
                        val pixel = pixels[row * width + col]
                        val gray = (((pixel shr 16) and 0xFF) +
                                   ((pixel shr 8) and 0xFF) +
                                   (pixel and 0xFF)) / 3
                        // In TSPL, 1 = black, 0 = white (opposite of some formats)
                        if (gray < threshold) {
                            byte = byte or (0x80 shr bit)
                        }
                    }
                }
                output.write(byte)
            }
        }

        output.write(CRLF.toByteArray())
        return output.toByteArray()
    }

    // ==================== PRINT COMMANDS ====================

    /**
     * Print the label
     * @param copies Number of copies
     * @param sets Number of sets (for multiple labels with counter)
     */
    fun print(copies: Int = 1, sets: Int = 1): String {
        return "PRINT $copies,$sets$CRLF"
    }

    /**
     * Feed one label
     */
    fun formFeed(): String {
        return "FORMFEED$CRLF"
    }

    /**
     * Home the label (calibrate)
     */
    fun home(): String {
        return "HOME$CRLF"
    }

    // ==================== SYSTEM COMMANDS ====================

    /**
     * Sound the buzzer
     * @param level Beep level (0-9)
     * @param interval Interval in 0.1 seconds
     */
    fun sound(level: Int = 2, interval: Int = 1): String {
        return "SOUND $level,$interval$CRLF"
    }

    /**
     * Cut the label (if cutter available)
     */
    fun cut(): String {
        return "CUT$CRLF"
    }

    /**
     * Set auto peel
     */
    fun peel(on: Boolean): String {
        return "SET PEEL ${if (on) "ON" else "OFF"}$CRLF"
    }

    /**
     * Set tear mode
     */
    fun tear(on: Boolean): String {
        return "SET TEAR ${if (on) "ON" else "OFF"}$CRLF"
    }
}

/**
 * TSPL Label Builder - Fluent API for building labels
 */
class TsplLabelBuilder(
    private val labelWidthMm: Int = 72,
    private val labelHeightMm: Int = 30,
    private val gapMm: Int = 3,
    private val dpi: Int = 203 // 203 DPI = 8 dots/mm
) {
    private val commands = StringBuilder()
    private val bitmapData = ByteArrayOutputStream()

    // Dots per mm
    private val dotsPerMm = dpi / 25.4f

    // Convert mm to dots
    fun mmToDots(mm: Float): Int = (mm * dotsPerMm).toInt()
    fun mmToDots(mm: Int): Int = (mm * dotsPerMm).toInt()

    // Label dimensions in dots
    val labelWidthDots = mmToDots(labelWidthMm)
    val labelHeightDots = mmToDots(labelHeightMm)

    /**
     * Initialize label with default settings
     */
    fun init(): TsplLabelBuilder {
        commands.append(TsplCommands.size(labelWidthMm, labelHeightMm))
        commands.append(TsplCommands.gap(gapMm))
        commands.append(TsplCommands.direction(0))
        commands.append(TsplCommands.cls())
        return this
    }

    /**
     * Set print density (0-15)
     */
    fun density(level: Int): TsplLabelBuilder {
        commands.append(TsplCommands.density(level))
        return this
    }

    /**
     * Set print speed (1-4)
     */
    fun speed(level: Int): TsplLabelBuilder {
        commands.append(TsplCommands.speed(level))
        return this
    }

    /**
     * Add text at position
     */
    fun text(
        x: Int,
        y: Int,
        content: String,
        font: String = "3",
        rotation: Int = 0,
        xScale: Int = 1,
        yScale: Int = 1
    ): TsplLabelBuilder {
        commands.append(TsplCommands.text(x, y, font, rotation, xScale, yScale, content))
        return this
    }

    /**
     * Add text at position (mm units)
     */
    fun textMm(
        xMm: Float,
        yMm: Float,
        content: String,
        font: String = "3",
        rotation: Int = 0,
        xScale: Int = 1,
        yScale: Int = 1
    ): TsplLabelBuilder {
        return text(mmToDots(xMm), mmToDots(yMm), content, font, rotation, xScale, yScale)
    }

    /**
     * Add large text (scaled 2x)
     */
    fun textLarge(x: Int, y: Int, content: String): TsplLabelBuilder {
        return text(x, y, content, "3", 0, 2, 2)
    }

    /**
     * Add box outline
     */
    fun box(x: Int, y: Int, width: Int, height: Int, thickness: Int = 2): TsplLabelBuilder {
        commands.append(TsplCommands.box(x, y, x + width, y + height, thickness))
        return this
    }

    /**
     * Add horizontal line
     */
    fun line(x: Int, y: Int, width: Int, thickness: Int = 2): TsplLabelBuilder {
        commands.append(TsplCommands.bar(x, y, width, thickness))
        return this
    }

    /**
     * Add barcode
     */
    fun barcode(x: Int, y: Int, content: String, height: Int = 50): TsplLabelBuilder {
        commands.append(TsplCommands.barcode(x, y, "128", height, 1, 0, 2, 2, content))
        return this
    }

    /**
     * Add QR code
     */
    fun qrcode(x: Int, y: Int, content: String, cellWidth: Int = 6): TsplLabelBuilder {
        commands.append(TsplCommands.qrcode(x, y, "L", cellWidth, "A", 0, content))
        return this
    }

    /**
     * Add bitmap image
     */
    fun bitmap(x: Int, y: Int, bitmap: Bitmap): TsplLabelBuilder {
        bitmapData.write(TsplCommands.bitmap(x, y, bitmap))
        return this
    }

    /**
     * Print the label
     */
    fun print(copies: Int = 1): TsplLabelBuilder {
        commands.append(TsplCommands.print(copies))
        return this
    }

    /**
     * Build final command bytes
     */
    fun build(): ByteArray {
        val output = ByteArrayOutputStream()
        output.write(commands.toString().toByteArray())
        output.write(bitmapData.toByteArray())
        return output.toByteArray()
    }

    /**
     * Build as string (for debugging, excludes binary bitmap data)
     */
    fun buildString(): String {
        return commands.toString()
    }
}

/**
 * TSPL Bitmap Text Renderer - Render Vietnamese text as bitmap for TSPL printers
 */
object TsplBitmapRenderer {
    /**
     * Render text to bitmap for TSPL printing
     * Returns bitmap that can be used with TsplCommands.bitmap()
     */
    fun renderText(
        text: String,
        width: Int,
        fontSize: Float = 24f,
        bold: Boolean = false,
        centerAlign: Boolean = false
    ): Bitmap {
        if (text.isEmpty()) {
            return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888)
        }

        val paint = TextPaint().apply {
            color = Color.BLACK
            textSize = fontSize
            isAntiAlias = false
            typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        }

        val alignment = if (centerAlign) Layout.Alignment.ALIGN_CENTER else Layout.Alignment.ALIGN_NORMAL

        val layout = StaticLayout.Builder
            .obtain(text, 0, text.length, paint, width)
            .setAlignment(alignment)
            .setLineSpacing(0f, 1.0f)
            .setIncludePad(true)
            .build()

        val height = layout.height.coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)
        layout.draw(canvas)

        return bitmap
    }

    /**
     * Render single line text
     */
    fun renderSingleLine(
        text: String,
        fontSize: Float = 24f,
        bold: Boolean = false
    ): Bitmap {
        val paint = TextPaint().apply {
            color = Color.BLACK
            textSize = fontSize
            isAntiAlias = false
            typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        }

        val width = paint.measureText(text).toInt() + 4
        val height = (fontSize * 1.5f).toInt()

        val bitmap = Bitmap.createBitmap(width.coerceAtLeast(1), height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)
        canvas.drawText(text, 0f, fontSize, paint)

        return bitmap
    }
}
