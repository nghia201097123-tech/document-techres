package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Chế độ in của bếp
 */
enum class KitchenPrintMode {
    TICKET,     // In phiếu bếp (nhiều món trên 1 tờ)
    LABEL,      // In tem (1 tem cho mỗi món/ly)
    BOTH        // In cả phiếu và tem
}

/**
 * Loại máy in / Protocol
 */
enum class PrinterProtocol(val displayName: String) {
    ESCPOS("ESC/POS (Receipt)"),     // Máy in hóa đơn: EPSON, BIXOLON, etc.
    TSPL("TSPL (Label)");            // Máy in tem: XPRINTER, TSC, GAINSCHA, etc.

    companion object {
        fun fromString(value: String?): PrinterProtocol {
            return entries.find { it.name == value } ?: ESCPOS
        }
    }
}

/**
 * Kích thước tem (cho máy in TSPL)
 *
 * Font size recommendations (base font, before scaling):
 * | Khổ tem    | Font Bold | Font Normal | Font Small | Max Toppings |
 * |------------|-----------|-------------|------------|--------------|
 * | 40x30mm    | 22f       | 18f         | 14f        | 2            |
 * | 50x30mm    | 24f       | 20f         | 16f        | 2            |
 * | 60x40mm    | 26f       | 22f         | 18f        | 3            |
 * | 72x30mm    | 24f       | 20f         | 16f        | 2            |
 * | 80x50mm    | 30f       | 26f         | 20f        | 5            |
 * | 100x50mm   | 32f       | 28f         | 22f        | 6            |
 * | 100x80mm   | 36f       | 30f         | 24f        | 10           |
 */
data class LabelSize(
    val widthMm: Int,
    val heightMm: Int,
    val gapMm: Int = 3
) {
    val displayName: String get() = "${widthMm}x${heightMm}mm"

    /**
     * Diện tích tem (mm²) để xác định nhóm kích thước
     */
    val area: Int get() = widthMm * heightMm

    /**
     * Lấy font size đề xuất cho tem (base font, chưa scale)
     * Returns: Triple(fontBold, fontNormal, fontSmall)
     */
    fun getRecommendedFontSizes(): Triple<Float, Float, Float> {
        return when {
            // Small labels (area <= 1500 mm²)
            heightMm <= 30 && widthMm <= 50 -> Triple(22f, 18f, 14f)  // 40x30
            heightMm <= 30 && widthMm <= 60 -> Triple(24f, 20f, 16f)  // 50x30
            heightMm <= 30 -> Triple(24f, 20f, 16f)                    // 72x30

            // Medium labels (area <= 2500 mm²)
            heightMm <= 40 -> Triple(26f, 22f, 18f)                    // 60x40

            // Large labels (area <= 5000 mm²)
            heightMm <= 50 && widthMm <= 80 -> Triple(30f, 26f, 20f)  // 80x50
            heightMm <= 50 -> Triple(32f, 28f, 22f)                    // 100x50

            // XL labels (area > 5000 mm²)
            else -> Triple(36f, 30f, 24f)                              // 100x80
        }
    }

    /**
     * Lấy số topping tối đa đề xuất dựa trên kích thước tem
     *
     * Tính toán dựa trên:
     * - Chiều cao tem và số dòng có thể hiển thị
     * - Các dòng bắt buộc: Item name (1-2), Order number (1), Separator (2-3)
     * - Các dòng tùy chọn: Size, Ice, Sugar, Price, Time
     * - Mỗi topping cần 1 dòng
     */
    fun getRecommendedMaxToppings(): Int {
        return when {
            // Tem rất nhỏ: 40x30, 50x30, 72x30 - chỉ đủ 2 toppings
            heightMm <= 30 -> 2

            // Tem trung bình: 60x40 - đủ 3 toppings
            heightMm <= 40 -> 3

            // Tem lớn: 80x50, 100x50 - đủ 5-6 toppings
            heightMm <= 50 && widthMm <= 80 -> 5
            heightMm <= 50 -> 6

            // Tem XL: 100x80 - đủ 10 toppings
            else -> 10
        }
    }

    companion object {
        // Common label sizes
        val SIZE_40x30 = LabelSize(40, 30, 3)
        val SIZE_50x30 = LabelSize(50, 30, 3)
        val SIZE_60x40 = LabelSize(60, 40, 3)
        val SIZE_72x30 = LabelSize(72, 30, 3)   // XPRINTER default
        val SIZE_80x50 = LabelSize(80, 50, 3)
        val SIZE_100x50 = LabelSize(100, 50, 3)
        val SIZE_100x80 = LabelSize(100, 80, 3)

        val ALL_SIZES = listOf(
            SIZE_40x30,
            SIZE_50x30,
            SIZE_60x40,
            SIZE_72x30,
            SIZE_80x50,
            SIZE_100x50,
            SIZE_100x80
        )

        fun fromDimensions(width: Int, height: Int, gap: Int = 3): LabelSize {
            return LabelSize(width, height, gap)
        }
    }
}

