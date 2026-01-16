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
 */
data class LabelSize(
    val widthMm: Int,
    val heightMm: Int,
    val gapMm: Int = 3
) {
    val displayName: String get() = "${widthMm}x${heightMm}mm"

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

    // ========== LABEL SIZE (for TSPL printers) ==========
    @ColumnInfo(name = "label_width_mm")
    val labelWidthMm: Int = 72, // Default 72mm (XPRINTER)

    @ColumnInfo(name = "label_height_mm")
    val labelHeightMm: Int = 30, // Default 30mm

    @ColumnInfo(name = "label_gap_mm")
    val labelGapMm: Int = 3, // Gap between labels

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
}
