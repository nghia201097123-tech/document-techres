package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Entity lưu trữ phụ thu trong Room Database
 * Phụ thu là các khoản phí thêm cho đơn hàng (VD: phí mang đồ ăn vào, phí đóng gói...)
 */
@Entity(
    tableName = "surcharges",
    indices = [
        Index(value = ["branch_id"]),
        Index(value = ["is_active"])
    ]
)
data class SurchargeEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "branch_id")
    val branchId: String,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "description")
    val description: String? = null,

    // Số tiền phụ thu (đã gồm VAT)
    @ColumnInfo(name = "amount")
    val amount: Double,

    // % VAT của phụ thu
    @ColumnInfo(name = "vat_rate")
    val vatRate: Double = 0.0,

    @ColumnInfo(name = "sort_order")
    val sortOrder: Int = 0,

    @ColumnInfo(name = "is_active")
    val isActive: Boolean = true,

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
     * Tính giá trước VAT từ giá đã gồm VAT
     */
    val priceBeforeVat: Double
        get() = if (vatRate > 0) amount / (1 + vatRate / 100) else amount

    /**
     * Tính số tiền VAT
     */
    val vatAmount: Double
        get() = amount - priceBeforeVat
}