/**
 * Loại bếp
 */
enum class KitchenType(val value: String) {
    KITCHEN("kitchen"),     // Bếp chính
    BAR("bar"),             // Quầy bar/đồ uống
    GRILL("grill"),         // Bếp nướng
    DESSERT("dessert"),     // Tráng miệng
    SEAFOOD("seafood"),     // Hải sản
    HOTPOT("hotpot"),       // Lẩu
    BAKERY("bakery"),       // Bánh
    OTHER("other")          // Khác
}

@Entity(
    tableName = "kitchens",
    indices = [
        Index(value = ["branch_id"]),
        Index(value = ["is_active"])
    ]
)
data class KitchenEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "branch_id")
    val branchId: String,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "description")
    val description: String? = null,

    @ColumnInfo(name = "kitchen_type")
    val kitchenType: String? = null, // "kitchen", "bar", "grill", "dessert", etc.

    @ColumnInfo(name = "sort_order")
    val sortOrder: Int = 0,

    @ColumnInfo(name = "is_active")
    val isActive: Boolean = true,

    // ========== PRINT MODE ==========
    @ColumnInfo(name = "print_mode")
    val printMode: String = KitchenPrintMode.TICKET.name, // TICKET, LABEL, BOTH

    @ColumnInfo(name = "paper_width")
    val paperWidth: Int = 80, // 58mm, 80mm, etc.

    // ========== PRINTER CONFIGURATION ==========
    @ColumnInfo(name = "printer_ip")
    val printerIp: String? = null,

    @ColumnInfo(name = "printer_port")
    val printerPort: Int = 9100,

    @ColumnInfo(name = "printer_name")
    val printerName: String? = null,

    @ColumnInfo(name = "is_printer_connected")
    val isPrinterConnected: Boolean = false,

    // ========== PRINTER PROTOCOL ==========
    @ColumnInfo(name = "printer_protocol")
    val printerProtocol: String = PrinterProtocol.ESCPOS.name, // ESCPOS or TSPL

    // ========== PRINT DENSITY ==========
    @ColumnInfo(name = "print_density")
    val printDensity: Int = 8, // 0-15 for TSPL, affects darkness

    // ========== TICKET PRINTING CONFIG ==========
    @ColumnInfo(name = "ticket_cut_after_print")
    val ticketCutAfterPrint: Boolean = true, // Cắt giấy sau khi in phiếu

    @ColumnInfo(name = "ticket_print_items_separately")
    val ticketPrintItemsSeparately: Boolean = false, // In từng món riêng biệt (thay vì gộp)

    @ColumnInfo(name = "ticket_copies")
    val ticketCopies: Int = 1, // Số bản in phiếu

    // ========== LABEL PRINTING CONFIG ==========
    @ColumnInfo(name = "label_print_price")
    val labelPrintPrice: Boolean = false, // In giá trên tem

    @ColumnInfo(name = "label_print_store_name")
    val labelPrintStoreName: Boolean = false, // In tên cửa hàng trên tem

    @ColumnInfo(name = "label_print_order_number")
    val labelPrintOrderNumber: Boolean = true, // In mã đơn hàng trên tem

    @ColumnInfo(name = "label_print_table_name")
    val labelPrintTableName: Boolean = true, // In tên bàn trên tem

    @ColumnInfo(name = "label_print_time")
    val labelPrintTime: Boolean = true, // In thời gian trên tem

    @ColumnInfo(name = "label_store_name")
    val labelStoreName: String? = null, // Tên cửa hàng hiển thị trên tem

    @ColumnInfo(name = "label_reverse")
    val labelReverse: Boolean = false, // Đảo chiều in tem (180°)

    // ========== LABEL SIZE & FONT CONFIG ==========
    @ColumnInfo(name = "label_width_mm")
    val labelWidthMm: Int = 72, // Default 72mm (XPRINTER)

    @ColumnInfo(name = "label_height_mm")
    val labelHeightMm: Int = 30, // Default 30mm

    @ColumnInfo(name = "label_gap_mm")
    val labelGapMm: Int = 3, // Gap between labels

    @ColumnInfo(name = "label_font_scale")
    val labelFontScale: Float = 1.0f, // Font scale factor (0.5 - 2.0)

    @ColumnInfo(name = "label_max_toppings")
    val labelMaxToppings: Int = 0, // Max toppings per label (0 = auto based on size)

    @ColumnInfo(name = "created_at")
    val createdAt: String,

    @ColumnInfo(name = "updated_at")
    val updatedAt: String,

    // Sync fields
    @ColumnInfo(name = "sync_status")
    val syncStatus: String = "synced",

    @ColumnInfo(name = "synced_at")
    val syncedAt: String? = null,

    @ColumnInfo(name = "version")
    val version: Int = 1
) {
    /**
     * Lấy KitchenPrintMode enum từ string
     */
    fun getPrintModeEnum(): KitchenPrintMode {
        return try {
            KitchenPrintMode.valueOf(printMode)
        } catch (e: Exception) {
            KitchenPrintMode.TICKET
        }
    }

    /**
     * Lấy KitchenType enum từ string
     */
    fun getKitchenTypeEnum(): KitchenType {
        return KitchenType.entries.find { it.value == kitchenType } ?: KitchenType.OTHER
    }

    /**
     * Kiểm tra có in phiếu không
     */
    fun shouldPrintTicket(): Boolean {
        val mode = getPrintModeEnum()
        return mode == KitchenPrintMode.TICKET || mode == KitchenPrintMode.BOTH
    }

    /**
     * Kiểm tra có in tem không
     */
    fun shouldPrintLabel(): Boolean {
        val mode = getPrintModeEnum()
        return mode == KitchenPrintMode.LABEL || mode == KitchenPrintMode.BOTH
    }

    /**
     * Lấy PrinterProtocol enum
     */
    fun getPrinterProtocolEnum(): PrinterProtocol {
        return PrinterProtocol.fromString(printerProtocol)
    }

    /**
     * Kiểm tra máy in TSPL (label printer)
     */
    fun isTsplPrinter(): Boolean {
        return getPrinterProtocolEnum() == PrinterProtocol.TSPL
    }

    /**
     * Kiểm tra máy in ESC/POS (receipt printer)
     */
    fun isEscPosPrinter(): Boolean {
        return getPrinterProtocolEnum() == PrinterProtocol.ESCPOS
    }

    /**
     * Lấy kích thước tem
     */
    fun getLabelSize(): LabelSize {
        return LabelSize(labelWidthMm, labelHeightMm, labelGapMm)
    }

    /**
     * Lấy max toppings (auto nếu = 0)
     */
    fun getEffectiveMaxToppings(): Int {
        if (labelMaxToppings > 0) return labelMaxToppings
        return getLabelSize().getRecommendedMaxToppings()
    }

    /**
     * Lấy font scale factor
     */
    fun getEffectiveFontScale(): Float {
        return labelFontScale.coerceIn(0.5f, 2.0f)
    }
}
