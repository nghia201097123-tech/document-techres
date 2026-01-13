package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "shifts",
    indices = [
        Index(value = ["branch_id"]),
        Index(value = ["staff_id"]),
        Index(value = ["status"]),
        Index(value = ["opened_at"]),
        Index(value = ["sync_status"])
    ]
)
data class ShiftEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "branch_id")
    val branchId: String,

    @ColumnInfo(name = "staff_id")
    val staffId: String,

    @ColumnInfo(name = "staff_name")
    val staffName: String,

    @ColumnInfo(name = "status")
    val status: String = "open", // open, closed

    @ColumnInfo(name = "opening_amount")
    val openingAmount: Double = 0.0,

    @ColumnInfo(name = "closing_amount")
    val closingAmount: Double = 0.0,

    @ColumnInfo(name = "expected_amount")
    val expectedAmount: Double = 0.0,

    @ColumnInfo(name = "difference_amount")
    val differenceAmount: Double = 0.0,

    @ColumnInfo(name = "total_orders")
    val totalOrders: Int = 0,

    @ColumnInfo(name = "total_revenue")
    val totalRevenue: Double = 0.0,

    @ColumnInfo(name = "cash_revenue")
    val cashRevenue: Double = 0.0,

    @ColumnInfo(name = "card_revenue")
    val cardRevenue: Double = 0.0,

    @ColumnInfo(name = "transfer_revenue")
    val transferRevenue: Double = 0.0,

    @ColumnInfo(name = "other_revenue")
    val otherRevenue: Double = 0.0,

    @ColumnInfo(name = "total_discount")
    val totalDiscount: Double = 0.0,

    @ColumnInfo(name = "total_refund")
    val totalRefund: Double = 0.0,

    @ColumnInfo(name = "total_cancelled")
    val totalCancelled: Int = 0,

    @ColumnInfo(name = "notes")
    val notes: String? = null,

    @ColumnInfo(name = "opened_at")
    val openedAt: String,

    @ColumnInfo(name = "closed_at")
    val closedAt: String? = null,

    @ColumnInfo(name = "created_at")
    val createdAt: String,

    @ColumnInfo(name = "updated_at")
    val updatedAt: String,

    // Sync fields
    @ColumnInfo(name = "sync_status")
    val syncStatus: String = "pending",

    @ColumnInfo(name = "synced_at")
    val syncedAt: String? = null,

    @ColumnInfo(name = "retry_count")
    val retryCount: Int = 0,

    @ColumnInfo(name = "version")
    val version: Int = 1
)
