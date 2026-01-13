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
}
