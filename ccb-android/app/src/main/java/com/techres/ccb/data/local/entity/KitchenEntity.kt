package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

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
    val kitchenType: String? = null, // "cooking", "grill", "bar", "dessert", etc.

    @ColumnInfo(name = "sort_order")
    val sortOrder: Int = 0,

    @ColumnInfo(name = "is_active")
    val isActive: Boolean = true,

    // Printer configuration (stored locally)
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
)
