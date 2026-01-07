package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "vouchers",
    indices = [
        Index(value = ["code"], unique = true),
        Index(value = ["branch_id"]),
        Index(value = ["is_active"]),
        Index(value = ["start_date"]),
        Index(value = ["end_date"])
    ]
)
data class VoucherEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "branch_id")
    val branchId: String,

    @ColumnInfo(name = "code")
    val code: String,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "description")
    val description: String? = null,

    @ColumnInfo(name = "discount_type")
    val discountType: String, // percent, fixed

    @ColumnInfo(name = "discount_value")
    val discountValue: Double,

    @ColumnInfo(name = "min_order_amount")
    val minOrderAmount: Double? = null,

    @ColumnInfo(name = "max_discount_amount")
    val maxDiscountAmount: Double? = null,

    @ColumnInfo(name = "max_usage_count")
    val maxUsageCount: Int? = null,

    @ColumnInfo(name = "max_usage_per_customer")
    val maxUsagePerCustomer: Int? = null,

    // Local tracking
    @ColumnInfo(name = "local_usage_count")
    val localUsageCount: Int = 0,

    // Server tracking
    @ColumnInfo(name = "server_usage_count")
    val serverUsageCount: Int = 0,

    @ColumnInfo(name = "start_date")
    val startDate: Long,

    @ColumnInfo(name = "end_date")
    val endDate: Long,

    @ColumnInfo(name = "is_active")
    val isActive: Boolean = true,

    @ColumnInfo(name = "applies_to")
    val appliesTo: String? = null, // all, category, product - JSON array

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
    val version: Int = 1,

    @ColumnInfo(name = "deleted_at")
    val deletedAt: Long? = null
)
