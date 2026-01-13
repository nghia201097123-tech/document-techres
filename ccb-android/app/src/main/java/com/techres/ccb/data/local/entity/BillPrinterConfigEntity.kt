package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Bill Printer Config Entity - Cấu hình máy in bill
 *
 * Mỗi chi nhánh có thể có nhiều máy in bill (nhiều quầy thu ngân)
 */
@Entity(
    tableName = "bill_printer_configs",
    indices = [
        Index(value = ["branch_id"]),
        Index(value = ["is_active"]),
        Index(value = ["is_default"])
    ]
)
data class BillPrinterConfigEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "branch_id")
    val branchId: String,

    @ColumnInfo(name = "name")
    val name: String, // Tên máy in (VD: "Quầy thu ngân 1")

    @ColumnInfo(name = "description")
    val description: String? = null,

    // ============ CONNECTION CONFIG ============
    @ColumnInfo(name = "connection_type")
    val connectionType: String = "network", // network, bluetooth, usb, sunmi

    @ColumnInfo(name = "printer_ip")
    val printerIp: String? = null,

    @ColumnInfo(name = "printer_port")
    val printerPort: Int = 9100,

    @ColumnInfo(name = "printer_mac")
    val printerMac: String? = null, // Địa chỉ MAC cho Bluetooth

    @ColumnInfo(name = "printer_usb_path")
    val printerUsbPath: String? = null, // USB device path

    // ============ TEMPLATE CONFIG ============
    @ColumnInfo(name = "template_id")
    val templateId: String? = null,

    // ============ PRINT CONFIG ============
    @ColumnInfo(name = "paper_width")
    val paperWidth: Int = 80, // 58 hoặc 80mm

    @ColumnInfo(name = "auto_print_on_payment")
    val autoPrintOnPayment: Boolean = true, // Tự động in khi thanh toán

    @ColumnInfo(name = "print_preview")
    val printPreview: Boolean = false, // Xem trước khi in

    @ColumnInfo(name = "number_of_copies")
    val numberOfCopies: Int = 1,

    @ColumnInfo(name = "cut_paper")
    val cutPaper: Boolean = true,

    @ColumnInfo(name = "open_cash_drawer")
    val openCashDrawer: Boolean = true,

    @ColumnInfo(name = "beep_after_print")
    val beepAfterPrint: Boolean = true,

    // ============ RETRY CONFIG ============
    @ColumnInfo(name = "retry_count")
    val retryCount: Int = 3,

    @ColumnInfo(name = "retry_delay_ms")
    val retryDelayMs: Int = 1000,

    @ColumnInfo(name = "connection_timeout_ms")
    val connectionTimeoutMs: Int = 5000,

    // ============ STATUS ============
    @ColumnInfo(name = "is_default")
    val isDefault: Boolean = false,

    @ColumnInfo(name = "is_active")
    val isActive: Boolean = true,

    @ColumnInfo(name = "sort_order")
    val sortOrder: Int = 0,

    @ColumnInfo(name = "created_at")
    val createdAt: String,

    @ColumnInfo(name = "updated_at")
    val updatedAt: String,

    // Sync fields
    @ColumnInfo(name = "sync_status")
    val syncStatus: String = "synced",

    @ColumnInfo(name = "synced_at")
    val syncedAt: String? = null,

    // Local status (not synced)
    @ColumnInfo(name = "is_connected")
    val isConnected: Boolean = false,

    @ColumnInfo(name = "last_print_at")
    val lastPrintAt: String? = null,

    @ColumnInfo(name = "last_error")
    val lastError: String? = null
)

/**
 * Enum for printer connection types
 */
enum class PrinterConnectionType(val value: String) {
    NETWORK("network"),
    BLUETOOTH("bluetooth"),
    USB("usb"),
    SUNMI("sunmi")
}
